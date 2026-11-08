# 📅 Feature: Outings (Sorties)

Module de gestion des sorties entre amis pour l'application **Crazer**, connecté directement à la base de données Supabase.

---

## 🏗️ Structure du Module

```
src/features/outings/
├── components/
│   ├── DurationField.tsx          # Durée d'une étape : presets (ChipGroup) + saisie libre
│   ├── OutingCard.tsx             # Carte d'affichage d'une sortie (Card cliquable + Badge)
│   ├── OutingEditForm.tsx         # Formulaire d'édition d'une sortie avec timeline intégrée
│   ├── OutingEditScreen.tsx       # Onglet Sorties : chargement / introuvable / OutingEditForm
│   ├── PlannedOutingCard.tsx      # Carte d'affichage d'une étape planifiée (Planned Outing)
│   ├── PlannedOutingsTimeline.tsx  # Timeline chronologique + choix du type d'étape (AppModal sheet)
│   ├── PlannedOutingEditForm.tsx  # Formulaire d'édition d'une étape, suppression via ConfirmDialog
│   ├── PlannedOutingFormActions.tsx # Boutons Annuler / Enregistrer / Supprimer d'une étape
│   ├── PlannedOutingEditScreen.tsx # Onglet Sorties : chargement / introuvable / PlannedOutingEditForm
│   ├── TimelineStep.tsx           # Une étape de la timeline (nœud, segments, carte)
│   └── scheduling/                # Creation workflow (steps 1–3 of the outing journey)
│       ├── CreateOutingWizard.tsx # « On sort ! » → « Quel genre ? » → « Avec qui ? » → « Quand ? » → « Mes dispos »
│       ├── WizardHeader.tsx       # Back / close + « Étape x/n »
│       ├── OutingNameStep.tsx, OutingDaysStep.tsx, AvailabilityStep.tsx, InviteFriendsStep.tsx
│       ├── JoinOutingFlow.tsx     # Invitee: Rejoindre ? → Quel jour ? → Dispos → Qui vient ?
│       ├── AvailabilityRecap.tsx  # Live recap: common slot per day, pending answers, « Choisir ce jour »
│       ├── DayRecapRow.tsx, MembersList.tsx
│       ├── InvitationCard.tsx, PendingInvitationsSection.tsx
│       └── ParticipantAvatars.tsx # Avatars + « n participants · m en attente »
│   └── questions/                 # Outing type + guided questions (step 4)
│       ├── OutingQuestions.tsx    # Screen: type picker (organizer) then the form of the type
│       ├── OutingTypeStep.tsx     # « Quel genre de sortie ? » (precise / one_day / holidays)
│       ├── PreciseQuestions.tsx, OneDayQuestions.tsx, HolidaysQuestions.tsx
│       └── questionProps.ts       # Props shared by the three forms
├── constants.ts                   # DURATION_PRESETS, PLANNED_STATUS_OPTIONS (partagés avec carte), OUTING_STATUS_OPTIONS, OUTINGS_SCREEN_EDGES
├── hooks/
│   ├── useOutings.ts              # Chargement / création / mise à jour des sorties
│   ├── useOutingEditing.ts        # Onglet Sorties : sélection, chargement des étapes, enregistrer / supprimer / annuler
│   ├── useOutingPlannedOutings.ts # Étapes d'une sortie éditée (store ou props du parent, ajout depuis la carte)
│   ├── usePlannedOutingEditForm.ts # Champs, validation, enregistrement et suppression d'une étape
│   ├── useOutingScheduling.ts     # Days + availabilities + members of an outing, kept live (realtime)
│   ├── useCreateOutingWizard.ts   # Wizard validation and submission
│   ├── useJoinOutingFlow.ts       # Invitee flow (accept / decline, days, slots)
│   ├── useAvailabilityRecap.ts    # Recap + organizer's day choice (« continuer sans tout le monde ? »)
│   ├── useVisibleOutings.ts       # My outings minus pending invitations and declined outings
│   └── useOutingMembers.ts        # Participants of one outing (loaded once)
├── services/
│   ├── outingService.ts           # Requêtes Supabase (outings & planned_outings CRUD)
│   ├── outingSchedulingService.ts # Scheduling RPCs, days, availabilities, members, invitations, realtime
│   └── outingAnswersService.ts    # Guided answers (fetch / save) and outing type
├── store/
│   ├── useOutingsStore.ts         # Store Zustand réactif gérant l'état des sorties et étapes
│   ├── useOutingCreationStore.ts  # Wizard draft (title, days, slots, invitees, step)
│   ├── useOutingSchedulingStore.ts # Invitations, scheduling per outing, create / respond actions
│   └── useOutingAnswersStore.ts   # Guided answers per outing, save answers, set outing type
├── questionOptions.ts             # Labels / emojis of the types, activities, budgets, wishes…
├── types/questions.ts             # OutingAnswers, MemberAnswers, DayPreference, HolidayWish
├── types/scheduling.ts            # DayKey, AvailabilitySlot, OutingMember, DayRecap, OutingInvitation…
├── utils/answersUtils.ts          # Row ↔ answers mapping, period helpers, per-type validation
├── utils/availabilityUtils.ts     # Pure helpers: candidate days, common slot per day, payloads
├── __tests__/                     # Tests unitaires et composants
│   ├── DurationField.test.tsx
│   ├── OutingCard.test.tsx
│   ├── OutingEditForm.test.tsx
│   ├── PlannedOutingCard.test.tsx
│   ├── PlannedOutingsTimeline.test.tsx
│   ├── PlannedOutingEditForm.test.tsx
│   ├── PlannedOutingFormActions.test.tsx
│   ├── OutingEditScreen.test.tsx
│   ├── PlannedOutingEditScreen.test.tsx
│   ├── useOutingEditing.test.ts
│   ├── useOutingPlannedOutings.test.ts
│   ├── usePlannedOutingEditForm.test.ts
│   ├── constants.test.ts
│   ├── outingService.test.ts
│   └── useOutingsStore.test.ts
└── index.ts                       # Point d'entrée du module (barrel export)
```

