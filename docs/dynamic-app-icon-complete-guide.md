# Guia completo: ícone de app dinâmico em React Native (implementação nativa, sem pacote NPM)

Este documento descreve como replicar em um **projeto novo** o padrão usado neste repositório: módulo nativo próprio **`ReactNativeDynamicAppIcon`**, sem `yarn add` de biblioteca de terceiros para troca de ícone.

## Visão geral

| Plataforma | Mecanismo | Observação |
|------------|-----------|------------|
| **iOS** | `UIApplication.setAlternateIconName` + `Info.plist` (`CFBundleIcons` / `CFBundleAlternateIcons`) + conjuntos no Asset Catalog | O ícone “padrão” visível na instalação é o `CFBundlePrimaryIcon` (ex.: conjunto `AppIcon`). No JavaScript, para voltar ao padrão usa-se o nome convencionado **`DefaultIcon`**, que no nativo vira `setAlternateIconName(nil)`. |
| **Android** | Vários `activity-alias` com `LAUNCHER`, cada um com `icon`/`roundIcon` diferentes; em runtime habilita-se só o alias desejado com `PackageManager.setComponentEnabledSetting`; em seguida `finish()` + `Process.killProcess` para o launcher refletir | Os ícones ficam em `@mipmap/...`. Costuma ser necessário avisar o utilizador que o app vai fechar. |

**Nome do módulo no bridge:** `ReactNativeDynamicAppIcon` (tem de coincidir com `getName()` no Android e `@objc(ReactNativeDynamicAppIcon)` no iOS).

**Variantes neste POC:** Morango (padrão), Sol, Leão — com artes em `AppIcons/<nome>/` e integração em iOS/Android conforme abaixo.

---

## File structure (referência)

```
src/ReactNativeDynamicAppIcon.ts          # API JS + mapa único ios/android

ios/<NomeDoApp>/
  ReactNativeDynamicAppIcon.swift
  ReactNativeDynamicAppIcon.mm
  Info.plist                              # CFBundleIcons
  Images.xcassets/
    AppIcon.appiconset/                   # ícone primário (Morango neste repo)
    SolIcon.appiconset/
    LeaoIcon.appiconset/

android/app/src/main/java/<seu/pacote>/
  ReactNativeDynamicAppIconModule.kt
  ReactNativeDynamicAppIconPackage.kt
  MainApplication.kt                      # add(ReactNativeDynamicAppIconPackage())

android/app/src/main/AndroidManifest.xml
android/app/src/main/res/mipmap-*/        # ic_launcher, ic_launcher_round, ic_launcher_sol*, ic_launcher_leao*
```

Incluir **Swift + `.mm`** no target da app no Xcode (Build Phases → Compile Sources).

---

## iOS — passos

### 1. Asset Catalog

- **`AppIcon.appiconset`:** ícone principal; o nome do conjunto deve corresponder a `CFBundlePrimaryIcon` → `CFBundleIconFiles` (neste projeto: `AppIcon`).
- **Alternativas:** um conjunto por variante, com nome **idêntico** à chave em `CFBundleAlternateIcons` (ex.: `SolIcon.appiconset`, `LeaoIcon.appiconset`).
- Preencher todos os slots de tamanho/idioma que o Xcode exigir para ícones de app.

### 2. Info.plist — `CFBundleIcons`

- `CFBundlePrimaryIcon` → `CFBundleIconFiles` → array com o nome base do asset primário (ex.: `AppIcon`).
- `CFBundleAlternateIcons` → um dicionário por alternativa; cada um com:
  - `CFBundleIconFiles` → array com o nome do conjunto (sem `@2x`)
  - `UIPrerenderedIcon` → `false` (padrão usual)

Exemplo de referência no repo: `ios/DynamicAppIconPOC/Info.plist` (chaves `SolIcon`, `LeaoIcon`).

### 3. Módulo Swift — `ReactNativeDynamicAppIcon.swift`

