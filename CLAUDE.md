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
  `/api/reposicao-lote/`, `/api/register/` (auto-cadastro, aberto — `AllowAny`),
  `/api/password-reset/request/` + `/password-reset/confirm/` (código de 6 dígitos pro chat
  pessoal do Telegram vinculado à conta, expira em 15 min — `bots/models.py:PasswordResetCode`,
  sem SMTP configurado; sem vínculo, falha em silêncio, não cai no grupo da família),
  `/api/telegram/link/status/` + `/link/request/` + `/link/confirm/` (vínculo conta↔Telegram —
  usuário pede código logado no app, manda pro bot no privado; `/link/confirm/` só aceita a
  credencial de serviço do bot, ver `bots/models.py:TelegramLink`),
  `/api/token/` + `/token/refresh/`, `/api/docs/` (Swagger), `/health/`.
- Testes: `pytest` (56 testes, todos passando na última checagem).
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
- **Se o bot responder "código inválido ou expirado" pra tudo (vínculo de Telegram, comandos em
  geral), suspeite de senha do usuário `bot` dessincronizada** — aconteceu em produção em
  2026-08-25: `BOT_API_PASSWORD` no Railway não batia mais com a senha salva no banco pro usuário
  `bot`, então **toda** chamada do bot pra API levava 401, e o bot mostra essa mensagem genérica
  pra qualquer `ApiError`, mascarando a causa real. Diagnóstico: `curl -X POST
  .../api/token/ -d '{"username":"bot","password":"<BOT_API_PASSWORD atual>"}'` — se vier
  "Usuário e/ou senha incorreto(s)", é isso. Fix: `railway ssh --service estoque-mobile
  "/opt/venv/bin/python manage.py criar_usuario_bot"` (idempotente, releva a senha do `.env`/env
  vars do Railway pro usuário existente). No Git Bash do Windows, prefixe com
  `MSYS_NO_PATHCONV=1` — sem isso o path `/opt/venv/bin/python` é reescrito errado
  (`C:/Program Files/...`) e o SSH falha com "No such file or directory".
- **Nunca deixe duas instâncias rodando ao mesmo tempo** — o Telegram só aceita um `getUpdates`
  por token, e no Windows é fácil acumular processos órfãos de sessões anteriores (background
  tasks que não foram encerrados direito). Antes de subir uma instância nova, confira:
  `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*run_telegram_bot*' }`
  e mate qualquer `python.exe` real que já esteja rodando (ignore os wrappers `bash.exe` do
  próprio terminal, que aparecem na mesma busca mas não são o processo em si).
- **`TELEGRAM_CHAT_IDS` guarda o(s) chat_id de grupo autorizado(s), não o chat privado com o
  bot** — IDs de grupo são negativos (`-100...`), IDs de DM são positivos. Se o grupo virar
  supergrupo (o Telegram faz isso sozinho ao ativar certos recursos), o chat_id **muda**, e o
  bot passa a ignorar toda mensagem silenciosamente (sem erro nos logs). Desde
  2026-08-25 o bot responde `🔒 ... ID deste chat: <id>` pra qualquer chat não autorizado
  (`bots/telegram_bot.py:avisar_nao_autorizado`) — mande qualquer mensagem no chat certo pra
  descobrir o ID atual e atualizar a env var (local **e** Railway, `railway variables --set`).
- O bot fala com a API via `bots/api_client.py` (JWT), nunca acessa o banco direto.
- Usa o SDK **`google-genai`** (novo) — o `google-generativeai` do projeto original foi
  descontinuado, não reintroduzir essa dependência.
- Erros `503 UNAVAILABLE` do Gemini são sobrecarga do lado do Google (visto acontecer de verdade
  em teste real), não bug nosso — só re-tentar.

## Produção

- **Backend (Railway)**: `https://estoque-mobile-production.up.railway.app` —
  dois serviços (`estoque-mobile` = web, `bot-telegram` = worker) + Postgres,
  projeto `estoquemobile`. Guia: [docs/DEPLOY.md](docs/DEPLOY.md).
- **Dashboard web (Vercel)**: `https://web-jade-three-89.vercel.app` — projeto
  `matheuslippe6-9418s-projects/web`. `NEXT_PUBLIC_API_URL` aponta pro Railway
  acima; `CORS_ALLOWED_ORIGINS` no backend já libera esse domínio. Redesign
  "dispensa.me" (mesmo tema Organic do mobile) aplicado em 2026-08-25, commit
  `27819de` — Vercel redeploya sozinho a cada push em `main` que toque `web/`.
- **Mobile (EAS)**: Android, perfil `preview` (APK standalone, instalação
  direta, sem Play Store), aponta pro backend do Railway acima. Build mais
  recente `1ed1c64d-5fa5-437c-aedd-728cd1136a05` (2026-08-25, v1.0.3 — já
  com o redesign "dispensa.me", cadastro de conta, "esqueci a senha" via
  Telegram vinculado, botão Retirar desabilitado quando o item está
  zerado, "Vincular Telegram" no Histórico, e um atalho pra abrir o
  dashboard web direto do app), SDK 57. Página:
  https://expo.dev/accounts/matheus_lippe/projects/estoque-mobile/builds/1ed1c64d-5fa5-437c-aedd-728cd1136a05.
  A fila do plano gratuito da EAS pode atrasar builds bastante (já vimos
  um levar 45min sem incidente registrado no status.expo.dev) — não é
  sinal de erro, só espera.
  Pra gerar um novo build: `cd mobile && eas build --platform android --profile preview`
  (guia completo em [docs/MOBILE_DEPLOY.md](docs/MOBILE_DEPLOY.md)). iOS e
  builds de `production` (pra loja) ainda não foram feitos — precisam de conta
  Apple Developer/Play Console.

