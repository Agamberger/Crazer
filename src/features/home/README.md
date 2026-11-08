# 🏠 Feature `home` — Page d'accueil

Premier onglet de l'app (`app/(tabs)/index.tsx`, route `/`). Elle donne un point d'entrée rapide vers le reste de l'app.

## Contenu de l'écran

| Bloc | Composant | Rôle |
| :--- | :--- | :--- |
| En-tête | `HomeHeader` | « Bonjour / Bonsoir, {prénom} 👋 » et l'avatar de l'utilisateur. |
| Invitations | `PendingInvitationsSection` (feature `outings`) | Invitations reçues et pas encore traitées ; un appui ouvre le parcours « Rejoindre » (`/outing/[id]/join`). |
| Prochaine sortie | `NextOutingSection` | La sortie à mettre en avant (voir `getNextOuting`), avec l'heure et les participants (`ParticipantAvatars`, « 3 participants · 1 en attente »). Un appui ouvre son détail dans l'onglet **Sorties** ; « Voir tout » ouvre la liste. Sans sortie active : état vide avec « Organiser une sortie ». |
| À venir | `UpcomingOutingsSection` | Les 5 prochaines sorties après la première (date et heure, voir `getUpcomingOutings`) et le bouton **« + Sortie »**. Les sorties **sans date** suivent les datées avec « Date à définir ». Masqué quand il n'y en a pas. |
| Raccourcis | `QuickActions` | Organiser une sortie (ouvre l'assistant `/outing/create`), Explorer la carte, Mes amis (avec le nombre de demandes d'ami en attente). |

Les sorties où l'utilisateur est seulement invité ou qu'il a refusées sont exclues (`useVisibleOutings`) : elles n'apparaissent que dans les invitations.

## Logique (`utils/homeUtils.ts`)

- `getNextOuting(outings, now)` : parmi les sorties actives (ni `done` ni `cancelled`), la plus proche à venir ; sinon une sortie `ongoing` ; sinon la plus récente passée, pour ne jamais masquer un brouillon.
- `getUpcomingOutings(outings, now, excludeId, limit)` : sorties actives à venir, la plus proche d'abord, sans celle déjà mise en avant, limitées à `UPCOMING_OUTINGS_LIMIT` (5). `formatUpcomingDate(iso)` : « mer. 11 nov. · 18:00 ».
- `getGreeting(date)` : « Bonjour » de 5 h à 18 h, « Bonsoir » sinon.
- `getFirstName(fullName, email)` : premier mot du nom complet, sinon la partie locale de l'email.

## Navigation

L'écran Sorties (`app/(tabs)/sorties.tsx`) affiche le détail de la sortie sélectionnée dans `useOutingsStore`. L'accueil sélectionne donc la sortie (`selectOuting`) avant `router.push('/(tabs)/sorties')`. Un appui sur l'onglet **Sorties** réinitialise la sélection.

## Tests

- `src/features/home/__tests__/homeUtils.test.ts` : choix de la prochaine sortie, sorties à venir, formatage, salutation, prénom.
- `src/features/home/__tests__/UpcomingOutingsSection.test.tsx` : liste « À venir » et « + Sortie ».
- `app/(tabs)/__tests__/home.test.tsx` : rendu de l'écran, navigation, assistant de création, invitations, participants, sorties masquées et raccourcis.

## Sorties sans date

`outings.start_date` peut être `null`. `getNextOuting` ne met en avant une sortie sans date que s'il n'existe aucune sortie datée active ; `getUpcomingOutings` les liste après les sorties datées à venir ; `formatUpcomingDate(null)` renvoie « Date à définir ».
