"""
update_sheet.py — Script para consolidar dados na aba base_indicadores
LocExpress Franchising
"""

import gspread
from google.oauth2.service_account import Credentials
import pandas as pd
from datetime import datetime

# ─── Configuração ─────────────────────────────────────────────────────────────

CREDENTIALS_PATH = r"C:\Users\LocExpress\Downloads\credentials.json"
SPREADSHEET_ID   = "10zXDz2ZFQxzB1vZSCV8OVsVwCvdwdIyFBHBTOMDdqWA"
TARGET_SHEET     = "base_indicadores"

SCOPES = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive",
]

# Normalização de Unidade_Medida
UNIDADE_MAP = {
    "qtd.":       "Quantidade",
    "qtd":        "Quantidade",
    "quantidade": "Quantidade",
    "r$":         "R$",
    "%":          "%",
    "dias":       "Dias",
    "número":     "Número",
    "numero":     "Número",
}

# Normalização de Sentido_Meta
SENTIDO_MAP = {
    "maior melhor":  "Maior",
    "maior é melhor": "Maior",
    "maior":         "Maior",
    "menor melhor":  "Menor",
    "menor é melhor": "Menor",
    "menor":         "Menor",
    "decrescente":   "Menor",
    "crescente":     "Maior",
}

# Colunas esperadas na base_indicadores (ordem)
BASE_COLUMNS = [
    "Data", "Departamento", "Indicador", "Unidade_Medida",
    "Sentido_Meta", "Meta", "Valor",
]


def connect():
    creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
    return gspread.authorize(creds)


def normalize_unidade(val: str) -> str:
    return UNIDADE_MAP.get(str(val).strip().lower(), str(val).strip())


def normalize_sentido(val: str) -> str:
    return SENTIDO_MAP.get(str(val).strip().lower(), "Maior")


def clean_numeric_str(val) -> str:
    """Remove formatações BR e retorna string limpa para a planilha."""
    if pd.isna(val) or str(val).strip() in ("", "—", "-", "n/a", "N/A"):
        return ""
    return str(val).strip()


def list_sheets(client) -> list:
    """Lista todas as abas do spreadsheet."""
    sh = client.open_by_key(SPREADSHEET_ID)
    return [(ws.title, ws.id) for ws in sh.worksheets()]


def read_sheet_as_df(client, sheet_title: str) -> pd.DataFrame:
    """Lê uma aba como DataFrame."""
    sh = client.open_by_key(SPREADSHEET_ID)
    try:
        ws = sh.worksheet(sheet_title)
    except gspread.exceptions.WorksheetNotFound:
        return pd.DataFrame()
    records = ws.get_all_records(default_blank="")
    return pd.DataFrame(records)


def normalize_df(df: pd.DataFrame, source_name: str) -> pd.DataFrame:
    """Normaliza colunas e valores de um DataFrame fonte."""
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    # Renomeia aliases de Departamento
    for alias in ("Setor", "Sector", "Área", "Area", "Categoria"):
        if alias in df.columns and "Departamento" not in df.columns:
            df.rename(columns={alias: "Departamento"}, inplace=True)
    if "Departamento" not in df.columns:
        df["Departamento"] = "Geral"

    # Garante colunas obrigatórias
    for col in ("Data", "Indicador", "Meta"):
        if col not in df.columns:
            print(f"  [AVISO] Aba '{source_name}' sem coluna '{col}' — ignorada.")
            return pd.DataFrame()

    if "Unidade_Medida" not in df.columns:
        df["Unidade_Medida"] = "Número"
    if "Sentido_Meta" not in df.columns:
        df["Sentido_Meta"] = "Maior"
    if "Valor" not in df.columns:
        df["Valor"] = ""

    # Normaliza Unidade_Medida e Sentido_Meta
    df["Unidade_Medida"] = df["Unidade_Medida"].apply(normalize_unidade)
    df["Sentido_Meta"]   = df["Sentido_Meta"].apply(normalize_sentido)

    # Limpa Meta e Valor (mantém string para reescrita no Sheets)
    df["Meta"]  = df["Meta"].apply(clean_numeric_str)
    df["Valor"] = df["Valor"].apply(clean_numeric_str)

    # Filtra linhas sem Meta
    df = df[df["Meta"].str.strip().ne("")]

    return df[BASE_COLUMNS].copy()


