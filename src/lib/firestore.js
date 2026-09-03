import { supabase } from '../config/supabase';

// ---------------------------
// Supabase Database Wrapper
// ---------------------------

export const createUserProfile = async (uid, data) => {
  const { data: result, error } = await supabase
    .from('admins')
    .upsert([{ id: uid, ...data }], { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return result;
};

export const getUserProfile = async (uid) => {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getStudents = async () => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getGuards = async () => {
  const { data, error } = await supabase
    .from('guards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getScanLogs = async () => {
  const { data, error } = await supabase
    .from('movement_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};
