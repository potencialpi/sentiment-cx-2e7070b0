import React from 'react';
import AdvancedClusteringAnalysis from '@/components/AdvancedClusteringAnalysis';

interface ClusteringTabProps {
  responses: any[];
  loading: boolean;
}

export const ClusteringTab: React.FC<ClusteringTabProps> = ({ responses, loading }) => {
  return (
    <AdvancedClusteringAnalysis 
      surveyData={responses} 
      isLoading={loading}
    />
  );
};

export default ClusteringTab;