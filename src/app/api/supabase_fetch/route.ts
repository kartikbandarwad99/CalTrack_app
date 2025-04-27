import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const table_name = 'Calories';
const DATE_COLUMN_NAME = 'Date';
const supabaseUrl = process.env.supabaseUrl!;
const supabase_public_key = process.env.supabase_public_key!;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabase_public_key);
    const body = await req.json();
    const selectedDateString = body.selectedDateString;

    if (!selectedDateString || typeof selectedDateString !== 'string') {
      return NextResponse.json({ message: 'Invalid date string format in request' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDateString)) {
         return NextResponse.json({ message: 'Invalid date string format. Expected YYYY-MM-DD.' }, { status: 400 });
    }
    console.log(`Querying data for date: ${selectedDateString} in column '${DATE_COLUMN_NAME}'`);
    const { data, error } = await supabase
      .from(table_name)
      .select('*')
      .eq(DATE_COLUMN_NAME, selectedDateString); // Use .eq for equality comparison

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