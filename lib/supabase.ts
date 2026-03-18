import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://adyebdcyqczhkluqgwvv.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeWViZGN5cWN6aGtsdXFnd3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTc0MzUsImV4cCI6MjA4ODkzMzQzNX0.kpMmCfyCuszQqtXtGk4_8MrVCVZVCG-Jz8oe0Q3chlI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
