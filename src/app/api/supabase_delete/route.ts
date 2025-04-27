import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.supabaseUrl;
const supabaseKey = process.env.supabase_public_key; 
 

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables not set!");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);
const TABLE_NAME = 'Calories';

export async function POST(req: Request) {
    console.log('--- Supabase Delete API Hit ---');
    try {
      const { id } = await req.json();
      console.log('Received ID:', id);
  
      if (!id) {
        console.log('Error: ID is missing');
        return NextResponse.json({ message: 'Item ID is required' }, { status: 400 });
      }
  
    //   const TABLE_NAME = 'user_food_entries'; // <--- Double check this name!
      console.log('Attempting delete from table:', TABLE_NAME, 'for ID:', id);
  
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id); // <--- Double check your ID column name!
  
      if (error) {
        console.error('Supabase Error during delete:', error);
        return NextResponse.json({ message: 'Failed to delete item', error: error.message }, { status: 500 });
      }
  
      console.log('Delete successful for ID:', id);
      return NextResponse.json({ message: 'Item deleted successfully', success: true });
  
    } catch (error: any) {
      console.error('General API Error:', error);
      return NextResponse.json({ message: 'An internal server error occurred', error: error.message }, { status: 500 });
    } finally {
       console.log('--- Supabase Delete API End ---');
    }
  }