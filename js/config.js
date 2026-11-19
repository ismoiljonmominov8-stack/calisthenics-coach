// Supabase project (the publishable key is safe to be public — the database rules protect the data)
export const SUPABASE_URL = 'https://lxmswplogfumixcfgjve.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_kIHA48aXZ79xeiE2jtVNdw_t5HyPu48';

// Students log in with phone + password. Supabase needs an email behind the scenes,
// so each phone becomes a hidden address on the coach's own mailbox (no emails are sent).
export const loginEmail = (phone) => `ismoiljonmominov8+u${phone}@gmail.com`;

export const ACCESS_DAYS = 30;
export const WARN_DAYS = 3;
export const APP_NAME = 'Calisthenics Coach';
