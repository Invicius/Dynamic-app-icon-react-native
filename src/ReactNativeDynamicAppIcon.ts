import { NativeModules, Platform } from 'react-native';

type NativeModuleType = {
  changeIcon: (iconName: string) => Promise<void>;
  getIcon: () => Promise<string>;
};

const NativeModule = NativeModules.ReactNativeDynamicAppIcon as
  | NativeModuleType
  | undefined;

function getModule(): NativeModuleType {
  if (!NativeModule) {
    throw new Error(
      'ReactNativeDynamicAppIcon native module is not linked. Rebuild the iOS/Android app.',
    );
  }
  return NativeModule;
}

/**
 * iOS: `DefaultIcon` (Morango / primary), `SolIcon`, `LeaoIcon` — must match
 * `CFBundleAlternateIcons` / asset sets. Android: `Default`, `Sol`, `Leao`.
 */
export async function changeIcon(iconName: string): Promise<void> {
  return getModule().changeIcon(iconName);
}

/** Current icon name (platform-specific). */
export async function getIcon(): Promise<string> {
  return getModule().getIcon();
}

/** Map product variants → native names (single source of truth). */
export const appIconPlatformNames = {
  morango: { ios: 'DefaultIcon', android: 'Default' },
  sol: { ios: 'SolIcon', android: 'Sol' },
  leao: { ios: 'LeaoIcon', android: 'Leao' },
} as const;

export type AppIconVariant = keyof typeof appIconPlatformNames;

export async function setAppIconVariant(variant: AppIconVariant): Promise<void> {
  const { ios, android } = appIconPlatformNames[variant];
  const name = Platform.OS === 'ios' ? ios : android;
  return changeIcon(name);
}

export async function getAppIconVariant(): Promise<AppIconVariant> {
  const current = await getIcon();
  if (Platform.OS === 'ios') {
    if (current === appIconPlatformNames.sol.ios) {
      return 'sol';
    }
    if (current === appIconPlatformNames.leao.ios) {
      return 'leao';
    }
    return 'morango';
  }
  if (current === appIconPlatformNames.sol.android) {
    return 'sol';
  }
  if (current === appIconPlatformNames.leao.android) {
    return 'leao';
  }
  return 'morango';
}
