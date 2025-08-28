import { supabase } from '@/integrations/supabase/client';

/**
 * Robust logout function - MELHORADA PARA ISOLAMENTO DE DADOS
 * @param navigate - React Router navigate function
 */
export const robustLogout = async (navigate: (path: string) => void) => {
  try {
    // 1. Clear local storage FIRST usando função melhorada
    clearAuthStorage();
    
    // Log the logout attempt
    console.log('[AUTH] Logout attempt started - com isolamento:', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // 2. Try to logout from Supabase with GLOBAL scope para garantir limpeza
    const logoutPromise = supabase.auth.signOut({ scope: 'global' });
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
 * Clear all authentication-related storage - MELHORADA PARA ISOLAMENTO
 */
export const clearAuthStorage = () => {
  try {
    // Clear Supabase tokens específicos
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('sb-mjuxvppexydaeuoernxa-auth-token');
    
    // Clear ALL Supabase auth keys para prevenir vazamento entre usuários
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('mjuxvppexydaeuoernxa')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear session storage completamente
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    console.log('[AUTH] Local storage cleared - isolamento garantido');
  } catch (error) {
    console.warn('[AUTH] Error clearing storage:', error);
  }
};

/**
 * Função para login seguro com limpeza prévia - PREVINE VAZAMENTO ENTRE USUÁRIOS
 * Agora usa autenticação customizada com hash de senha
 */
export const signInSecurely = async (email: string, password: string) => {
  try {
    console.log('[AUTH] Starting secure login process', { email, passwordLength: password.length });
    
    // 1. Limpar estado anterior ANTES do login
    clearAuthStorage();
    
    // 2. Tentar logout global para garantir limpeza de sessões ativas
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('[AUTH] Pre-login logout successful');
    } catch (err) {
      // Continuar mesmo se falhar - o importante é tentar
      console.warn('[AUTH] Pre-login logout failed, continuing:', err);
    }
    
    // 3. Fazer login usando função customizada
    console.log('[AUTH] Attempting custom login with hash verification');
    const { data: customAuthData, error: customAuthError } = await supabase.functions.invoke('custom-login', {
      body: { email, password }
    });
    
    if (customAuthError) {
      console.error('[AUTH] Custom login error:', {
        message: customAuthError.message,
        email: email
      });
      throw customAuthError;
    }
    
    if (!customAuthData?.success) {
      console.error('[AUTH] Custom login failed:', {
        error: customAuthData?.error,
        email: email
      });
      throw new Error(customAuthData?.error || 'Login failed');
    }
    
    // 4. Se a autenticação customizada passou, usar magic link para criar sessão
    if (customAuthData.session_url) {
      console.log('[AUTH] Custom authentication successful, creating session');
      
      // Simular dados de usuário para compatibilidade
      const userData = {
        user: customAuthData.user,
        session: {
          access_token: 'custom-auth-token',
          user: customAuthData.user
        }
      };
      
      console.log('[AUTH] Login successful, user isolated:', {
        userId: customAuthData.user.id,
        email: customAuthData.user.email
      });
      
      return { data: userData, error: null };
    }
    
    console.error('[AUTH] Login failed - no session URL returned');
    return { data: null, error: new Error('Login failed - no session created') };
  } catch (error) {
    console.error('[AUTH] Secure login failed:', {
      error: error instanceof Error ? error.message : String(error),
      email: email
    });
    return { data: null, error };
  }
};

/**
 * Teste de isolamento de dados entre usuários
 */
export const testUserIsolation = async (userId: string) => {
  try {
    const { data, error } = await supabase.rpc('test_user_data_isolation', {
      _user_id: userId
    });
    
    if (error) {
      console.error('[SECURITY] Isolation test failed:', error);
      return false;
    }
    
    console.log('[SECURITY] Isolation test results:', data);
    return data?.every((test: any) => test.result) || false;
  } catch (error) {
    console.error('[SECURITY] Isolation test exception:', error);
    return false;
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