Comportamento:

- Constante interna **`defaultIconName = "DefaultIcon"`** — usada pelo JS para “reset” ao ícone primário.
- **`changeIcon`:** executa na main queue; verifica `UIApplication.shared.supportsAlternateIcons`; se o nome for vazio ou `DefaultIcon`, usa `alternateName = nil`; se já está ativo, resolve; senão chama `setAlternateIconName` e trata erros na completion.
- **`getIcon`:** se `alternateIconName == nil`, devolve `DefaultIcon`; caso contrário devolve o nome do alternate atual.
- **`requiresMainQueueSetup()`** → `true`.

File: `ios/DynamicAppIconPOC/ReactNativeDynamicAppIcon.swift`.

### 4. Stub Objective-C++ — `ReactNativeDynamicAppIcon.mm`

Expõe o módulo ao React Native com `RCT_EXTERN_MODULE` e `RCT_EXTERN_METHOD` para `changeIcon` e `getIcon`.

File: `ios/DynamicAppIconPOC/ReactNativeDynamicAppIcon.mm`.

### 5. Xcode

- Adicionar os dois files ao target.
- Clean + rebuild após alterar assets ou plist.

---

## Android — passos

### 1. `MainActivity` sem entrada LAUNCHER

A activity real (ex.: `.MainActivity`) permanece com as `configChanges` habituais do RN, mas **sem** `intent-filter` `MAIN` + `LAUNCHER`. Apenas os aliases aparecem na gaveta.

Referência: `android/app/src/main/AndroidManifest.xml`.

### 2. Um `activity-alias` por variante

Para cada ícone na launcher:

- `android:name=".MainActivity<Sufixo>"` — ex.: `.MainActivityDefault`, `.MainActivitySol`, `.MainActivityLeao`.
- `android:targetActivity=".MainActivity"` (ajustar se o nome da activity for outro).
- `android:icon` e `android:roundIcon` para mipmaps distintos.
- `intent-filter`: `MAIN` + `LAUNCHER`.
- **Exatamente um** alias com `android:enabled="true"` no estado inicial; os restantes `false`.

O módulo Kotlin assume o nome de classe:

`ComponentName(packageName, "$packageName.MainActivity$suffix")`

(ex.: `com.dynamicappiconpoc.MainActivitySol`).

### 3. Recursos (mipmap)

Por densidade (`mipmap-mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`):

- Padrão: `ic_launcher.png`, `ic_launcher_round.png`
- Sol: `ic_launcher_sol.png`, `ic_launcher_sol_round.png`
- Leão: `ic_launcher_leao.png`, `ic_launcher_leao_round.png`

Os nomes em `@mipmap/...` no manifest têm de existir em `res/`.

### 4. `ReactNativeDynamicAppIconModule.kt`

- `getName()` → `"ReactNativeDynamicAppIcon"`.
- **`changeIcon`:** valida `currentActivity`; `normalizeAndroidSuffix(iconName)`; se já é o sufixo ativo, resolve; para cada entrada em `ICON_SUFFIXES`, `setComponentEnabledSetting` no `ComponentName` correspondente; `promise.resolve(null)`; na UI thread agenda reinício após `onActivityDestroyed` e chama `activity.finish()`.
- **`getIcon`:** lê qual alias está `ENABLED` e devolve o sufixo (`Default`, `Sol`, `Leao`, …).
- **`ICON_SUFFIXES`:** lista completa de sufixos — **obrigatoriamente alinhada** com os aliases do manifest.
- **`normalizeAndroidSuffix`:** mapeia strings recebidas do JS para sufixos conhecidos; neste POC, valores desconhecidos caem no `Default`.

File: `android/app/src/main/java/com/dynamicappiconpoc/ReactNativeDynamicAppIconModule.kt`.

### 5. `ReactNativeDynamicAppIconPackage.kt`

