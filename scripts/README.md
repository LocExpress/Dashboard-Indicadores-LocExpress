# scripts/

## `gen_viabilidade.py`

Regenera `web/lib/viabilidade.ts` (snapshot do dashboard de **Viabilidade do
Franqueado — Projeto Compact 272K**) a partir da planilha Google Sheets publicada.

O link CSV publicado expõe apenas 1 aba; este script usa o mesmo link com
`?output=xlsx` (que devolve o workbook inteiro) e lê a aba
`Dashboard Franqueado (5anos)`.

### Uso

```bash
pip install openpyxl requests
python scripts/gen_viabilidade.py
```

Saída: reescreve `web/lib/viabilidade.ts`. Rode sempre que a planilha mudar e
depois confira o `git diff` antes de commitar.

> Observação: a TIR ao mês (`tirAm`, 3,44%) vem da aba `Premissas` e está fixada no
> topo do script (`TIR_AM`). Ajuste caso a planilha mude.
