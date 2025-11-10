import { Question } from './api';

export interface ConditionalRule {
  questionId: string;
  value: any;
  op?: '==' | '!=' | 'in' | '>' | '<';
}

export interface Conditional {
  showIf?: ConditionalRule;
  all?: ConditionalRule[];
  any?: ConditionalRule[];
}

function evaluateCondition(
  rule: ConditionalRule,
  answers: Record<string, any>
): boolean {
  const answerValue = answers[rule.questionId];
  const { value: expectedValue, op = '==' } = rule;

  switch (op) {
    case '==':
      return answerValue === expectedValue;
    case '!=':
      return answerValue !== expectedValue;
    case 'in':
      if (!Array.isArray(expectedValue)) {
        return false;
      }
      return expectedValue.includes(answerValue);
    case '>':
      return Number(answerValue) > Number(expectedValue);
    case '<':
      return Number(answerValue) < Number(expectedValue);
    default:
      return false;
  }
}

export function shouldShowQuestion(
  question: Question,
  answers: Record<string, any>
): boolean {
  if (!question.conditional) {
    return true;
  }

  const conditional = question.conditional as Conditional;

  // Handle simple showIf
  if (conditional.showIf) {
    return evaluateCondition(conditional.showIf, answers);
  }

  // Handle 'all' - all conditions must be true
  if (conditional.all && conditional.all.length > 0) {
    return conditional.all.every((rule) => evaluateCondition(rule, answers));
  }

  // Handle 'any' - at least one condition must be true
  if (conditional.any && conditional.any.length > 0) {
    return conditional.any.some((rule) => evaluateCondition(rule, answers));
  }

  // No conditions, show by default
  return true;
}