Pegadinhas descobertas fazendo o primeiro deploy de verdade (já corrigidas no
código, mas bom saber se aparecer de novo):

- **Railway não roda a fase `release:` do Procfile** (isso é convenção do
  Heroku). `migrate`/`collectstatic` agora ficam encadeados dentro do próprio
  comando `web:` do `Procfile`, então rodam a cada boot do container.
- **`railway run <comando>` não serve pra rodar Django** — ele executa
  *localmente*, só injetando as env vars de produção; como `DATABASE_URL`
  aponta pro host interno `postgres.railway.internal` (só resolve de dentro
  da rede do Railway), a conexão falha. Use `railway ssh --service
  estoque-mobile "python manage.py <comando>"` — isso roda dentro do
  container de verdade. Precisa de uma chave SSH registrada
  (`ssh-keygen -t ed25519` + `railway ssh keys add`) e, em terminal
  não-interativo, `StrictHostKeyChecking accept-new` no `~/.ssh/config`
  (senão trava em "Host key verification failed").
- **O serviço do bot só roda o bot se o Custom Start Command estiver setado**
  no painel (Settings → Deploy → Custom Start Command →
  `python manage.py run_telegram_bot`). Sem isso, ele roda o `web:` padrão do
  Procfile (gunicorn) — sobe, aparece "Online", mas não é o bot. Não tem como
  setar isso pela CLI. Se o bot não responder no Telegram, `railway logs
  --service bot-telegram` — se aparecer `gunicorn`/`Listening at:` em vez de
  `Bot iniciado. API: ...`, é esse o problema.

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
- **O `router.replace()`/`router.push()` client-side do Next.js (App Router) também não completa
  nesse ambiente** — confirmado em 2026-08-25 até no código original do `web/` (sem nenhuma
  mudança minha), então não é regressão de redesign: uma tela que depende só de um `useEffect`
  chamando `router.replace(...)` (ex.: redirecionar pra `/login` quando desautenticado) fica
  parada mostrando o fallback de loading pra sempre *dentro deste ambiente de teste* — em
  navegador de verdade funciona normal. Pra verificar uma rota protegida aqui, navegue direto
  pra URL final (`mcp__Claude_Browser__navigate` pro path exato) em vez de confiar no redirect
  automático. Raiz confirmada: o Next lança `Router action dispatched before initialization`
  (erro interno `E668`) no console — algo dispara uma ação de router antes do App Router
  terminar de inicializar, e isso é specífico do **modo dev do Next 16 + Turbopack** neste
  ambiente. Sintoma relacionado: em dev, conteúdo colocado **depois** de um `<button
  type="submit">` dentro de um `<form>` às vezes nem chega a montar no DOM (confirmado com um
  `<div>` fixo de teste que sumia). `npx next start` (build de produção, sem HMR/Turbopack dev)
  não tem nenhum dos dois problemas — pra validar uma tela de verdade aqui, prefira `next build
  && next start` a `next dev` quando o dev mode se comportar estranho.
- `gh` CLI não está instalado — operações de leitura no GitHub via `curl` na API pública
  (`api.github.com`), e `git clone`/`push` funcionam porque o Git Credential Manager do Windows
  já tinha as credenciais do usuário configuradas.

## O que falta (gaps identificados, nenhum construído ainda)

- **Dashboard de consumo geral** — o app original tinha um `resumo()`/análise agregada (item de
  maior risco, média/dia geral, top 5) na dashboard. Hoje só existe análise **por item**
  (`/api/itens/{id}/analise/`); o mobile ("previsão de consumo" na Dashboard) e o web aproximam
  isso agregando no client, mas não existe endpoint dedicado nem "maior risco" calculado de verdade.
- **Notificação push nativa no mobile** (`expo-notifications`) — mencionado como opcional na Fase 4,
  não implementado. Hoje o único aviso proativo é via Telegram.
- **Multi-usuário/família com permissões por perfil** — mencionado como extra da Fase 6, não
  implementado. O backend não tem conceito de "perfil"/"família", só usuários Django comuns — e
  desde 2026-08-25 o cadastro é **aberto** (`/api/register/`, `AllowAny`), então qualquer pessoa
  com o link do APK pode criar conta e ver/editar o mesmo estoque compartilhado. Foi decisão
  explícita do usuário (preferiu simplicidade a fechar o cadastro), mas se o app circular além da
  família de confiança isso vira um problema real — vale revisitar antes disso acontecer.
- **Exportação em PDF** — só CSV foi implementado (histórico e lista de compras, no dashboard web).
- **Publicação nas lojas** — backend (Railway), dashboard web (Vercel) e um build Android `preview`
  (EAS, instalação direta) já estão no ar (ver seção "Produção" acima). Falta: build `production` de
  verdade + submissão pra Play Store/TestFlight — precisa de conta Apple Developer Program (US$99/ano)
  e Google Play Console (US$25 taxa única), que são do usuário.
- **iOS** nunca foi testado nesta sessão — só validamos Android (Expo Go + build EAS) e o preview web.
