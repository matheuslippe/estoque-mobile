# Deploy — Backend no Railway

O código já está pronto pro deploy (settings de produção, `Procfile`, WhiteNoise
pros estáticos, health check em `/health/`). Só falta a parte que só você pode
fazer: criar a conta, conectar o repositório e colar os segredos no painel.

## 1. Criar o projeto no Railway

1. Entre em [railway.app](https://railway.app) e crie uma conta (dá pra usar login do GitHub).
2. **New Project → Deploy from GitHub repo** → selecione `matheuslippe/estoque-mobile`.
3. O Railway vai tentar buildar a raiz do repo — corrija isso: abra o serviço criado → **Settings → Root Directory** → digite `backend`.
4. Em **Settings → Deploy**, confirme que o *Builder* é Nixpacks (detecta Python sozinho a partir do `requirements.txt`).

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

O deploy roda automaticamente a cada push na `main`. Na primeira vez, o
`Procfile` cuida de tudo:

```
release: python manage.py migrate --noinput && python manage.py collectstatic --noinput
web: gunicorn core.wsgi --bind 0.0.0.0:$PORT --log-file -
```

Confirme que subiu: `https://<seu-dominio>/health/` deve responder `{"status": "ok"}`.

## 6. Criar o superusuário e o usuário do bot em produção

Instale a [Railway CLI](https://docs.railway.app/guides/cli), rode `railway login`
e `railway link` (aponte pro serviço do backend), depois:

```bash
railway run python manage.py createsuperuser
railway run python manage.py criar_usuario_bot
```

## 7. Bot do Telegram como um segundo serviço (opcional)

Se quiser o bot rodando 24/7 em produção (não só na sua máquina):

1. No mesmo projeto Railway, **New → GitHub Repo** de novo, mesmo repositório.
2. **Root Directory**: `backend`.
3. **Settings → Deploy → Custom Start Command**: `python manage.py run_telegram_bot`
4. Copie as mesmas variáveis de ambiente do serviço web (ou use "Add Reference" pra reusar).
5. Esse serviço não precisa de domínio público — é só um worker rodando em loop.

## 8. Apontar o app mobile pra API em produção

Em `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://<seu-dominio-railway>/api
```

## Custos

O Railway cobra por uso depois do trial inicial (não é mais "free tier"
permanente desde 2023) — acompanhe o consumo em **Usage** no dashboard. Pra um
projeto de portfólio com pouco tráfego costuma ficar bem barato, mas vale
configurar um limite de gasto em **Settings → Usage Limits**.
