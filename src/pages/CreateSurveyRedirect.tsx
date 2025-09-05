import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getUserPlan, getPlanCreateSurveyRoute, getPlanAdminRoute } from '@/lib/planUtils';
import { validateUserPlanAccess, handlePlanError } from '@/lib/planValidation';

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

        // Usar validação robusta de plano
        const planValidation = await validateUserPlanAccess(user.id);
        const planCode = planValidation.planCode;
        
        console.log('CreateSurveyRedirect - Plano encontrado:', planCode);
        
        const createSurveyRoute = getPlanCreateSurveyRoute(planCode);
        console.log('CreateSurveyRedirect - Redirecionando para:', createSurveyRoute);
        
        navigate(createSurveyRoute);
      } catch (error) {
        handlePlanError(error, 'checkPlanAndRedirect');
        navigate('/admin/create-survey/start-quantico');
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