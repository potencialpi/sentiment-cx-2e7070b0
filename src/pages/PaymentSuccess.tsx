import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        toast({
          title: "Erro",
          description: "Sessão de pagamento não encontrada",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data?.success) {
          toast({
            title: "Pagamento confirmado!",
            description: `Seu plano ${data.subscriptionTier} foi ativado com sucesso`,
          });
          setPaymentVerified(true);
        } else {
          throw new Error(data?.error || 'Pagamento não confirmado');
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        toast({
          title: "Erro na verificação",
          description: "Não foi possível verificar o pagamento. Entre em contato com o suporte.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate, toast]);

  const handleContinue = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-brand-green mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verificando pagamento...</h2>
            <p className="text-gray-600 text-center">
              Aguarde enquanto confirmamos seu pagamento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {paymentVerified ? 'Pagamento Confirmado!' : 'Processando...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {paymentVerified ? (
            <>
              <p className="text-gray-600">
                Sua assinatura foi ativada com sucesso! Agora você pode acessar todos os recursos do seu plano.
              </p>
              <Button 
                onClick={handleContinue}
                className="w-full bg-brand-green hover:bg-brand-green/90"
                size="lg"
              >
                Acessar Dashboard
              </Button>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                Houve um problema na verificação do pagamento. Entre em contato com nosso suporte.
              </p>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Voltar aos Planos
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;