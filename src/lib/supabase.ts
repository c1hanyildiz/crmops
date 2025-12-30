import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'Director' | 'PropertyManager' | 'VendorAdmin' | 'Tenant' | 'Employee';

export interface User {
  id: string;
  org_id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'invited' | 'disabled';
}