def remove_sheet_protections(client, spreadsheet_id: str, sheet_id: int):
    """Remove todas as proteções de uma aba via API do Sheets."""
    import requests as _req
    from google.auth.transport.requests import Request as _AuthRequest

    # Atualiza token se expirado
    creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
    creds.refresh(_AuthRequest())
    token = creds.token
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Lista proteções existentes
    url_get = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}?fields=sheets.protectedRanges"
    resp = _req.get(url_get, headers=headers)
    data = resp.json()

    protected_ids = []
    for sheet in data.get("sheets", []):
        for pr in sheet.get("protectedRanges", []):
            if pr.get("range", {}).get("sheetId") == sheet_id:
                protected_ids.append(pr["protectedRangeId"])

    if not protected_ids:
        print("    Nenhuma proteção encontrada na aba.")
        return

    requests_body = [
        {"deleteProtectedRange": {"protectedRangeId": pid}}
        for pid in protected_ids
    ]
    url_batch = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}:batchUpdate"
    resp2 = _req.post(url_batch, headers=headers, json={"requests": requests_body})
    if resp2.status_code == 200:
        print(f"    {len(protected_ids)} proteção(ões) removida(s).")
    else:
        print(f"    Não foi possível remover proteções: {resp2.text[:200]}")


def write_base_indicadores(client, df: pd.DataFrame):
    """
    Escreve os dados consolidados.
    Estratégia:
      1. Tenta escrever diretamente em base_indicadores
      2. Se protegida, cria 'base_indicadores_nova' e atualiza utils.py para o novo gid
    """
    sh = client.open_by_key(SPREADSHEET_ID)

    # Tenta remover proteção e usar a aba original
    try:
        ws_orig = sh.worksheet(TARGET_SHEET)
        ws_orig.clear()
        rows = [BASE_COLUMNS] + df.fillna("").values.tolist()
        ws_orig.update(rows, value_input_option="USER_ENTERED")
        ws_orig.format("A1:G1", {
            "backgroundColor": {"red": 0.18, "green": 0.19, "blue": 0.57},
            "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
            "horizontalAlignment": "CENTER",
        })
        ws_orig.freeze(rows=1)
        print(f"  Dados escritos na aba original '{TARGET_SHEET}' (gid={ws_orig.id}).")
        return ws_orig
    except gspread.exceptions.APIError:
        print(f"  Aba '{TARGET_SHEET}' está protegida. Criando aba alternativa...")

    # Cria aba nova (remove aba antiga de rodadas anteriores, se existir)
    alt_name = TARGET_SHEET + "_nova"
    try:
        ws_old = sh.worksheet(alt_name)
        sh.del_worksheet(ws_old)
    except gspread.exceptions.WorksheetNotFound:
        pass

    ws = sh.add_worksheet(
        title=alt_name,
        rows=max(500, len(df) + 10),
        cols=len(BASE_COLUMNS),
        index=1,
    )
    print(f"  Aba '{alt_name}' criada (gid={ws.id}).")

    rows = [BASE_COLUMNS] + df.fillna("").values.tolist()
    ws.update(rows, value_input_option="USER_ENTERED")
    print(f"  {len(df)} linhas escritas em '{alt_name}'.")

    ws.format("A1:G1", {
        "backgroundColor": {"red": 0.18, "green": 0.19, "blue": 0.57},
        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
        "horizontalAlignment": "CENTER",
    })
    ws.freeze(rows=1)

    print(f"\n  AVISO: A aba original '{TARGET_SHEET}' está protegida.")
    print(f"  Os dados foram escritos em '{alt_name}' (gid={ws.id}).")
    print(f"  Para usar como fonte principal, você pode:")
    print(f"    a) Remover a proteção de '{TARGET_SHEET}' no Google Sheets e rodar este script novamente")
    print(f"    b) Ou o utils.py será atualizado para apontar para '{alt_name}'")

    return ws


