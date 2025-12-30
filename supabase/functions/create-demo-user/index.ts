import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const demoEmail = 'cihan@highlinebldg.com';
    const demoPassword = 'hbs9393';
    const demoOrgId = '00000000-0000-0000-0000-000000000001';

    // Create user with admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Cihan Demo',
      },
    });

    if (authError) {
      throw authError;
    }

    if (!authUser.user) {
      throw new Error('User creation failed');
    }

    // Create user profile in public.users
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        org_id: demoOrgId,
        role: 'Director',
        name: 'Cihan Demo',
        email: demoEmail,
        status: 'active',
      });

    if (profileError) {
      // If profile creation fails, clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo user created successfully',
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
