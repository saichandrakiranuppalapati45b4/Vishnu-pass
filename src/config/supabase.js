import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fyyilfwujicikshqfcul.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eWlsZnd1amljaWtzaHFmY3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTI5NDgsImV4cCI6MjA4ODQyODk0OH0.tBOFhir3vOME-Lc_O2KDqmS-w6ksamIviIXYKBZgev4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Upload a file to a Supabase Storage bucket and return its public URL
 */
export const uploadFile = async (bucket, path, file) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
};

/**
 * Get public URL for a file in a Supabase Storage bucket
 */
export const getStorageUrl = (bucket, path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return publicUrl;
};
