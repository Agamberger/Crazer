import React from 'react';
import { render } from '@testing-library/react-native';
import { ParticipantAvatars } from '../components/scheduling/ParticipantAvatars';
import { OutingMember } from '../types/scheduling';

const member = (userId: string, status: OutingMember['status']): OutingMember => ({
  userId,
  displayName: userId.toUpperCase(),
  avatarUrl: null,
  status,
  isOrganizer: false,
});

describe('ParticipantAvatars', () => {
  it('ne rend rien sans participant présent', () => {
    const { toJSON } = render(
      <ParticipantAvatars members={[member('a', 'invited'), member('b', 'declined')]} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('résume les participants et les réponses en attente', () => {
    const { getByText, getByTestId } = render(
      <ParticipantAvatars
        members={[member('a', 'accepted'), member('b', 'maybe'), member('c', 'invited')]}
      />,
    );
    expect(getByText('2 participants · 1 en attente')).toBeTruthy();
    expect(getByTestId('participant-avatars').props.accessibilityLabel).toBe(
      '2 participants · 1 en attente',
    );
  });

  it('utilise le singulier et omet l’attente quand tout le monde a répondu', () => {
    const { getByText } = render(<ParticipantAvatars members={[member('a', 'accepted')]} />);
    expect(getByText('1 participant')).toBeTruthy();
  });

  it('limite les avatars affichés et indique le reste', () => {
    const members = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => member(id, 'accepted'));
    const { getByText } = render(<ParticipantAvatars members={members} maxAvatars={4} />);
    expect(getByText('+2')).toBeTruthy();
    expect(getByText('6 participants')).toBeTruthy();
  });
});
