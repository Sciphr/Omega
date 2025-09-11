import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database setup...\n');

  const tables = [
    'tournaments',
    'tournament_participants', 
    'user_game_profiles',
    'teams',
    'team_members'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ Table '${table}' does not exist`);
        } else {
          console.log(`⚠️  Table '${table}' exists but has error: ${error.message}`);
        }
      } else {
        console.log(`✅ Table '${table}' exists and is accessible`);
      }
    } catch (err) {
      console.log(`❌ Error checking table '${table}': ${err.message}`);
    }
  }

  console.log('\n📋 Next steps:');
  console.log('1. If tables are missing, run the SQL schema in your Supabase dashboard');
  console.log('2. Check database/supabase-schema.sql for the complete schema');
  console.log('3. Make sure Row Level Security (RLS) policies are set up');
}

checkDatabase().catch(console.error);