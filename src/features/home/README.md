# 🏠 Feature `home` — Page d'accueil

Premier onglet de l'app (`app/(tabs)/index.tsx`, route `/`). Elle donne un point d'entrée rapide vers le reste de l'app.

## Contenu de l'écran

| Bloc | Composant | Rôle |
| :--- | :--- | :--- |
| En-tête | `HomeHeader` | « Bonjour / Bonsoir, {prénom} 👋 » et l'avatar de l'utilisateur. |
| Prochaine sortie | `NextOutingSection` | La sortie à mettre en avant (voir `getNextOuting`). Un appui ouvre son détail dans l'onglet **Sorties** ; « Voir tout » ouvre la liste. Sans sortie active : état vide avec « Organiser une sortie ». |
| Raccourcis | `QuickActions` | Organiser une sortie (création puis ouverture dans **Sorties**), Explorer la carte, Mes amis (avec le nombre de demandes d'ami en attente). |

## Logique (`utils/homeUtils.ts`)

- `getNextOuting(outings, now)` : parmi les sorties actives (ni `done` ni `cancelled`), la plus proche à venir ; sinon une sortie `ongoing` ; sinon la plus récente passée, pour ne jamais masquer un brouillon.
- `getGreeting(date)` : « Bonjour » de 5 h à 18 h, « Bonsoir » sinon.
- `getFirstName(fullName, email)` : premier mot du nom complet, sinon la partie locale de l'email.

## Navigation

L'écran Sorties (`app/(tabs)/sorties.tsx`) affiche le détail de la sortie sélectionnée dans `useOutingsStore`. L'accueil sélectionne donc la sortie (`selectOuting`) avant `router.push('/(tabs)/sorties')`. Un appui sur l'onglet **Sorties** réinitialise la sélection.

## Tests

- `src/features/home/__tests__/homeUtils.test.ts` : choix de la prochaine sortie, salutation, prénom.
- `app/(tabs)/__tests__/home.test.tsx` : rendu de l'écran, navigation, création de sortie, erreur et raccourcis.
