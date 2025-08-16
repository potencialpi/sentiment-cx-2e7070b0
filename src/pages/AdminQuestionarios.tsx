
import React from 'react';
import UnifiedPlanInterface from '@/components/UnifiedPlanInterface';
import { startQuanticoConfig } from '@/config/planConfigs';

const AdminQuestionarios = () => {
  return (
    <UnifiedPlanInterface 
      config={startQuanticoConfig}
    />
  );
};

export default AdminQuestionarios;
