# 🤝 Place contributions (`src/features/place-contributions`)

Content added by Crazer users to any place — Crazer, OpenStreetMap or a Google place stored by its place ID (roadmap phase 2). The goal is to depend less and less on Google: when a place has enough of our own data, its card no longer needs Google.

**Rule: a contribution is never pre-filled from Google nor copied from it** (Google Maps Platform terms). Only what users type, take or confirm is stored.

## Status

| Increment | Content                                                                                    | State |
| :-------- | :----------------------------------------------------------------------------------------- | :---- |
| 2.1       | Database (tables, Storage bucket, RLS, RPCs, pgTAP) and typed service layer                | ✅    |
| 2.2       | Photos: pick / take, compress on the phone, upload, gallery                                | ✅    |
| 2.3       | Opening hours: weekly editor, « C'est juste ? » votes, confirmed hours shown before Google | ✅    |
| 2.4       | Crazer reviews (friends first)                                                             | ⏳    |
| 2.5       | Completeness score, skip the Google call, Google dependency metric                         | ⏳    |

## Data (migration `place_contributions`)

- **Photos** — `place_photos` + private Storage bucket `place-photos` (JPEG, 2 MB max). Files: `<place_id>/<photo_id>.jpg` and `<place_id>/<photo_id>_thumb.jpg`, uploaded first, then registered with the RPC `add_place_photo` (checks both files exist and belong to the caller). Quotas: **10 photos per user per rolling day, 20 visible photos per place** (`54000` → `quota_reached`). Reports through `report_place_photo` (one per user, not on one's own photo): **hidden from the 3rd report**; a hidden photo stays visible to its uploader only. `delete_place_photo` removes the row; the app then removes both files.
- **Opening hours** — `place_hours_proposals.periods` = `[{ day: 0–6 (0 = Monday), open: "HH:MM", close: "HH:MM" }]` (a day without period is closed, `close < open` ends after midnight, 21 periods max). `propose_place_hours` replaces the caller's pending proposal. `vote_place_hours` (not on one's own proposal, a new vote replaces the previous one): **confirmed with ≥ 2 « Oui » and more « Oui » than « Non »**, **rejected with ≥ 2 « Non » and more « Non » than « Oui »**.
- **Reviews** — `place_reviews`: one per user and place, 1–5 stars, comment ≤ 500 characters; authors write their own rows directly (RLS).
- **Summaries** — `get_place_contribution_summaries(place_ids)` (≤ 100 places): visible photos, review count, average rating, latest confirmed hours.
- Reads: any authenticated user. Writes: RPCs only for photos, reports, hours and votes.

## Code

- `types/contributions.ts` — `PlacePhoto`, `PlaceHoursProposal`, `PlaceReview`, `PlaceContributionSummary`, `OpeningPeriod`, `WeekDay`, `PhotoReportReason`.
- `utils/openingPeriods.ts` — validation mirroring SQL (`isValidOpeningPeriod`, `areValidOpeningPeriods`), JSON narrowing (`parseOpeningPeriods`), serialisation, French formatting (`formatOpeningPeriods`, same lines as the place card).
- `services/contributionError.ts` — `ContributionError` (`not_authenticated`, `forbidden`, `not_found`, `invalid`, `quota_reached`, `network`) with French `userMessage`; `toContributionError` maps Postgres codes.
- `services/placeContributionsService.ts` — `fetchSummaries`, `fetchPhotos`, `createPhotoUrls` (signed URLs, 1 h), `registerPhoto`, `reportPhoto`, `deletePhoto`, `fetchHoursProposals` (pending + latest confirmed), `fetchMyHoursVotes`, `proposeHours`, `voteHours`, `fetchReviews`, `saveMyReview` (insert or update, comment trimmed), `deleteMyReview`.

## Photos (increment 2.2)

