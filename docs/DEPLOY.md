# Deploy — Backend no Railway

O código já está pronto pro deploy (settings de produção, `Procfile`, WhiteNoise
pros estáticos, health check em `/health/`). Só falta a parte que só você pode
fazer: criar a conta, conectar o repositório e colar os segredos no painel.

## 1. Criar o projeto no Railway

1. Entre em [railway.app](https://railway.app) e crie uma conta (dá pra usar login do GitHub).
2. **New Project → Deploy from GitHub repo** → selecione `matheuslippe/estoque-mobile`.
3. O Railway vai tentar buildar a raiz do repo — corrija isso: abra o serviço criado → **Settings → Root Directory** → digite `backend`.
4. O builder é o **Railpack** (padrão atual do Railway) — detecta Python sozinho a partir do
   `.python-version` + `requirements.txt` + `Procfile`, não precisa mexer em nada aqui.

## 2. Adicionar o Postgres

1. No mesmo projeto, **New → Database → Add PostgreSQL**.
2. No serviço do backend (não no do Postgres), vá em **Variables** e adicione:
   - `DATABASE_URL` → clique em "Add Reference" e aponte para `Postgres.DATABASE_URL` (evita copiar/colar a senha do banco à mão).

## 3. Variáveis de ambiente do backend

Ainda em **Variables** do serviço do backend, adicione (gere valores novos —
não reaproveite o `SECRET_KEY`/senhas do seu `.env` local):

| Variável | Valor |
|---|---|
| `SECRET_KEY` | gere uma nova (ex.: `python -c "import secrets; print(secrets.token_urlsafe(50))"`) |
| `DEBUG` | `False` |
| `DATABASE_URL` | referência ao Postgres (passo 2) |
| `CORS_ALLOWED_ORIGINS` | deixe vazio por enquanto (o app mobile não manda header `Origin`) |
| `TELEGRAM_BOT_TOKEN` | o mesmo token do seu `.env` local, se quiser o bot em produção |
| `TELEGRAM_CHAT_IDS` | idem |
| `GEMINI_API_KEY` | idem |
| `BOT_API_BASE_URL` | `https://<seu-dominio-railway>/api` (defina depois do passo 4) |
| `BOT_API_USERNAME` | `bot` |
| `BOT_API_PASSWORD` | gere uma senha nova, diferente da local |

Não precisa setar `ALLOWED_HOSTS` nem `CSRF_TRUSTED_ORIGINS` — o `settings.py`
já lê a variável `RAILWAY_PUBLIC_DOMAIN` (o Railway injeta essa sozinho) e
libera o domínio automaticamente.

## 4. Gerar o domínio público (HTTPS incluso)

**Settings → Networking → Generate Domain**. Isso cria algo como
`estoque-mobile-production.up.railway.app`, já com HTTPS. Volte no passo 3 e
preencha `BOT_API_BASE_URL` com esse domínio.

## 5. Primeiro deploy

O deploy roda automaticamente a cada push na `main`. **O Railway não tem a fase
`release:` do Heroku** — ele ignora essa linha do `Procfile` — então `migrate`
e `collectstatic` ficam encadeados dentro do próprio comando `web:`, rodando
toda vez que o container sobe (idempotente, então é seguro rodar de novo em
todo restart):

```
web: python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn core.wsgi --bind 0.0.0.0:$PORT --log-file -
```

Confirme que subiu: `https://<seu-dominio>/health/` deve responder `{"status": "ok"}`.
Se você importou este projeto **antes** dessa correção, o banco pode ter ficado
sem tabelas (migrate nunca rodou) — veja o passo 6 pra rodar manualmente uma vez.

## 6. Criar o superusuário e o usuário do bot em produção

Instale a [Railway CLI](https://docs.railway.app/guides/cli) e rode `railway login`.

**`railway run` não funciona pra comandos Django aqui** — ele roda o comando
*localmente*, só injetando as variáveis de ambiente de produção; como
`DATABASE_URL` aponta pro host interno `postgres.railway.internal` (só
resolve de dentro da rede do Railway), a conexão falha. Use `railway ssh` pra
rodar dentro do container de verdade:

```bash
cd backend
railway link                          # escolha o projeto/ambiente na primeira vez
railway ssh --service estoque-mobile "python manage.py createsuperuser"
railway ssh --service estoque-mobile "python manage.py criar_usuario_bot"
```

Se der "No SSH keys found" / "No registered SSH keys found": gere uma
(`ssh-keygen -t ed25519`) e registre com `railway ssh keys add`. Se der "Host
key verification failed" num terminal não-interativo: adicione ao
`~/.ssh/config`:

```
Host *
    StrictHostKeyChecking accept-new
```

## 7. Bot do Telegram como um segundo serviço (opcional)

Se quiser o bot rodando 24/7 em produção (não só na sua máquina):

1. No mesmo projeto Railway, **New → GitHub Repo** de novo, mesmo repositório.
2. **Root Directory**: `backend`.
3. **Settings → Deploy → Custom Start Command**: `python manage.py run_telegram_bot`
   — **isso é obrigatório e só dá pra fazer pelo painel** (a CLI não tem comando
   pra setar isso). Sem preencher esse campo, o serviço roda o `web:` do
   `Procfile` (gunicorn) por padrão — sobe, aparece "Online" no dashboard, mas
   **não é o bot** e não vai responder nada no Telegram. Se o serviço estiver
   "Online" mas o bot não responde, confira `railway logs --service bot-telegram`:
   se aparecer `gunicorn`/`Listening at: http://0.0.0.0:8080` em vez de
   `Bot iniciado. API: ...`, é esse o problema.
4. Copie as mesmas variáveis de ambiente do serviço web (ou use "Add Reference" pra reusar).
5. Esse serviço não precisa de domínio público — é só um worker rodando em loop.

## 8. Apontar o app mobile pra API em produção

Em `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://<seu-dominio-railway>/api
```

## 9. Dashboard web no Vercel

Publicado em: `https://web-jade-three-89.vercel.app` (projeto
`matheuslippe6-9418s-projects/web`).

```bash
npm install -g vercel
vercel login                          # abre um fluxo de autenticacao por codigo no navegador
cd web
vercel link --yes                     # cria/linka o projeto na primeira vez
vercel env add NEXT_PUBLIC_API_URL production \
  --value "https://<seu-dominio-railway>/api" --no-sensitive --yes
vercel --prod --yes
```

- `NEXT_PUBLIC_*` **não pode** ser adicionada como variável "sensitive" (padrão do
  `vercel env add`) em Production/Preview — dá erro `invalid_visibility`. Use
  `--no-sensitive` (faz sentido: essas variáveis vão pro bundle JS público mesmo).
- **CORS**: depois do primeiro deploy, pegue a URL de produção que o Vercel gerou
  (a "Aliased" no output do `vercel --prod`, fica estável entre deploys) e
  adicione em `CORS_ALLOWED_ORIGINS` no serviço `estoque-mobile` do Railway —
  sem isso a API bloqueia as requisições do dashboard (em produção,
  `DEBUG=False` desativa o `CORS_ALLOW_ALL_ORIGINS` que salva no dev local):
  ```bash
  railway variable set "CORS_ALLOWED_ORIGINS=https://<dominio-vercel>" --service estoque-mobile
  ```

## Custos

O Railway cobra por uso depois do trial inicial (não é mais "free tier"
permanente desde 2023) — acompanhe o consumo em **Usage** no dashboard. Pra um
projeto de portfólio com pouco tráfego costuma ficar bem barato, mas vale
configurar um limite de gasto em **Settings → Usage Limits**.
