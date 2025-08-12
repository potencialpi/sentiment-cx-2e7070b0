import { supabase } from '@/integrations/supabase/client';

/**
 * Robust logout function that handles network errors and ensures local cleanup
 * @param navigate - React Router navigate function
 */
export const robustLogout = async (navigate: (path: string) => void) => {
  try {
    // 1. Clear local storage first to ensure immediate logout effect
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('sb-mjuxvppexydaeuoernxa-auth-token');
    sessionStorage.clear();
    
    // Log the logout attempt
    console.log('[AUTH] Logout attempt started:', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // 2. Try to logout from Supabase with timeout to prevent hanging
    const logoutPromise = supabase.auth.signOut({ scope: 'local' });
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Logout timeout after 3 seconds')), 3000)
    );
    
    const result = await Promise.race([logoutPromise, timeoutPromise]);
    
    if ('error' in result && result.error) {
      console.warn('[AUTH] Supabase logout warning:', result.error.message);
    } else {
      console.log('[AUTH] Supabase logout successful');
    }
    
  } catch (error) {
    // Log the error but don't prevent local logout
    console.warn('[AUTH] Logout failed, but continuing with local cleanup:', error);
  } finally {
    // 3. Always redirect and clean state, regardless of Supabase response
    console.log('[AUTH] Redirecting to home and clearing state');
    navigate('/');
    
    // Force a page reload after a short delay to ensure complete state cleanup
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
};

/**
 * Enhanced logout handler with better error handling
 * @param navigate - React Router navigate function
 * @param onError - Optional error callback
 */
export const handleLogoutWithFallback = async (
  navigate: (path: string) => void,
  onError?: (error: any) => void
) => {
  try {
    await robustLogout(navigate);
  } catch (error) {
    console.error('[AUTH] Critical logout error:', error);
    if (onError) {
      onError(error);
    }
    
    // Emergency fallback - force navigation even if everything fails
    window.location.href = '/';
  }
};

/**
 * Check if user is authenticated with error handling
 * @returns Promise<boolean>
 */
export const checkAuthStatus = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('[AUTH] Session check error:', error.message);
      return false;
    }
    
    return !!session;
  } catch (error) {
    console.warn('[AUTH] Session check exception:', error);
    return false;
  }
};

/**
 * Clear all authentication-related storage
 */
export const clearAuthStorage = () => {
  try {
    // Clear Supabase tokens
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('sb-mjuxvppexydaeuoernxa-auth-token');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear any other auth-related items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('[AUTH] Local storage cleared');
  } catch (error) {
    console.warn('[AUTH] Error clearing storage:', error);
  }
};

/**
 * Log authentication events for debugging
 * @param event - Event name
 * @param details - Event details
 */
export const logAuthEvent = (event: string, details: any = {}) => {
  console.log(`[AUTH] ${event}:`, {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...details
  });
};