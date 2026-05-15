/**
 * @format
 */

import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import {
  appIconPlatformNames,
  getAppIconVariant,
  getIcon,
  setAppIconVariant,
  type AppIconVariant,
} from './src/ReactNativeDynamicAppIcon';

const VARIANT_LABELS: Record<AppIconVariant, string> = {
  morango: 'Morango',
  sol: 'Sol',
  leao: 'Leão',
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [variant, setVariant] = useState<AppIconVariant | null>(null);
  const [nativeName, setNativeName] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const v = await getAppIconVariant();
    const n = await getIcon();
    setVariant(v);
    setNativeName(n);
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      setVariant(null);
      setNativeName('');
    });
  }, [refresh]);

  const onSelect = async (next: AppIconVariant) => {
    const run = async () => {
      setBusy(true);
      try {
        await setAppIconVariant(next);
        if (Platform.OS === 'android') {
          return;
        }
        await refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        Alert.alert('Could not change icon', message);
      } finally {
        setBusy(false);
      }
    };

    if (Platform.OS === 'android') {
      Alert.alert(
        'Change launcher icon',
        'The app will close and restart so the home screen icon can update.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => void run() },
        ],
      );
    } else {
      await run();
    }
  };

  const variants: AppIconVariant[] = ['morango', 'sol', 'leao'];

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        },
      ]}>
      <Text style={styles.title}>Ícone do app</Text>
      <Text style={styles.subtitle}>
        Variante: {variant ? VARIANT_LABELS[variant] : '…'} · Nativo{' '}
        <Text style={styles.mono}>{nativeName || '…'}</Text>
      </Text>
      <Text style={styles.hint}>
        Artes em <Text style={styles.mono}>AppIcons/</Text> (Morango, Sol, Leão).
        iOS: {appIconPlatformNames.morango.ios}, {appIconPlatformNames.sol.ios},{' '}
        {appIconPlatformNames.leao.ios}. Android:{' '}
        {appIconPlatformNames.morango.android},{' '}
        {appIconPlatformNames.sol.android},{' '}
        {appIconPlatformNames.leao.android}.
      </Text>

      {variants.map((key) => (
        <Pressable
          key={key}
          style={[styles.button, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={() => onSelect(key)}>
          <Text style={styles.buttonLabel}>Usar {VARIANT_LABELS[key]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 8,
    opacity: 0.85,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hint: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default App;
