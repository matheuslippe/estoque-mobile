# Roadmap: Reinício do Gestor de Estoque (Mobile-First → Multiplataforma)

## 0. Contexto

O projeto atual (`estoque`, privado) já resolve o problema real: Python + Streamlit, banco SQLite, bot de Telegram com IA (Gemini) para comandos por texto/áudio, lista de compras automática, reposição em lote e análise de consumo. Toda a regra de negócio vive em `db.py` — isso é ótimo, porque é exatamente o que vamos migrar, não vamos reinventar.

**Objetivo deste reinício:** reescrever o backend em Django + Django REST Framework (para virar seu projeto público de portfólio em Django) e construir um app mobile como cliente principal, deixando web/desktop para depois.

**Antes de começar:** não apague nem mude o repositório `estoque` atual — ele continua sendo sua referência funcional enquanto o novo projeto é construído. Só decida o que fazer com ele (arquivar, tornar público como está, ou descontinuar) depois que o novo estiver rodando.

## 1. Decisões de arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| Backend | Django + Django REST Framework | Admin pronto, ORM maduro, é o que falta no seu portfólio público |
| Autenticação | JWT (`djangorestframework-simplejwt`) | Padrão para consumir API de um app mobile |
| Banco | PostgreSQL (Docker local; gerenciado em produção) | SQLite não segura bem escrita concorrente do app + bot em produção |
| Mobile | React Native com Expo | Você já domina JavaScript/React (Finance-SAS, DriveApp) — menor curva de aprendizado que Flutter |
| Repositório | Novo repo público, ex. `estoque-mobile` | Histórico de commits limpo desde o dia 1, bom para o portfólio |

## 2. Estrutura de pastas sugerida

```
estoque-mobile/
├── backend/
│   ├── core/            # settings do projeto Django
│   ├── estoque/         # app: Item, Categoria
│   ├── historico/       # app: Movimentacao
│   ├── shopping/        # app: lista de compras / reposição em lote
│   ├── bots/            # integração Telegram + Gemini
│   └── manage.py
├── mobile/               # app Expo/React Native
└── docs/
    └── ROADMAP.md        # este arquivo, versionado no repo
```

## Fase 0 — Planejamento (1–2 dias)

- [x] Ler `db.py` do projeto atual e listar toda regra de negócio (níveis de estoque, cálculo de lista de compras, reposição em lote, análise de consumo) — isso vira a especificação do novo backend → [docs/SPEC_BACKEND.md](SPEC_BACKEND.md)
- [x] Definir o MVP: quais telas o mobile precisa ter no primeiro release → mantido igual à lista da Fase 3 (Início, Detalhe do item, Lista de compras, Histórico, Análise)
- [ ] Criar o repositório público `estoque-mobile` no GitHub (repo local já iniciado com git; falta criar o remoto e dar push)
- [ ] Criar um board simples (GitHub Projects ou Issues) para quebrar as fases abaixo em tarefas menores

## Fase 1 — Backend Django: fundação (2–3 dias)

- [x] `django-admin startproject core .`
- [x] Criar apps: `estoque`, `historico`, `shopping`
- [x] Modelar `Item` (nome, categoria, qtd, qtd_minima) e `Movimentacao` (item FK, tipo, quantidade, data_hora, origem, obs) — espelhando as tabelas atuais
- [x] Registrar os models no Django Admin (ganho rápido: você já tem um painel de gestão funcional antes mesmo da API existir)
- [x] `makemigrations` / `migrate` e testar CRUD direto pelo admin (testado no navegador: cadastro de item e cálculo de status "ok"/"baixo"/"zerado" funcionando)

## Fase 2 — API REST (3–4 dias)

- [ ] Instalar `djangorestframework`, `django-cors-headers`, `djangorestframework-simplejwt`
- [ ] Serializers para `Item` e `Movimentacao`
- [ ] ViewSets + Router: `/api/itens/`, `/api/movimentacoes/`
- [ ] Autenticação: `/api/token/` e `/api/token/refresh/`
- [ ] Endpoint de negócio `/api/lista-compras/` — itens com `qtd <= qtd_minima`, já com a quantidade sugerida
- [ ] Endpoint de negócio `POST /api/reposicao-lote/` — repõe todos os faltantes a 2x o mínimo
- [ ] Endpoint de análise `/api/itens/{id}/analise/` — consumo, tendência, estimativa de dias restantes
- [ ] Testes automatizados (`pytest-django`) cobrindo as regras migradas do `db.py`
- [ ] Documentação automática da API (`drf-spectacular`, gera Swagger/OpenAPI)

## Fase 3 — App mobile (React Native + Expo) (1–2 semanas)

- [ ] `npx create-expo-app mobile`
- [ ] Navegação (React Navigation): Início (cards), Detalhe do item, Lista de compras, Histórico, Análise
- [ ] Tela de login (JWT), token salvo com `expo-secure-store`
- [ ] Cards de estoque com barra de nível e status (ok / baixo / zerado) — reaproveite a lógica visual que você já validou no Streamlit
- [ ] Ações de retirar / repor / ajustar direto no card (modal ou bottom sheet)
- [ ] Tela de lista de compras (consome `/api/lista-compras/`)
- [ ] Botão de reposição em lote
- [ ] Histórico com filtro por item e período
- [ ] Gráficos de consumo (`victory-native` ou `react-native-chart-kit`)
- [ ] Tema claro/escuro seguindo o sistema do celular
- [ ] Testar em Android e iOS via Expo Go

## Fase 4 — Bot + IA (em paralelo à Fase 3, ou logo depois) (3–5 dias)

- [ ] Reescrever o bot do Telegram para consumir a API Django (em vez de acessar o SQLite direto)
- [ ] Migrar a função que interpreta texto/áudio via Gemini para um módulo reutilizável
- [ ] Endpoint/webhook dedicado para o Telegram avisar quando um item bate o mínimo
- [ ] Opcional: complementar (ou substituir) o Telegram por notificação push nativa no mobile (`expo-notifications`)

## Fase 5 — Deploy (2–3 dias)

- [ ] Backend: Railway, Render ou Fly.io (Postgres gerenciado incluso nos três)
- [ ] Segredos via variáveis de ambiente (`python-decouple` ou `django-environ`) — nunca commitar chaves
- [ ] Mobile: build com EAS Build; distribuir via TestFlight (iOS) e Internal Testing (Play Console)
- [ ] HTTPS/domínio para a API

## Fase 6 — Outras plataformas (só depois do mobile validado)

- [ ] Web: dashboard em React/Next.js consumindo a mesma API (visão gerencial, gráficos maiores)
- [ ] PWA instalável a partir do dashboard web em vez de investir em Electron — mesmo esforço, mais alcance
- [ ] Extras: exportação de relatórios (PDF/CSV), múltiplos usuários/famílias com permissões por perfil

## Dicas para o portfólio

- Commits pequenos e frequentes em cada fase mantêm o histórico do repositório orgânico e ativo — evite commits vazios só para preencher o gráfico de contribuições.
- Quando o backend + mobile MVP estiverem rodando, deixe o repositório público, escreva um README com GIF/print do app, e adicione descrição + topics (`django`, `djangorestframework`, `react-native`, `expo`, `postgresql`).
- Depois de ter algo demonstrável, atualize os pins do seu perfil para incluir este projeto — ele passa a ser a prova pública de Django que hoje falta no seu GitHub.
