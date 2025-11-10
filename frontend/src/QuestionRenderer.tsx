import { Question } from './utils/api';

interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
}

function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            id={question.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Enter your answer"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={question.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            required={question.required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Enter a number"
          />
        );

      case 'boolean':
        return (
          <div className="mt-1 flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={question.id}
                checked={value === true}
                onChange={() => onChange(true)}
                required={question.required}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={question.id}
                checked={value === false}
                onChange={() => onChange(false)}
                required={question.required}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">No</span>
            </label>
          </div>
        );

      case 'select':
        const choices = question.options?.choices || [];
        return (
          <select
            id={question.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Select an option</option>
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            id={question.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={question.id} className="block text-sm font-medium text-gray-700">
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
    </div>
  );
}

export default QuestionRenderer;



