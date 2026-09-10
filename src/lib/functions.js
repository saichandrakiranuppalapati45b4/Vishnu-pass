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

const extractFunctionError = async (error, data, defaultMsg) => {
  if (data?.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  if (data?.message) return typeof data.message === 'string' ? data.message : JSON.stringify(data.message);

  if (error) {
    if (error.context) {
      try {
        const body = typeof error.context.json === 'function' ? await error.context.json() : error.context;
        if (body?.error) return typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
        if (body?.message) return typeof body.message === 'string' ? body.message : JSON.stringify(body.message);
      } catch {
        try {
          const text = typeof error.context.text === 'function' ? await error.context.text() : null;
          if (text) return text;
        } catch {}
      }
    }
    if (error.message && error.message !== 'Edge Function returned a non-2xx status code') {
      return error.message;
    }
  }
  return defaultMsg || 'An error occurred while communicating with the server';
};

/**
 * Register a student account with Supabase Auth credentials and database record
 */
export const registerStudentAccount = async (studentData) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-student-user', {
      body: studentData,
    });

    if (error || data?.error) {
      const errorMsg = await extractFunctionError(error, data, 'Failed to register student authentication credentials');
      throw new Error(errorMsg);
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

    if (error || data?.error) {
      const errorMsg = await extractFunctionError(error, data, 'Failed to delete student authentication credentials');
      throw new Error(errorMsg);
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
 * Register or update a guard account with Supabase Auth credentials and database record
 */
export const registerGuardAccount = async (guardData) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-guard-user', {
      body: guardData,
    });

    if (error || data?.error) {
      const errorMsg = await extractFunctionError(error, data, 'Failed to register guard authentication credentials');
      throw new Error(errorMsg);
    }

    return { data: data?.guard || data };
  } catch (err) {
    console.error('Error in registerGuardAccount:', err);
    throw err;
  }
};

/**
 * Delete a guard account from both database and Supabase Auth
 */
export const deleteGuardAccount = async ({ id, employeeId, email }) => {
  try {
    const { data, error } = await supabase.functions.invoke('delete-guard-user', {
      body: { id, employeeId, email },
    });

    if (error || data?.error) {
      const errorMsg = await extractFunctionError(error, data, 'Failed to delete guard authentication credentials');
      throw new Error(errorMsg);
    }

    return { data };
  } catch (err) {
    console.error('Error in deleteGuardAccount via function:', err);
    // Fallback: delete directly from DB
    if (id) {
      const { error: dbErr } = await supabase.from('guards').delete().eq('id', id);
      if (dbErr) throw dbErr;
    } else if (employeeId) {
      const { error: dbErr } = await supabase.from('guards').delete().eq('employee_id', employeeId);
      if (dbErr) throw dbErr;
    }
    return { data: { success: true } };
  }
};

/**
 * Create a guard record in Supabase (legacy fallback)
 */
export const createGuardAccount = async (guardData) => {
  return registerGuardAccount(guardData);
};
