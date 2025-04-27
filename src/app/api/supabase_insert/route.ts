import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const table_name = 'Calories';
const supabaseUrl = process.env.supabaseUrl!;
const supabase_public_key = process.env.supabase_public_key!;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabase_public_key);
    const body = await req.json();
    const selectedDateString = body.selectedDateString;
    console.log("Body: ",body)
    console.log("Date: ",selectedDateString)
    const { data, error } = await supabase
    .from(table_name)
    .insert([
        { Data: body, Date: selectedDateString },
    ])
    .select()

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    console.log(`Found ${data?.length || 0} records for date ${selectedDateString}`);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error processing request:', err);
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}