Implementa `ReactPackage` e regista `ReactNativeDynamicAppIconModule` em `createNativeModules`.

### 6. `MainApplication.kt`

```kotlin
PackageList(this).packages.apply {
  add(ReactNativeDynamicAppIconPackage())
}
```

Ajustar o pacote/imports ao teu `applicationId` e estrutura de pastas.

### 7. Reinício do processo

Após a troca, regista-se `Application.ActivityLifecycleCallbacks`; quando a activity que iniciou a troca é destruída, remove-se o callback e executa-se `Process.killProcess(Process.myPid())`. O utilizador reabre o app pelo ícone que o launcher mostra.

Na UI React Native, recomenda-se um **Alert** antes da troca no Android (como em `App.tsx`).

---

## JavaScript — `src/ReactNativeDynamicAppIcon.ts`

- Obtém `NativeModules.ReactNativeDynamicAppIcon` com métodos `changeIcon` e `getIcon`.
- **`appIconPlatformNames`:** mapa único de variantes de produto → `{ ios, android }`.
- **`setAppIconVariant` / `getAppIconVariant`:** abstraem `Platform.OS`.

Neste repositório:

| Variante (JS) | iOS (`changeIcon` / `getIcon`) | Android (`changeIcon` / `getIcon`) |
|---------------|-------------------------------|-------------------------------------|
| `morango`     | `DefaultIcon`                 | `Default`                           |
| `sol`         | `SolIcon`                     | `Sol`                               |
| `leao`        | `LeaoIcon`                    | `Leao`                              |

Para adicionar uma variante nova: atualizar **Info.plist + asset sets iOS + aliases Android + mipmaps + `ICON_SUFFIXES` + `normalizeAndroidSuffix` + `appIconPlatformNames`**.

---

## Testes (Jest)

Mockar o módulo local, **não** substituir o `react-native` inteiro (evita falhas com TurboModules como `DevMenu` no ambiente de teste).

Ver `__tests__/App.test.tsx`.

---

## Checklist — projeto novo

- [ ] iOS: `AppIcon` + alternates no Asset Catalog; `CFBundleIcons` no `Info.plist`.
- [ ] iOS: `ReactNativeDynamicAppIcon.swift` + `.mm` no target; rebuild.
- [ ] Android: `MainActivity` sem LAUNCHER; um alias enabled; restantes disabled.
- [ ] Android: mipmaps por variante; nomes coerentes com o manifest.
- [ ] Android: Module + Package + registo em `MainApplication`.
- [ ] JS: `src/ReactNativeDynamicAppIcon.ts` + UI/fluxo com alerta no Android.
- [ ] Validar em dispositivo iOS quando relevante.

---

## Problemas comuns

- **iOS — falha ao mudar ícone:** chave em `CFBundleAlternateIcons` inexistente ou nome do asset ≠ string passada a `setAlternateIconName`.
- **iOS — `UNSUPPORTED`:** dispositivo/OS sem alternate icons.
- **Android — alias inválido:** classe `.MainActivity<Sufixo>` não declarada ou `packageName` incorreto no `ComponentName`.
- **JS — módulo não encontrado:** nome do nativo diferente de `ReactNativeDynamicAppIcon` ou app não recompilado após adicionar código nativo.
- **Android — dois ícones na gaveta:** mais de um alias com `LAUNCHER` enabled em simultâneo.

---

## Dependências NPM

Nenhuma biblioteca extra dedicada à troca de ícone; usa-se apenas APIs do React Native (`NativeModules`, `Platform`). O resto é código nativo no target iOS/Android.

---

## Documentos relacionados neste repo

- `docs/dynamic-app-icon-implementation.md` — guia de referência alinhado ao pacote `@computools/react-native-dynamic-app-icon` e padrões gerais iOS/Android.

Este documento descreve também **a implementação nativa inlined** efectiva neste POC (Morango / Sol / Leão, sem dependência NPM de ícone).
