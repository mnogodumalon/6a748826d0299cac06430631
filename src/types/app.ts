// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface NightcorePlaylists {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    beschreibung?: string;
    playlist_url?: string;
    cover_bild?: string;
    genre_tags?: LookupValue[];
    anzahl_songs?: number;
    erstellt_am?: string; // Format: YYYY-MM-DD oder ISO String
    plattform?: LookupValue;
    bewertung?: LookupValue;
    notizen?: string;
    favorit?: boolean;
  };
}

export const APP_IDS = {
  NIGHTCORE_PLAYLISTS: '6a7487cc70e5e1836dc8e384',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'nightcore_playlists': {
    genre_tags: [{ key: "nightcore_classic", label: "Nightcore Classic" }, { key: "nightcore_anime", label: "Nightcore Anime" }, { key: "nightcore_gaming", label: "Nightcore Gaming" }, { key: "nightcore_pop", label: "Nightcore Pop" }, { key: "nightcore_rock", label: "Nightcore Rock" }, { key: "nightcore_edm", label: "Nightcore EDM" }, { key: "nightcore_metal", label: "Nightcore Metal" }, { key: "nightcore_chill", label: "Nightcore Chill" }, { key: "nightcore_remix", label: "Nightcore Remix" }],
    plattform: [{ key: "youtube", label: "YouTube" }, { key: "spotify", label: "Spotify" }, { key: "soundcloud", label: "SoundCloud" }, { key: "apple_music", label: "Apple Music" }, { key: "andere", label: "Andere" }],
    bewertung: [{ key: "stern_1", label: "⭐ 1 – Nicht so gut" }, { key: "stern_2", label: "⭐⭐ 2 – Geht so" }, { key: "stern_3", label: "⭐⭐⭐ 3 – Gut" }, { key: "stern_4", label: "⭐⭐⭐⭐ 4 – Sehr gut" }, { key: "stern_5", label: "⭐⭐⭐⭐⭐ 5 – Absoluter Favorit" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'nightcore_playlists': {
    'titel': 'string/text',
    'beschreibung': 'string/textarea',
    'playlist_url': 'string/url',
    'cover_bild': 'file',
    'genre_tags': 'multiplelookup/checkbox',
    'anzahl_songs': 'number',
    'erstellt_am': 'date/date',
    'plattform': 'lookup/select',
    'bewertung': 'lookup/radio',
    'notizen': 'string/textarea',
    'favorit': 'bool',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateNightcorePlaylists = StripLookup<NightcorePlaylists['fields']>;