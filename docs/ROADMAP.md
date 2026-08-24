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

- [x] Instalar `djangorestframework`, `django-cors-headers`, `djangorestframework-simplejwt`
- [x] Serializers para `Item` e `Movimentacao`
- [x] ViewSets + Router: `/api/itens/`, `/api/movimentacoes/`
- [x] Autenticação: `/api/token/` e `/api/token/refresh/`
- [x] Endpoint de negócio `/api/lista-compras/` — itens com `qtd <= qtd_minima`, já com a quantidade sugerida
- [x] Endpoint de negócio `POST /api/reposicao-lote/` — repõe todos os faltantes a 2x o mínimo
- [x] Endpoint de análise `/api/itens/{id}/analise/` — consumo, tendência, estimativa de dias restantes
- [x] Testes automatizados (`pytest-django`) cobrindo as regras migradas do `db.py` — 16 testes, todos passando
- [x] Documentação automática da API (`drf-spectacular`, gera Swagger/OpenAPI) — `/api/docs/` e `/api/schema/`

## Fase 3 — App mobile (React Native + Expo) (1–2 semanas)

- [x] `npx create-expo-app mobile`
- [x] Navegação (React Navigation): Início (cards), Detalhe do item, Lista de compras, Histórico, Análise
- [x] Tela de login (JWT), token salvo com `expo-secure-store` (fallback `localStorage` só no preview web)
- [x] Cards de estoque com barra de nível e status (ok / baixo / zerado) — reaproveite a lógica visual que você já validou no Streamlit
- [x] Ações de retirar / repor / ajustar direto no card (modal ou bottom sheet) — retirar/repor no detalhe, ajustar em bottom sheet
- [x] Tela de lista de compras (consome `/api/lista-compras/`)
- [x] Botão de reposição em lote
- [x] Histórico com filtro por item e período
- [x] Gráficos de consumo (`victory-native` ou `react-native-chart-kit`) — `react-native-chart-kit`
- [x] Tema claro/escuro seguindo o sistema do celular
- [ ] Testar em Android e iOS via Expo Go — validado via preview web (login, cards, detalhe/análise, retirar, lista de compras, reposição em lote, histórico, logout); falta testar num device real com Expo Go

## Fase 4 — Bot + IA (em paralelo à Fase 3, ou logo depois) (3–5 dias)

- [x] Reescrever o bot do Telegram para consumir a API Django (em vez de acessar o SQLite direto) — `backend/bots/api_client.py` (JWT, refresh automatico em 401), validado ponta a ponta contra a API real
- [x] Migrar a função que interpreta texto/áudio via Gemini para um módulo reutilizável — `backend/bots/gemini.py`, no SDK atual `google-genai` (o `google-generativeai` usado no projeto original foi descontinuado)
- [x] Endpoint/webhook dedicado para o Telegram avisar quando um item bate o mínimo — automático em `POST /api/itens/{id}/movimentar/` (só na transição ok→baixo/zerado) + manual em `POST /api/lista-compras/notificar/`
- [ ] Opcional: complementar (ou substituir) o Telegram por notificação push nativa no mobile (`expo-notifications`) — não feito
- [ ] Pendente do usuário: gerar `TELEGRAM_BOT_TOKEN` (via @BotFather) e `GEMINI_API_KEY`, preencher no `backend/.env` e rodar `python manage.py run_telegram_bot` pra testar com o Telegram de verdade

## Fase 5 — Deploy (2–3 dias)

- [x] Backend: Railway escolhido. Código pronto (settings de produção, `Procfile`, WhiteNoise, health check em `/health/`) — guia passo a passo em [docs/DEPLOY.md](DEPLOY.md)
- [x] Segredos via variáveis de ambiente (`django-environ`) — já era assim desde a Fase 1, nada commitado
- [ ] Pendente do usuário: criar a conta no Railway, conectar o repo, colar as variáveis de ambiente e gerar o domínio (passos 1–6 do DEPLOY.md) — envolve conta/pagamento, não posso fazer por você
- [x] Mobile: build com EAS Build — `mobile/eas.json` (perfis development/preview/production) e `app.json` configurados (bundle id, `userInterfaceStyle` corrigido de "light" pra "automatic" — estava ignorando o tema do sistema). Guia em [docs/MOBILE_DEPLOY.md](MOBILE_DEPLOY.md)
- [ ] Pendente do usuário: criar conta Expo (`eas login`, `eas build:configure`), rodar os builds, e — se quiser publicar de verdade — conta Apple Developer Program (US$99/ano) e Google Play Console (US$25 taxa única) pra TestFlight/Internal Testing
- [x] HTTPS/domínio para a API — resolvido automaticamente pelo domínio gerado no Railway (passo 4 do DEPLOY.md), nenhuma config extra necessária

## Fase 6 — Outras plataformas (só depois do mobile validado)

- [x] Web: dashboard em Next.js consumindo a mesma API (visão gerencial: resumo, gráfico "mais consumidos" agregado, grade de itens, detalhe com análise, compras, histórico com filtros)
- [x] PWA instalável a partir do dashboard web em vez de investir em Electron — mesmo esforço, mais alcance (manifest + service worker cacheando o app shell, ícones gerados sem assets externos)
- [x] Extras: exportação de relatórios em CSV (lista de compras e histórico)
- [ ] Extras não feitos: exportação em PDF, múltiplos usuários/famílias com permissões por perfil (o backend ainda não tem esse conceito)

## Dicas para o portfólio

- Commits pequenos e frequentes em cada fase mantêm o histórico do repositório orgânico e ativo — evite commits vazios só para preencher o gráfico de contribuições.
- Quando o backend + mobile MVP estiverem rodando, deixe o repositório público, escreva um README com GIF/print do app, e adicione descrição + topics (`django`, `djangorestframework`, `react-native`, `expo`, `postgresql`).
- Depois de ter algo demonstrável, atualize os pins do seu perfil para incluir este projeto — ele passa a ser a prova pública de Django que hoje falta no seu GitHub.
