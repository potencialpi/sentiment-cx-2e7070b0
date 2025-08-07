import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPlanAdminRoute } from '@/lib/planUtils';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    redirectToCorrectAdminPage();
  }, []);

  const redirectToCorrectAdminPage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      let planCode = 'start-quantico'; // fallback padrão

      // Tentar buscar o plano na tabela companies primeiro
      const { data: companyData } = await supabase
        .from('companies')
        .select('plan_name')
        .eq('user_id', session.user.id)
        .single();

      if (companyData?.plan_name) {
        planCode = companyData.plan_name;
      } else {
        // Se não encontrar na companies, tentar na profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('plan_name')
          .eq('user_id', session.user.id)
          .single();
        
        if (profileData?.plan_name) {
          planCode = profileData.plan_name;
        }
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
  };

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