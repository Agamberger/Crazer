import { DEFAULT_USER_DISPLAY_NAME, getUserDisplayName } from '@/features/profil/utils/userDisplay';

describe('getUserDisplayName', () => {
  it('privilégie le nom complet', () => {
    expect(getUserDisplayName({ fullName: '  Bob Martin ', email: 'bob@crazer.app' })).toBe(
      'Bob Martin',
    );
  });

  it("utilise la partie locale de l'email sans nom complet", () => {
    expect(getUserDisplayName({ fullName: null, email: 'bob@crazer.app' })).toBe('bob');
  });

  it("retombe sur un libellé générique quand l'email est masqué", () => {
    expect(getUserDisplayName({ fullName: '', email: null })).toBe(DEFAULT_USER_DISPLAY_NAME);
  });
});
