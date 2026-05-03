# 🚗 Dashboard de Indicadores | LocExpress Franchising
> **Nosso DNA é locação!**

Dashboard executivo interativo construído com **Python + Streamlit + Plotly**, alimentado diretamente por uma planilha Google Sheets.

---

## 📁 Estrutura do Projeto

```
dashboard_locexpress/
├── app.py            # Aplicação principal Streamlit
├── utils.py          # Utilitários: dados, KPIs, formatação e cores
├── requirements.txt  # Dependências Python
└── README.md         # Este arquivo
```

---

## 🗂️ Estrutura Esperada da Planilha

A planilha deve ter uma aba chamada **`base_indicadores`** com as seguintes colunas (exatamente esses nomes):

| Coluna       | Tipo     | Exemplo              |
|--------------|----------|----------------------|
| Data         | Texto    | 01/01/2025           |
| Ano          | Número   | 2025                 |
| Mês          | Número   | 1 (ou "Janeiro")     |
| Departamento | Texto    | Comercial            |
| Unidade      | Texto    | Unidade SP Centro    |
| Indicador    | Texto    | NPS                  |
| Valor        | Número   | 87.5                 |
| Meta         | Número   | 90.0                 |
| Responsável  | Texto    | João Silva           |
| Observação   | Texto    | (opcional)           |

> A planilha deve estar **publicada na web como CSV** para o dashboard conseguir ler.

---

## ⚙️ Pré-requisitos

- Python **3.9** ou superior
- pip atualizado

---

## 🚀 Como Rodar o Projeto

### 1. Clone ou baixe a pasta do projeto

```bash
cd dashboard_locexpress
```

### 2. Crie um ambiente virtual (recomendado)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Instale as dependências

```bash
pip install -r requirements.txt
```

### 4. Execute o dashboard

```bash
streamlit run app.py
```

O navegador abrirá automaticamente em `http://localhost:8501`.

---

## 📊 Funcionalidades

### Filtros Laterais
- Ano, Mês, Departamento, Unidade e Indicador
- Seleção múltipla com valores padrão = todos
- Botão para limpar cache e recarregar dados da planilha

### KPIs Principais
| Card              | Descrição                          |
|-------------------|------------------------------------|
| Valor Realizado   | Soma dos valores no período filtrado |
| Meta Total        | Soma das metas no período filtrado  |
| % Atingimento     | Realizado ÷ Meta × 100             |
| Diferença         | Realizado − Meta                   |

### Alertas Visuais
| Cor      | Faixa de Atingimento |
|----------|----------------------|
| 🟢 Verde  | ≥ 100%               |
| 🟡 Amarelo | 80% a 99%           |
| 🔴 Vermelho | < 80%              |

### Aba: Visão Geral
1. **Meta × Realizado por Departamento** — barras agrupadas
2. **Meta × Realizado por Unidade** — barras agrupadas
3. **Evolução Mensal** — linha + área com % por mês
4. **Ranking das Unidades** — barras horizontais ordenadas
5. **Mapa de Calor** — % atingimento por Indicador × Departamento
6. **Tabela Resumo** por departamento

### Aba: Por Departamento
- Seletor de departamento
- KPIs específicos do departamento
- Gráficos por Indicador e por Unidade
- Evolução mensal do departamento
- Tabela com todos os registros do departamento

---

## 🌐 Publicar a Planilha no Google Sheets

Para que o dashboard consiga ler os dados:

1. Abra a planilha no Google Sheets
2. Vá em **Arquivo → Compartilhar → Publicar na web**
3. Selecione a aba `base_indicadores`
4. Formato: **Valores separados por vírgula (.csv)**
5. Clique em **Publicar** e confirme

---

## 🔄 Atualização dos Dados

- O cache é renovado automaticamente a cada **5 minutos**
- Para forçar atualização imediata, clique no botão **"Atualizar Dados"** na barra lateral

---

## 🎨 Identidade Visual LocExpress

| Elemento      | Cor         |
|---------------|-------------|
| Azul escuro   | `#003087`   |
| Laranja       | `#F47920`   |
| Cinza claro   | `#F3F4F6`   |
| Branco        | `#FFFFFF`   |
| Verde (ok)    | `#00C853`   |
| Amarelo (atenção) | `#FFB300` |
| Vermelho (crítico) | `#F44336` |

---

## 🛠️ Tecnologias Utilizadas

| Biblioteca  | Versão mínima | Uso                           |
|-------------|---------------|-------------------------------|
| Streamlit   | 1.32          | Interface web e layout        |
| Plotly      | 5.18          | Gráficos interativos          |
| Pandas      | 2.0           | Manipulação de dados          |
| NumPy       | 1.24          | Suporte numérico              |
| Requests    | 2.31          | Conexão HTTP com a planilha   |

---

## 🐛 Solução de Problemas

| Problema                               | Solução                                                     |
|----------------------------------------|-------------------------------------------------------------|
| "Não foi possível conectar"            | Verifique a conexão e se a planilha está publicada          |
| "Colunas ausentes"                     | Confirme os nomes exatos das colunas na planilha             |
| "A planilha está vazia"               | Adicione dados na aba `base_indicadores`                    |
| Filtros vazios / sem dados             | Verifique se os valores de Ano e Mês estão preenchidos      |
| Dashboard lento no primeiro carregamento | Normal — Streamlit compila na primeira execução           |

---

*Desenvolvido para LocExpress Franchising — Nosso DNA é locação! 🚗*
