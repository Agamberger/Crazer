# 📅 Feature: Outings (Sorties)

Outings between friends in **Crazer**: creation, invitations, availabilities, outing type and guided questions, activity votes, steps and planning of the day. Data lives in Supabase (RPCs + RLS, realtime).

---

## 🧭 Journey

An outing is created **as soon as it has a name**, then completed from a single screen, the **outing hub**. Creation and edition are the same screen.

| Route | Screen | Purpose |
| :--- | :--- | :--- |
| `/outing/create` (modal) | `CreateOutingScreen` | « On sort ! »: name only, then **replaces** itself with the hub. |
| `/outing/[id]` | `OutingHub` | Name at the top, then the rows « Quand ? », « Qui ? », « Quoi ? », each with a visual summary; each row opens a full-page panel sliding in from the right (`AppModal` `slideOver`). |
| `/outing/[id]/join` (modal) | `JoinOutingFlow` | Invitee: accept or decline, days, slots (`respond_to_outing_invitation`), then the hub. |
| `/outing/[id]/planning` | `OutingPlanning` | Planning of the day; closing it goes back to the hub. |

Entry points:
- « Organiser une sortie » (home quick action, home empty state, Sorties tab) and the map (« + Créer une nouvelle sortie », with a place) open `/outing/create`.
- An outing card (home « Prochaine sortie » / « À venir », Sorties tab list) opens its hub. « Voir tout » opens the Sorties tab list.
- A pending invitation (home, Sorties tab, `PendingInvitationsSection`) opens the join flow; when the outing has no candidate day yet, « Rejoindre » accepts directly (days and slots are given later in the hub). A pending invitee can also answer from the hub (« Qui ? » › « Ma réponse »).
- « Choisir un lieu sur la carte » (hub › « Quoi ? » › Programme) opens the map in **step** mode; after « Ajouter à la sortie », the app goes back to the hub (`router.navigate`).
- « 🗺️ Chercher sur la carte » (hub › « Quoi ? » › Activités) opens the map in **activity** mode (`useMapStore.setTargetOutingId(id, 'activity')`): the banner reads « 💡 Proposer une activité pour … », the place card button « + Proposer comme activité » saves the place (`ensurePlaceExists`) and opens `ProposePlaceActivityModal` (title prefilled, 📍 place, day, note); once proposed, the app goes back to the hub.

### Creation (`CreateOutingScreen`, `useCreateOuting`)
- Name prefilled by `?placeName=` (map) or `?title=`.
- Calls `create_outing_with_invites` with no day, type nor invitee (an undated `draft` outing; the organizer is an `accepted` participant).
- From a place, the place becomes a `pending` 60 min step dated now (the trigger `outings_align_planned_outings` moves it once a date is chosen). If the step cannot be added, the outing is still created and a warning toast says so. The place must already be saved (`ensurePlaceExists`, done by the map).

### Hub (`OutingHub`, `useOutingHub`)
- The organizer renames the outing in place (`OutingHubTitle`, saved on blur); members see the name.
- `useOutingHub(outingId)` combines `useOutingScheduling` (realtime on participants, candidate days and availabilities) with the answers and activities, reloaded each time the hub gets the focus (`useFocusEffect`). While the hub is open, its outing is **selected** in `useOutingsStore` (that store keeps the steps of the selected outing only, and the planning refreshes them for it).
- Panels show the result of their own actions inline (`PanelFeedback` + `InlineAlert`), because a toast is drawn under an open modal. Screens opened from a panel (tie-break, planning, map, new outing) close the panel first, because a screen pushed under a modal stays hidden.
- Known limit: errors reported by toasts from reused hooks (vote, proposal, type change) are drawn under the modal.

