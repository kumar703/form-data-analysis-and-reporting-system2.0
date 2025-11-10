import { useState, useEffect } from 'react';
import { getQuestions, createProduct, submitResponse, logout } from './utils/api';
import { Question, Answer } from './utils/api';
import QuestionRenderer from './QuestionRenderer';
import { shouldShowQuestion } from './utils/conditional';
import { useAutosave } from './hooks/useAutosave';
import { Toast } from './components/Toast';
import { formatTimeAgo } from './utils/formatTime';

interface FormContainerProps {
  onLogout: () => void;
}

function FormContainer({ onLogout }: FormContainerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsByStep, setQuestionsByStep] = useState<Record<number, Question[]>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [productId, setProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );

  // Autosave hook
  const { queueLength, lastSaved, flushQueue } = useAutosave({
    productId,
    answers,
    enabled: !!productId && Object.keys(answers).length > 0,
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  // Show toast on autosave success/error
  useEffect(() => {
    if (lastSaved) {
      setToast({ message: 'Changes saved', type: 'success' });
    }
  }, [lastSaved]);

  useEffect(() => {
    if (questions.length > 0) {
      const grouped = questions.reduce((acc, q) => {
        if (!acc[q.step]) {
          acc[q.step] = [];
        }
        acc[q.step].push(q);
        return acc;
      }, {} as Record<number, Question[]>);

      // Sort questions within each step by order
      Object.keys(grouped).forEach((step) => {
        grouped[Number(step)].sort((a, b) => a.order - b.order);
      });

      setQuestionsByStep(grouped);
    }
  }, [questions]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const fetchedQuestions = await getQuestions();
      setQuestions(fetchedQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const getVisibleQuestions = (step: number): Question[] => {
    const stepQuestions = questionsByStep[step] || [];
    return stepQuestions.filter((q) => shouldShowQuestion(q, answers));
  };

  const validateStep = (step: number): boolean => {
    const visibleQuestions = getVisibleQuestions(step);
    return visibleQuestions.every((q) => {
      if (!q.required) return true;
      const answer = answers[q.id];
      return answer !== undefined && answer !== null && answer !== '';
    });
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');

    // If first step, create product
    if (currentStep === 1 && !productId) {
      try {
        setSubmitting(true);
        const companyName = answers[questionsByStep[1]?.[0]?.id] || 'New Product';
        const product = await createProduct(companyName);
        setProductId(product.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create product');
        setSubmitting(false);
        return;
      }
    }

    const maxStep = Math.max(...Object.keys(questionsByStep).map(Number));
    
    if (currentStep < maxStep) {
      setCurrentStep(currentStep + 1);
      setSubmitting(false);
    } else {
      // Last step - submit response
      if (productId) {
        try {
          setSubmitting(true);
          const answerArray: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
            questionId,
            value,
          }));
          await submitResponse(productId, answerArray);
          // Flush any remaining queue items
          await flushQueue();
          setToast({ message: 'Form submitted successfully!', type: 'success' });
          // Reset form
          setAnswers({});
          setProductId(null);
          setCurrentStep(1);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to submit form');
        } finally {
          setSubmitting(false);
        }
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const maxStep = Math.max(...Object.keys(questionsByStep).map(Number), 1);
  const visibleQuestions = getVisibleQuestions(currentStep);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Multi-Step Form</h1>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStep} of {maxStep}
                {lastSaved && (
                  <span className="ml-2 text-xs text-gray-500">
                    • Saved {formatTimeAgo(lastSaved)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {queueLength > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-md">
                  <span className="text-xs font-medium text-yellow-800">
                    {queueLength} pending {queueLength === 1 ? 'save' : 'saves'}
                  </span>
                  <button
                    onClick={flushQueue}
                    className="text-xs text-yellow-700 hover:text-yellow-900 underline"
                    title="Retry pending saves"
                  >
                    Retry
                  </button>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center">
              {Array.from({ length: maxStep }, (_, i) => i + 1).map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`flex-1 h-2 rounded ${
                      step <= currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                  {step < maxStep && (
                    <div
                      className={`w-2 h-2 rounded-full ${
                        step < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-6 transition-all duration-300">
            {visibleQuestions.map((question) => (
              <div key={question.id} className="transition-opacity duration-300">
                <QuestionRenderer
                  question={question}
                  value={answers[question.id]}
                  onChange={(value) => handleAnswerChange(question.id, value)}
                />
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 1 || submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Submitting...'
                : currentStep === maxStep
                ? 'Submit'
                : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormContainer;

