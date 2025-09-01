import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MagicLinkValidator } from '@/components/MagicLinkValidator'
import { useMagicLinkAuth } from '@/hooks/useMagicLinkAuth'
import { useToast } from '@/hooks/use-toast'

/**
 * Página de autenticação via Magic Link
 * 
 * Esta página é acessada quando o usuário clica no link recebido por email.
 * Ela valida o token, autentica o usuário e redireciona para a pesquisa.
 * 
 * Parâmetros da URL esperados:
 * - token: Token único do magic link
 * - surveyId: ID da pesquisa (opcional, pode vir do token)
 */
export function MagicLinkAuth() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAuthenticated } = useMagicLinkAuth()

  const token = searchParams.get('token')
  const surveyId = searchParams.get('surveyId')

  // Callback para sucesso na validação/autenticação
  const handleValidationSuccess = (data: any) => {
    console.log('Autenticação via magic link bem-sucedida:', {
      surveyId: data?.surveyData?.surveyId || surveyId,
      email: data?.surveyData?.email,
      userId: data?.user?.id,
      timestamp: new Date().toISOString()
    })

    toast({
      title: "Acesso Autorizado!",
      description: "Você foi autenticado com sucesso. Redirecionando...",
      variant: "default"
    })

    // Redirecionar para a pesquisa após um breve delay
    const targetSurveyId = data?.surveyData?.surveyId || surveyId
    if (targetSurveyId) {
      setTimeout(() => {
        navigate(`/survey/${targetSurveyId}`, { replace: true })
      }, 2000)
    } else {
      // Fallback: redirecionar para home se não tiver surveyId
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 2000)
    }
  }

  // Callback para erro na validação/autenticação
  const handleValidationError = (error: string) => {
    console.error('Erro na autenticação via magic link:', {
      error,
      token: token ? `${token.substring(0, 8)}...` : 'não fornecido',
      surveyId,
      timestamp: new Date().toISOString()
    })

    toast({
      title: "Erro de Autenticação",
      description: error || "Não foi possível validar seu acesso.",
      variant: "destructive"
    })
  }

  // Se não há token, mostrar erro
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Inválido</h1>
            <p className="text-gray-600 mb-4">
              Este link de acesso não é válido ou está malformado.
            </p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Se já está autenticado, redirecionar
  if (isAuthenticated && surveyId) {
    navigate(`/survey/${surveyId}`, { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com informações de segurança */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Conexão segura - Seus dados estão protegidos</span>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex items-center justify-center min-h-[calc(100vh-60px)] p-4">
        <div className="w-full max-w-md">
          <MagicLinkValidator
            onValidationSuccess={handleValidationSuccess}
            onValidationError={handleValidationError}
          />
        </div>
      </div>

      {/* Footer com informações de privacidade */}
      <div className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>
              Este link é único e temporário. Válido por 24 horas após a geração.
            </p>
            <p>
              Seus dados são processados em conformidade com a LGPD.
              <br />
              <a href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                Política de Privacidade
              </a>
              {' | '}
              <a href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                Termos de Uso
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MagicLinkAuth