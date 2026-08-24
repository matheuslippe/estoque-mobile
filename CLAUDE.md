# estoque-mobile — contexto para o Claude Code

Leia isto antes de mexer no projeto. Cobre o que já existe, como rodar cada
parte localmente, e as pegadinhas específicas desta máquina (Windows) que já
morderam a gente nesta sessão.

Plano completo por fases: [docs/ROADMAP.md](docs/ROADMAP.md) (todas as 6 fases
têm código pronto — o que falta em cada uma está marcado lá com `[ ]`).
Regras de negócio migradas do projeto original: [docs/SPEC_BACKEND.md](docs/SPEC_BACKEND.md).

## Visão geral

Reescrita do gestor de estoque doméstico (`matheuslippe/estoque`, privado,
Streamlit + SQLite) como Django REST API + três clientes: mobile (Expo/React
Native), web (Next.js, PWA) e bot do Telegram com IA (Gemini). Repositório
público: `matheuslippe/estoque-mobile`.

```
estoque-mobile/
├── backend/    Django + DRF + JWT + Postgres
│   ├── core/          settings, urls
│   ├── estoque/       model Item, ViewSet (CRUD + movimentar + analise)
│   ├── historico/     model Movimentacao, ViewSet somente leitura
│   ├── shopping/      lista de compras, reposicao em lote, notificar Telegram
│   └── bots/          integracao Telegram + Gemini (api_client, gemini, telegram_bot, notify)
├── mobile/     Expo (TypeScript) - app cliente principal
├── web/        Next.js (TypeScript, PWA) - dashboard gerencial
└── docs/       ROADMAP, SPEC_BACKEND, DEPLOY (Railway), MOBILE_DEPLOY (EAS)
```

## Como rodar tudo localmente

Ordem: **Postgres → backend → (mobile ou web) → bot (opcional)**.

### 1. Postgres

```bash
cd backend
docker compose up -d
```

Se o Docker não estiver instalado/rodando, o backend cai sozinho pra SQLite
(`backend/db.sqlite3`) — funciona pra dev sem bloquear, mas prefira Postgres.

### 2. Backend

```bash
cd backend
.\venv\Scripts\Activate.ps1          # ou chame .\venv\Scripts\python.exe direto sem ativar
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

- **Sempre bind em `0.0.0.0`**, não só `127.0.0.1` — senão o celular/rede local não alcança.
- Config vem de `backend/.env` (gitignored, não existe fresh clone — copie de `.env.example`).
  Variáveis: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`,
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS`, `GEMINI_API_KEY`, `BOT_API_BASE_URL`,
  `BOT_API_USERNAME`, `BOT_API_PASSWORD`.
- **`.env` não recarrega sozinho** — depois de editar, mate e suba o `runserver` de novo.
- Endpoints: `/api/itens/` (CRUD + `/movimentar/` + `/analise/`), `/api/movimentacoes/`
  (leitura, filtro `?item=` `?data_inicio=` `?data_fim=`), `/api/lista-compras/` (+`/notificar/`),
  `/api/reposicao-lote/`, `/api/token/` + `/token/refresh/`, `/api/docs/` (Swagger), `/health/`.
- Testes: `pytest` (32 testes, todos passando na última checagem).
- Usuários já criados neste banco local: `admin` (superuser), `matheus` (superuser, criado a
  pedido do usuário), `bot` (usuário de serviço só pra autenticar o bot na API — sem staff/superuser,
  criado via `python manage.py criar_usuario_bot`, que lê `BOT_API_USERNAME`/`BOT_API_PASSWORD` do `.env`).
  Senhas ficam só no `.env` local e na cabeça do usuário — não estão neste arquivo.

### 3a. Mobile (Expo Go)

```bash
cd mobile
npm install
npx expo start
```

No celular: app **Expo Go** → **"Enter URL manually"** → `exp://<IP-DA-MAQUINA>:8081`
(o QR code não renderiza direito quando o `expo start` roda num terminal não-interativo/capturado).

- `mobile/.env` (gitignored) precisa de `EXPO_PUBLIC_API_URL=http://<IP-DA-MAQUINA>:8000/api`
  apontando pro **IP da rede local**, não `localhost` — o celular não é a mesma máquina.
  - Emulador Android: `10.0.2.2` em vez do IP da máquina.
  - iOS Simulator / preview web: `127.0.0.1` funciona normal.
- **O IP muda toda vez que a rede muda** (trocou de Wi-Fi, ligou/desligou VPN). Antes de testar
  no celular, confira com `Get-NetIPConfiguration | Select-Object InterfaceAlias,InterfaceDescription,IPv4Address`
  (PowerShell) e pegue o IP do adaptador **Wi-Fi de verdade** — ignore adaptadores Hyper-V/WSL
  (`172.x`) e VPN (ex.: Fortinet). Depois de identificar o IP certo, atualize **os dois**:
  `mobile/.env` (`EXPO_PUBLIC_API_URL`) e `backend/.env` (`ALLOWED_HOSTS`), e reinicie o `runserver`.
- Firewall do Windows: já existem regras "Allow" pra `python.exe` e `Node.js JavaScript Runtime`
  no perfil Public — normalmente não precisa mexer, mas se a rede Wi-Fi estiver marcada como
  "Private" em vez de "Public" (`Get-NetConnectionProfile`), pode ser preciso liberar ali também.
