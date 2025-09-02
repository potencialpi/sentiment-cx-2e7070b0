import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  robustLogout,
  handleLogoutWithFallback,
  checkAuthStatus,
  clearAuthStorage,
  signInSecurely,
  testUserIsolation,
  logAuthEvent
} from '../src/lib/authUtils';

// Mock do módulo Supabase
const mockSupabase = {
  auth: {
    signOut: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn()
  },
  rpc: vi.fn()
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock do localStorage e sessionStorage
const mockLocalStorage = {
  removeItem: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
};

const mockSessionStorage = {
  removeItem: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
};

// Mock do navigator e window
const mockNavigator = {
  userAgent: 'Test User Agent',
  clipboard: {
    writeText: vi.fn()
  }
};

const mockWindow = {
  location: {
    href: 'http://localhost:3000/test',
    reload: vi.fn()
  }
};

describe('authUtils', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup global mocks
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });
    
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
    
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    });

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock setTimeout
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('clearAuthStorage', () => {
    it('should clear all Supabase-related storage items', () => {
      // Mock Object.keys to return some test keys
      const mockKeys = [
        'supabase.auth.token',
        'sb-test-auth-token',
        'mjuxvppexydaeuoernxa-test',
        'other-key',
        'supabase.auth.session'
      ];
      
      Object.defineProperty(Object, 'keys', {
        value: vi.fn().mockReturnValue(mockKeys),
        writable: true
      });

      clearAuthStorage();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('supabase.auth.token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('sb-mjuxvppexydaeuoernxa-auth-token');
      expect(console.log).toHaveBeenCalledWith('[AUTH] Local storage cleared - isolamento garantido');
    });

    it('should handle storage errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => clearAuthStorage()).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith('[AUTH] Error clearing storage:', expect.any(Error));
    });
  });

  describe('checkAuthStatus', () => {
    it('should return true when user has valid session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
        error: null
      });

      const result = await checkAuthStatus();

      expect(result).toBe(true);
      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    });

    it('should return false when no session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      const result = await checkAuthStatus();

      expect(result).toBe(false);
    });

    it('should return false when session check fails', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' }
      });

      const result = await checkAuthStatus();

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('[AUTH] Session check error:', 'Session error');
    });

    it('should handle exceptions gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));

      const result = await checkAuthStatus();

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('[AUTH] Session check exception:', expect.any(Error));
    });
  });

  describe('signInSecurely', () => {
    const testEmail = 'test@example.com';
    const testPassword = 'password123';

    it('should successfully sign in user', async () => {
      const mockUser = { id: 'test-user', email: testEmail };
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await signInSecurely(testEmail, testPassword);

      expect(result.data).toEqual({ user: mockUser });
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: testEmail,
        password: testPassword
      });
    });

    it('should handle login errors', async () => {
      const loginError = new Error('Invalid credentials');
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: loginError
      });

      const result = await signInSecurely(testEmail, testPassword);

      expect(result.data).toBeNull();
      expect(result.error).toBe(loginError);
    });

    it('should continue login even if pre-logout fails', async () => {
      const mockUser = { id: 'test-user', email: testEmail };
      mockSupabase.auth.signOut.mockRejectedValue(new Error('Logout failed'));
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await signInSecurely(testEmail, testPassword);

      expect(result.data).toEqual({ user: mockUser });
      expect(result.error).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('[AUTH] Pre-login logout failed, continuing:', expect.any(Error));
    });
  });

  describe('robustLogout', () => {
    it('should successfully logout and navigate', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await robustLogout(mockNavigate);

      expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(mockWindow.location.reload).toHaveBeenCalled();
    });

    it('should handle logout timeout', async () => {
      // Mock a slow logout that times out
      mockSupabase.auth.signOut.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      await robustLogout(mockNavigate);

      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(console.warn).toHaveBeenCalledWith(
        '[AUTH] Logout failed, but continuing with local cleanup:', 
        expect.any(Error)
      );
    });

    it('should handle logout errors gracefully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ 
        error: { message: 'Logout error' } 
      });

      await robustLogout(mockNavigate);

      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(console.warn).toHaveBeenCalledWith('[AUTH] Supabase logout warning:', 'Logout error');
    });
  });

  describe('handleLogoutWithFallback', () => {
    it('should call robustLogout successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await handleLogoutWithFallback(mockNavigate);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should use emergency fallback on critical error', async () => {
      const mockOnError = vi.fn();
      
      // Mock robustLogout to throw an error
      mockSupabase.auth.signOut.mockRejectedValue(new Error('Critical error'));
      
      // Mock window.location.href
      Object.defineProperty(mockWindow.location, 'href', {
        set: vi.fn(),
        configurable: true
      });

      await handleLogoutWithFallback(mockNavigate, mockOnError);

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
      expect(console.error).toHaveBeenCalledWith('[AUTH] Critical logout error:', expect.any(Error));
    });
  });

  describe('testUserIsolation', () => {
    const testUserId = 'test-user-123';

    it('should return true when isolation test passes', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ result: true }, { result: true }],
        error: null
      });

      const result = await testUserIsolation(testUserId);

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('test_user_data_isolation', {
        _user_id: testUserId
      });
    });

    it('should return false when isolation test fails', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ result: true }, { result: false }],
        error: null
      });

      const result = await testUserIsolation(testUserId);

      expect(result).toBe(false);
    });

    it('should return false when RPC call fails', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC error' }
      });

      const result = await testUserIsolation(testUserId);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('[SECURITY] Isolation test failed:', { message: 'RPC error' });
    });

    it('should handle exceptions gracefully', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Network error'));

      const result = await testUserIsolation(testUserId);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('[SECURITY] Isolation test exception:', expect.any(Error));
    });
  });

  describe('logAuthEvent', () => {
    it('should log authentication events with details', () => {
      const eventName = 'LOGIN_ATTEMPT';
      const eventDetails = { userId: 'test-user' };

      logAuthEvent(eventName, eventDetails);

      expect(console.log).toHaveBeenCalledWith(
        `[AUTH] ${eventName}:`,
        expect.objectContaining({
          timestamp: expect.any(String),
          userAgent: 'Test User Agent',
          url: 'http://localhost:3000/test',
          userId: 'test-user'
        })
      );
    });

    it('should log events without additional details', () => {
      const eventName = 'LOGOUT';

      logAuthEvent(eventName);

      expect(console.log).toHaveBeenCalledWith(
        `[AUTH] ${eventName}:`,
        expect.objectContaining({
          timestamp: expect.any(String),
          userAgent: 'Test User Agent',
          url: 'http://localhost:3000/test'
        })
      );
    });
  });
});