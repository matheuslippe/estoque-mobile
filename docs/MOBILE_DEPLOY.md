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

## 6. Atualizacao OTA (`eas update`)

O `expo-updates` esta configurado desde 2026-08-26. Com ele, **mudanca so de
JS/TS/assets nao precisa de build novo nem reinstalar APK** — voce publica e o
celular baixa sozinho:

```bash
cd mobile
eas update --branch preview --message "descreva o que mudou"
```

O `--branch` tem que casar com o `channel` do perfil de build usado no APK que
esta no aparelho (`preview` → canal `preview`, ver `eas.json`).

Como o app se comporta:

1. No **cold start**, o `expo-updates` checa o servidor e baixa o bundle novo em
   background (padrao `checkAutomatically: ON_LOAD`). O app continua rodando a
   versao antiga nessa sessao — esse e o comportamento padrao e confunde muita
   gente.
2. Quando o download termina, o `UpdateBanner`
   (`mobile/src/components/UpdateBanner.tsx`) aparece no topo: "Nova versao
   pronta — toque pra atualizar". Tocar chama `Updates.reloadAsync()` e aplica na
   hora. Ignorar tambem funciona: entra sozinho no proximo cold start.

### Quando OTA NAO resolve (precisa de build novo)

O `runtimeVersion` usa a policy **`fingerprint`**: o Expo calcula um hash do lado
nativo do projeto (dependencias nativas, config plugins, `app.json`, `eas.json`).
Se esse hash mudar, o update publicado **nao alcanca** os APKs antigos — de
proposito, porque o bundle novo dependeria de codigo nativo que eles nao tem.
Muda o fingerprint: instalar/remover pacote com codigo nativo, mexer em
`plugins`/icone/permissoes do `app.json`, subir de SDK. Nesses casos: build novo.

Conferir o fingerprint atual (e comparar com o do build instalado):

```bash
cd mobile && npx expo-updates fingerprint:generate --platform android
```

### O primeiro build depois de ligar o OTA

Um APK **so recebe OTA se ele proprio foi buildado ja com o `expo-updates`
dentro**. O APK v1.0.3 (build `1ed1c64d`, de 25/08) e anterior a isso — logo,
ele **nunca vai receber update nenhum**, por mais `eas update` que se publique.
E preciso um build novo (`eas build --platform android --profile preview`) e
instalar ele na mao **uma ultima vez**. Dai pra frente, JS-only vai por OTA.

## Notas

- `expo-secure-store` já está registrado como plugin no `app.json` — nenhuma configuração extra necessária.
- O ícone do app usa os assets já gerados pelo `create-expo-app` em `mobile/assets/` (adaptive icon do Android incluso).
- OTA (`expo-updates`) esta **ligado** desde 2026-08-26 — ver a secao "6. Atualizacao OTA" acima.
