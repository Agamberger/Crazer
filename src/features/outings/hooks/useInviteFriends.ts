import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth';
import { UserSearchResult, useFriendsStore } from '@/features/profil';
import { OutingRow } from '@/shared/types';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { PanelFeedback } from '../types/hub';
import { OutingMember } from '../types/scheduling';

export interface UseInviteFriendsResult {
  /** Friends who can be invited: not members yet, or members who declined. */
  invitableFriends: UserSearchResult[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  isLoadingFriends: boolean;
  isInviting: boolean;
  feedback: PanelFeedback | null;
  /** Sends the invitations; resolves with `true` on success. */
  invite: () => Promise<boolean>;
}

/**
 * Selection and sending of new invitations for an existing outing (organizer).
 * @param outing the outing to invite to (`null` while loading).
 * @param members current participants, to leave out the friends already invited.
 */
export const useInviteFriends = (
  outing: Pick<OutingRow, 'id' | 'created_by'> | null,
  members: ReadonlyArray<OutingMember>,
): UseInviteFriendsResult => {
  const { user } = useAuth();
  const friends = useFriendsStore((state) => state.friends);
  const isLoadingFriends = useFriendsStore((state) => state.isLoading);
  const fetchFriendsList = useFriendsStore((state) => state.fetchFriendsList);
  const inviteFriends = useOutingSchedulingStore((state) => state.inviteFriends);
  const isInviting = useOutingSchedulingStore((state) => state.isSubmitting);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<PanelFeedback | null>(null);

  useEffect(() => {
    if (user?.id) void fetchFriendsList(user.id);
  }, [user?.id, fetchFriendsList]);

  const invitableFriends = useMemo(() => {
    const blockedIds = new Set(
      members.filter((member) => member.status !== 'declined').map((member) => member.userId),
    );
    return friends.filter(
      (friend) => friend.friendshipStatus === 'accepted' && !blockedIds.has(friend.id),
    );
  }, [friends, members]);

  const invite = async () => {
    if (!outing || selectedIds.length === 0) return false;
    try {
      const count = await inviteFriends(outing, selectedIds);
      setFeedback({
        tone: 'success',
        message: `Invitation envoyée à ${count} ami${count > 1 ? 's' : ''}.`,
      });
      setSelectedIds([]);
      return true;
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Impossible d’envoyer les invitations. Réessaie dans un instant.',
      });
      return false;
    }
  };

  return {
    invitableFriends,
    selectedIds,
    setSelectedIds: (ids) => {
      setFeedback(null);
      setSelectedIds(ids);
    },
    isLoadingFriends,
    isInviting,
    feedback,
    invite,
  };
};
