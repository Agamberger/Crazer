# 🧩 Composants UI partagés — Crazer

Kit de composants réutilisables, thémés via `@/shared/constants/theme` (dark mode Crazer).
Tous sont exportés depuis un point d'entrée unique :

```tsx
import { Button, TextField, List, ListItem, Avatar } from '@/shared/components';
```

> Règle : dans une feature, n'utilisez plus `TextInput`, `Modal`, `Alert.alert`, `FlatList`,
> `ActivityIndicator` ou des boutons `TouchableOpacity` « faits main » si un composant ci-dessous
> couvre le besoin. Toutes les features (auth, profil, outings, carte, activités) utilisent ce kit.

Les icônes sont des noms [Ionicons](https://icons.expo.fyi/) (type `IconName`, auto-complété).

---

## Typographie & actions

| Composant | Rôle | Props clés |
| :--- | :--- | :--- |
| `AppText` | Texte thémé | `variant` (`h1` `h2` `h3` `body` `bodySmall` `caption` `label`), `color`, `weight`, `align` |
| `Button` | Bouton principal | `title`, `variant` (`primary` `secondary` `outline` `ghost` `danger`), `size`, `loading`, `leftIcon`, `rightIcon`, `fullWidth` |
| `IconButton` | Bouton icône rond | `icon`, `accessibilityLabel` (**obligatoire**), `variant` (`filled` `surface` `ghost`), `size` |

```tsx
<AppText variant="h2">Mes sorties</AppText>
<Button title="Créer une sortie" leftIcon="add" fullWidth loading={isSaving} onPress={save} />
<IconButton icon="settings-outline" accessibilityLabel="Paramètres" onPress={openSettings} />
```

## Formulaires

| Composant | Rôle | Props clés |
| :--- | :--- | :--- |
| `TextField` | Champ texte avec label / erreur | `label`, `error`, `helperText`, `leftIcon`, `rightIcon` + `onPressRightIcon`, `isPassword`, `showCounter` + `maxLength`, `multiline` + `minHeight` (zone de texte), `variant` (`default` `title`), `ref` |
| `SearchBar` | Champ de recherche | `value`, `onChangeText`, `onClear`, `loading`, `containerStyle`, `ref` |
| `ChipGroup` | Puces à sélection unique (générique typé, `string` ou `number`) | `options` (`value`, `label`, `emoji?`, `icon?`), `value`, `onChange`, `label`, `testID` → `${testID}-${value}` |
| `MultiChipGroup` | Puces à sélection multiple (jours, amis…), l'ordre des options est conservé | `options`, `values`, `onChange(values)`, `label`, `testID` → `${testID}-${value}` — helper `toggleChipValue()` |
| `MultiDateCalendar` | Calendrier mensuel à sélection multiple de jours, navigation libre entre les mois, jours choisis listés en puces supprimables | `values` (`YYYY-MM-DD`), `onChange`, `minDate` (jours passés et mois précédent désactivés), `testID` → `${testID}-selected-${day}` |
| `TimeRangeField` | Créneau horaire « De » / « À » (sélecteur thémé en mode heure seule), erreur si fin ≤ début | `value` (`{ start, end }` en `HH:mm`), `onChange`, `label`, `testID` — helpers `isValidTimeRange()`, `formatTimeLabel()` |
| `DateTimeField` | Boutons « Date » + « Heure » avec sélecteur thémé intégré | `value`, `onChange`, `label`, `testIDScope` — helpers `formatFieldDate()`, `formatFieldTime()` |
| `Checkbox` | Case à cocher | `checked`, `onChange`, `label`, `description` |
| `Toggle` | Interrupteur | `value`, `onValueChange`, `label`, `description` |
| `SegmentedControl` | Onglets compacts (générique typé) | `options`, `value`, `onChange` |
| `ThemedDateTimePicker` | Sélecteur date / heure (bas niveau) | voir `DateTimePicker/` — préférez `DateTimeField` ; `lockMode` masque les onglets Date / Heure ; `CalendarPickerView` accepte `isDaySelected`, `isDayDisabled` et `disablePrevMonth` |

```tsx
<TextField variant="title" placeholder="Titre de la sortie..." value={title} onChangeText={setTitle} />
<TextField label="Description" multiline minHeight={90} value={desc} onChangeText={setDesc} />
<DateTimeField label="Date et heure de début" value={startDate} onChange={setStartDate} />
<ChipGroup
  label="Statut"
  options={[{ value: 'draft', label: 'Brouillon', emoji: '📝' }, { value: 'planned', label: 'Planifiée' }]}
  value={status}
  onChange={setStatus}
/>
<TextField
  label="Mot de passe"
  isPassword
  value={password}
  onChangeText={setPassword}
  error={errors.password}
/>
<SegmentedControl
  options={[{ value: 'upcoming', label: 'À venir' }, { value: 'past', label: 'Passées' }]}
  value={tab}
  onChange={setTab}
/>
```

## Affichage

| Composant | Rôle | Props clés |
| :--- | :--- | :--- |
| `Card` | Conteneur surface | `variant` (`default` `elevated` `outlined`), `onPress` (rend la carte cliquable) |
| `Avatar` | Photo ou initiales | `name`, `fallback`, `imageUrl`, `size` (`xs`→`xl`), `online` — helper `getInitials()` |
| `Badge` | Statut / compteur | `label`, `tone`, `max` (`150` → `99+`) |
| `Chip` | Filtre / centre d'intérêt | `label`, `emoji`, `selected`, `onPress`, `onRemove`, `icon`, `accessibilityLabel` |
| `Divider` | Séparateur | `label` (ex : « ou »), `spacingSize` |
| `InlineAlert` | Bandeau de message | `message`, `title`, `tone` (`error` `success` `warning` `info`), `onDismiss` |
| `Loader` | Spinner | `message`, `fullScreen`, `size` |
| `EmptyState` | État vide | `title`, `description`, `icon`, `actionLabel` + `onAction` |

## Listes

| Composant | Rôle | Props clés |
| :--- | :--- | :--- |
| `List` | `FlatList` avec loading / erreur / vide / pull-to-refresh | toutes les props `FlatList` + `loading`, `refreshing`, `onRefresh`, `error`, `empty`, `gap` |
| `ListItem` | Ligne générique (mémoïsée) | `title`, `subtitle`, `icon` ou `left`, `right` (reste hors de la zone cliquable, donc accessible séparément), `onPress`, `showChevron`, `bordered`, `destructive` |
| `SectionHeader` | Titre de section | `title`, `actionLabel` + `onAction` |

```tsx
<SectionHeader title="Mes amis" actionLabel="Voir tout" onAction={goToFriends} />
<List
  data={friends}
  keyExtractor={(f) => f.id}
  loading={isLoading}
  refreshing={isRefreshing}
  onRefresh={refresh}
  error={error}
  empty={{ title: "Pas encore d'amis", icon: 'people-outline', actionLabel: 'Rechercher', onAction: openSearch }}
  renderItem={({ item }) => (
    <ListItem
      bordered
      title={item.fullName}
      subtitle={item.email}
      left={<Avatar name={item.fullName} imageUrl={item.avatarUrl} />}
      onPress={() => openProfile(item.id)}
    />
  )}
/>
```

> Pour les performances, passez un `renderItem` stable (`useCallback`) — `ListItem` est déjà mémoïsé.

## Overlays & mise en page

| Composant | Rôle | Props clés |
| :--- | :--- | :--- |
| `AppModal` | Dialogue, bottom sheet ou écran complet | `visible`, `onClose`, `title`, `variant` (`center` `sheet` `fullScreen`), `footer`, `dismissOnBackdrop`, `closeIcon`, `closeAccessibilityLabel`, `closeButtonTestID` |
| `ConfirmDialog` | Confirmation Annuler / Confirmer | `visible`, `title`, `message`, `destructive`, `loading`, `onConfirm`, `onCancel` |
| `Screen` | Conteneur racine d'écran | `scrollable`, `padded`, `edges`, `avoidKeyboard`, `header`, `footer` |
| `ToastHost` + `toast` | Notifications éphémères (file d'attente Zustand) | `toast.success/error/info/warning(message, { title, duration })` — `ToastHost` est déjà monté dans `app/_layout.tsx` |

```tsx
<Screen scrollable avoidKeyboard footer={<Button title="Enregistrer" fullWidth onPress={save} />}>
  <TextField label="Nom de la sortie" value={name} onChangeText={setName} />
</Screen>

<ConfirmDialog
  visible={isConfirmOpen}
  title="Quitter la sortie ?"
  message="Tu ne verras plus les dépenses du groupe."
  confirmLabel="Quitter"
  destructive
  onConfirm={leave}
  onCancel={() => setConfirmOpen(false)}
/>
```

```tsx
import { toast } from '@/shared/store/useToastStore';

toast.success('Sortie créée !');
toast.error("Impossible d'enregistrer l'étape.", { title: 'Erreur', duration: 5000 });
```

> N'utilisez plus `Alert.alert` : `ConfirmDialog` pour une confirmation, `toast` pour un retour.
> Les toasts identiques déjà en file ne sont pas dupliqués.
> ⚠️ Un toast s'affiche **sous** une `AppModal`/`Modal` ouverte (limite de React Native) : dans une modale, affichez l'erreur avec `InlineAlert`. Un toast de succès juste avant la fermeture de la modale reste visible.

---

## Thème

Les tokens sont dans `src/shared/constants/theme.ts` : `colors`, `spacing`, `typography`,
`radii`, `iconSizes`, `opacity`. Les fonds translucides des messages sont aussi des tokens
(`errorBackground`, `successBackground`, `warningBackground`, `infoBackground`).
Ne codez jamais une couleur ou un espacement en dur.

## Tests

Les tests sont dans `src/shared/components/__tests__/` (un fichier par famille :
`Button`, `FormControls`, `SelectionControls`, `DisplayComponents`, `ListComponents`,
`OverlayComponents`, `Toast`) ; le store des toasts est testé dans `src/shared/store/__tests__/`.
Tout nouveau composant partagé doit être ajouté à `index.ts`, à ce README et aux tests.

Sous-composants internes (non exportés par `index.ts`, chacun avec son test) :
`TextFieldTrailingIcon` (œil du mot de passe ou icône d'action de `TextField`),
`TextFieldFooter` (erreur / aide / compteur sous `TextField`) et `AppModalHeader`
(barre de titre et bouton de fermeture de `AppModal`).
