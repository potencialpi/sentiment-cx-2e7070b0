import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

const PaymentCancel = () => {
  const navigate = useNavigate();

  const handleBackToPlans = () => {
    navigate('/choose-plan');
  };

  const handleTryAgain = () => {
    navigate(-1); // Volta para a página anterior
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Pagamento Cancelado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-gray-600">
            Seu pagamento foi cancelado. Não se preocupe, nenhuma cobrança foi realizada.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleTryAgain}
              className="w-full bg-brand-green hover:bg-brand-green/90"
              size="lg"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
            
            <Button 
              onClick={handleBackToPlans}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar aos Planos
            </Button>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Precisa de ajuda?</h3>
            <p className="text-sm text-blue-800">
              Se você está enfrentando problemas com o pagamento, entre em contato com nosso suporte.
            </p>
            <Button 
              variant="link" 
              className="text-blue-600 hover:text-blue-800 p-0 h-auto mt-2"
              onClick={() => window.open('mailto:suporte@sentimentcx.com', '_blank')}
            >
              suporte@sentimentcx.com
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancel;