# 📅 Feature: Outings (Sorties)

Module de gestion des sorties entre amis pour l'application **Crazer**, connecté directement à la base de données Supabase.

---

## 🏗️ Structure du Module

```
src/features/outings/
├── components/
│   ├── OutingCard.tsx       # Carte d'affichage d'une sortie
│   └── OutingEditForm.tsx   # Formulaire d'édition d'une sortie
├── services/
│   └── outingService.ts     # Requêtes Supabase (fetchMyOutings, getOutingById, createOuting, updateOuting)
├── store/
│   └── useOutingsStore.ts   # Store Zustand réactif gérant l'état des sorties
├── __tests__/               # Tests unitaires et composants
│   ├── OutingCard.test.tsx
│   ├── OutingEditForm.test.tsx
│   ├── outingService.test.ts
│   └── useOutingsStore.test.ts
└── index.ts                 # Point d'entrée du module (barrel export)
```

---

## ⚡ Utilisation

### Récupération, Création et Modification de Sorties

```typescript
import { useOutingsStore, OutingEditForm } from '@/features/outings';

function MyScreen() {
  const outings = useOutingsStore((state) => state.outings);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const createOuting = useOutingsStore((state) => state.createOuting);
  const updateOuting = useOutingsStore((state) => state.updateOuting);
  const isLoading = useOutingsStore((state) => state.isLoading);

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

---

## 🧪 Tests

Exécuter la suite de tests dédiée au module :
```bash
npm test -- --testPathPattern="outings"
```
