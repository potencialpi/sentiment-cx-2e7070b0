
import React from "react";
import UnifiedPlanInterface from "@/components/UnifiedPlanInterface";
import { vortexNeuralConfig } from "@/config/planConfigs";

const AdminVortex = () => {
  return (
    <UnifiedPlanInterface 
      config={vortexNeuralConfig}
    />
  );
};

export default AdminVortex;
