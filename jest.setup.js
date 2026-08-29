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

// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: any) => React.createElement(View, null, children),
    SafeAreaView: ({ children, style, testID }: any) =>
      React.createElement(View, { style, testID }, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: jest.fn(),
      postMessage: jest.fn(),
      reload: jest.fn(),
    }));
    return React.createElement(View, { ...props, testID: props.testID || 'mock-webview' });
  });
  return {
    WebView,
    default: WebView,
  };
});

// Mock @maplibre/maplibre-react-native
jest.mock(
  '@maplibre/maplibre-react-native',
  () => {
    const React = require('react');
    const { View } = require('react-native');
    const MapView = ({ children, testID, ...props }: any) =>
      React.createElement(View, { ...props, testID: testID || 'maplibre-map-view' }, children);
    const Camera = (props: any) => React.createElement(View, { ...props, testID: 'maplibre-camera' });
    const MarkerView = ({ children, ...props }: any) =>
      React.createElement(View, { ...props, testID: 'maplibre-marker-view' }, children);

    return {
      __esModule: true,
      default: {
        MapView,
        Camera,
        MarkerView,
        setAccessToken: jest.fn(),
      },
      MapView,
      Camera,
      MarkerView,
      setAccessToken: jest.fn(),
    };
  },
  { virtual: true }
);

// Mock Expo vector icons
jest.mock(
  '@expo/vector-icons',
  () => {
    const React = require('react');
    const { Text } = require('react-native');
    return {
      Ionicons: (props: any) => React.createElement(Text, props, props.name || 'Ionicons'),
      Octicons: (props: any) => React.createElement(Text, props, props.name || 'Octicons'),
    };
  },
  { virtual: true }
);

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
