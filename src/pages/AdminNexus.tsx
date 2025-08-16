
import React from "react";
import UnifiedPlanInterface from "@/components/UnifiedPlanInterface";
import { nexusInfinitoConfig } from "@/config/planConfigs";

const AdminNexus = () => {
  return (
    <UnifiedPlanInterface 
      config={nexusInfinitoConfig}
    />
  );
};

export default AdminNexus;
