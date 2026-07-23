import { useAuthStore } from '../store/useAuthStore';

/**
 * Custom hook pour utiliser l'authentification dans les composants React.
 */
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const clearError = useAuthStore((state) => state.clearError);

  return {
    user,
    session,
    isAuthenticated: !!session && !!user,
    isLoading,
    isInitialized,
    error,
    login,
    register,
    logout,
    initializeAuth,
    clearError,
  };
};
