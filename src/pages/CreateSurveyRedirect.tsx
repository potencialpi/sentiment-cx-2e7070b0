import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getUserPlan, getPlanCreateSurveyRoute } from '@/lib/planUtils';

const CreateSurveyRedirect = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPlanAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Usar a função getUserPlan que busca nas tabelas corretas (companies e profiles)
        const planCode = await getUserPlan(supabase, user.id);
        
        console.log('CreateSurveyRedirect - Plano encontrado:', planCode);
        
        // Redireciona para a página de criação de pesquisa correta baseada no plano
        const createSurveyRoute = getPlanCreateSurveyRoute(planCode);
        console.log('CreateSurveyRedirect - Redirecionando para:', createSurveyRoute);
        navigate(createSurveyRoute);
      } catch (error) {
        console.error('Error in redirect:', error);
        toast({
          title: "Erro",
          description: "Erro ao verificar plano do usuário",
          variant: "destructive"
        });
        navigate('/create-survey-start');
      } finally {
        setLoading(false);
      }
    };

    checkPlanAndRedirect();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-green mx-auto"></div>
          <p className="mt-4 text-brand-dark-gray">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default CreateSurveyRedirect;