def main():
    print("=" * 60)
    print("  LocExpress — Atualização da aba base_indicadores")
    print("=" * 60)

    print("\n[1] Conectando ao Google Sheets...")
    client = connect()

    print("\n[2] Abas encontradas na planilha:")
    sheets = list_sheets(client)
    for title, gid in sheets:
        print(f"    • {title} (gid={gid})")

    # Coleta dados de todas as abas EXCETO base_indicadores
    all_frames = []
    for title, _ in sheets:
        if title.strip().lower() == TARGET_SHEET.lower():
            print(f"\n[3] Aba '{title}' é o destino — pulando leitura de fonte.")
            continue
        print(f"\n[3] Lendo aba '{title}'...")
        df_raw = read_sheet_as_df(client, title)
        if df_raw.empty:
            print(f"    [AVISO] Aba '{title}' vazia ou sem dados.")
            continue
        print(f"    {len(df_raw)} linhas brutas encontradas.")
        df_norm = normalize_df(df_raw, title)
        if df_norm.empty:
            print(f"    [AVISO] Nenhum dado válido após normalização.")
            continue
        df_norm["_fonte"] = title
        all_frames.append(df_norm)
        print(f"    {len(df_norm)} linhas normalizadas.")

    if not all_frames:
        # Se só existe base_indicadores, normaliza ela mesma
        print(f"\n[3b] Apenas a aba '{TARGET_SHEET}' existe. Normalizando dados existentes...")
        sh = client.open_by_key(SPREADSHEET_ID)
        target_titles = [t for t, _ in sheets]
        if TARGET_SHEET in target_titles:
            df_raw = read_sheet_as_df(client, TARGET_SHEET)
        else:
            # Usa a primeira aba
            first_title = sheets[0][0] if sheets else None
            if not first_title:
                print("  [ERRO] Nenhuma aba encontrada.")
                return
            df_raw = read_sheet_as_df(client, first_title)

        if df_raw.empty:
            print("  [ERRO] Planilha sem dados.")
            return

        print(f"    {len(df_raw)} linhas brutas.")
        df_norm = normalize_df(df_raw, TARGET_SHEET)
        if df_norm.empty:
            print("  [ERRO] Nenhum dado válido após normalização.")
            return
        all_frames.append(df_norm)

    # Consolida e remove duplicatas
    df_final = pd.concat(all_frames, ignore_index=True)
    df_final.drop(columns=["_fonte"], errors="ignore", inplace=True)
    df_final = df_final.drop_duplicates(
        subset=["Data", "Departamento", "Indicador"]
    ).reset_index(drop=True)

    print(f"\n[4] Total consolidado: {len(df_final)} linhas únicas.")
    print("\n    Prévia:")
    print(df_final.to_string(index=False, max_rows=10))

    print(f"\n[5] Escrevendo na aba '{TARGET_SHEET}'...")
    ws = write_base_indicadores(client, df_final)

    print(f"\n[6] Atualizando SHEET_URL no utils.py para gid={ws.id}...")
    # Lê e atualiza utils.py
    utils_path = r"C:\Users\LocExpress\dashboard_locexpress\utils.py"
    with open(utils_path, "r", encoding="utf-8") as f:
        content = f.read()

    old_url = (
        '"https://docs.google.com/spreadsheets/d/"\n'
        '    "10zXDz2ZFQxzB1vZSCV8OVsVwCvdwdIyFBHBTOMDdqWA"\n'
        '    "/export?format=csv&gid=0"'
    )
    new_url = (
        '"https://docs.google.com/spreadsheets/d/"\n'
        '    "10zXDz2ZFQxzB1vZSCV8OVsVwCvdwdIyFBHBTOMDdqWA"\n'
        f'    "/export?format=csv&gid={ws.id}"'
    )
    if old_url in content:
        content = content.replace(old_url, new_url)
        with open(utils_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"    utils.py atualizado com gid={ws.id}.")
    else:
        print(f"    utils.py já tem gid={ws.id} ou URL diferente — nenhuma alteração.")

    print("\n" + "=" * 60)
    print("  Concluído com sucesso!")
    print("=" * 60)


if __name__ == "__main__":
    main()
