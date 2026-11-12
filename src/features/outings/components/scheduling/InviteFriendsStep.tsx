import React from 'react';
import { AppText, Checkbox, EmptyState, Loader } from '@/shared/components';
import { UserSearchResult, getUserDisplayName } from '@/features/profil';

export interface InviteFriendsStepProps {
  friends: UserSearchResult[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLoading: boolean;
  heading?: string;
  description?: string;
  /** Shown when there is no friend to pick. */
  emptyTitle?: string;
  emptyDescription?: string;
}

/** « Avec qui ? » — pick the friends to invite (wizard step, also used by the hub « Qui ? » panel). */
export const InviteFriendsStep: React.FC<InviteFriendsStepProps> = ({
  friends,
  selectedIds,
  onChange,
  isLoading,
  heading = 'Avec qui ?',
  description = 'Choisis les amis à inviter.',
  emptyTitle = "Pas encore d'amis",
  emptyDescription = 'Tu peux créer la sortie maintenant et inviter des amis plus tard.',
}) => {
  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((v) => v !== id));

  return (
    <>
      <AppText variant="h2">{heading}</AppText>
      <AppText color="secondary">{description}</AppText>
      {isLoading && friends.length === 0 ? <Loader message="Chargement des amis..." /> : null}
      {!isLoading && friends.length === 0 ? (
        <EmptyState icon="people-outline" title={emptyTitle} description={emptyDescription} />
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
