# bots — Telegram + Gemini

Bot do Telegram que fala com a API Django (`api_client.py`), nunca com o banco
direto — a regra de negocio mora so na API, o bot e so mais um cliente dela
(igual o app mobile).

## Modulos

- `gemini.py` — interpreta texto/audio em JSON estruturado (SDK `google-genai`)
- `api_client.py` — cliente HTTP fino pra API (login JWT, refresh automatico em 401)
- `formatting.py` — Markdown do Telegram (escape, texto da lista de compras)
- `notify.py` — envia mensagens pro Telegram; usado pelo bot **e** pela API
  (quando uma retirada feita pelo app derruba um item pro nivel minimo)
- `telegram_bot.py` — handlers de texto/audio, busca de item por nome aproximado

## Configurar

No `backend/.env`:

```
TELEGRAM_BOT_TOKEN=        # crie um bot com o @BotFather no Telegram
TELEGRAM_CHAT_IDS=         # ids dos chats autorizados, separados por virgula (vazio = qualquer um)
GEMINI_API_KEY=            # https://aistudio.google.com/apikey
BOT_API_BASE_URL=http://127.0.0.1:8000/api
BOT_API_USERNAME=bot
BOT_API_PASSWORD=          # escolha uma senha
```

Depois, com o backend rodando:

```bash
python manage.py criar_usuario_bot   # cria o usuario 'bot' com a senha do .env
python manage.py run_telegram_bot    # inicia o polling (Ctrl+C pra parar)
```

## Endpoints de aviso

- Automatico: `POST /api/itens/{id}/movimentar/` dispara um aviso no Telegram
  quando a saida faz o item cruzar de "ok" pra "baixo"/"zerado" (so na
  transicao, pra nao repetir a cada nova saida enquanto ja esta em falta).
- Manual: `POST /api/lista-compras/notificar/` envia a lista de compras atual
  pro Telegram sob demanda — util pra chamar de um job agendado (cron) alem do
  gatilho automatico.