---

## ⚡ Utilisation

### Récupération, Création et Modification de Sorties

```typescript
import { useOutingsStore, OutingEditForm } from '@/features/outings';

function MyScreen() {
  const outings = useOutingsStore((state) => state.outings);
  const selectedOutingId = useOutingsStore((state) => state.selectedOutingId);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const createOuting = useOutingsStore((state) => state.createOuting);
  const updateOuting = useOutingsStore((state) => state.updateOuting);
  const selectOuting = useOutingsStore((state) => state.selectOuting);

  useEffect(() => {
    fetchOutings();
  }, [fetchOutings]);

  const handleCreate = async () => {
    await createOuting();
  };

  const handleUpdate = async (id: string, updates: OutingUpdate) => {
    await updateOuting(id, updates);
  };
}
```

### Édition d'une Étape Planifiée (`PlannedOutingEditForm`)

L'accès à l'édition d'un `Planned Outing` se fait en cliquant sur une carte d'étape dans la timeline de la sortie :

```typescript
import { useOutingsStore, PlannedOutingEditForm } from '@/features/outings';

function EditPlannedOutingScreen() {
  const selectedPlannedOutingId = useOutingsStore((state) => state.selectedPlannedOutingId);
  const plannedOutings = useOutingsStore((state) => state.plannedOutings);
  const updatePlannedOuting = useOutingsStore((state) => state.updatePlannedOuting);
  const deletePlannedOuting = useOutingsStore((state) => state.deletePlannedOuting);
  const selectPlannedOuting = useOutingsStore((state) => state.selectPlannedOuting);

  const plannedOuting = plannedOutings.find((p) => p.id === selectedPlannedOutingId);

  if (!plannedOuting) return null;

  return (
    <PlannedOutingEditForm
      plannedOuting={plannedOuting}
      onSubmit={async (updates) => {
        await updatePlannedOuting(plannedOuting.id, updates);
        selectPlannedOuting(null);
      }}
      onDelete={async () => {
        await deletePlannedOuting(plannedOuting.id);
        selectPlannedOuting(null);
      }}
      onCancel={() => selectPlannedOuting(null)}
    />
  );
}
```

---

### Gestion des erreurs d'enregistrement
`updateOuting`, `updatePlannedOuting` et `deletePlannedOuting` ne lèvent pas d'exception : ils renvoient `null` / `false` et placent le message dans `error`. L'écran Sorties (`app/(tabs)/sorties.tsx`) ne referme donc le formulaire **que si l'opération a réussi**, pour ne pas perdre la saisie. Un échec de création de sortie ou de suppression d'étape est signalé par un toast.

## 🗓️ Outing creation workflow (invitations & availability)

Implements steps 1 to 3 of the « Parcours complet d'une sortie » note. Routes live in `app/outing/`:

| Route | Screen | Purpose |
| :--- | :--- | :--- |
| `/outing/create` (modal) | `CreateOutingWizard` | Name, candidate days (any future day, picked in a month calendar), my slot per day, friends to invite. Calls the `create_outing_with_invites` RPC (atomic). |
| `/outing/[id]/join` (modal) | `JoinOutingFlow` | Invitee accepts or declines, picks among the outing's candidate days (chips) and gives slots (`respond_to_outing_invitation`). |
| `/outing/[id]/recap` | `AvailabilityRecap` | Live recap per day: who is available and the common slot (`computeDayRecaps`). The organizer either picks a day (outing becomes `planned` with `start_date` = day + common slot start) or presses **« Continuer »** to open the outing in the Sorties tab edit form without any date. « Fermer » is secondary. |

