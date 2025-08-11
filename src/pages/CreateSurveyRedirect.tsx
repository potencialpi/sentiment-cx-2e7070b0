import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

        // Buscar plano do usuário na tabela user_plans
        const { data: userPlan, error } = await supabase
          .from('user_plans')
          .select('plan_name')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user plan:', error);
          // Default para start se não encontrar
          navigate('/create-survey-start');
          return;
        }

        // Redirecionar baseado no plano
        switch (userPlan.plan_name) {
          case 'start-quantico':
            navigate('/create-survey-start');
            break;
          case 'vortex-neural':
            navigate('/create-survey-vortex');
            break;
          case 'nexus-infinito':
            navigate('/create-survey-nexus');
            break;
          default:
            navigate('/create-survey-start');
            break;
        }
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