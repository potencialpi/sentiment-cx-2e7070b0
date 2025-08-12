import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPlanAdminRoute, getUserPlan } from '@/lib/planUtils';

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

      // Usar a função getUserPlan que busca nas tabelas corretas (companies e profiles)
      const planCode = await getUserPlan(supabase, session.user.id);

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