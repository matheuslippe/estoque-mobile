# Especificação do backend (migrada de `db.py`)

Extraída do projeto original (`matheuslippe/estoque`, privado) — `db.py`, `app.py` (aba Análise) e `bot_telegram.py`. Esta é a fonte da verdade para os models e endpoints do novo backend Django.

## Models

### `Item` (era a tabela `estoque`)

| Campo | Tipo | Regra |
|---|---|---|
| `nome` | CharField | Normalizado: espaços colapsados + Title Case (`" ".join(nome.split()).title()`) |
| `categoria` | CharField | Normalizado para Title Case; vazio vira `"Geral"` |
| `qtd` | PositiveIntegerField | Nunca negativo (`max(0, ...)`) |
| `qtd_minima` | PositiveIntegerField | Nunca negativo, default 1 |

Regras:
- **Nome único, case-insensitive.** `criar_item` rejeita duplicata comparando `item COLLATE NOCASE`. No Django: `UniqueConstraint(Lower("nome"), name="item_nome_unico")` ou validação no serializer.
- Ao editar (`ajustar_item`), colisão de nome com **outro** item (id diferente) também é bloqueada.

### `Movimentacao` (era a tabela `historico`)

| Campo | Tipo | Regra |
|---|---|---|
| `item` (FK) | ForeignKey(Item, null=True, on_delete=SET_NULL) | Nullable — item pode ser excluído e o histórico permanece |
| `item_nome` | CharField | Snapshot do nome no momento do evento (sobrevive a rename/exclusão) |
| `tipo` | CharField(choices) | `ENTRADA`, `SAIDA`, `AJUSTE`, `CADASTRO`, `EXCLUSAO` |
| `quantidade` | IntegerField | Quantidade aplicada (para `AJUSTE` pode ser a diferença, inclusive negativa) |
| `data_hora` | DateTimeField(auto_now_add=True) | |
| `origem` | CharField(choices) | `app` ou `bot` |
| `obs` | CharField(null=True) | Observação livre (ex.: "Reposicao em lote", justificativa de ajuste, nota de rename) |

Índices: por `data_hora` e por `item` (equivalentes a `idx_hist_data`, `idx_hist_item`).

## Regras de negócio (para os endpoints de `shopping`/lógica de serviço)

Constantes de "nível seguro": **alvo = 2× `qtd_minima`** (mínimo 1). Usado tanto na lista de compras quanto na reposição em lote — importante manter os dois em sincronia (o app antigo tinha um bug histórico aqui: a lista pedia só até o mínimo, o que deixava o item ainda "em falta" após a compra).

- `qtd_a_comprar(qtd, qtd_minima)` → `max(1, max(qtd_minima*2, 1) - qtd)`
- `status_item(qtd, qtd_minima)` → `"zerado"` se `qtd==0`; `"baixo"` se `qtd <= qtd_minima`; senão `"ok"`
- `percentual_item(qtd, qtd_minima)` → `min(100, round(qtd / max(qtd_minima*2, 1) * 100))`
- **Itens em falta**: `qtd <= qtd_minima`, ordenado por `qtd ASC, categoria, item`
- **Movimentar (entrada/saída)**: atômico — lê a linha, calcula a nova quantidade *dentro* da transação (evita race condition entre app e bot escrevendo ao mesmo tempo). Saída nunca fica negativa; se já está zerado e a saída não muda nada, retorna erro sem gravar histórico.
- **Reposição em lote** (`POST /api/reposicao-lote/`): repõe todo item `qtd <= qtd_minima` para `2× qtd_minima`, registra um `ENTRADA` com `obs="Reposicao em lote"` por item, e informa quantos foram repostos. Se nenhum item precisa, retorna "nada a repor" sem erro.
- **Ajuste** (`ajustar_item`): permite renomear + corrigir qtd/qtd_minima manualmente; grava `AJUSTE` com a diferença de quantidade e concatena a justificativa com uma nota de rename quando o nome muda.
- **Exclusão**: apaga o item mas mantém o histórico (por isso `item` no histórico é snapshot, não só FK).

## Endpoint de análise (`/api/itens/{id}/analise/` ou `/api/analise/?dias=N`)

Reproduz `calcular_analise` do Streamlit:

1. Pega `SAIDA` dos últimos N dias (default 30), já ligadas ao item.
2. `dias_obs` = dias realmente observados no período (não fixo em 30) — `(max(data) - min(data)).days + 1`, mínimo 1.
3. Por item: `consumo` = soma de quantidade retirada; `consumo_diario = consumo / dias_obs`.
4. `dias_restantes = qtd_atual / consumo_diario` (arredondado, 1 casa) — `None`/`null` se não há consumo no período.
5. Agregados úteis pro dashboard: total retirado, média/dia, item mais consumido, item de maior risco (menor `dias_restantes`), top 5 mais consumidos, série diária de retiradas (`por_dia`).

Isso deve virar um serializer de resposta customizado (não um ModelSerializer), já que é tudo calculado, não persistido.

## Constantes / enums a migrar

```python
ENTRADA, SAIDA, AJUSTE, CADASTRO, EXCLUSAO = "ENTRADA", "SAIDA", "AJUSTE", "CADASTRO", "EXCLUSAO"
ORIGEM_APP, ORIGEM_BOT = "app", "bot"
```

## Notas de migração SQLite → Postgres

- WAL/`busy_timeout` existiam só para permitir escrita concorrente do app Streamlit + bot no mesmo arquivo SQLite. Com Postgres isso deixa de ser necessário — o banco já lida com concorrência.
- `escapar_markdown` (escape de `_`, `*`, `` ` ``, `[`) continua necessário no módulo do bot (Fase 4), não no backend.
- Sem lógica de auth/multiusuário no original — todo o app era de uso único. JWT é uma adição nova do backend, não uma migração de regra existente.
