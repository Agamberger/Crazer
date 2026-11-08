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
│   ├── PlannedOutingCard.tsx      # Carte d'affichage d'une étape planifiée (Planned Outing)
│   ├── PlannedOutingsTimeline.tsx  # Timeline chronologique + choix du type d'étape (AppModal sheet)
│   ├── PlannedOutingEditForm.tsx  # Formulaire d'édition d'une étape, suppression via ConfirmDialog
│   ├── PlannedOutingFormActions.tsx # Boutons Annuler / Enregistrer / Supprimer d'une étape
│   └── TimelineStep.tsx           # Une étape de la timeline (nœud, segments, carte)
├── constants.ts                   # DURATION_PRESETS, PLANNED_STATUS_OPTIONS (partagés avec carte), OUTING_STATUS_OPTIONS
├── hooks/
│   ├── useOutings.ts              # Chargement / création / mise à jour des sorties
│   ├── useOutingPlannedOutings.ts # Étapes d'une sortie éditée (store ou props du parent, ajout depuis la carte)
│   └── usePlannedOutingEditForm.ts # Champs, validation, enregistrement et suppression d'une étape
├── services/
│   └── outingService.ts           # Requêtes Supabase (outings & planned_outings CRUD)
├── store/
│   └── useOutingsStore.ts         # Store Zustand réactif gérant l'état des sorties et étapes
├── __tests__/                     # Tests unitaires et composants
│   ├── DurationField.test.tsx
│   ├── OutingCard.test.tsx
│   ├── OutingEditForm.test.tsx
│   ├── PlannedOutingCard.test.tsx
│   ├── PlannedOutingsTimeline.test.tsx
│   ├── PlannedOutingEditForm.test.tsx
│   ├── PlannedOutingFormActions.test.tsx
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
