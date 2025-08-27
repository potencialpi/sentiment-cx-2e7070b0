import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Tag, Check, X } from 'lucide-react';

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
  const [showCouponField, setShowCouponField] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponData, setCouponData] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const { toast } = useToast();

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setCouponValidating(true);
    setCouponError('');
    setCouponData(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-coupon', {
        body: { couponCode: couponCode.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.valid) {
        setCouponData(data);
        toast({
          title: "Cupom aplicado!",
          description: data.description || "Desconto aplicado com sucesso",
        });
      } else {
        setCouponError(data?.error || 'Cupom inválido');
      }
    } catch (error) {
      console.error('Coupon validation error:', error);
      setCouponError('Erro ao validar cupom');
    } finally {
      setCouponValidating(false);
    }
  };

  const removeCoupon = () => {
    setCouponData(null);
    setCouponCode('');
    setCouponError('');
  };

  const calculateDiscountedPrice = () => {
    if (!couponData) return price;
    
    if (couponData.percentOff) {
      return price * (1 - couponData.percentOff / 100);
    } else if (couponData.amountOff) {
      return Math.max(0, price - (couponData.amountOff / 100)); // amountOff comes in cents
    }
    return price;
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planId, 
          billingType,
          couponCode: couponData?.couponId || undefined
        }
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
          {couponData && (
            <div className="flex justify-between text-green-600">
              <span>Desconto:</span>
              <span>
                {couponData.percentOff ? `-${couponData.percentOff}%` : `-R$ ${((couponData.amountOff || 0) / 100).toLocaleString()}`}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span>R$ {calculateDiscountedPrice().toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Coupon Section */}
      <div className="space-y-3">
        {!showCouponField && !couponData ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowCouponField(true)}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            <Tag className="mr-2 h-4 w-4" />
            Tem um cupom de desconto?
            <span className="block text-xs mt-1">Aceita códigos simples ou IDs de promoção</span>
          </Button>
        ) : (
          <div className="space-y-2">
            {couponData ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {couponData.description}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeCoupon}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Ex: DESCONTO10 ou promo_1S0..."
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onBlur={validateCoupon}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={validateCoupon}
                    disabled={!couponCode.trim() || couponValidating}
                    className="px-4"
                  >
                    {couponValidating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Aplicar'
                    )}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-sm text-red-600">{couponError}</p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCouponField(false);
                    setCouponCode('');
                    setCouponError('');
                  }}
                  className="text-sm text-muted-foreground"
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}
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
          `Pagar R$ ${calculateDiscountedPrice().toLocaleString()}`
        )}
      </Button>

      <p className="text-xs text-gray-600 text-center">
        Pagamento seguro processado pelo Stripe. Seus dados estão protegidos.
      </p>
    </div>
  );
};

export default StripeCheckout;