- **Dependencies**: `expo-image-picker` (camera / library, permissions declared in `app.json` in French) and `expo-image-manipulator`.
- `services/photoProcessing.ts` — `pickPhoto(source)` (permission → `forbidden` when refused, `null` when cancelled, `exif: false`) and `preparePhoto(image)`: re-encodes a **1080 px** JPEG (quality 0.75) and a **320 px** thumbnail (0.6); re-encoding drops the EXIF metadata, **location included**. `fitWithin` never scales up.
- `services/photoUploadService.ts` — `uploadPlacePhoto(placeId, prepared)`: photo id chosen by the app (`createUuidV4`), both files uploaded to `<place_id>/<photo_id>(_thumb).jpg`, then `registerPhoto`; uploaded files are removed again on failure. A Storage RLS refusal (daily quota) becomes `quota_reached`.
- `hooks/usePlacePhotos.ts` — photos of a place with signed URLs (thumbnail + full size) and the **uploader's name** (`fetchUploaderNames` → `get_profiles`, « Membre Crazer » when unknown or unreachable), shown as « © Name » under each thumbnail and in the viewer, like the Google photo credits, `addPhoto` (saves the place first through `resolvePlaceId` when it is not saved yet), `reportPhoto`, `deletePhoto`, French `error`.
- `components/PlacePhotosSection.tsx` — **one merged photo strip**, no source heading: a discreet « + » tile (`AddPhotoTile`: camera / library sheet on a phone, file picker on the web), the community photos (tap: viewer), then the other source's photos (`otherPhotos`: Google Maps or stored images), each with its small « © author » credit (`PhotoThumbnail`); errors under the strip; `PlacePhotoViewer` (full-screen photo, « Signaler » with a reason for others' photos, « Supprimer ma photo » for one's own).
- Used by `carte` through `PlaceCommunityPhotos` (finds the `places` row of a Google place, saves the place with `ensurePlaceExists` on the first upload): in the same strip as the Google photos in `GooglePlaceSheet` (which no longer has a separate Google gallery), and in the expanded `PlaceDetailCard` of Crazer places (with the stored images).

## Opening hours and merged sources (increment 2.3)

Design rule: **subtle**. One card, no source tag on every line.

- `hooks/usePlaceHours.ts` — confirmed hours, the latest proposal of someone else to check (`toReview`), the user's own pending proposal, the user's vote, `propose` (saves the place first when needed) and `vote`.
- `components/PlaceHoursSection.tsx` — « Horaires »:
  - **confirmed community hours first**, with « Ouvert / Fermé maintenant » computed from them (`isOpenAt`, periods after midnight included) and a small **✓**; tapping it reveals « Horaires confirmés par N membres de Crazer »;
  - the other source's hours (Google Maps, or the stored hours of a Crazer place) stay **one tap away** (« Voir les horaires Google Maps »), or are shown alone, without marker, when the community has none;
  - a quiet « Un membre propose : … C'est juste ? Oui / Non » line for someone else's proposal; « Ta proposition attend la confirmation de deux membres » for one's own;
  - « Proposer des horaires » / « Corriger les horaires » (ghost link) opens `OpeningHoursEditor`.
- `components/OpeningHoursEditor.tsx` — week grid: each day open / closed (`Toggle`), one or two ranges (`TimeRangeField` with `allowOvernight`). Starts from the confirmed community hours, otherwise empty: **never pre-filled with Google's hours**.
- `utils/openingPeriods.ts` — `isOpenAt(periods, date)`, `toWeekDay(date)` (0 = Monday).
- In `carte`: `PlaceCommunityHours` (via `useSavedPlaceId`) replaces the hours block of `GooglePlaceSheet` and of the expanded `PlaceDetailCard`. The sheet's footer reads « Google Maps · Crazer » (`GoogleAttribution withCrazer`): the only source line of the card.

## Tests

- `__tests__/openingPeriods.test.ts`, `__tests__/placeContributionsService.test.ts`, `__tests__/photoProcessing.test.ts`, `__tests__/photoUploadService.test.ts`, `__tests__/PlacePhotosSection.test.tsx`, `__tests__/PlaceHoursSection.test.tsx` (Jest); `carte/__tests__/PlaceCommunityPhotos.test.tsx`, `carte/__tests__/PlaceCommunityHours.test.tsx`
- `supabase/tests/database/place_contributions.test.sql` (pgTAP: bucket, Storage policies, quotas, reports, votes, reviews, summaries, rights)
