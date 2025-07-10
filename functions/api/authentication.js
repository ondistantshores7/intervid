import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  try {
    const { username, password } = await context.request.json();

    // These should ideally be stored as secrets in the Cloudflare dashboard
    // and accessed via context.env.SUPABASE_URL and context.env.SUPABASE_KEY
    const supabaseUrl = 'https://bilxeglwtyykdfihuoot.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbHhlZ2x3dHl5a2RmaWh1b290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDAxMDMsImV4cCI6MjA2NzU3NjEwM30.g_5gjJ41KQLZWUkrhCiXoQTde_amAWLOgpS0m4S8gyk';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (data.user && data.session) {
        const { user, session } = data;
        const responseBody = JSON.stringify({ success: true, user, session });

        // The Supabase client library on the browser handles the session cookie automatically.
        // We just need to return the user and session data.
        return new Response(responseBody, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } else {
        return new Response(JSON.stringify({ success: false, message: 'Login failed. Please check your credentials.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
