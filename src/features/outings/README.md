# 📅 Feature: Outings (Sorties)

Module de gestion des sorties entre amis pour l'application **Crazer**, connecté directement à la base de données Supabase.

---

## 🏗️ Structure du Module

```
src/features/outings/
├── components/
│   ├── OutingCard.tsx             # Carte d'affichage d'une sortie
│   ├── OutingEditForm.tsx         # Formulaire d'édition d'une sortie avec timeline intégrée
│   ├── PlannedOutingCard.tsx      # Carte d'affichage d'une étape planifiée (Planned Outing)
│   ├── PlannedOutingsTimeline.tsx  # Timeline chronologique visuelle des étapes
│   └── PlannedOutingEditForm.tsx  # Formulaire complet d'édition/suppression d'une étape
├── services/
│   └── outingService.ts           # Requêtes Supabase (outings & planned_outings CRUD)
├── store/
│   └── useOutingsStore.ts         # Store Zustand réactif gérant l'état des sorties et étapes
├── __tests__/                     # Tests unitaires et composants
│   ├── OutingCard.test.tsx
│   ├── OutingEditForm.test.tsx
│   ├── PlannedOutingCard.test.tsx
│   ├── PlannedOutingsTimeline.test.tsx
│   ├── PlannedOutingEditForm.test.tsx
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

## 🧪 Tests

Exécuter la suite de tests dédiée au module :
```bash
npm test -- --testPathPattern="outings"
```
