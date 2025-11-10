import { shouldShowQuestion } from '../conditional';
import { Question } from '../../utils/api';

describe('shouldShowQuestion', () => {
  it('should return true when question has no conditional', () => {
    const question: Question = {
      id: 'q1',
      step: 1,
      order: 1,
      type: 'text',
      label: 'Test Question',
      required: false,
      options: null,
      conditional: null,
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(shouldShowQuestion(question, {})).toBe(true);
  });

  it('should show question when showIf condition is met', () => {
    const question: Question = {
      id: 'q2',
      step: 1,
      order: 2,
      type: 'text',
      label: 'Follow-up Question',
      required: false,
      options: null,
      conditional: {
        showIf: {
          questionId: 'q1',
          value: 'yes',
        },
      },
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(shouldShowQuestion(question, { q1: 'yes' })).toBe(true);
    expect(shouldShowQuestion(question, { q1: 'no' })).toBe(false);
  });

  it('should handle != operator', () => {
    const question: Question = {
      id: 'q2',
      step: 1,
      order: 2,
      type: 'text',
      label: 'Follow-up Question',
      required: false,
      options: null,
      conditional: {
        showIf: {
          questionId: 'q1',
          value: 'yes',
          op: '!=',
        },
      },
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(shouldShowQuestion(question, { q1: 'no' })).toBe(true);
    expect(shouldShowQuestion(question, { q1: 'yes' })).toBe(false);
  });

  it('should handle "in" operator', () => {
    const question: Question = {
      id: 'q2',
      step: 1,
      order: 2,
      type: 'text',
      label: 'Follow-up Question',
      required: false,
      options: null,
      conditional: {
        showIf: {
          questionId: 'q1',
          value: ['option1', 'option2'],
          op: 'in',
        },
      },
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(shouldShowQuestion(question, { q1: 'option1' })).toBe(true);
    expect(shouldShowQuestion(question, { q1: 'option2' })).toBe(true);
    expect(shouldShowQuestion(question, { q1: 'option3' })).toBe(false);
  });

  it('should handle "all" conditions', () => {
    const question: Question = {
      id: 'q3',
      step: 1,
      order: 3,
      type: 'text',
      label: 'Follow-up Question',
      required: false,
      options: null,
      conditional: {
        all: [
          { questionId: 'q1', value: 'yes' },
          { questionId: 'q2', value: 'true' },
        ],
      },
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(shouldShowQuestion(question, { q1: 'yes', q2: 'true' })).toBe(true);
    expect(shouldShowQuestion(question, { q1: 'yes', q2: 'false' })).toBe(false);
    expect(shouldShowQuestion(question, { q1: 'no', q2: 'true' })).toBe(false);
  });

  it('should handle "any" conditions', () => {
    const question: Question = {
      id: 'q3',
      step: 1,
      order: 3,
      type: 'text',
      label: 'Follow-up Question',
      required: false,
      options: null,
      conditional: {
        any: [
          { questionId: 'q1', value: 'yes' },
          { questionId: 'q2', value: 'true' },
        ],
      },
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(shouldShowQuestion(question, { q1: 'yes' })).toBe(true);
    expect(shouldShowQuestion(question, { q2: 'true' })).toBe(true);
    expect(shouldShowQuestion(question, { q1: 'yes', q2: 'true' })).toBe(true);
    expect(shouldShowQuestion(question, { q1: 'no', q2: 'false' })).toBe(false);
  });

  it('should handle numeric comparisons', () => {
    const question: Question = {
      id: 'q2',
      step: 1,
      order: 2,
      type: 'text',
      label: 'Follow-up Question',
      required: false,
      options: null,
      conditional: {
        showIf: {
          questionId: 'q1',
          value: 10,
          op: '>',
        },
      },
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(shouldShowQuestion(question, { q1: 15 })).toBe(true);
    expect(shouldShowQuestion(question, { q1: 5 })).toBe(false);
    expect(shouldShowQuestion(question, { q1: 10 })).toBe(false);
  });
});



