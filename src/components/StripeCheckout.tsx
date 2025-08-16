import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId, billingType }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecionando...",
          description: "Uma nova aba foi aberta para o checkout do Stripe",
        });
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Erro no checkout",
        description: error instanceof Error ? error.message : "Não foi possível criar a sessão de pagamento",
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