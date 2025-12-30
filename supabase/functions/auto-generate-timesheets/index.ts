import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const targetDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    console.log(`Generating timesheets for date: ${targetDate}`);

    const { data: activeEmployees, error: employeeError } = await supabase
      .from('employees')
      .select('id, org_id, property_id')
      .eq('active', true);

    if (employeeError) {
      throw employeeError;
    }

    if (!activeEmployees || activeEmployees.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active employees found',
          timesheets_created: 0 
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const timesheetsToCreate = [];

    for (const employee of activeEmployees) {
      const { data: existing, error: checkError } = await supabase
        .from('timesheets')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('date', targetDate)
        .maybeSingle();

      if (checkError) {
        console.error(`Error checking existing timesheet for employee ${employee.id}:`, checkError);
        continue;
      }

      if (existing) {
        console.log(`Timesheet already exists for employee ${employee.id} on ${targetDate}`);
        continue;
      }

      timesheetsToCreate.push({
        org_id: employee.org_id,
        employee_id: employee.id,
        property_id: employee.property_id,
        date: targetDate,
        hours_reg: 7,
        hours_ot: 0,
        notes: 'Auto-generated: Regular schedule (8AM-5PM, 1hr lunch)',
        locked: false,
      });
    }

    if (timesheetsToCreate.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All timesheets already exist for this date',
          timesheets_created: 0 
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: created, error: insertError } = await supabase
      .from('timesheets')
      .insert(timesheetsToCreate)
      .select();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully created ${created?.length || 0} timesheets for ${targetDate}`,
        timesheets_created: created?.length || 0,
        date: targetDate,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating timesheets:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate timesheets',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});