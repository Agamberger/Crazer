import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileHeaderCard } from '../components/ProfileHeaderCard';
import { InterestsSection } from '../components/InterestsSection';
import { BadgesSection } from '../components/BadgesSection';
import { Badge } from '@/shared/types';

describe('Nouveaux composants UI de Profil', () => {
  describe('ProfileHeaderCard', () => {
    it('doit afficher les informations de profil et déclencher onOpenFriendsSearch', () => {
      const onOpenFriendsSearchMock = jest.fn();

      const { getByText, getByTestId } = render(
        <ProfileHeaderCard
          displayName="Alexandre Martin"
          displayEmail="alex@crazer.app"
          friendsCount={14}
          pendingRequestsCount={2}
          unlockedBadgesCount={1}
          totalBadgesCount={3}
          onOpenFriendsSearch={onOpenFriendsSearchMock}
        />
      );

      expect(getByText('Alexandre Martin')).toBeTruthy();
      expect(getByText('alex@crazer.app')).toBeTruthy();
      expect(getByText('AM')).toBeTruthy();
      expect(getByText('14')).toBeTruthy();
      expect(getByText('1/3')).toBeTruthy();

      const searchBtn = getByTestId('btn-open-search-friends');
      fireEvent.press(searchBtn);
      expect(onOpenFriendsSearchMock).toHaveBeenCalled();
    });
  });

  describe('InterestsSection', () => {
    it('doit afficher les centres d intérêt de l utilisateur', () => {
      const interests = ['Burgers', 'Bowling', 'Concerts'];
      const { getByText } = render(<InterestsSection interests={interests} />);

      expect(getByText('🍔 Burgers')).toBeTruthy();
      expect(getByText('🎳 Bowling')).toBeTruthy();
      expect(getByText('🎵 Concerts')).toBeTruthy();
    });
  });

  describe('BadgesSection', () => {
    it('doit afficher les badges débloqués et verrouillés', () => {
      const mockBadges: Badge[] = [
        {
          id: 'b-1',
          title: 'Premier Pas',
          description: 'Créer votre première sortie',
          iconName: 'trophy',
          unlockedAt: '2026-08-01',
        },
        {
          id: 'b-2',
          title: 'Super Hôte',
          description: 'Organiser 10 sorties',
          iconName: 'star',
        },
      ];

      const { getByText } = render(<BadgesSection badges={mockBadges} />);

      expect(getByText('Premier Pas')).toBeTruthy();
      expect(getByText('Débloqué')).toBeTruthy();
      expect(getByText('Super Hôte')).toBeTruthy();
      expect(getByText('Verrouillé')).toBeTruthy();
    });
  });
});
