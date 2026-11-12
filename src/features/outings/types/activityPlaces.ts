/** Where a place suggestion comes from. */
export type ActivityPlaceSource = 'crazer' | 'google';

/** A place suggestion shown while proposing an activity. */
export interface ActivityPlaceSuggestion {
  /** Crazer: the `places` id. Google: the Google place id. */
  key: string;
  source: ActivityPlaceSource;
  name: string;
  subtitle: string | null;
}

/** A place picked for an activity (already stored in `places`). */
export interface PickedPlace {
  id: string;
  name: string;
}
