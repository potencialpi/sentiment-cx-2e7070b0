import { describe, it, expect } from 'vitest';
import { PlanConfig, getPlanConfig } from '../src/config/planConfigs';

describe('planConfigs', () => {
  describe('Plan Configurations', () => {
    it('should have Start Quântico plan with correct configuration', () => {
      const startPlan = getPlanConfig('Start Quântico');

      expect(startPlan).toBeDefined();
      expect(startPlan?.planName).toBe('Start Quântico');
      expect(startPlan?.planTitle).toBe('Start Quântico');
      expect(startPlan?.planDescription).toBe('Plano inicial com recursos essenciais para análise de sentimentos e criação de pesquisas básicas.');
      expect(startPlan?.maxQuestions).toBe(5);
      expect(startPlan?.maxResponses).toBe(50);
      expect(startPlan?.maxSurveysPerMonth).toBe(3);
      expect(startPlan?.backRoute).toBe('/dashboard');

      // Test features structure
      expect(startPlan?.features).toBeDefined();
      expect(startPlan?.features.analytics).toBeDefined();
      expect(startPlan?.features.analytics.basic).toBeInstanceOf(Array);
      expect(startPlan?.features.analytics.advanced).toBeInstanceOf(Array);
      expect(startPlan?.features.analytics.charts).toBeInstanceOf(Array);
      expect(startPlan?.features.analytics.export).toBeInstanceOf(Array);
      
      expect(startPlan?.features.sentiment).toBeDefined();
      expect(startPlan?.features.sentiment.levels).toBeInstanceOf(Array);
      expect(startPlan?.features.sentiment.segmentation).toBeInstanceOf(Array);
      
      expect(startPlan?.features.statistics).toBeDefined();
      expect(startPlan?.features.statistics.basic).toBeInstanceOf(Array);
      expect(startPlan?.features.statistics.advanced).toBeInstanceOf(Array);
      expect(startPlan?.features.ai).toBeUndefined();
    });

    it('should have Vortex Neural plan with correct configuration', () => {
      const vortexPlan = getPlanConfig('Vortex Neural');

      expect(vortexPlan).toBeDefined();
      expect(vortexPlan?.planName).toBe('Vortex Neural');
      expect(vortexPlan?.planTitle).toBe('Vortex Neural');
      expect(vortexPlan?.planDescription).toBe('Plano intermediário com análises avançadas de IA e recursos de machine learning para insights profundos.');
      expect(vortexPlan?.maxQuestions).toBe(10);
      expect(vortexPlan?.maxResponses).toBe(250);
      expect(vortexPlan?.maxSurveysPerMonth).toBe(4);
      expect(vortexPlan?.backRoute).toBe('/dashboard');

      // Test features structure
      expect(vortexPlan?.features).toBeDefined();
      expect(vortexPlan?.features.analytics).toBeDefined();
      expect(vortexPlan?.features.analytics.basic).toBeInstanceOf(Array);
      expect(vortexPlan?.features.analytics.advanced).toBeInstanceOf(Array);
      expect(vortexPlan?.features.analytics.charts).toBeInstanceOf(Array);
      expect(vortexPlan?.features.analytics.export).toBeInstanceOf(Array);
      
      expect(vortexPlan?.features.sentiment).toBeDefined();
      expect(vortexPlan?.features.sentiment.levels).toBeInstanceOf(Array);
      expect(vortexPlan?.features.sentiment.segmentation).toBeInstanceOf(Array);
      
      expect(vortexPlan?.features.statistics).toBeDefined();
      expect(vortexPlan?.features.statistics.basic).toBeInstanceOf(Array);
      expect(vortexPlan?.features.statistics.advanced).toBeInstanceOf(Array);
      
      expect(vortexPlan?.features.aiFeatures).toBeUndefined();
    });

    it('should have Nexus Infinito plan with correct configuration', () => {
      const nexusPlan = getPlanConfig('Nexus Infinito');

      expect(nexusPlan).toBeDefined();
      expect(nexusPlan?.planName).toBe('Nexus Infinito');
      expect(nexusPlan?.planTitle).toBe('Nexus Infinito');
      expect(nexusPlan?.planDescription).toBe('Plano premium com recursos ilimitados, IA avançada e análises em tempo real para empresas de grande porte.');
      expect(nexusPlan?.maxQuestions).toBe(999999);
      expect(nexusPlan?.maxResponses).toBe(999999);
      expect(nexusPlan?.maxSurveysPerMonth).toBe(999999);
      expect(nexusPlan?.backRoute).toBe('/dashboard');

      // Test features structure
      expect(nexusPlan?.features.analytics).toBeDefined();
      expect(nexusPlan?.features.analytics.basic).toBeInstanceOf(Array);
      expect(nexusPlan?.features.analytics.advanced).toBeInstanceOf(Array);
      expect(nexusPlan?.features.analytics.charts).toBeInstanceOf(Array);
      expect(nexusPlan?.features.analytics.export).toBeInstanceOf(Array);
      
      expect(nexusPlan?.features.sentiment).toBeDefined();
      expect(nexusPlan?.features.sentiment.levels).toBeInstanceOf(Array);
      expect(nexusPlan?.features.sentiment.segmentation).toBeInstanceOf(Array);
      
      expect(nexusPlan?.features.statistics).toBeDefined();
      expect(nexusPlan?.features.statistics.basic).toBeInstanceOf(Array);
      expect(nexusPlan?.features.statistics.advanced).toBeInstanceOf(Array);
      
      expect(nexusPlan?.features.aiFeatures).toBeDefined();
      expect(nexusPlan?.features.aiFeatures?.sentiment).toBeDefined();
      expect(nexusPlan?.features.aiFeatures?.predictive).toBeDefined();
      expect(nexusPlan?.features.aiFeatures?.clustering).toBeDefined();
      expect(nexusPlan?.features.aiFeatures?.brandIndex).toBeDefined();
      expect(nexusPlan?.features.aiFeatures?.trendAnalysis).toBeDefined();
    });
  });

  describe('getPlanConfig function', () => {
    it('should return correct plan for valid plan names', () => {
      const startPlan = getPlanConfig('Start Quântico');
      const vortexPlan = getPlanConfig('Vortex Neural');
      const nexusPlan = getPlanConfig('Nexus Infinito');

      expect(startPlan?.planName).toBe('Start Quântico');
      expect(vortexPlan?.planName).toBe('Vortex Neural');
      expect(nexusPlan?.planName).toBe('Nexus Infinito');
    });

    it('should throw error for invalid plan names', () => {
      expect(() => getPlanConfig('Invalid Plan')).toThrow('Configuração não encontrada para o plano: Invalid Plan');
      expect(() => getPlanConfig('')).toThrow('Configuração não encontrada para o plano: ');
      expect(() => getPlanConfig(null as any)).toThrow();
      expect(() => getPlanConfig(undefined as any)).toThrow();
    });

    it('should handle case variations correctly', () => {
      // These should work (case insensitive)
      const lowerCasePlan = getPlanConfig('start quantico');
      const upperCasePlan = getPlanConfig('START QUANTICO');
      const mixedCasePlan = getPlanConfig('Start quântico');

      expect(lowerCasePlan).toBeDefined();
      expect(upperCasePlan).toBeDefined();
      expect(mixedCasePlan).toBeDefined();
      
      // Invalid plan name should throw error
      expect(() => getPlanConfig('Invalid Plan')).toThrow('Configuração não encontrada para o plano: Invalid Plan');
    });
  });

  describe('Plan Configuration Structure', () => {
    const allPlans = [
      getPlanConfig('Start Quântico'),
      getPlanConfig('Vortex Neural'),
      getPlanConfig('Nexus Infinito')
    ].filter(Boolean) as PlanConfig[];

    it('should have all required properties for each plan', () => {
      allPlans.forEach(plan => {
        expect(plan).toHaveProperty('planName');
        expect(plan).toHaveProperty('planTitle');
        expect(plan).toHaveProperty('planDescription');
        expect(plan).toHaveProperty('maxQuestions');
        expect(plan).toHaveProperty('maxResponses');
        expect(plan).toHaveProperty('maxSurveysPerMonth');
        expect(plan).toHaveProperty('backRoute');
        expect(plan).toHaveProperty('features');
      });
    });

    it('should have valid numeric limits for each plan', () => {
      allPlans.forEach(plan => {
        expect(typeof plan.maxQuestions).toBe('number');
        expect(typeof plan.maxResponses).toBe('number');
        expect(typeof plan.maxSurveysPerMonth).toBe('number');
        
        expect(plan.maxQuestions).toBeGreaterThan(0);
        expect(plan.maxResponses).toBeGreaterThan(0);
        expect(plan.maxSurveysPerMonth).toBeGreaterThan(0);
      });
    });

    it('should have consistent features structure for each plan', () => {
      allPlans.forEach(plan => {
        expect(plan.features).toHaveProperty('analytics');
        expect(plan.features).toHaveProperty('sentiment');
        expect(plan.features).toHaveProperty('statistics');

        // Analytics structure
        expect(plan.features.analytics).toHaveProperty('basic');
        expect(plan.features.analytics).toHaveProperty('advanced');
        expect(plan.features.analytics).toHaveProperty('charts');
        expect(plan.features.analytics).toHaveProperty('export');

        // Sentiment structure
        expect(plan.features.sentiment).toHaveProperty('levels');
        expect(plan.features.sentiment).toHaveProperty('segmentation');
        expect(plan.features.sentiment.levels).toBeInstanceOf(Array);
        expect(plan.features.sentiment.levels.length).toBeGreaterThan(0);
        expect(plan.features.sentiment.segmentation).toBeInstanceOf(Array);

        // Statistics structure
        expect(plan.features.statistics).toHaveProperty('basic');
        expect(plan.features.statistics).toHaveProperty('advanced');
      });
    });

    it('should have progressive feature enhancement across plans', () => {
      const startPlan = getPlanConfig('Start Quântico')!;
      const vortexPlan = getPlanConfig('Vortex Neural')!;
      const nexusPlan = getPlanConfig('Nexus Infinito')!;

      // Limits should increase progressively
      expect(startPlan.maxQuestions).toBeLessThan(vortexPlan.maxQuestions);
      expect(vortexPlan.maxQuestions).toBeLessThan(nexusPlan.maxQuestions);

      expect(startPlan.maxResponses).toBeLessThan(vortexPlan.maxResponses);
      expect(vortexPlan.maxResponses).toBeLessThan(nexusPlan.maxResponses);

      expect(startPlan.maxSurveysPerMonth).toBeLessThan(vortexPlan.maxSurveysPerMonth);
      expect(vortexPlan.maxSurveysPerMonth).toBeLessThan(nexusPlan.maxSurveysPerMonth);

      // Sentiment levels should increase (check array length)
      expect(startPlan.features.sentiment.levels.length).toBeLessThan(vortexPlan.features.sentiment.levels.length);
      expect(vortexPlan.features.sentiment.levels.length).toBeLessThan(nexusPlan.features.sentiment.levels.length);

      // Advanced features should increase across plans (check array length)
      expect(startPlan.features.analytics.advanced).toBeInstanceOf(Array);
      expect(vortexPlan.features.analytics.advanced).toBeInstanceOf(Array);
      expect(nexusPlan.features.analytics.advanced).toBeInstanceOf(Array);
      expect(startPlan.features.analytics.advanced.length).toBeLessThan(vortexPlan.features.analytics.advanced.length);
      expect(vortexPlan.features.analytics.advanced.length).toBeLessThan(nexusPlan.features.analytics.advanced.length);

      // Statistics advanced features should increase across plans (check array length)
      expect(startPlan.features.statistics.advanced).toBeInstanceOf(Array);
      expect(vortexPlan.features.statistics.advanced).toBeInstanceOf(Array);
      expect(nexusPlan.features.statistics.advanced).toBeInstanceOf(Array);
      expect(startPlan.features.statistics.advanced.length).toBeLessThan(vortexPlan.features.statistics.advanced.length);
      expect(vortexPlan.features.statistics.advanced.length).toBeLessThan(nexusPlan.features.statistics.advanced.length);

      // AI features progression (only Nexus has aiFeatures)
      expect(startPlan.features.aiFeatures).toBeUndefined();
      expect(vortexPlan.features.aiFeatures).toBeUndefined();
      expect(nexusPlan.features.aiFeatures).toBeDefined();
      expect(nexusPlan.features.aiFeatures?.sentiment).toBeDefined();
      expect(nexusPlan.features.aiFeatures?.predictive).toBeDefined();
      expect(nexusPlan.features.aiFeatures?.clustering).toBeDefined();
      expect(nexusPlan.features.aiFeatures?.brandIndex).toBeDefined();
      expect(nexusPlan.features.aiFeatures?.trendAnalysis).toBeDefined();
    });

    it('should have consistent backRoute for all plans', () => {
      allPlans.forEach(plan => {
        expect(plan.backRoute).toBe('/dashboard');
      });
    });

    it('should have non-empty strings for plan names and descriptions', () => {
      allPlans.forEach(plan => {
        expect(typeof plan.planName).toBe('string');
        expect(typeof plan.planTitle).toBe('string');
        expect(typeof plan.planDescription).toBe('string');
        
        expect(plan.planName.length).toBeGreaterThan(0);
        expect(plan.planTitle.length).toBeGreaterThan(0);
        expect(plan.planDescription.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Type Safety', () => {
    it('should satisfy PlanConfig interface requirements', () => {
      const startPlan = getPlanConfig('Start Quântico');
      
      if (startPlan) {
        // This test ensures TypeScript compilation and interface compliance
        const planConfig: PlanConfig = startPlan;
        expect(planConfig).toBeDefined();
        
        // Test that all required properties exist and have correct types
        expect(typeof planConfig.planName).toBe('string');
        expect(typeof planConfig.planTitle).toBe('string');
        expect(typeof planConfig.planDescription).toBe('string');
        expect(typeof planConfig.maxQuestions).toBe('number');
        expect(typeof planConfig.maxResponses).toBe('number');
        expect(typeof planConfig.maxSurveysPerMonth).toBe('number');
        expect(typeof planConfig.backRoute).toBe('string');
        expect(typeof planConfig.features).toBe('object');
      }
    });
  });
});