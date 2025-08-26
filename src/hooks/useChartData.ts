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

// Modern vibrant color palette - highly saturated and impactful
const COLORS = [
  '#FF0080', // Pink Neon
  '#00FFFF', // Cyan Electric
  '#FF4000', // Orange Vibrant
  '#8000FF', // Purple Electric
  '#00FF80', // Green Neon
  '#FFFF00', // Yellow Electric
  '#FF8000', // Orange Neon
  '#0080FF', // Blue Electric
  '#FF0040', // Red Neon
  '#40FF00', // Lime Green
  '#FF00C0', // Magenta Neon
  '#00C0FF', // Azure Electric
  '#C000FF', // Violet Electric
  '#FF6000', // Tangerine Neon
  '#00FF40'  // Spring Green
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
        { name: 'Positivo', value: positive, color: '#00FF80' }, // Bright green neon
        { name: 'Neutro', value: neutral, color: '#00FFFF' }, // Cyan electric
        { name: 'Negativo', value: negative, color: '#FF0040' } // Red neon
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