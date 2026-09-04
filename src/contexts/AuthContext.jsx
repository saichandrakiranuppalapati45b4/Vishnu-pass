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
      const { data: guardData } = await supabase
        .from('guards')
        .select('*')
        .ilike('email', emailLower)
        .maybeSingle();

      if (guardData) {
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
          shift_id: guardData.shift_id
        };
      }

      // 3. Check students table
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .ilike('email', emailLower)
        .maybeSingle();

      if (studentData) {
        if (studentData.status === 'Suspended') {
          console.warn('Student account is suspended. Signing out.');
          await supabase.auth.signOut();
          return null;
        }
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
