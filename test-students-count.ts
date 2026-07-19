import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock'
);

async function check() {
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
  console.log('Total students:', count);
  console.log('Error:', error);
}

check();
