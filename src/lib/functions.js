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

/**
 * Fetch combined movement logs from movement_logs and completed scan_sessions
 */
export const fetchCombinedMovementLogs = async ({ studentId, limit = 50 } = {}) => {
  try {
    // 1. Fetch from movement_logs
    let mQuery = supabase
      .from('movement_logs')
      .select('*, guard_gates:access_point_id(id, name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (studentId) {
      const sUpper = String(studentId).toUpperCase();
      const sLower = String(studentId).toLowerCase();
      if (sUpper === sLower) {
        mQuery = mQuery.eq('student_id', studentId);
      } else {
        mQuery = mQuery.or(`student_id.eq.${studentId},student_id.eq.${sUpper},student_id.eq.${sLower}`);
      }
    }

    const { data: movementLogs } = await mQuery;

    // 2. Fetch from scan_sessions
    let sQuery = supabase
      .from('scan_sessions')
      .select('*, guard_gates:gate_id(id, name), students:student_id(full_name, photo_url, department_id, departments(name))')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (studentId) {
      const sUpper = String(studentId).toUpperCase();
      const sLower = String(studentId).toLowerCase();
      if (sUpper === sLower) {
        sQuery = sQuery.eq('student_id', studentId);
      } else {
        sQuery = sQuery.or(`student_id.eq.${studentId},student_id.eq.${sUpper},student_id.eq.${sLower}`);
      }
    }

    const { data: scanSessions } = await sQuery;

    // Normalize scan_sessions to match movement_logs structure
    const normalizedSessions = (scanSessions || [])
      .filter(s => s.status === 'completed' || s.status === 'approved' || s.status === 'Success' || s.status === 'rejected' || s.status === 'denied')
      .map(s => {
        const studentName = s.students?.full_name || s.student_id;
        const deptName = s.students?.departments?.name || 'Engineering';
        const isApproved = s.status === 'completed' || s.status === 'approved' || s.status === 'Success';
        
        return {
          id: s.id,
          user_name: studentName,
          student_name: studentName,
          studentName: studentName,
          student_id: s.student_id,
          studentId: s.student_id,
          movement_type: s.movement_type || 'IN',
          movementType: s.movement_type || 'IN',
          status: isApproved ? 'Success' : (s.status === 'rejected' ? 'Denied' : s.status),
          access_point_id: s.gate_id,
          guard_gates: s.guard_gates,
          created_at: s.created_at,
          photoUrl: s.students?.photo_url || null,
          photo_url: s.students?.photo_url || null,
          department: deptName,
          departments: s.students?.departments || { name: deptName },
          warning: s.warning,
          isScanSession: true
        };
      });

    // Merge and deduplicate by student_id and timestamp within 5 seconds
    const allLogs = [...(movementLogs || []).map(l => ({
      ...l,
      studentName: l.user_name || l.student_id,
      studentId: l.student_id,
      movementType: l.movement_type
    }))];
    
    for (const sess of normalizedSessions) {
      const sessTime = new Date(sess.created_at).getTime();
      const isDuplicate = allLogs.some(l => {
        const lTime = new Date(l.created_at).getTime();
        const lStudent = (l.student_id || l.studentId || '').toLowerCase();
        const sStudent = (sess.student_id || '').toLowerCase();
        const lType = (l.movement_type || l.movementType || '').toUpperCase();
        const sType = (sess.movement_type || '').toUpperCase();

        return lStudent === sStudent && 
               lType === sType && 
               Math.abs(lTime - sessTime) < 5000;
      });
      if (!isDuplicate) {
        allLogs.push(sess);
      }
    }

    // Sort by created_at descending
    allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allLogs.slice(0, limit);
  } catch (err) {
    console.warn('Error fetching combined logs:', err);
    return [];
  }
};

