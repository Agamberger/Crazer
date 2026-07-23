// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({}),
  usePathname: () => '/',
  Link: 'Link',
  Tabs: 'Tabs',
  Stack: 'Stack',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest')
);

// Polyfill WebSocket pour l'environnement de test Jest (Node < 22)
if (typeof global.WebSocket === 'undefined') {
  // @ts-ignore
  global.WebSocket = class WebSocket {
    constructor() { }
    close() { }
    send() { }
    addEventListener() { }
    removeEventListener() { }
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
