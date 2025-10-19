import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export type User = {
  user_id: string;
  orcid_id: string;
  orcid_uri: string;
  email: string | null;
  display_name: string;
  credit_balance: number;
  total_credits_earned: number;
  affiliation: string | null;
  affiliation_id: string | null;
  affiliation_uri: string | null;
  account_status: 'active' | 'suspended' | 'deleted';
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};
