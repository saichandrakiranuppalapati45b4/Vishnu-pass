import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (user) => {
    if (!user || !user.email) return null;

    try {
      const emailLower = user.email.toLowerCase().trim();

      // 1. Check admins table (College Admin)
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .ilike('email', emailLower)
        .maybeSingle();

      if (adminData) {
        if (adminData.status === 'Suspended') {
          console.warn('Admin account is suspended. Signing out.');
          await supabase.auth.signOut();
          return null;
        }
        return {
          ...adminData,
          uid: user.id,
          id: adminData.id || user.id,
          name: adminData.name || 'College Admin',
          email: adminData.email || user.email,
          role: 'college_admin',
          collegeName: 'Vishnu Institute',
          status: adminData.status || 'Active'
        };
      }

      // 2. Check guards table
      let { data: guardData } = await supabase
        .from('guards')
        .select('*, guard_gates(id, name), guard_shifts(id, name)')
        .ilike('email', emailLower)
        .maybeSingle();

      if (!guardData) {
        // Fallback simple query if join syntax fails
        const { data: simpleGuard } = await supabase
          .from('guards')
          .select('*')
          .ilike('email', emailLower)
          .maybeSingle();
        guardData = simpleGuard;
      }

      if (guardData) {
        let gateName = guardData.guard_gates?.name || null;
        let shiftName = guardData.guard_shifts?.name || null;

        // If gateName wasn't resolved by relation join, look it up from guard_gates
        if (!gateName && guardData.gate_id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guardData.gate_id);
          if (isUuid) {
            try {
              const { data: gateRow } = await supabase
                .from('guard_gates')
                .select('name')
                .eq('id', guardData.gate_id)
                .maybeSingle();
              if (gateRow?.name) {
                gateName = gateRow.name;
              }
            } catch (e) {
              console.warn('Gate name lookup failed:', e);
            }
          } else {
            gateName = guardData.gate_id;
          }
        }

        // If shiftName wasn't resolved by relation join, look it up from guard_shifts
        if (!shiftName && guardData.shift_id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guardData.shift_id);
          if (isUuid) {
            try {
              const { data: shiftRow } = await supabase
                .from('guard_shifts')
                .select('name')
                .eq('id', guardData.shift_id)
                .maybeSingle();
              if (shiftRow?.name) {
                shiftName = shiftRow.name;
              }
            } catch (e) {
              console.warn('Shift name lookup failed:', e);
            }
          } else {
            shiftName = guardData.shift_id;
          }
        }

        const finalGateName = gateName || 'Main Campus Gate';
        const finalShiftName = shiftName || 'Morning Shift';

        return {
          ...guardData,
          uid: user.id,
          id: guardData.id || user.id,
          name: guardData.full_name || 'Guard',
          full_name: guardData.full_name || 'Guard',
          email: guardData.email || user.email,
          role: 'guard',
          collegeId: 'vishnu-institute',
          gate_id: guardData.gate_id,
          shift_id: guardData.shift_id,
          gate_name: finalGateName,
          guard_gates: { id: guardData.gate_id, name: finalGateName },
          guard_shifts: { id: guardData.shift_id, name: finalShiftName }
        };
      }

      // 3. Check students table
      let studentData = null;
      try {
        const { data: joinedData, error: joinErr } = await supabase
          .from('students')
          .select('*, departments(id, name)')
          .ilike('email', emailLower)
          .maybeSingle();
        
        if (!joinErr && joinedData) {
          studentData = joinedData;
        }
      } catch (err) {
        console.warn('Direct join on students & departments failed, falling back:', err);
      }

      if (!studentData) {
        const { data: rawData } = await supabase
          .from('students')
          .select('*')
          .ilike('email', emailLower)
          .maybeSingle();
        studentData = rawData;
      }

      if (studentData) {
        if (studentData.status === 'Suspended') {
          console.warn('Student account is suspended. Signing out.');
          await supabase.auth.signOut();
          return null;
        }

        // Robust department resolution
        let resolvedDeptName = null;
        let resolvedDeptId = studentData.department_id || null;

        if (studentData.departments) {
          if (Array.isArray(studentData.departments) && studentData.departments.length > 0) {
            resolvedDeptName = studentData.departments[0]?.name;
            resolvedDeptId = studentData.departments[0]?.id || resolvedDeptId;
          } else if (typeof studentData.departments === 'object' && studentData.departments.name) {
            resolvedDeptName = studentData.departments.name;
            resolvedDeptId = studentData.departments.id || resolvedDeptId;
          }
        }

        // If department name not yet resolved, look it up from departments table using department_id or department field
        if (!resolvedDeptName && (studentData.department_id || studentData.department)) {
          const deptTarget = studentData.department_id || studentData.department;
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deptTarget);
          
          if (isUuid || deptTarget.length <= 12) {
            try {
              const { data: deptRow } = await supabase
                .from('departments')
                .select('id, name')
                .eq('id', deptTarget)
                .maybeSingle();
              if (deptRow?.name) {
                resolvedDeptName = deptRow.name;
                resolvedDeptId = deptRow.id;
              }
            } catch (deptErr) {
              console.warn('Department lookup error:', deptErr);
            }
          } else {
            // Already a human-readable department name string
            resolvedDeptName = deptTarget;
          }
        }

        const finalDepartments = resolvedDeptName
          ? { id: resolvedDeptId, name: resolvedDeptName }
          : { name: 'Engineering' };

        return {
          ...studentData,
          uid: user.id,
          id: studentData.id || user.id,
          name: studentData.full_name || 'Student',
          full_name: studentData.full_name || 'Student',
          email: studentData.email || user.email,
          role: 'student',
          student_id: studentData.student_id,
          collegeId: 'vishnu-institute',
          department_id: resolvedDeptId,
          department: resolvedDeptName || 'Engineering',
          departments: finalDepartments,
          first_login_completed: (studentData.first_login_completed === true || user.user_metadata?.first_login_completed === true)
        };
      }


      // 4. Default fallback student profile if user is authenticated
      return {
        uid: user.id,
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: user.user_metadata?.role || 'student',
        collegeId: 'vishnu-institute'
      };

    } catch (err) {
      console.error('Error fetching user profile from Supabase:', err);
      return null;
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        const profile = await fetchUserProfile(session.user);
        setUserProfile(profile);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        const profile = await fetchUserProfile(session.user);
        setUserProfile(profile);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
