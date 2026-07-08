import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-side Admin usage (Bypasses RLS to insert codes securely)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

import { cookies } from 'next/headers';

export async function getServerUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  if (!token) return null;
  
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error) {
    console.error(error);
    return null;
  }
  return user;
}
