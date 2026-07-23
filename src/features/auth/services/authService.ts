import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import { AuthUser, SignInCredentials, SignUpCredentials } from '../types';

/**
 * Service encapsulant la logique d'authentification Supabase.
 */
export const authService = {
  /**
   * Connexion par email et mot de passe.
   */
  async signInWithEmail({ email, password }: SignInCredentials): Promise<{ session: Session; user: AuthUser }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session || !data.user) {
      throw new Error('Connexion échouée : aucune session retournée.');
    }

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || '',
      fullName: data.user.user_metadata?.full_name || '',
      avatarUrl: data.user.user_metadata?.avatar_url || '',
    };

    return { session: data.session, user };
  },

  /**
   * Création de compte par email et mot de passe.
   */
  async signUpWithEmail({ email, password, fullName }: SignUpCredentials): Promise<{ session: Session | null; user: AuthUser | null }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    const authUser = data.user
      ? {
          id: data.user.id,
          email: data.user.email || '',
          fullName: fullName || data.user.user_metadata?.full_name || '',
          avatarUrl: data.user.user_metadata?.avatar_url || '',
        }
      : null;

    return { session: data.session, user: authUser };
  },

  /**
   * Déconnexion de l'utilisateur.
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Récupère la session active courante.
   */
  async getCurrentSession(): Promise<{ session: Session | null; user: AuthUser | null }> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      return { session: null, user: null };
    }

    const user: AuthUser = {
      id: data.session.user.id,
      email: data.session.user.email || '',
      fullName: data.session.user.user_metadata?.full_name || '',
      avatarUrl: data.session.user.user_metadata?.avatar_url || '',
    };

    return { session: data.session, user };
  },

  /**
   * Écouteur de changement d'état d'authentification Supabase.
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription;
  },
};