### « Quand ? » (`WhenPanel`, `useWhenPanel`)
Summary (`summarizeWhen`): the chosen date (« sam. 15 nov. · 14:00 »), else the candidate days as chips (3 max + « +n ») and how many days have a common slot, else « Aucun jour proposé ». Saved with « Enregistrer »:
- **Jours possibles**: the organizer picks them in a month calendar while no day is chosen (`set_outing_days` through `useOutingSchedulingStore.saveDays`); an added day is ticked in the organizer's own slots with the default 18:00–23:00. Others see the days as chips.
- **Mes dispos** (`MySlotsEditor`): for each day, available or not, and the slot (`set_my_outing_slots` through `saveMySlots`). Organizer and members who said yes / « peut-être » only; a pending invitee is asked to answer the invitation first.
- **Créneau commun par jour**: live recap (`computeDayRecaps`, `DayRecapRow`). Dates are never voted: the app intersects the slots of `accepted` / `maybe` members per day. The organizer taps « Choisir ce jour » (`useDayChoice`, with « Continuer sans tout le monde ? » while invitees have not answered): `start_date` = day + common slot start, status `planned`. « Changer de jour » clears the date (status back to `draft`) so that the days can be edited again — the database refuses any change of the days while a date is chosen, and the removal of a day whose activity is placed in the planning.
- Drafts follow the saved data until the user edits them (so data loaded after the panel opened is not mistaken for « no day »), and are reset each time the panel opens. A failed « Choisir ce jour » is reported in the panel.

### « Qui ? » (`WhoPanel`)
Summary: `ParticipantAvatars` (« 1 participant · 1 en attente »).
- **Ma réponse** (members only, `useMyAnswer`, `MyAnswerSection`): « Je viens » / « Peut-être » / « Je ne viens pas » through `respond_to_outing_invitation`. The member's current slots are sent again with the answer, because the RPC replaces them (« Je ne viens pas » deletes them).
- Members with their answer (`MembersList`).
- **Inviter des amis** (organizer, `useInviteFriends`): accepted friends who are not members yet, or who declined, through `invite_to_outing` (`useOutingSchedulingStore.inviteFriends`).

### « Quoi ? » (`WhatPanel`)
Summary (`summarizeWhat`): type, « n/m ont répondu aux questions » (attendees who answered for the type), activities placed in the programme (« 📅 Karting, Restaurant ») and the size of the pool (« 2 activités dans la pool »). One scrolling page with four sections (`components/hub/what/`):
- **Type et questions** (`WhatQuestionsSection`, `useOutingQuestions`): see below. `submit` resolves with `'saved' | 'invalid' | 'failed'`.
- **Détails** (`WhatDetailsSection`): description and status, edited by the organizer (« Enregistrer les détails »), read by the members.
- **Activités** (`WhatActivitiesSection`, `useActivityVotes`, `ActivityVotesContent`): the pool, see below.
- **Programme** (`WhatStepsSection`): the steps timeline (`PlannedOutingsTimeline`, drop zones from `renderDropSlot`); a new or tapped step opens `PlannedOutingEditForm` in a nested `slideOver` page; « Planifier la journée » opens the planning.

---

## 🧭 Outing type and guided questions

1. **Type** (organizer only): `precise`, `one_day` or `holidays`, stored in `outings.outing_type` (`OutingTypeStep`). « Changer » resets it to `NULL`; a member sees a waiting message until it is chosen.
2. **Questions** per type, stored per member in `outing_answers` (`OutingQuestionsFields`):

