import { OutingActivity } from '../types/activities';
import { MemberAnswers } from '../types/questions';
import { DayRecap, OutingMember } from '../types/scheduling';
import { EMPTY_ANSWERS } from '../utils/answersUtils';
import { formatOutingDate, summarizeWhat, summarizeWhen } from '../utils/hubSummaryUtils';

const member = (userId: string, status: OutingMember['status']): OutingMember => ({
  userId,
  displayName: userId,
  avatarUrl: null,
  status,
  isOrganizer: userId === 'alice',
});

const recap = (day: string, hasCommonSlot: boolean): DayRecap => ({
  day,
  availableMembers: [],
  commonSlot: hasCommonSlot ? { start: '18:00', end: '22:00' } : null,
});

const activity = (id: string, title: string): OutingActivity => ({
  id,
  outingId: 'o1',
  title,
  note: null,
  proposedBy: 'alice',
  place: null,
  createdAt: '2026-11-01T00:00:00Z',
});

describe('summarizeWhen', () => {
  it('shows the chosen date first', () => {
    const iso = '2026-11-14T13:00:00.000Z';
    expect(summarizeWhen({ start_date: iso }, [recap('2026-11-14', true)])).toEqual({
      kind: 'date',
      label: formatOutingDate(iso),
    });
  });

  it('lists the candidate days and counts the days with a common slot', () => {
    expect(
      summarizeWhen({ start_date: null }, [recap('2026-11-14', true), recap('2026-11-15', false)]),
    ).toEqual({ kind: 'days', days: ['2026-11-14', '2026-11-15'], daysWithCommonSlot: 1 });
  });

  it('is empty without date nor candidate day', () => {
    expect(summarizeWhen({ start_date: null }, [])).toEqual({ kind: 'empty' });
  });
});

describe('formatOutingDate', () => {
  it('joins the day and the time', () => {
    const label = formatOutingDate('2026-11-14T13:00:00.000Z');
    expect(label).toContain(' · ');
    expect(label).toMatch(/\d{2}:\d{2}$/);
  });
});

describe('summarizeWhat', () => {
  const members = [
    member('alice', 'accepted'),
    member('bob', 'maybe'),
    member('charlie', 'invited'),
  ];
  const answers: MemberAnswers[] = [
    { ...EMPTY_ANSWERS, userId: 'alice', dayPreferences: ['evening'] },
    { ...EMPTY_ANSWERS, userId: 'bob' },
    { ...EMPTY_ANSWERS, userId: 'charlie', dayPreferences: ['morning'] },
  ];

  it('counts the attendees who answered for the outing type', () => {
    const summary = summarizeWhat({ outing_type: 'one_day' }, members, answers, null, []);
    expect(summary).toEqual({
      outingType: 'one_day',
      answeredCount: 1,
      attendingCount: 2,
      poolCount: 0,
      placedTitles: [],
    });
  });

  it('counts nobody as answered while the type is not chosen', () => {
    expect(summarizeWhat({ outing_type: null }, members, answers, null, []).answeredCount).toBe(0);
  });

  it('counts the pool and lists the activities placed in the programme', () => {
    const summary = summarizeWhat(
      { outing_type: 'precise' },
      members,
      [],
      { activities: [activity('a1', 'Karting'), activity('a2', 'Bowling')], votes: [] },
      [
        { activity_id: 'a1', status: 'pending' },
        { activity_id: 'a2', status: 'cancelled' },
      ],
    );
    expect(summary.poolCount).toBe(1);
    expect(summary.placedTitles).toEqual(['Karting']);
  });
});
