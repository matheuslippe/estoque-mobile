# Deploy — App mobile via EAS Build

O `mobile/app.json` e `mobile/eas.json` já estão configurados (bundle
identifier, perfis de build). Falta a parte que só você pode fazer: criar a
conta Expo (e as contas Apple/Google se quiser publicar nas lojas de verdade)
e rodar os comandos.

## 1. Instalar a EAS CLI e logar

```bash
npm install -g eas-cli
eas login
```

Se ainda não tem conta Expo, `eas login` te leva pro cadastro.

## 2. Vincular o projeto

```bash
cd mobile
eas build:configure
```

Isso preenche `extra.eas.projectId` no `app.json` automaticamente — não
precisa mexer nisso à mão.

## 3. Apontar pra API em produção

Antes de buildar `preview`/`production`, troque
`https://SEU-DOMINIO-RAILWAY.up.railway.app/api` no `mobile/eas.json` pelo
domínio real do backend (depois de seguir o [docs/DEPLOY.md](DEPLOY.md)). Não
precisa disso pro perfil `development` — ele já aponta pro `localhost`, pra
testar contra o backend rodando na sua máquina.

## 4. Buildar

```bash
# APK direto, pra instalar manualmente num Android e testar (mais rapido, nao precisa de conta Google)
eas build --platform android --profile preview

# Build de producao pras lojas
eas build --platform android --profile production
eas build --platform ios --profile production   # precisa de conta Apple Developer Program (US$99/ano)
```

O build roda nos servidores da Expo — acompanha o progresso no link que
aparece no terminal (ou em [expo.dev](https://expo.dev)). No fim, o Android
gera um `.apk`/`.aab` pra baixar direto; o iOS precisa de um Apple Developer
Program ativo (a EAS CLI guia a criação do certificado/perfil de provisionamento
na primeira vez).

## 5. Distribuir

**Testar rápido (sem passar pelas lojas):**
- Android: baixe o `.apk` do build `preview` e instale direto no aparelho.
- iOS: sem conta Apple Developer, o único jeito de testar num iPhone físico é via **Expo Go** rodando `npx expo start` (Fase 3) — build nativo pra iOS sempre exige a conta paga, mesmo só pra instalar no seu próprio aparelho.

**Play Console (Internal Testing):**
```bash
eas submit --platform android
```
Precisa de conta no [Google Play Console](https://play.google.com/console) (taxa única de US$25) e do app já criado lá.

**TestFlight (iOS):**
```bash
eas submit --platform ios
```
Precisa de [Apple Developer Program](https://developer.apple.com/programs/) (US$99/ano).

## Notas

- `expo-secure-store` já está registrado como plugin no `app.json` — nenhuma configuração extra necessária.
- O ícone do app usa os assets já gerados pelo `create-expo-app` em `mobile/assets/` (adaptive icon do Android incluso).
- Se quiser atualizar o app sem passar por um build novo nas lojas (OTA), dá pra configurar `expo-updates` depois — não faz parte do MVP do roadmap.
