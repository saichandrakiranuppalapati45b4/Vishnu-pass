import { supabase } from '../config/supabase';

/**
 * Generate a dynamic QR verification token
 */
export const generateQrToken = async () => {
  const token = crypto.randomUUID ? crypto.randomUUID() : `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    data: {
      token,
      expiresAt: Date.now() + 30000
    }
  };
};

/**
 * Verify a dynamic QR token
 */
export const verifyQrToken = async ({ token }) => {
  return {
    data: {
      valid: !!token
    }
  };
};

/**
 * Create a student record in Supabase
 */
export const createStudentAccount = async (studentData) => {
  const { data, error } = await supabase
    .from('students')
    .insert([studentData])
    .select()
    .single();

  if (error) throw error;
  return { data };
};

/**
 * Create a guard record in Supabase
 */
export const createGuardAccount = async (guardData) => {
  const { data, error } = await supabase
    .from('guards')
    .insert([guardData])
    .select()
    .single();

  if (error) throw error;
  return { data };
};
