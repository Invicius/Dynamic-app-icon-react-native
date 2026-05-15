# Playbook: reimplementar ícone dinâmico em qualquer projeto React Native

Este documento existe para **humans ou agentes** replicarem a implementação nativa (sem pacote NPM de ícone) noutro repo. Siga a ordem; substitua placeholders antes de compilar.

## Constantes de projeto (preencher primeiro)

| Placeholder | Significado | Como descobrir |
|-------------|-------------|----------------|
| `{{IOS_APP_FOLDER}}` | Pasta do target iOS dentro de `ios/` | Ex.: `ios/MyApp/` |
| `{{XCODE_TARGET}}` | Nome do target da app | Xcode → target list |
| `{{ANDROID_PACKAGE}}` | Package Kotlin/Java | `android/app/src/main/java/...` e `namespace` / `applicationId` |
| `{{MAIN_ACTIVITY}}` | Nome da activity (classe) sem pacote | Normalmente `MainActivity` |
| `{{RN_MODULE_NAME}}` | Nome do componente RN | `AppDelegate` / `MainActivity.getMainComponentName()` |
| `N` | Número de variantes de ícone **além** do padrão | ≥ 0 |

**Invariantes (não mudar sem motivo):**

- Nome do módulo no bridge: **`ReactNativeDynamicAppIcon`** (Android `getName()`, iOS `@objc(ReactNativeDynamicAppIcon)`, JS `NativeModules.ReactNativeDynamicAppIcon`).
- String iOS para “ícone primário” no JS: **`DefaultIcon`** → no Swift vira `setAlternateIconName(nil)`.
- Nome do conjunto primário no Asset Catalog deve bater com **`CFBundlePrimaryIcon` → `CFBundleIconFiles`** (típico: `AppIcon`).

**Referência canónica no repo POC** (copiar e adaptar):

- `ios/DynamicAppIconPOC/ReactNativeDynamicAppIcon.swift`
- `ios/DynamicAppIconPOC/ReactNativeDynamicAppIcon.mm`
- `ios/DynamicAppIconPOC/Info.plist` (`CFBundleIcons`)
- `android/.../ReactNativeDynamicAppIconModule.kt`
- `android/.../ReactNativeDynamicAppIconPackage.kt`
- `android/app/src/main/AndroidManifest.xml` (padrão de aliases)
- `src/ReactNativeDynamicAppIcon.ts`
- `docs/dynamic-app-icon-complete-guide.md` (explicação humana longa)

---

## Tabela de variantes (definir uma vez; propagar em todo o código)

Crie uma linha por variante. **Padrão** = uma linha especial (primário).

| `key` (JS) | `iosAlternateKey` ( plist + asset set name ) | `androidSuffix` (classe = `.{{MAIN_ACTIVITY}}{{androidSuffix}}`) | `mipmap_base` (Android, sem extensão) |
|------------|-----------------------------------------------|-------------------------------------------------------------------|----------------------------------------|
| `primary`  | — (usa `DefaultIcon` no JS, `nil` nativo)      | `Default`                                                         | `ic_launcher` + `ic_launcher_round`    |
| `variantA` | `VariantAIcon`                               | `VariantA`                                                        | `ic_launcher_variant_a` + `_round`     |
| `variantB` | `VariantBIcon`                               | `VariantB`                                                        | `ic_launcher_variant_b` + `_round`     |

Regras:

- `iosAlternateKey` deve ser **igual** ao nome do `.appiconset` e à chave sob `CFBundleAlternateIcons`.
- Android: o file Kotlin constrói `{{ANDROID_PACKAGE}}.{{MAIN_ACTIVITY}}{{androidSuffix}}` — o sufixo deve ser **PascalCase/idêntico** ao usado no manifest (`MainActivityDefault`, `MainActivityVariantA`, …).
- Só pode haver **um** alias `LAUNCHER` com `android:enabled="true"` no manifest inicial.

---

## Ordem de execução (checklist)

### Fase A — iOS

1. Em `{{IOS_APP_FOLDER}}/Images.xcassets/`, garantir `AppIcon.appiconset` (primário) completo.
2. Para cada linha não-`primary`, criar `{{iosAlternateKey}}.appiconset` com todos os tamanhos.
3. Em `Info.plist`, adicionar `CFBundleIcons` → `CFBundlePrimaryIcon` apontando ao nome do `AppIcon`; `CFBundleAlternateIcons` com uma entrada por `iosAlternateKey` (estrutura igual ao POC).
4. Copiar `ReactNativeDynamicAppIcon.swift` e `ReactNativeDynamicAppIcon.mm` para `{{IOS_APP_FOLDER}}/`. Ajustar apenas se renomear módulo (não recomendado).
5. Xcode: adicionar ambos ao target `{{XCODE_TARGET}}` → Compile Sources.
6. Validar: build iOS sem erros.

### Fase B — Android

