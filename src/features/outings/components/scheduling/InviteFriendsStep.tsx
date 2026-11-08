import React from 'react';
import { AppText, Checkbox, EmptyState, Loader } from '@/shared/components';
import { UserSearchResult, getUserDisplayName } from '@/features/profil';

export interface InviteFriendsStepProps {
  friends: UserSearchResult[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLoading: boolean;
}

/** « Avec qui ? » — pick the friends to invite. */
export const InviteFriendsStep: React.FC<InviteFriendsStepProps> = ({
  friends,
  selectedIds,
  onChange,
  isLoading,
}) => {
  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((v) => v !== id));

  return (
    <>
      <AppText variant="h2">Avec qui ?</AppText>
      <AppText color="secondary">Choisis les amis à inviter.</AppText>
      {isLoading && friends.length === 0 ? <Loader message="Chargement des amis..." /> : null}
      {!isLoading && friends.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Pas encore d'amis"
          description="Tu peux créer la sortie maintenant et inviter des amis plus tard."
        />
      ) : null}
      {friends.map((friend) => (
        <Checkbox
          key={friend.id}
          label={getUserDisplayName(friend)}
          checked={selectedIds.includes(friend.id)}
          onChange={(checked) => toggle(friend.id, checked)}
          testID={`checkbox-friend-${friend.id}`}
        />
      ))}
    </>
  );
};
