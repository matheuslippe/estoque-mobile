# Estoque Web

Dashboard Next.js (App Router, TypeScript, Tailwind) consumindo a mesma API
Django em [`../backend`](../backend) — visão gerencial com gráficos maiores
que o app mobile, e instalável como PWA.

## Rodando localmente

```bash
cd web
npm install
cp .env.example .env.local   # ajuste NEXT_PUBLIC_API_URL se precisar
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). O backend precisa estar
rodando (`python manage.py runserver`) e com CORS liberado — em `DEBUG=True`
isso já é automático (`CORS_ALLOW_ALL_ORIGINS`).

## Estrutura

```
web/
└── src/
    ├── app/
    │   ├── login/                # tela de login (fora do guard de auth)
    │   ├── (app)/                # rotas protegidas, com nav no layout
    │   │   ├── page.tsx           # dashboard: resumo, grafico "mais consumidos", grade de itens
    │   │   ├── itens/[id]/        # detalhe: retirar/repor/ajustar/excluir + analise de consumo
    │   │   ├── compras/           # lista de compras, reposicao em lote, exportar CSV, notificar Telegram
    │   │   └── historico/         # movimentacoes com filtro por periodo/item, exportar CSV
    │   ├── manifest.ts            # manifest do PWA
    │   ├── icon.tsx / apple-icon.tsx / pwa-icon-*  # icones gerados via next/og (sem assets externos)
    │   └── layout.tsx
    ├── components/                # StatusBadge, NivelBar, dialogs, registro do service worker
    ├── context/AuthContext.tsx    # login/logout, guarda as rotas do grupo (app)
    └── lib/                       # cliente axios (JWT + refresh automatico), chamadas por dominio
```

## PWA

`public/sw.js` cacheia só o app shell estatico — chamadas pra `/api/*` sempre
vao pra rede (estoque desatualizado em cache seria pior que um erro). Pra
instalar: abra no Chrome/Edge e use "Instalar app" na barra de endereco, ou
"Adicionar a tela de inicio" no Safari/iOS.

## Autenticacao

Mesmo esquema do mobile: JWT em `localStorage` (trade-off aceitavel pra um
projeto de portfolio — sem cookies httpOnly porque a API e um servidor
separado sem sessao Django por tras dela), com refresh automatico num 401 e
retorno pro login se o refresh falhar.

## Extras da Fase 6 nao feitos

Exportacao em PDF e multiplos usuarios/familias com permissoes por perfil
ficaram de fora — CSV cobre a exportacao de relatorios por enquanto, e o
backend nao tem conceito de "familia"/perfil ainda (so o usuario admin e o
usuario de servico do bot).
