import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Clock, Shield, AlertTriangle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface MagicLinkValidatorProps {
  onValidationSuccess?: (data: any) => void
  onValidationError?: (error: string) => void
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

export function MagicLinkValidator({ onValidationSuccess, onValidationError }: MagicLinkValidatorProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'expired' | 'used' | 'authenticating' | 'authenticated' | 'error'>('validating')
  const [error, setError] = useState<string | null>(null)
  const [validationData, setValidationData] = useState<any>(null)
  const [countdown, setCountdown] = useState(5)

  const token = searchParams.get('token')
  const surveyId = searchParams.get('surveyId') || validationData?.surveyId



  const authenticateWithMagicLink = useCallback(async (token: string) => {
    try {
      setStatus('authenticating')
      setError(null)

      // Usar o token para autenticação
      const { data: authResult, error: authError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'use',
          token: token
        }
      })

      if (authError) {
        throw new Error(authError.message || 'Erro na autenticação')
      }

      const auth: AuthResponse = authResult

      if (!auth.success) {
        throw new Error(auth.error || 'Falha na autenticação')
      }

      // Definir a sessão no Supabase client
      if (auth.data?.session) {
        await supabase.auth.setSession(auth.data.session)
      }

      setStatus('authenticated')
      setCountdown(3) // Iniciar contagem regressiva

      console.log('Autenticação realizada com sucesso')

    } catch (err: any) {
      console.error('Erro na autenticação:', err)
      setStatus('auth_error')
      setError(err.message || 'Erro interno na autenticação')
    }
  }, [])

  const validateMagicLink = useCallback(async (token: string) => {
    try {
      setStatus('validating')
      setError(null)

      console.log('Validando magic link token:', token)

      const { data: validationResult, error: validationError } = await supabase.functions.invoke('magic-link', {
        body: {
          action: 'validate',
          token: token
        }
      })

      if (validationError) {
        throw new Error(validationError.message || 'Erro na validação')
      }

      const validation: ValidationResponse = validationResult

      if (!validation.success) {
        if (validation.error?.includes('expirado')) {
          setStatus('expired')
        } else if (validation.error?.includes('utilizado')) {
          setStatus('used')
        } else {
          setStatus('invalid')
        }
        setError(validation.error || 'Token inválido')
        if (onValidationError) {
          onValidationError(validation.error || 'Token inválido')
        }
        return
      }

      setValidationData(validation.data)
      setStatus('valid')

      // Auto-autenticar após 2 segundos
      setTimeout(() => {
        authenticateWithMagicLink(token)
      }, 2000)

      if (onValidationSuccess) {
        onValidationSuccess(validation.data)
      }

    } catch (err: any) {
      console.error('Erro ao validar magic link:', err)
      setStatus('error')
      setError(err.message || 'Erro interno ao validar token')
      if (onValidationError) {
        onValidationError(err.message || 'Erro interno')
      }
    }
  }, [onValidationError, authenticateWithMagicLink])

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Token de acesso não encontrado na URL')
      return
    }

    validateMagicLink(token)
  }, [token, validateMagicLink])

  useEffect(() => {
    if (status === 'authenticated' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (status === 'authenticated' && countdown === 0) {
      // Redirecionar para a pesquisa
      if (surveyId) {
        navigate(`/survey/${surveyId}`, { replace: true })
      }
    }
  }, [status, countdown, surveyId, navigate])

  const handleRetry = () => {
    if (token) {
      validateMagicLink(token)
    }
  }

  const handleRequestNewLink = () => {
    // Redirecionar para a página de solicitação de novo link
    if (surveyId) {
      navigate(`/survey/${surveyId}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'validating':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Validando Acesso</CardTitle>
              <CardDescription>
                Verificando seu link de acesso seguro...
              </CardDescription>
            </CardHeader>
          </Card>
        )

      case 'valid':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Link Válido!</CardTitle>
              <CardDescription>
                Autenticando automaticamente...
              </CardDescription>
            </CardHeader>
            {validationData && (
              <CardContent>
                <div className="bg-green-50 p-4 rounded-lg space-y-2">
                  <div className="text-sm text-green-700">
                    <strong>Email:</strong> {validationData.email}
                  </div>
                  <div className="text-sm text-green-700">
                    <strong>Pesquisa:</strong> {validationData.surveyTitle}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Clock className="w-4 h-4" />
                    <span>Expira em: {new Date(validationData.expiresAt).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )

      case 'authenticating':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Autenticando</CardTitle>
              <CardDescription>
                Criando sua sessão segura...
              </CardDescription>
            </CardHeader>
          </Card>
        )

      case 'authenticated':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Acesso Autorizado!</CardTitle>
              <CardDescription>
                Redirecionando para a pesquisa em {countdown} segundos...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <Shield className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-700">
                  Sua sessão foi criada com segurança. Você terá acesso exclusivo às suas respostas.
                </p>
              </div>
            </CardContent>
          </Card>
        )

      case 'expired':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-orange-800">Link Expirado</CardTitle>
              <CardDescription>
                Este link de acesso expirou. Links são válidos por apenas 24 horas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Por motivos de segurança, os links de acesso têm validade limitada.
                </AlertDescription>
              </Alert>
              <Button onClick={handleRequestNewLink} className="w-full mt-4">
                Solicitar Novo Link
              </Button>
            </CardContent>
          </Card>
        )

      case 'used':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-orange-800">Link Já Utilizado</CardTitle>
              <CardDescription>
                Este link de acesso já foi usado. Cada link pode ser usado apenas uma vez.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Por segurança, cada link de acesso é de uso único.
                </AlertDescription>
              </Alert>
              <Button onClick={handleRequestNewLink} className="w-full mt-4">
                Solicitar Novo Link
              </Button>
            </CardContent>
          </Card>
        )

      case 'invalid':
      case 'error':
      default:
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-800">Erro de Acesso</CardTitle>
              <CardDescription>
                Não foi possível validar seu link de acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button onClick={handleRetry} variant="outline" className="flex-1">
                  Tentar Novamente
                </Button>
                <Button onClick={handleRequestNewLink} className="flex-1">
                  Novo Link
                </Button>
              </div>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {renderContent()}
    </div>
  )
}

export default MagicLinkValidator