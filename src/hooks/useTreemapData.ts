import { useMemo } from 'react';

export interface TreemapDataItem {
  name: string;
  value: number;
  color?: string;
  children?: TreemapDataItem[];
}

export interface TreemapConfig {
  width?: number;
  height?: number;
  colors?: string[];
  showLabels?: boolean;
  animationDuration?: number;
}

const DEFAULT_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#0088fe', '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1'
];

export const useTreemapData = () => {
  const processTreemapData = useMemo(() => {
    return (data: any[], config: TreemapConfig = {}) => {
      const { colors = DEFAULT_COLORS } = config;
      
      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map((item, index) => ({
        name: item.name || item.label || `Item ${index + 1}`,
        value: Number(item.value) || 0,
        color: item.color || colors[index % colors.length],
        children: item.children ? processTreemapData(item.children, config) : undefined
      }));
    };
  }, []);

  const calculateTreemapMetrics = useMemo(() => {
    return (data: TreemapDataItem[]) => {
      if (!data || !Array.isArray(data)) {
        return {
          totalValue: 0,
          itemCount: 0,
          maxValue: 0,
          minValue: 0,
          averageValue: 0
        };
      }

      const values = data.map(item => item.value);
      const totalValue = values.reduce((sum, value) => sum + value, 0);
      const itemCount = data.length;
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const averageValue = totalValue / itemCount;

      return {
        totalValue,
        itemCount,
        maxValue,
        minValue,
        averageValue
      };
    };
  }, []);

  const formatTreemapTooltip = useMemo(() => {
    return (data: TreemapDataItem, total?: number) => {
      const percentage = total ? ((data.value / total) * 100).toFixed(1) : '0';
      return {
        label: data.name,
        value: data.value,
        percentage: `${percentage}%`,
        formattedValue: data.value.toLocaleString()
      };
    };
  }, []);

  const sortTreemapData = useMemo(() => {
    return (data: TreemapDataItem[], sortBy: 'value' | 'name' = 'value', order: 'asc' | 'desc' = 'desc') => {
      if (!data || !Array.isArray(data)) {
        return [];
      }

      return [...data].sort((a, b) => {
        let comparison = 0;
        
        if (sortBy === 'value') {
          comparison = a.value - b.value;
        } else {
          comparison = a.name.localeCompare(b.name);
        }
        
        return order === 'desc' ? -comparison : comparison;
      });
    };
  }, []);

  return {
    processTreemapData,
    calculateTreemapMetrics,
    formatTreemapTooltip,
    sortTreemapData,
    DEFAULT_COLORS
  };
};