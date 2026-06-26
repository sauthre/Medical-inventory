import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing environment variables.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify → Site Settings → Environment Variables.'
  );
}

// Catch the most common mistake: pasting just the project ID instead of the full URL
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  throw new Error(
    `VITE_SUPABASE_URL looks wrong: "${supabaseUrl}"\n` +
    'It must be the full URL, e.g. https://qvnbxjelxvdqpdtbxbqe.supabase.co'
  );
}

export const supabase = createClient(supabaseUrl.replace(/\/$/, ''), supabaseKey);
