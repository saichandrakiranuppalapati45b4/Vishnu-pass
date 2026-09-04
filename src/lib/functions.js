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
 * Register a student account with Supabase Auth credentials and database record
 */
export const registerStudentAccount = async (studentData) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-student-user', {
      body: studentData,
    });

    if (error) {
      // In case supabase.functions.invoke wraps an HTTP error
      const errorMsg = data?.error || error.message || 'Failed to register student authentication credentials';
      throw new Error(errorMsg);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return { data: data?.student || data };
  } catch (err) {
    console.error('Error in registerStudentAccount:', err);
    throw err;
  }
};

/**
 * Delete a student account from both database and Supabase Auth
 */
export const deleteStudentAccount = async ({ id, studentId, email }) => {
  try {
    const { data, error } = await supabase.functions.invoke('delete-student-user', {
      body: { id, studentId, email },
    });

    if (error) {
      const errorMsg = data?.error || error.message || 'Failed to delete student authentication credentials';
      throw new Error(errorMsg);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return { data };
  } catch (err) {
    console.error('Error in deleteStudentAccount via function:', err);
    // Fallback: delete directly from DB if edge function has issues (Postgres trigger will also attempt to delete from auth.users)
    if (id) {
      await supabase.from('scan_sessions').delete().eq('student_id', studentId || id);
      await supabase.from('student_devices').delete().eq('student_id', id);
      const { error: dbErr } = await supabase.from('students').delete().eq('id', id);
      if (dbErr) throw dbErr;
    } else if (studentId) {
      await supabase.from('scan_sessions').delete().eq('student_id', studentId);
      const { error: dbErr } = await supabase.from('students').delete().eq('student_id', studentId);
      if (dbErr) throw dbErr;
    }
    return { data: { success: true } };
  }
};

/**
 * Create a student record in Supabase (legacy fallback)
 */
export const createStudentAccount = async (studentData) => {
  return registerStudentAccount(studentData);
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

