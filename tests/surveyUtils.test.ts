import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Question,
  Survey,
  questionUtils,
  validationUtils,
  uiUtils,
  surveyDataUtils,
  handlePlanLimitError
} from '../src/utils/surveyUtils';

// Mock do toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast
}));

// Mock do navigator.clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined)
};

Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: mockClipboard
  },
  writable: true
});

// Mock do window.location
Object.defineProperty(global, 'window', {
  value: {
    location: {
      origin: 'http://localhost:3000'
    }
  },
  writable: true
});

describe('surveyUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('questionUtils', () => {
    describe('createNewQuestion', () => {
      it('should create a new question with default values', () => {
        const question = questionUtils.createNewQuestion();

        expect(question).toEqual({
          id: expect.any(String),
          text: '',
          type: 'text',
          options: []
        });
      });

      it('should create questions with unique IDs', () => {
        const question1 = questionUtils.createNewQuestion();
        const question2 = questionUtils.createNewQuestion();

        expect(question1.id).not.toBe(question2.id);
      });
    });

    describe('updateQuestion', () => {
      const mockQuestions: Question[] = [
        { id: '1', text: 'Question 1', type: 'text', options: [] },
        { id: '2', text: 'Question 2', type: 'single_choice', options: ['A', 'B'] }
      ];

      it('should update question text', () => {
        const updated = questionUtils.updateQuestion(mockQuestions, '1', 'text', 'Updated Question');

        expect(updated[0].text).toBe('Updated Question');
        expect(updated[1]).toEqual(mockQuestions[1]); // Other questions unchanged
      });

      it('should update question type', () => {
        const updated = questionUtils.updateQuestion(mockQuestions, '1', 'type', 'rating');

        expect(updated[0].type).toBe('rating');
      });

      it('should update question options', () => {
        const newOptions = ['Option 1', 'Option 2', 'Option 3'];
        const updated = questionUtils.updateQuestion(mockQuestions, '2', 'options', newOptions);

        expect(updated[1].options).toEqual(newOptions);
      });

      it('should not modify questions if ID not found', () => {
        const updated = questionUtils.updateQuestion(mockQuestions, 'nonexistent', 'text', 'New Text');

        expect(updated).toEqual(mockQuestions);
      });
    });

    describe('removeQuestion', () => {
      const mockQuestions: Question[] = [
        { id: '1', text: 'Question 1', type: 'text', options: [] },
        { id: '2', text: 'Question 2', type: 'single_choice', options: ['A', 'B'] },
        { id: '3', text: 'Question 3', type: 'rating', options: [] }
      ];

      it('should remove question by ID', () => {
        const updated = questionUtils.removeQuestion(mockQuestions, '2');

        expect(updated).toHaveLength(2);
        expect(updated.find(q => q.id === '2')).toBeUndefined();
        expect(updated).toEqual([
          mockQuestions[0],
          mockQuestions[2]
        ]);
      });

      it('should return same array if ID not found', () => {
        const updated = questionUtils.removeQuestion(mockQuestions, 'nonexistent');

        expect(updated).toEqual(mockQuestions);
      });
    });

    describe('addOption', () => {
      const mockQuestions: Question[] = [
        { id: '1', text: 'Question 1', type: 'single_choice', options: ['A', 'B'] },
        { id: '2', text: 'Question 2', type: 'text', options: [] }
      ];

      it('should add option to question with less than 5 options', () => {
        const updated = questionUtils.addOption(mockQuestions, '1');

        expect(updated[0].options).toEqual(['A', 'B', '']);
      });

      it('should not add option if question already has 5 options', () => {
        const questionsWithMaxOptions: Question[] = [
          { id: '1', text: 'Question 1', type: 'single_choice', options: ['A', 'B', 'C', 'D', 'E'] }
        ];

        const updated = questionUtils.addOption(questionsWithMaxOptions, '1');

        expect(updated[0].options).toHaveLength(5);
      });

      it('should not modify question if ID not found', () => {
        const updated = questionUtils.addOption(mockQuestions, 'nonexistent');

        expect(updated).toEqual(mockQuestions);
      });
    });

    describe('removeOption', () => {
      const mockQuestions: Question[] = [
        { id: '1', text: 'Question 1', type: 'single_choice', options: ['A', 'B', 'C'] }
      ];

      it('should remove option at specified index', () => {
        const updated = questionUtils.removeOption(mockQuestions, '1', 1);

        expect(updated[0].options).toEqual(['A', 'C']);
      });

      it('should not modify question if ID not found', () => {
        const updated = questionUtils.removeOption(mockQuestions, 'nonexistent', 0);

        expect(updated).toEqual(mockQuestions);
      });
    });

    describe('updateOption', () => {
      const mockQuestions: Question[] = [
        { id: '1', text: 'Question 1', type: 'single_choice', options: ['A', 'B', 'C'] }
      ];

      it('should update option at specified index', () => {
        const updated = questionUtils.updateOption(mockQuestions, '1', 1, 'Updated B');

        expect(updated[0].options).toEqual(['A', 'Updated B', 'C']);
      });

      it('should not modify question if ID not found', () => {
        const updated = questionUtils.updateOption(mockQuestions, 'nonexistent', 0, 'New Value');

        expect(updated).toEqual(mockQuestions);
      });
    });
  });

  describe('validationUtils', () => {
    describe('validateQuestions', () => {
      it('should return null for valid questions', () => {
        const validQuestions: Question[] = [
          { id: '1', text: 'Valid question', type: 'text', options: [] },
          { id: '2', text: 'Choice question', type: 'single_choice', options: ['A', 'B'] }
        ];

        const result = validationUtils.validateQuestions(validQuestions);

        expect(result).toBeNull();
      });

      it('should return error for questions with empty text', () => {
        const invalidQuestions: Question[] = [
          { id: '1', text: '', type: 'text', options: [] },
          { id: '2', text: 'Valid question', type: 'text', options: [] }
        ];

        const result = validationUtils.validateQuestions(invalidQuestions);

        expect(result).toBe('Todas as questões devem ter texto');
      });

      it('should return error for choice questions with insufficient options', () => {
        const invalidQuestions: Question[] = [
          { id: '1', text: 'Choice question', type: 'single_choice', options: ['A'] }
        ];

        const result = validationUtils.validateQuestions(invalidQuestions);

        expect(result).toBe('Questões de escolha devem ter pelo menos 2 opções válidas');
      });

      it('should return error for choice questions with empty options', () => {
        const invalidQuestions: Question[] = [
          { id: '1', text: 'Choice question', type: 'multiple_choice', options: ['A', ''] }
        ];

        const result = validationUtils.validateQuestions(invalidQuestions);

        expect(result).toBe('Questões de escolha devem ter pelo menos 2 opções válidas');
      });
    });

    describe('validateSurveyData', () => {
      const validQuestions: Question[] = [
        { id: '1', text: 'Valid question', type: 'text', options: [] }
      ];

      it('should return null for valid survey data', () => {
        const result = validationUtils.validateSurveyData('Valid Title', validQuestions);

        expect(result).toBeNull();
      });

      it('should return error for empty title', () => {
        const result = validationUtils.validateSurveyData('', validQuestions);

        expect(result).toBe('Título da pesquisa é obrigatório');
      });

      it('should return error for whitespace-only title', () => {
        const result = validationUtils.validateSurveyData('   ', validQuestions);

        expect(result).toBe('Título da pesquisa é obrigatório');
      });

      it('should return error for empty questions array', () => {
        const result = validationUtils.validateSurveyData('Valid Title', []);

        expect(result).toBe('Adicione pelo menos uma questão');
      });

      it('should return question validation error if questions are invalid', () => {
        const invalidQuestions: Question[] = [
          { id: '1', text: '', type: 'text', options: [] }
        ];

        const result = validationUtils.validateSurveyData('Valid Title', invalidQuestions);

        expect(result).toBe('Todas as questões devem ter texto');
      });
    });
  });

  describe('uiUtils', () => {
    describe('formatDate', () => {
      it('should format date to Brazilian format', () => {
        const dateString = '2024-01-15T10:30:00Z';
        const formatted = uiUtils.formatDate(dateString);

        // The exact format may vary based on locale, but should be a valid date string
        expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      });
    });

    describe('copyLinkToClipboard', () => {
      it('should copy full link to clipboard and show toast', () => {
        const link = 'abc123';
        const expectedFullLink = 'http://localhost:3000/survey/abc123';

        uiUtils.copyLinkToClipboard(link, mockToast);

        expect(mockClipboard.writeText).toHaveBeenCalledWith(expectedFullLink);
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Link copiado!',
          description: 'Link da pesquisa copiado para a área de transferência.'
        });
      });
    });

    describe('showExportNotification', () => {
      it('should show export notification for CSV', () => {
        uiUtils.showExportNotification('csv');

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Exportando CSV',
          description: 'A exportação será iniciada em breve.'
        });
      });

      it('should show export notification for JSON', () => {
        uiUtils.showExportNotification('json');

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Exportando JSON',
          description: 'A exportação será iniciada em breve.'
        });
      });

      it('should show export notification for Parquet', () => {
        uiUtils.showExportNotification('parquet');

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Exportando PARQUET',
          description: 'A exportação será iniciada em breve.'
        });
      });
    });
  });

  describe('surveyDataUtils', () => {
    describe('prepareQuestionsForInsert', () => {
      it('should prepare questions for database insertion', () => {
        const questions: Question[] = [
          { id: '1', text: 'Text question', type: 'text', options: [] },
          { id: '2', text: 'Choice question', type: 'single_choice', options: ['A', 'B', 'C'] },
          { id: '3', text: 'Rating question', type: 'rating', options: [] }
        ];
        const surveyId = 'survey-123';

        const result = surveyDataUtils.prepareQuestionsForInsert(questions, surveyId);

        expect(result).toEqual([
          {
            survey_id: 'survey-123',
            question_text: 'Text question',
            question_type: 'text',
            question_order: 1,
            options: null
          },
          {
            survey_id: 'survey-123',
            question_text: 'Choice question',
            question_type: 'single_choice',
            question_order: 2,
            options: ['A', 'B', 'C']
          },
          {
            survey_id: 'survey-123',
            question_text: 'Rating question',
            question_type: 'rating',
            question_order: 3,
            options: null
          }
        ]);
      });

      it('should filter empty options for choice questions', () => {
        const questions: Question[] = [
          { id: '1', text: 'Choice question', type: 'multiple_choice', options: ['A', '', 'B', '   ', 'C'] }
        ];
        const surveyId = 'survey-123';

        const result = surveyDataUtils.prepareQuestionsForInsert(questions, surveyId);

        expect(result[0].options).toEqual(['A', 'B', 'C']);
      });
    });

    describe('filterSurveysWithResponses', () => {
      it('should filter surveys that have responses', () => {
        const surveys: Survey[] = [
          {
            id: '1',
            title: 'Survey 1',
            description: null,
            status: 'active',
            created_at: '2024-01-01',
            current_responses: 5,
            max_responses: 100,
            unique_link: 'link1'
          },
          {
            id: '2',
            title: 'Survey 2',
            description: null,
            status: 'active',
            created_at: '2024-01-02',
            current_responses: 0,
            max_responses: 100,
            unique_link: 'link2'
          },
          {
            id: '3',
            title: 'Survey 3',
            description: null,
            status: 'active',
            created_at: '2024-01-03',
            current_responses: 10,
            max_responses: 100,
            unique_link: 'link3'
          }
        ];

        const result = surveyDataUtils.filterSurveysWithResponses(surveys);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('1');
        expect(result[1].id).toBe('3');
      });

      it('should return empty array if no surveys have responses', () => {
        const surveys: Survey[] = [
          {
            id: '1',
            title: 'Survey 1',
            description: null,
            status: 'active',
            created_at: '2024-01-01',
            current_responses: 0,
            max_responses: 100,
            unique_link: 'link1'
          }
        ];

        const result = surveyDataUtils.filterSurveysWithResponses(surveys);

        expect(result).toHaveLength(0);
      });
    });
  });

  describe('handlePlanLimitError', () => {
    const mockConfig = {
      planName: 'Test Plan',
      maxQuestions: 5,
      maxSurveysPerMonth: 3
    };

    it('should handle question limit error', () => {
      const error = { message: 'Limite de questões por pesquisa excedido' };

      handlePlanLimitError(error, mockConfig, mockToast);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Limite de questões excedido',
        description: 'Seu plano Test Plan permite apenas 5 questões por pesquisa.',
        variant: 'destructive'
      });
    });

    it('should handle survey limit error', () => {
      const error = { message: 'Limite de pesquisas por mês excedido' };

      handlePlanLimitError(error, mockConfig, mockToast);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Limite de pesquisas excedido',
        description: 'Seu plano Test Plan permite apenas 3 pesquisas por mês.',
        variant: 'destructive'
      });
    });

    it('should handle generic error', () => {
      const error = { message: 'Generic error message' };

      handlePlanLimitError(error, mockConfig, mockToast);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erro',
        description: 'Generic error message',
        variant: 'destructive'
      });
    });

    it('should handle error without message', () => {
      const error = {};

      handlePlanLimitError(error, mockConfig, mockToast);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erro',
        description: 'Falha ao criar pesquisa',
        variant: 'destructive'
      });
    });
  });
});