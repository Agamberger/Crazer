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
