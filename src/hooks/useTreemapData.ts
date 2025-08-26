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

// Modern vibrant treemap color palette - highly saturated and impactful
const DEFAULT_COLORS = [
  '#FF0080', '#00FFFF', '#FF4000', '#8000FF', '#00FF80',
  '#FFFF00', '#FF8000', '#0080FF', '#FF0040', '#40FF00',
  '#FF00C0', '#00C0FF', '#C000FF', '#FF6000', '#00FF40'
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