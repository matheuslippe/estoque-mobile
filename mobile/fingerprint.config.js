/** @type {import('@expo/fingerprint').Config} */
const config = {
  // O runtimeVersion usa a policy "fingerprint" (app.json). Por padrao o
  // fingerprint inclui o bloco de versoes do app.json no hash — ou seja, bumpar
  // "version" de 1.0.4 pra 1.0.5 mudaria o runtime e cortaria o OTA de todos os
  // aparelhos ja instalados, mesmo sem nada nativo ter mudado. Como a versao aqui
  // e so rotulo pro usuario, pulamos ela: o hash passa a refletir de fato o lado
  // nativo (dependencias, config plugins, autolinking), que e o unico motivo
  // legitimo pra exigir build novo.
  // ATENCAO: declarar sourceSkips SOBRESCREVE os defaults do @expo/fingerprint.
  // O "PackageJsonAndroidAndIosScriptsIfNotContainRun" vem ligado por padrao e
  // precisa ser repetido aqui: o `expo prebuild` (que a EAS roda antes de
  // calcular o fingerprint dela) reescreve os scripts android/ios do
  // package.json de "expo start --android" pra "expo run:android". Sem esse
  // skip, o hash local nunca bate com o da EAS e o build falha com
  // "Runtime version mismatch" — foi o que derrubou o build bef10566.
  sourceSkips: ["ExpoConfigVersions", "PackageJsonAndroidAndIosScriptsIfNotContainRun"],
};
module.exports = config;
