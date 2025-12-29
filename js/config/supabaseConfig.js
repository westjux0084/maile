// Supabase Configuration
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export configuration
export const config = {
    supabaseUrl,
    supabaseAnonKey
};

// Note: Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY with your actual Supabase credentials
// You can get these from your Supabase project settings