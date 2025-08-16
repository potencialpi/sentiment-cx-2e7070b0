import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { stripePromise, getStripePriceId, createCheckoutSession } from '@/lib/stripe';
import { Loader2 } from 'lucide-react';

interface StripeCheckoutProps {
  planId: string;
  planName: string;
  billingType: 'monthly' | 'yearly';
  price: number;
  customerEmail?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  planId,
  planName,
  billingType,
  price,
  customerEmail,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      // Obter o Stripe
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe não foi carregado corretamente');
      }

      // Obter o price_id correto
      const priceId = getStripePriceId(planId, billingType);
      
      // Criar sessão de checkout
      const sessionId = await createCheckoutSession(priceId, customerEmail);
      
      // Redirecionar para o checkout do Stripe
      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        console.error('Erro no checkout:', error);
        toast({
          title: "Erro no pagamento",
          description: error.message || "Ocorreu um erro ao processar o pagamento",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível iniciar o processo de pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">Resumo do Pedido</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Plano:</span>
            <span className="font-medium">{planName}</span>
          </div>
          <div className="flex justify-between">
            <span>Cobrança:</span>
            <span className="font-medium">
              {billingType === 'monthly' ? 'Mensal' : 'Anual'}
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span>R$ {price.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <Button 
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3 text-lg font-semibold bg-brand-green hover:bg-brand-green/90"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          `Pagar R$ ${price.toLocaleString()}`
        )}
      </Button>

      <p className="text-xs text-gray-600 text-center">
        Pagamento seguro processado pelo Stripe. Seus dados estão protegidos.
      </p>
    </div>
  );
};

export default StripeCheckout;