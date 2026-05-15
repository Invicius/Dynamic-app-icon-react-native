/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/ReactNativeDynamicAppIcon', () => ({
  appIconPlatformNames: {
    morango: { ios: 'DefaultIcon', android: 'Default' },
    sol: { ios: 'SolIcon', android: 'Sol' },
    leao: { ios: 'LeaoIcon', android: 'Leao' },
  },
  getAppIconVariant: jest.fn().mockResolvedValue('morango'),
  getIcon: jest.fn().mockResolvedValue('DefaultIcon'),
  setAppIconVariant: jest.fn().mockResolvedValue(undefined),
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
