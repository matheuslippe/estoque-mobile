# Estoque Mobile

Reinício do Gestor de Estoque: backend em Django + Django REST Framework e app mobile em React Native (Expo) como cliente principal.

Migra a regra de negócio do projeto original (Python + Streamlit + SQLite + bot de Telegram com IA) para uma arquitetura multiplataforma, mantendo o projeto antigo intacto como referência funcional.

## Estrutura

```
estoque-mobile/
├── backend/
│   ├── core/            # settings do projeto Django
│   ├── estoque/         # app: Item, Categoria
│   ├── historico/       # app: Movimentacao
│   ├── shopping/        # app: lista de compras / reposição em lote
│   ├── bots/             # integração Telegram + Gemini
│   └── manage.py
├── mobile/               # app Expo/React Native
├── web/                  # dashboard Next.js (PWA)
└── docs/
    ├── ROADMAP.md        # plano completo do projeto, por fases
    ├── SPEC_BACKEND.md   # regras de negócio migradas do projeto original
    └── DEPLOY.md         # guia de deploy do backend (Railway)
```

Veja o plano completo em [docs/ROADMAP.md](docs/ROADMAP.md). Pra contexto
operacional (como rodar cada parte localmente, pegadinhas conhecidas, o que
ainda falta), veja [CLAUDE.md](CLAUDE.md) — é carregado automaticamente pelo
Claude Code em toda conversa nova sobre este repositório.

## Stack

- **Backend:** Django + Django REST Framework, JWT (`djangorestframework-simplejwt`), PostgreSQL
- **Mobile:** React Native com Expo
- **Web:** Next.js (App Router, TypeScript, Tailwind), instalável como PWA
- **Bot:** Telegram + Gemini (IA para comandos por texto/áudio)
