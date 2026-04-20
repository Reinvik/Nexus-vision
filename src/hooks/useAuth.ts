import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Profile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoadingAuth(false);
      }
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      const profileData = data as Profile;
      
      // Si el usuario está bloqueado, desloguear inmediatamente
      if (profileData.is_blocked) {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingAuth(false);
    }
  };

  const isSuperAdmin = 
    ['ariel.mellag@gmail.com', 'equipo@belean.cl'].includes(user?.email?.toLowerCase() || '') || 
    profile?.role?.toLowerCase() === 'superadmin';

  return { user, profile, loadingAuth, isSuperAdmin };
}
