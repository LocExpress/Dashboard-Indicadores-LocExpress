# scripts/

## `gen_projetos.py`

Regenera `web/lib/viabilidadeData.ts` com **todos os projetos** de Viabilidade
Financeira do Franqueado (Compact, Compact Plus, Custom, Premium, Prime) a partir
das planilhas Google Sheets publicadas.

O link CSV publicado de cada projeto expõe apenas 1 aba; o script usa o mesmo link
com `?output=xlsx` (workbook inteiro) e extrai, por projeto: KPIs, séries de 5 anos,
fluxo de caixa acumulado (60 meses), composição do investimento, despesas fixas,
recursos humanos e DRE anual (somando 12 meses/ano).

### Uso

```bash
pip install openpyxl
python scripts/gen_projetos.py
```

Saída: reescreve `web/lib/viabilidadeData.ts`. Rode sempre que alguma planilha mudar
e confira o `git diff` antes de commitar.

### Adicionar um novo projeto

Edite a lista `PROJETOS` no topo de `gen_projetos.py` (slug, nome exibido e o id de
publicação do link `…/d/e/<ID>/pub`) e rode o script novamente.

> Observação: a TIR ao mês (`tirAm`, 3,44%) vem da aba `Premissas` e está fixada no
> topo do script (`TIR_AM`). Ajuste caso a planilha mude.
