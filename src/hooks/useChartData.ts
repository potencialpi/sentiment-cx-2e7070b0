import { useMemo } from 'react';

export interface ChartDataItem {
  name: string;
  value: number;
  color?: string;
}

export interface TreemapDataItem {
  name: string;
  value: number;
  fill?: string;
}

const COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export const useChartData = () => {
  const processChartData = useMemo(() => {
    return (data: ChartDataItem[]): ChartDataItem[] => {
      return data.map((item, index) => ({
        ...item,
        color: item.color || COLORS[index % COLORS.length]
      }));
    };
  }, []);

  const processTreemapData = useMemo(() => {
    return (data: ChartDataItem[]): TreemapDataItem[] => {
      return data.map((item, index) => ({
        name: item.name,
        value: item.value,
        fill: item.color || COLORS[index % COLORS.length]
      }));
    };
  }, []);

  const calculateSentimentData = useMemo(() => {
    return (positive: number, neutral: number, negative: number): ChartDataItem[] => {
      return [
        { name: 'Positivo', value: positive, color: '#10B981' },
        { name: 'Neutro', value: neutral, color: '#6B7280' },
        { name: 'Negativo', value: negative, color: '#EF4444' }
      ].filter(item => item.value > 0);
    };
  }, []);

  const formatResponsesByDate = useMemo(() => {
    return (responsesByDate: Array<{ date: string; count: number }>): ChartDataItem[] => {
      return responsesByDate.map((item, index) => ({
        name: item.date,
        value: item.count,
        color: COLORS[index % COLORS.length]
      }));
    };
  }, []);

  return {
    processChartData,
    processTreemapData,
    calculateSentimentData,
    formatResponsesByDate,
    COLORS
  };
};