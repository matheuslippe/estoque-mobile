/** @type {import('@expo/fingerprint').Config} */
const config = {
  // O runtimeVersion usa a policy "fingerprint" (app.json). Por padrao o
  // fingerprint inclui o bloco de versoes do app.json no hash — ou seja, bumpar
  // "version" de 1.0.4 pra 1.0.5 mudaria o runtime e cortaria o OTA de todos os
  // aparelhos ja instalados, mesmo sem nada nativo ter mudado. Como a versao aqui
  // e so rotulo pro usuario, pulamos ela: o hash passa a refletir de fato o lado
  // nativo (dependencias, config plugins, autolinking), que e o unico motivo
  // legitimo pra exigir build novo.
  sourceSkips: ["ExpoConfigVersions"],
};
module.exports = config;
