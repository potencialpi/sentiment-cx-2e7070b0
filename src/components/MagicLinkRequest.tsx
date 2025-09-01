import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Shield, Clock, CheckCircle, AlertTriangle, Copy, Link, ExternalLink, RefreshCw } from 'lucide-react'
import { useMagicLinkAuth } from '@/hooks/useMagicLinkAuth'
import { useToast } from '@/hooks/use-toast'

interface MagicLinkRequestProps {
  surveyId: string
  surveyTitle: string
  onSuccess?: (data: any) => void
}

export function MagicLinkRequest({ surveyId, surveyTitle, onSuccess }: MagicLinkRequestProps) {
  const [email, setEmail] = useState('')
  const {
    isLoading,
    error,
    magicLinkData,
    requestMagicLink,
    clearError,
    reset,
    isValidEmail
  } = useMagicLinkAuth()
  const [isSuccess, setIsSuccess] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      return
    }

    if (!isValidEmail(email)) {
      return
    }

    const result = await requestMagicLink({
      email: email.trim(),
      surveyId,
      surveyTitle
    })

    if (result?.success) {
      setIsSuccess(true)
      if (onSuccess) {
        onSuccess(result.data)
      }
    }
  }

  const handleNewRequest = () => {
    setIsSuccess(false)
    setEmail('')
    clearError()
    reset()
  }

  const handleCopyToClipboard = async () => {
    if (!magicLinkData?.magicLinkUrl) return
    
    try {
      await navigator.clipboard.writeText(magicLinkData.magicLinkUrl)
      setCopySuccess(true)
      toast({
        title: "Link Copiado!",
        description: "O magic link foi copiado para a área de transferência.",
        variant: "default"
      })
      
      // Reset copy success after 3 seconds
      setTimeout(() => setCopySuccess(false), 3000)
    } catch (err) {
      toast({
        title: "Erro ao Copiar",
        description: "Não foi possível copiar o link. Tente selecionar e copiar manualmente.",
        variant: "destructive"
      })
    }
  }

  if (isSuccess && magicLinkData) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Link className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Magic Link Gerado!</CardTitle>
          <CardDescription>
            Link de acesso gerado para <strong>{email}</strong>. Copie o link abaixo e envie diretamente ao respondente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Link gerado com sucesso!</strong><br />
              Copie o link abaixo para compartilhar. Válido por 24 horas e uso único.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <label htmlFor="magic-link" className="text-sm font-medium">
              Seu Magic Link:
            </label>
            <div className="flex gap-2">
              <Input
                id="magic-link"
                type="text"
                value={magicLinkData.magicLinkUrl || ''}
                readOnly
                className="font-mono text-xs"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                onClick={handleCopyToClipboard}
                variant={copySuccess ? "default" : "outline"}
                size="sm"
                className="px-3"
              >
                {copySuccess ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            {copySuccess && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Link copiado para a área de transferência!
              </p>
            )}
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Expira em: {new Date(magicLinkData.expiresAt).toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4" />
              <span>Pesquisa: {surveyTitle}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleNewRequest}
              className="flex-1"
            >
              Gerar Novo Link
            </Button>
            <Button 
              onClick={() => window.open(magicLinkData.magicLinkUrl, '_blank')}
              className="flex-1"
            >
              <Link className="mr-2 h-4 w-4" />
              Abrir Link
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            <Shield className="w-3 h-3 inline mr-1" />
            Seus dados estão protegidos conforme a LGPD
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle>Acesso Seguro à Pesquisa</CardTitle>
        <CardDescription>
          Gere um link de acesso seguro para o respondente participar da pesquisa <strong>"{surveyTitle}"</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Seu Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full"
              autoComplete="email"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            disabled={isLoading || !email.trim() || !isValidEmail(email)}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                Gerar Link de Acesso
              </>
            )}
          </Button>

          <div className="space-y-3 text-xs text-gray-600">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-800 mb-1">Proteção de Dados (LGPD)</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• Seus dados são criptografados e protegidos</li>
                    <li>• Acesso exclusivo às suas respostas</li>
                    <li>• Link válido por apenas 24 horas</li>
                    <li>• Uso único para máxima segurança</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p>⚠️ <strong>Proteção de Dados:</strong> Este email será usado apenas para identificação do respondente. Não compartilhamos seus dados com terceiros e você pode solicitar remoção a qualquer momento.</p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default MagicLinkRequest