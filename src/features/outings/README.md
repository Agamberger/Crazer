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
│       ├── CreateOutingWizard.tsx # « On sort ! » → « Quand ? » → « Mes dispos » → « Avec qui ? »
│       ├── WizardHeader.tsx       # Back / close + « Étape x/n »
│       ├── OutingNameStep.tsx, OutingDaysStep.tsx, AvailabilityStep.tsx, InviteFriendsStep.tsx
│       ├── JoinOutingFlow.tsx     # Invitee: Rejoindre ? → Quel jour ? → Dispos → Qui vient ?
│       ├── AvailabilityRecap.tsx  # Live recap: common slot per day, pending answers, « Choisir ce jour »
│       ├── DayRecapRow.tsx, MembersList.tsx
│       └── InvitationCard.tsx, PendingInvitationsSection.tsx
├── constants.ts                   # DURATION_PRESETS, PLANNED_STATUS_OPTIONS (partagés avec carte), OUTING_STATUS_OPTIONS, OUTINGS_SCREEN_EDGES
├── hooks/
│   ├── useOutings.ts              # Chargement / création / mise à jour des sorties
│   ├── useOutingEditing.ts        # Onglet Sorties : sélection, chargement des étapes, enregistrer / supprimer / annuler
│   ├── useOutingPlannedOutings.ts # Étapes d'une sortie éditée (store ou props du parent, ajout depuis la carte)
│   ├── usePlannedOutingEditForm.ts # Champs, validation, enregistrement et suppression d'une étape
│   ├── useOutingScheduling.ts     # Days + availabilities + members of an outing, kept live (realtime)
│   ├── useCreateOutingWizard.ts   # Wizard validation and submission
│   ├── useJoinOutingFlow.ts       # Invitee flow (accept / decline, days, slots)
│   └── useAvailabilityRecap.ts    # Recap + organizer's day choice (« continuer sans tout le monde ? »)
├── services/
│   ├── outingService.ts           # Requêtes Supabase (outings & planned_outings CRUD)
│   └── outingSchedulingService.ts # Scheduling RPCs, days, availabilities, members, invitations, realtime
├── store/
│   ├── useOutingsStore.ts         # Store Zustand réactif gérant l'état des sorties et étapes
│   ├── useOutingCreationStore.ts  # Wizard draft (title, days, slots, invitees, step)
│   └── useOutingSchedulingStore.ts # Invitations, scheduling per outing, create / respond actions
├── types/scheduling.ts            # DayKey, AvailabilitySlot, OutingMember, DayRecap, OutingInvitation…
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
| `/outing/[id]/recap` | `AvailabilityRecap` | Live recap per day: who is available and the common slot (`computeDayRecaps`). The organizer picks a day → outing becomes `planned` with `start_date` = day + common slot start. |

- Entry points: « Organiser une sortie » (home, Sorties tab) opens the wizard; pending invitations are listed on the home screen and the Sorties tab (`PendingInvitationsSection`); the outing edit form has a « Participants & dispos » button.
- Dates are never voted: the app computes the intersection of the slots of `accepted` / `maybe` members per day. Invitees who have not answered are counted as pending, and the organizer can « continuer sans tout le monde ».
- `useOutingScheduling(outingId)` subscribes to `outing_participants` and `outing_availabilities` changes and refetches, so the recap updates live.
- `createOutingWithInvites` and `respondToInvitation` throw on failure (screens show a toast and keep the draft); fetch actions store the message in `error`.
- The legacy one-tap `createOuting` is still used by the map's « + Créer une nouvelle sortie » (reworked in the explore/home entry points lot).

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
