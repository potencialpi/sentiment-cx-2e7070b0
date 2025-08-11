import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPlanAdminRoute } from '@/lib/planUtils';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const redirectToCorrectAdminPage = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      let planCode = 'start-quantico'; // fallback padrão

      // Buscar o plano na tabela user_plans
      const { data: userPlanData } = await supabase
        .from('user_plans')
        .select('plan_name')
        .eq('user_id', session.user.id)
        .single();

      if (userPlanData?.plan_name) {
        planCode = userPlanData.plan_name;
      }

      console.log('Dashboard - Plano encontrado:', planCode);
      
      // Redireciona para a página administrativa correta baseada no plano
      const adminRoute = getPlanAdminRoute(planCode);
      console.log('Dashboard - Redirecionando para:', adminRoute);
      navigate(adminRoute);
    } catch (error) {
      console.error('Erro ao redirecionar para dashboard:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    redirectToCorrectAdminPage();
  }, [redirectToCorrectAdminPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg-gray flex items-center justify-center">
        <div className="text-brand-dark-gray">Redirecionando...</div>
      </div>
    );
  }

  return null;
};

export default Dashboard;