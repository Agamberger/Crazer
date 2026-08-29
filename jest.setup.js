/* eslint-disable @typescript-eslint/no-var-requires */
// Mock Expo Router
jest.mock('expo-router', () => {
  const React = require('react');
  const MockTabs = ({ children }: any) => React.createElement('Tabs', null, children);
  MockTabs.Screen = ({ name, options, listeners }: any) =>
    React.createElement('Tabs.Screen', { testID: `tab-screen-${name}`, name, options, listeners });

  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }),
    useNavigation: jest.fn(() => ({
      setOptions: jest.fn(),
      addListener: jest.fn(),
    })),
    useSearchParams: () => ({}),
    usePathname: () => '/',
    Link: 'Link',
    Tabs: MockTabs,
    Stack: 'Stack',
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest')
);

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => React.createElement(Text, props, props.name),
  };
});

// Polyfill WebSocket pour l'environnement de test Jest (Node < 22)
if (typeof global.WebSocket === 'undefined') {
  // @ts-ignore
  global.WebSocket = class WebSocket {
    constructor() {}
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

// Mock MapLibre React Native
jest.mock('@maplibre/maplibre-react-native', () => ({
  setAccessToken: jest.fn(),
  Map: 'MapView',
  MapView: 'MapView',
  Camera: 'Camera',
  Marker: 'MarkerView',
  MarkerView: 'MarkerView',
  PointAnnotation: 'PointAnnotation',
  ViewAnnotation: 'ViewAnnotation',
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props: any) => React.createElement(View, { testID: 'leaflet-webview', ...props }),
  };
});
