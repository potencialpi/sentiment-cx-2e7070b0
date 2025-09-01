import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface MagicLinkRequestData {
  email: string
  surveyId: string
  surveyTitle?: string
}

interface MagicLinkResponse {
  success: boolean
  message: string
  data?: {
    token: string
    magicLink: string
    expiresAt: string
    email: string
    surveyId: string
  }
  error?: string
}

interface ValidationResponse {
  success: boolean
  message: string
  data?: {
    email: string
    surveyId: string
    surveyTitle: string
    expiresAt: string
  }
  error?: string
}

interface AuthResponse {
  success: boolean
  message: string
  data?: {
    session: any
    user: any
    surveyData: any
  }
  error?: string
}

interface UseMagicLinkAuthReturn {
  // Estados
  isLoading: boolean
  isValidating: boolean
  isAuthenticated: boolean
  error: string | null
  magicLinkData: any
  validationData: any
  
  // Funções
  requestMagicLink: (data: MagicLinkRequestData) => Promise<MagicLinkResponse | null>
  validateMagicLink: (token: string) => Promise<ValidationResponse | null>
  authenticateWithMagicLink: (token: string) => Promise<AuthResponse | null>
  clearError: () => void
  reset: () => void
  
  // Utilitários
  isValidEmail: (email: string) => boolean
  formatExpirationTime: (expiresAt: string) => string
}

export function useMagicLinkAuth(): UseMagicLinkAuthReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkData, setMagicLinkData] = useState<any>(null)
  const [validationData, setValidationData] = useState<any>(null)
  const { toast } = useToast()

  // Verificar se já está autenticado
  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    
    checkAuthStatus()

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
      
      if (event === 'SIGNED_IN' && session) {
        console.log('Usuário autenticado via magic link:', {
          userId: session.user.id,
          email: session.user.email,
          timestamp: new Date().toISOString()
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const requestMagicLink = useCallback(async (data: MagicLinkRequestData): Promise<MagicLinkResponse | null> => {
    try {
      setIsLoading(true)
      setError(null)

      // Validar email
      if (!isValidEmail(data.email)) {
        throw new Error('Email inválido')
      }

      // Validar surveyId
      if (!data.surveyId || data.surveyId.trim() === '') {
        throw new Error('ID da pesquisa é obrigatório')
      }

      console.log('Solicitando magic link:', {
        email: data.email,
        surveyId: data.surveyId,
        timestamp: new Date().toISOString()
      })

      const { data: result, error: functionError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'generate',
          email: data.email,
          surveyId: data.surveyId
        }
      })

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao solicitar magic link')
      }

      const response: MagicLinkResponse = result

      if (!response.success) {
        throw new Error(response.error || 'Falha ao gerar magic link')
      }

      setMagicLinkData(response.data)
      
      toast({
        title: "Magic Link Enviado!",
        description: "Verifique seu email para acessar a pesquisa.",
        variant: "default"
      })

      console.log('Magic link gerado com sucesso:', {
        email: data.email,
        surveyId: data.surveyId,
        expiresAt: response.data?.expiresAt,
        timestamp: new Date().toISOString()
      })

      return response

    } catch (err: any) {
      const errorMessage = err.message || 'Erro interno ao solicitar magic link'
      setError(errorMessage)
      
      toast({
        title: "Erro ao Enviar Magic Link",
        description: errorMessage,
        variant: "destructive"
      })

      console.error('Erro ao solicitar magic link:', {
        error: err.message,
        email: data.email,
        surveyId: data.surveyId,
        timestamp: new Date().toISOString()
      })

      return null
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const validateMagicLink = useCallback(async (token: string): Promise<ValidationResponse | null> => {
    try {
      setIsValidating(true)
      setError(null)

      if (!token || token.trim() === '') {
        throw new Error('Token de acesso não fornecido')
      }

      console.log('Validando magic link token')

      const { data: result, error: functionError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'validate',
          token: token
        }
      })

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao validar token')
      }

      const response: ValidationResponse = result

      if (!response.success) {
        throw new Error(response.error || 'Token inválido')
      }

      setValidationData(response.data)

      console.log('Token validado com sucesso')

      return response

    } catch (err: any) {
      const errorMessage = err.message || 'Erro interno na validação'
      setError(errorMessage)

      console.error('Erro ao validar magic link:', {
        error: err.message,
        tokenLength: token?.length || 0,
        timestamp: new Date().toISOString()
      })

      return null
    } finally {
      setIsValidating(false)
    }
  }, [])

  const authenticateWithMagicLink = useCallback(async (token: string): Promise<AuthResponse | null> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!token || token.trim() === '') {
        throw new Error('Token de acesso não fornecido')
      }

      console.log('Autenticando com magic link')

      const { data: result, error: functionError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'use',
          token: token
        }
      })

      if (functionError) {
        throw new Error(functionError.message || 'Erro na autenticação')
      }

      const response: AuthResponse = result

      if (!response.success) {
        throw new Error(response.error || 'Falha na autenticação')
      }

      // Definir a sessão no Supabase client
      if (response.data?.session) {
        await supabase.auth.setSession(response.data.session)
        setIsAuthenticated(true)
      }

      toast({
        title: "Autenticação Realizada!",
        description: "Você foi autenticado com sucesso.",
        variant: "default"
      })

      console.log('Autenticação realizada com sucesso')

      return response

    } catch (err: any) {
      const errorMessage = err.message || 'Erro interno na autenticação'
      setError(errorMessage)
      
      toast({
        title: "Erro na Autenticação",
        description: errorMessage,
        variant: "destructive"
      })

      console.error('Erro na autenticação com magic link:', {
        error: err.message,
        tokenLength: token?.length || 0,
        timestamp: new Date().toISOString()
      })

      return null
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setIsValidating(false)
    setError(null)
    setMagicLinkData(null)
    setValidationData(null)
  }, [])

  const isValidEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }, [])

  const formatExpirationTime = useCallback((expiresAt: string): string => {
    try {
      const expirationDate = new Date(expiresAt)
      const now = new Date()
      const diffMs = expirationDate.getTime() - now.getTime()
      
      if (diffMs <= 0) {
        return 'Expirado'
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      
      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m restantes`
      } else {
        return `${diffMinutes}m restantes`
      }
    } catch {
      return 'Tempo inválido'
    }
  }, [])

  return {
    // Estados
    isLoading,
    isValidating,
    isAuthenticated,
    error,
    magicLinkData,
    validationData,
    
    // Funções
    requestMagicLink,
    validateMagicLink,
    authenticateWithMagicLink,
    clearError,
    reset,
    
    // Utilitários
    isValidEmail,
    formatExpirationTime
  }
}

export default useMagicLinkAuth