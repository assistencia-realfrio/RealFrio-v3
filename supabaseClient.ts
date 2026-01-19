
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkhsfegoslmkaaeerldl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raHNmZWdvc2xta2FhZWVybGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjgyMDMsImV4cCI6MjA4Mzk0NDIwM30.iXdGXQaRt1Xf_TBjq5B02LrXcRimgmez3V5C1lObZEE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