1. Remover `MAIN`/`LAUNCHER` da `<activity android:name=".{{MAIN_ACTIVITY}}" ...>` real (deixar só atributos necessários; manter `exported` conforme política RN/SDK).
2. Para cada linha da tabela de variantes (incluindo `primary`), criar `<activity-alias android:name=".{{MAIN_ACTIVITY}}{{androidSuffix}}" android:targetActivity=".{{MAIN_ACTIVITY}}" ...>` com:
   - `icon` / `roundIcon` → `@mipmap/...` conforme coluna `mipmap_base`
   - `intent-filter` MAIN + LAUNCHER
   - um alias `enabled="true"` (o padrão inicial), restantes `enabled="false"`
3. Em `mipmap-*`, colocar todos os PNGs referenciados no manifest.
4. Copiar `ReactNativeDynamicAppIconModule.kt` e `ReactNativeDynamicAppIconPackage.kt` para `android/app/src/main/java/{{ANDROID_PACKAGE_PATH}}/`.
5. Substituir package no topo dos `.kt` pelo pacote real.
6. Editar o módulo:
   - Lista `ICON_SUFFIXES` = todos os `androidSuffix` da tabela, **na mesma ordem** que deseja iterar (ordem não crítica desde que complete).
   - `normalizeAndroidSuffix`: mapear cada string que o JS pode enviar (`Default`, nomes das variantes, e opcionalmente `DefaultIcon` se quiser paridade com iOS) para o sufixo correcto; rejeitar ou mapear fallback com política explícita.
7. Em `MainApplication` (ou equivalente RN 0.73+), `add(ReactNativeDynamicAppIconPackage())` na lista de packages.
8. Validar: `./gradlew :app:assembleDebug` (ou build Android Studio).

### Fase C — JavaScript

1. Criar `src/ReactNativeDynamicAppIcon.ts` (ou caminho acordado):
   - `changeIcon`, `getIcon` delegam a `NativeModules.ReactNativeDynamicAppIcon`.
   - Objecto único `appIconPlatformNames` alinhado com a tabela (cada `key` → `{ ios, android }`).
   - `primary` usa `ios: 'DefaultIcon'` e `android: 'Default'` (ou os tokens que `normalizeAndroidSuffix` trata como padrão).
   - `setAppIconVariant` / `getAppIconVariant` usando `Platform.OS`.
2. UI: no Android, alertar antes de `changeIcon` (app vai fechar/reiniciar).
3. Jest: `jest.mock('.../ReactNativeDynamicAppIcon', () => ({ ... }))` — **não** mockar todo o `react-native`.

### Fase D — Verificação manual

- **iOS:** trocar ícone, voltar ao `DefaultIcon`; ícone na springboard muda sem reinstalar (sem novo alias).
- **Android:** só um ícone na gaveta por vez; após troca, launcher mostra o novo asset (pode exigir kill — já implementado no POC).
- Erros: ver secção “Falhas esperadas” abaixo.

---

## Contrato da API nativa (para implementação)

```text
changeIcon(iconName: string): Promise<void>
getIcon(): Promise<string>
```

- **iOS `getIcon`:** retorna `DefaultIcon` quando está no primário; caso contrário o nome do alternate (ex.: `VariantAIcon`).
- **Android `getIcon`:** retorna o **sufixo** do alias activo (ex.: `Default`, `VariantA`). O JS mapeia para `key` de produto.

---

## Falhas esperadas e causa provável

| Sintoma | Causa provável |
|---------|----------------|
| iOS erro ao mudar | Chave em `CFBundleAlternateIcons` ≠ nome do asset set ou string passada em `setAlternateIconName`. |
| iOS unsupported | `supportsAlternateIcons == false` no dispositivo/OS. |
| Android “módulo não faz nada” / alias errado | `ComponentName` não coincide com `{{ANDROID_PACKAGE}}.{{MAIN_ACTIVITY}}{{androidSuffix}}`. |
| Dois ícones na launcher | Dois aliases com `LAUNCHER` enabled. |
| JS “native module is null” | Target não incluiu os files nativos, ou nome do módulo diferente, ou não rebuild. |

---

## Extensão: mais variantes

1. Nova linha na **tabela de variantes**.
2. iOS: novo `.appiconset` + entrada em `CFBundleAlternateIcons`.
3. Android: novo alias + novos mipmaps + append em `ICON_SUFFIXES` + ramo em `normalizeAndroidSuffix`.
4. JS: nova chave em `appIconPlatformNames` + lógica em `getAppIconVariant`.

---

## O que **não** fazer

- Não instalar um pacote NPM só para isto a menos que seja decisão de equipa (este playbook evita dependência extra).
- Não deixar `MainActivity` **e** um alias com LAUNCHER ao mesmo tempo sem desenho claro (duplica entrada na gaveta).
- Não divergir nomes entre plist, assets iOS, strings JS e `setAlternateIconName` (iOS é sensível a isto).

---

## Resumo em uma frase para um agente

> Copiar os files nativos e o `src/ReactNativeDynamicAppIcon.ts` do POC, preencher a tabela de variantes, sincronizar manifest + mipmaps + `ICON_SUFFIXES` + `normalizeAndroidSuffix` + `Info.plist` + asset sets, registar Package e files Swift/.mm no Xcode, e expor `ReactNativeDynamicAppIcon` com `DefaultIcon`/`Default` para o primário.