| Type | Questions | Required to save |
| :--- | :--- | :--- |
| `precise` | Type d'activité · lieu · heure · manger avant ? (« Partant ? » is the invitation answer, not asked again) | nothing |
| `one_day` | Préférences de la journée (matin, après-midi, soirée, dehors, à l'abri, actif, tranquille) | at least one preference |
| `holidays` | Période · budget · envies | period |

Design choices (simplest option, easy to refine later):
- Answers are **per member**: « n / m ont répondu » counts answers saved by accepted or « peut-être » participants. A single-choice answer is cleared by pressing it again; a failed loading shows an error instead of a blank form. There is no aggregation of answers yet.
- « Heure » is a set of preset start times (`PREFERRED_TIME_OPTIONS`), « lieu » a free-text wish (≤ 200 characters). « Période » uses the shared `MultiDateCalendar` (first and last picked days). « Budget » is a 3-level scale.
- Answers of an unused type are kept in the row when the type is changed, but ignored by the UI.
- Saving is update-then-insert (`outingAnswersService.saveMyAnswers`) because `outing_id` / `user_id` are not updatable columns; a unique violation from a concurrent save is retried as an update.

## 🗳️ Activity pool, votes and programme

Data: `activityVotesService`, `useActivityVotesStore`, hook `useActivityVotes`; ranking in `utils/activityUtils.ts` (`rankActivities`); placement in `utils/programmeUtils.ts` and `hooks/useProgrammePlacement.ts`; drag-and-drop in `components/hub/what/ProgrammeDragContext.tsx` / `ProgrammeDragParts.tsx` (geometry in `utils/dragUtils.ts`).

- **The pool**: the activities proposed for the outing, with no day and no « retained » flag (`activity_pool` migration; the `day` / `chosen` columns stay in the database, unused, for already-installed app versions). Any attendee adds one with **« + Activité perso »** (`ProposeActivityForm` in a `slideOver` page: title ≤ 120, optional note ≤ 300) or **« 🗺️ Chercher sur la carte »** (a place picked on the map, see the entry points). The pool lists them best score first; the author or the organizer can delete a proposal.
- **Place of an activity**: only a proposal made from the map is linked to a place (`outing_activities.place_id`, stored through `ensurePlaceExists`; a Google place keeps only its place ID). The card shows « 📍 name · address » through `PlaceNameLabel` (carte): Google places are resolved live and credited « Google Maps ».
- **Votes**: « Partant » (2 points) or « Peut-être » (1 point); pressing the current vote again removes it. Results are live (`subscribeToActivities`). There is no « Retenir », tie-break nor draw any more: the group composes the programme directly.
- **To the programme** (any attendee, `place_outing_activity`): drag the « ⠿ » handle of a pool card onto a drop zone of « Programme » (zones appear between the steps while dragging; the page stops scrolling and scrolls by itself near its top / bottom edge; on web, text selection is off during the drag), or tap **« → Programme »** (after the last step). The new step (60 min, title / note / place of the activity) starts when the closest non-cancelled step above it ends (or at the next step's time when dropped first; on the outing date, else the first candidate day at 18:00, in an empty programme) (`placementAt`). The database moves the steps it overlaps, in cascade and only as much as needed: a step after a free gap keeps its time. The drag handle is injected by the hub (`renderDragHandle`), so `ActivityVotesContent` does not depend on the drag. A placed activity leaves the pool; deleting or cancelling its step puts it back.
- Known limit: errors from reused hooks (vote, proposal) are toasts drawn under the panel; a failed placement is shown in the panel.

## 🕒 Planning of the day

`OutingPlanning` (`useOutingPlanning`, `useOutingPlanningStore`, `outingPlanningService`, pure logic in `utils/planningUtils.ts`).

- The planning *is* the outing's `planned_outings` of the selected day (the « Programme » steps). An activity of the pool becomes a step through `place_outing_activity` (« Placer » lists the pool activities not placed yet); manual steps appear too; cancelled steps are left out. « ✨ Proposer des horaires » packs the day's steps only, it never adds pool activities.
- Suggested start: the earliest slot start at which more than half of the attendees of the day are available (`suggestStartTime`), 18:00 when nobody gave a slot.
- Who comes to each step (`computeAttendance`): present, arrives late, leaves early or not available, with a warning per step.
- The organizer orders (« ✨ Proposer des horaires », ↑ / ↓, « Durée », « Placer »); everything is saved in one transaction (`apply_outing_planning`).
- Late arrival: each attendee sets « Mes horaires ce jour-là » (`set_my_outing_availability`).
- Live through realtime on `planned_outings`, `outing_activities`, `outing_availabilities` and `outing_participants`.

## 📆 Outings without a date

`outings.start_date` is `NULL` until a day is chosen (candidate days are in `outing_days`).
- `OutingCard` and the home « À venir » list show « Date à définir »; `fetchMyOutings` lists undated outings first.
- Default date of a new step (`resolveStepBaseDate` / `useStepBaseDate`): the outing's `start_date`; for an undated outing, the first planned step's date, else the first candidate day at 18:00, else now.

## 👀 Outings the user does not attend

`useOutingSchedulingStore.nonAttendingOutingIds` lists the outings where the user's participation is `invited` or `declined`. `useVisibleOutings()` removes them from every « my outings » list (home, Sorties tab, map outing picker), so a pending invitation only appears in the invitations section.

---

## 🏗️ Structure

```
src/features/outings/
├── components/
│   ├── hub/                       # Outing hub (creation and edition)
│   │   ├── CreateOutingScreen.tsx # « On sort ! »: name only
│   │   ├── OutingHub.tsx, OutingHubTitle.tsx, HubSectionRow.tsx
│   │   ├── WhenSummaryView.tsx, WhatSummaryView.tsx
│   │   ├── WhenPanel.tsx, MySlotsEditor.tsx
│   │   ├── WhoPanel.tsx, MyAnswerSection.tsx
│   │   ├── WhatPanel.tsx
│   │   └── what/                  # WhatQuestionsSection, WhatActivitiesSection, WhatDetailsSection, WhatStepsSection,
│   │                              # ProgrammeDragContext / ProgrammeDragParts (pool → programme drag-and-drop)
│   ├── scheduling/                # Invitations, days, availabilities
│   │   ├── JoinOutingFlow.tsx     # Invitee: Rejoindre ? → Quel jour ? → Dispos → Qui vient ?
│   │   ├── OutingNameStep.tsx, OutingDaysStep.tsx, AvailabilityStep.tsx, InviteFriendsStep.tsx, WizardHeader.tsx
│   │   ├── DayRecapRow.tsx, MembersList.tsx, ParticipantAvatars.tsx
│   │   └── InvitationCard.tsx, PendingInvitationsSection.tsx
│   ├── questions/                 # OutingTypeStep, OutingQuestionsFields, Precise/OneDay/HolidaysQuestions
│   ├── activities/                # ActivityVotesContent (pool), ActivityVoteCard, ProposeActivityForm,
│   │                              # ProposePlaceActivityModal (map)
│   ├── planning/                  # OutingPlanning and its cards
│   ├── OutingCard.tsx, PlannedOutingCard.tsx, PlannedOutingsTimeline.tsx, TimelineStep.tsx
│   └── PlannedOutingEditForm.tsx, PlannedOutingFormActions.tsx, DurationField.tsx
├── hooks/                         # useOutingHub, useCreateOuting, useWhenPanel, useDayChoice, useMyAnswer,
│                                  # useInviteFriends, useOutingScheduling, useJoinOutingFlow, useOutingQuestions,
│                                  # useActivityVotes, useProgrammePlacement, useOutingPlanning, useOutingPlannedOutings, …
├── services/                      # outingService, outingSchedulingService, outingAnswersService,
│                                  # activityVotesService, outingPlanningService, stepBaseDate
├── store/                         # useOutingsStore, useOutingSchedulingStore, useOutingAnswersStore,
│                                  # useActivityVotesStore, useOutingPlanningStore
├── types/                         # hub, scheduling, questions, activities, planning
├── utils/                         # hubSummaryUtils, availabilityUtils, answersUtils, activityUtils, planningUtils,
│                                  # programmeUtils, dragUtils
├── constants.ts, questionOptions.ts
├── __tests__/
└── index.ts                       # Public API (barrel)
```

## 🧩 Shared UI kit

Screens use `@/shared/components`: `AppModal` (`slideOver` for the hub panels, `sheet`, `center`), `TextField`, `ChipGroup`, `MultiDateCalendar`, `TimeRangeField`, `Checkbox`, `InlineAlert`, `ConfirmDialog`, `Card`, `Button`. Deleting a step asks for a confirmation through `ConfirmDialog` (`confirm-delete-planned`).

## 🧪 Tests

```bash
npm test -- --testPathPattern="outings"
npm run db:test   # pgTAP: supabase/tests/database/*.test.sql (local stack)
```

Store actions `updateOuting`, `updatePlannedOuting` and `deletePlannedOuting` do not throw: they return `null` / `false` and keep the message in `error`. Scheduling, answers and votes actions throw on failure.
