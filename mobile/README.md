# Estoque Mobile — App

App Expo/React Native (TypeScript) que consome a API Django em [`../backend`](../backend).

## Rodando localmente

```bash
cd mobile
npm install
cp .env.example .env   # ajuste EXPO_PUBLIC_API_URL
npx expo start
```

- **Expo Go (device fisico):** `EXPO_PUBLIC_API_URL` precisa ser o IP da maquina na rede local (ex.: `http://192.168.1.19:8000/api`), nao `localhost`. Confirme com `ipconfig`/`ifconfig` e que o backend esta rodando com `runserver 0.0.0.0:8000`.
- **Emulador Android:** use `http://10.0.2.2:8000/api` (o emulador nao enxerga `localhost` da maquina host).
- **iOS Simulator / web:** `http://127.0.0.1:8000/api` funciona normalmente.

O backend tambem precisa do IP usado aqui na lista `ALLOWED_HOSTS` do `backend/.env`.

## Estrutura

```
mobile/
├── App.tsx                 # providers (auth, safe area) + navegacao raiz
└── src/
    ├── api/                 # cliente axios (JWT + refresh automatico), chamadas por dominio
    ├── components/          # ItemCard, StatusBadge, NivelBar, modais
    ├── context/AuthContext  # estado de login/logout
    ├── navigation/          # stacks e tabs (React Navigation)
    ├── screens/             # Login, Home, ItemDetail, ShoppingList, History
    ├── theme/                # paleta claro/escuro (segue o tema do sistema)
    └── types/                # tipos espelhando os serializers do backend
```

## Telas

- **Estoque** (tab): lista de cards com nivel/status, busca e botao de novo item
- **Detalhe do item**: retirar/repor (1 un.), ajustar (nome/qtd/minima), excluir, e a analise de consumo (consumo/dia, dias restantes, grafico das ultimas retiradas)
- **Compras** (tab): itens em falta agrupados por categoria, com botao de reposicao em lote
- **Historico** (tab): movimentacoes com filtro por periodo (7/30/90 dias/tudo) e por item

## Autenticacao

JWT via `djangorestframework-simplejwt`. O token de acesso e enviado em todo request; um 401 dispara refresh automatico (fila unica, sem duplicar chamadas); se o refresh falhar o usuario volta pra tela de login. Os tokens ficam no `expo-secure-store` (no navegador, que nao tem SecureStore, cai em `localStorage` — so pra dev/preview).
