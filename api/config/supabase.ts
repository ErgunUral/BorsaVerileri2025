import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';

let supabase: any = null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase environment variables. Supabase features will be disabled.');
  // Create a mock client that returns null for all operations
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') })
    },
    from: () => ({
      select: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    })
  };
} else {
  // Create Supabase client with service role key for backend operations
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export { supabase };

// Export types for TypeScript
// export type { Database } from '../types/supabase';

// Helper function to get authenticated user from request
export const getAuthenticatedUser = async (authHeader?: string) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
};

// Helper function to create client-side Supabase instance
export const createClientSupabase = () => {
  const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'] || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase client environment variables. Client features will be disabled.');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};