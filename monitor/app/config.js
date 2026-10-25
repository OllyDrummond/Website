// Public settings for the Kinetiq Tank Monitor dashboard.
//
// Both values come from Supabase > Project Settings > API. The publishable key
// is designed to be public: row-level security in the database decides what
// each logged-in customer can see. Never put a secret or service key here.
//
// While these are empty, only the demo is available.

export const SUPABASE_URL = '';
export const SUPABASE_PUBLISHABLE_KEY = '';

// How old a reading can be before it is shown as Delayed / Offline.
// Tank units send every 20 s.
export const LIVE_SECONDS = 60;          // under 1 min: Live
export const OFFLINE_SECONDS = 5 * 60;   // over 5 min: Offline (between: Delayed)

// The receiver uploads at least every 60 s.
export const RECEIVER_OFFLINE_SECONDS = 2 * 60;
