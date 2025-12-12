import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.46.1/+esm';

const supabaseUrl = 'https://bilxeglwtyykdfihuoot.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbHhlZ2x3dHl5a2RmaWh1b290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDAxMDMsImV4cCI6MjA2NzU3NjEwM30.g_5gjJ41KQLZWUkrhCiXoQTde_amAWLOgpS0m4S8gyk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