- Entry points: « Organiser une sortie » (home, Sorties tab) opens the wizard; pending invitations are listed on the home screen and the Sorties tab (`PendingInvitationsSection`); the outing edit form has a « Participants & dispos » button.
- Dates are never voted: the app computes the intersection of the slots of `accepted` / `maybe` members per day. Invitees who have not answered are counted as pending, and the organizer can « continuer sans tout le monde ».
- `useOutingScheduling(outingId)` subscribes to `outing_participants` and `outing_availabilities` changes and refetches, so the recap updates live.
- `createOutingWithInvites` and `respondToInvitation` throw on failure (screens show a toast and keep the draft); fetch actions store the message in `error`.
- **From a place** (map « + sortie » → « + Créer une nouvelle sortie »): `/outing/create?placeId=…&placeName=…` opens the wizard with the title prefilled and the place announced as the first step. After the outing is created, the place is added as a `pending` 60 min step at the start of the organizer's first slot (`getFirstStepDate`). If that step cannot be added, the outing is still created and a warning toast says so. The place must already be saved (`ensurePlaceExists`, done by the map).
- **Outings the user does not attend**: `useOutingSchedulingStore.nonAttendingOutingIds` lists the outings where the user's participation is `invited` or `declined` (loaded with the invitations, updated by `respondToInvitation`). `useVisibleOutings()` removes them from every « my outings » list (home, Sorties tab, map outing picker), so a pending invitation only appears in the invitations section.
- `useOutingMembers(outing)` loads an outing's participants once (home « Prochaine sortie »), and `ParticipantAvatars` shows who is coming (« 3 participants · 1 en attente »).
- The legacy one-tap `createOuting` store action is no longer used by any screen.

## 🧪 Tests

Exécuter la suite de tests dédiée au module :
```bash
npm test -- --testPathPattern="outings"
```

---

## 🧩 Composants UI partagés

Les formulaires utilisent le kit `@/shared/components` : `TextField` (variante `title` et
`multiline`), `DateTimeField`, `ChipGroup`, `InlineAlert`, `ConfirmDialog`, `AppModal`.
La suppression d'une étape demande une confirmation via `ConfirmDialog`
(`testID` : `confirm-delete-planned`) au lieu de `Alert.alert`.

## Outings without a date

`outings.start_date` is nullable: the wizard creates an undated `draft` outing (candidate days are in `outing_days`).
- `OutingCard` and the Home « À venir » list show « Date à définir ».
- `OutingEditForm` offers « Définir la date » / « Retirer la date »; saving without a date is allowed.
- Default date of a new step (`resolveStepBaseDate` / `useStepBaseDate`, used by `createPlannedOuting` and the carte « Ajouter à une sortie » modal): the outing's `start_date`; for an undated outing, the first planned step's date, else the first candidate day at 18:00, else now. The DB requires `scheduled_for` but only checks it against `start_date` when one exists. The wizard's first step (opened from a place) uses the first candidate day at the start of the organizer's slot.
- `fetchMyOutings` orders by `start_date` descending with undated outings first.

---

## 🧭 Outing type and guided questions (step 4)

Route `app/outing/[id]/questions.tsx` renders `OutingQuestions`. Journey: recap → **« Continuer »** (organizer) → questions → « Enregistrer mes réponses » → Sorties tab. Members reach the same screen from the recap through **« Répondre aux questions »**, shown once the organizer has chosen the type.

1. **Type** (organizer only): `precise`, `one_day` or `holidays`, stored in `outings.outing_type`. It is chosen at creation, as step 2 of the wizard (name → type → who comes → days → my availability → recap → questions → steps), and saved atomically with the outing by `create_outing_with_invites` (`p_outing_type`); the questions screen only offers the picker again if the organizer resets the type. « Changer le type de sortie » resets it to `NULL`. A member opening the screen before the choice sees a waiting message.
2. **Questions** per type, stored per member in `outing_answers`:

| Type | Questions | Required to save |
| :--- | :--- | :--- |
| `precise` | Type d'activité · lieu · heure · manger avant ? (« Partant ? » is the invitation answer, not asked again) | nothing |
| `one_day` | Préférences de la journée (matin, après-midi, soirée, dehors, à l'abri, actif, tranquille) | at least one preference |
| `holidays` | Période · budget · envies | period |

Design choices (simplest option, easy to refine later):
- Answers are **per member** (not a single organizer answer): preferences are individual. The screen shows « n / m ont répondu » (answers saved by accepted or « peut-être » participants / those participants); a single-choice answer is cleared by pressing it again, and a failed loading shows an error instead of a blank form. There is no vote or aggregation of answers yet.
- « Heure » is a set of preset start times (`PREFERRED_TIME_OPTIONS`), « lieu » is a free-text wish (≤ 200 characters), not a link to a `places` row.
- « Période » uses the shared `MultiDateCalendar`: the first and last picked days are the period bounds.
- « Budget » is a 3-level scale (`low`, `medium`, `high`), not an amount.
- Answers of an unused type are kept in the row when the type is changed, but ignored by the UI.
- Saving is update-then-insert (`outingAnswersService.saveMyAnswers`) because `outing_id` / `user_id` are not updatable columns, so `upsert` would be refused; a unique violation from a concurrent save is retried as an update. The outing type is changed through `useOutingsStore.updateOuting`.