- **Expo Go é travado numa única SDK por versão** (não é mais multi-SDK). Este projeto usa SDK 57 →
  precisa do Expo Go **57.0.9** especificamente. Erro "Project is incompatible with this version of
  Expo Go" mesmo com o app "atualizado" geralmente é atraso de rollout da Play Store — confirme a
  versão instalada em Ajustes → Apps → Expo Go, ou baixe direto de
  `https://github.com/expo/expo-go-releases/releases/download/Expo-Go-57.0.9/Expo-Go-57.0.9.apk`
  (link oficial do repositório `expo/expo-go-releases`). No iOS a App Store demora mais pra aprovar
  cada versão — pode não ter alternativa de sideload.
- Build de produção (EAS): configurado em `mobile/eas.json` + `mobile/app.json`, mas **nunca rodado**
  (precisa da conta Expo do usuário). Guia completo: [docs/MOBILE_DEPLOY.md](docs/MOBILE_DEPLOY.md).

### 3b. Web (dashboard)

```bash
cd web
npm install
npm run dev
```

Abre em http://localhost:3000. Config em `web/.env.local` (gitignored,
copie de `.env.example`) — `NEXT_PUBLIC_API_URL`. Em `DEBUG=True` no backend
o CORS já libera tudo (`CORS_ALLOW_ALL_ORIGINS`), não precisa configurar nada
extra pra rodar contra `localhost`.

### 4. Bot do Telegram (opcional)

```bash
cd backend
python manage.py run_telegram_bot
```

- Precisa de `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS`, `GEMINI_API_KEY` e `BOT_API_PASSWORD`
  preenchidos no `.env`, e do usuário `bot` criado (`python manage.py criar_usuario_bot`).
- **Nunca deixe duas instâncias rodando ao mesmo tempo** — o Telegram só aceita um `getUpdates`
  por token, e no Windows é fácil acumular processos órfãos de sessões anteriores (background
  tasks que não foram encerrados direito). Antes de subir uma instância nova, confira:
  `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*run_telegram_bot*' }`
  e mate qualquer `python.exe` real que já esteja rodando (ignore os wrappers `bash.exe` do
  próprio terminal, que aparecem na mesma busca mas não são o processo em si).
- O bot fala com a API via `bots/api_client.py` (JWT), nunca acessa o banco direto.
- Usa o SDK **`google-genai`** (novo) — o `google-generativeai` do projeto original foi
  descontinuado, não reintroduzir essa dependência.
- Erros `503 UNAVAILABLE` do Gemini são sobrecarga do lado do Google (visto acontecer de verdade
  em teste real), não bug nosso — só re-tentar.

## Pegadinhas gerais desta máquina (Windows)

- Terminal principal é Git Bash; PowerShell só quando precisa de `Get-CimInstance`/`Get-NetIPConfiguration`/
  serviços do Windows. `venv` é criado com scripts `.ps1`/`.exe` do Windows (`venv\Scripts\`, não `venv/bin/`).
- Matar processo em background: `Stop-Process` via PowerShell é mais confiável que `kill` do bash pra
  processos filhos do Windows (python.exe, node.exe). Sempre confira com `Get-CimInstance Win32_Process`
  antes de assumir que algo foi encerrado — múltiplos processos residuais já se acumularam nesta sessão
  mais de uma vez.
- Docker Desktop e Node.js **não vinham instalados** nesta máquina — foram instalados via
  `winget install Docker.DockerDesktop` / `winget install OpenJS.NodeJS.LTS` (sempre com confirmação
  explícita do usuário antes, por ser instalação de software no sistema).
- A ferramenta de browser automation (`computer` click/screenshot) trava ou falha nesse ambiente
  ("Browser pane is not displayed"/hang de 30s) especificamente ao clicar em elementos com transição
  de navegação (React Navigation no mobile web preview, etc.). Alternativa que funciona: `javascript_tool`
  disparando o evento DOM direto (`element.click()` ou `form.requestSubmit()`), e `get_page_text`/`read_page`
  pra verificar o resultado em vez de screenshot.
- `gh` CLI não está instalado — operações de leitura no GitHub via `curl` na API pública
  (`api.github.com`), e `git clone`/`push` funcionam porque o Git Credential Manager do Windows
  já tinha as credenciais do usuário configuradas.

## O que falta (gaps identificados, nenhum construído ainda)

- **Filtro por categoria no mobile Home** — o web tem (dropdown), o mobile só tem busca por nome.
- **Dashboard de consumo geral** — o app original tinha um `resumo()`/análise agregada (item de
  maior risco, média/dia geral, top 5) na dashboard. Hoje só existe análise **por item**
  (`/api/itens/{id}/analise/`); o web aproxima um gráfico "mais consumidos" agregando o histórico
  no client, mas não existe endpoint dedicado nem "maior risco" calculado.
- **Notificação push nativa no mobile** (`expo-notifications`) — mencionado como opcional na Fase 4,
  não implementado. Hoje o único aviso proativo é via Telegram.
- **Multi-usuário/família com permissões por perfil** — mencionado como extra da Fase 6, não
  implementado. O backend não tem conceito de "perfil"/"família", só usuários Django comuns.
- **Exportação em PDF** — só CSV foi implementado (histórico e lista de compras, no dashboard web).
- **Deploy real** — código pronto pros dois (`docs/DEPLOY.md` pro backend no Railway,
  `docs/MOBILE_DEPLOY.md` pro mobile via EAS Build), mas nenhum dos dois foi executado de fato —
  depende de contas do usuário (Railway, Expo, e opcionalmente Apple Developer/Play Console).
- **iOS** nunca foi testado nesta sessão — só validamos Android via Expo Go e o preview web.
