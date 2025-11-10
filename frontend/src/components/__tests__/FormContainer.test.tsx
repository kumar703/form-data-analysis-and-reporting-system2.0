import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FormContainer from '../../FormContainer';
import { getQuestions, createProduct, submitResponse } from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api');
jest.mock('../../hooks/useAutosave', () => ({
  useAutosave: () => ({ queueLength: 0, lastSaved: null, flushQueue: jest.fn() }),
}));

const mockedGetQuestions = getQuestions as jest.MockedFunction<typeof getQuestions>;
const mockedCreateProduct = createProduct as jest.MockedFunction<typeof createProduct>;
const mockedSubmitResponse = submitResponse as jest.MockedFunction<typeof submitResponse>;

const mockQuestions = [
  {
    id: 'q1',
    step: 1,
    order: 1,
    type: 'text',
    label: 'What is your company name?',
    required: true,
    options: null,
    conditional: null,
    companyId: 'company-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'q2',
    step: 1,
    order: 2,
    type: 'select',
    label: 'Do you have an existing product?',
    required: true,
    options: {
      choices: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
    },
    conditional: null,
    companyId: 'company-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'q3',
    step: 2,
    order: 1,
    type: 'text',
    label: 'What is the name of your existing product?',
    required: true,
    options: null,
    conditional: {
      showIf: {
        questionId: 'q2',
        value: 'yes',
      },
    },
    companyId: 'company-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('FormContainer Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetQuestions.mockResolvedValue(mockQuestions);
  });

  it('should render form and load questions', async () => {
    const onLogout = jest.fn();
    render(<FormContainer onLogout={onLogout} />);

    await waitFor(() => {
      expect(screen.getByText('What is your company name?')).toBeInTheDocument();
    });

    expect(mockedGetQuestions).toHaveBeenCalledTimes(1);
  });

  it('should create product on first step and navigate to next', async () => {
    const onLogout = jest.fn();
    const mockProduct = {
      id: 'product-1',
      name: 'Test Company',
      description: null,
      metadata: null,
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockedCreateProduct.mockResolvedValue(mockProduct);

    render(<FormContainer onLogout={onLogout} />);

    await waitFor(() => {
      expect(screen.getByText('What is your company name?')).toBeInTheDocument();
    });

    // Fill in answer
    const input = screen.getByPlaceholderText('Enter your answer');
    fireEvent.change(input, { target: { value: 'Test Company' } });

    // Click Next
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockedCreateProduct).toHaveBeenCalledWith('Test Company');
    });

    // Should show step 2
    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    });
  });

  it('should submit response on final step', async () => {
    const onLogout = jest.fn();
    const mockProduct = {
      id: 'product-1',
      name: 'Test Company',
      description: null,
      metadata: null,
      companyId: 'company-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockedCreateProduct.mockResolvedValue(mockProduct);
    mockedSubmitResponse.mockResolvedValue(undefined);

    // Mock window.alert
    window.alert = jest.fn();

    render(<FormContainer onLogout={onLogout} />);

    await waitFor(() => {
      expect(screen.getByText('What is your company name?')).toBeInTheDocument();
    });

    // Fill step 1
    const input = screen.getByPlaceholderText('Enter your answer');
    fireEvent.change(input, { target: { value: 'Test Company' } });

    // Go to step 2
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    });

    // Fill step 2 (conditional question should not show since q2 is not answered)
    // Actually, we need to go back and answer q2 first
    fireEvent.click(screen.getByText('Previous'));

    // Answer q2
    const select = screen.getByLabelText(/Do you have an existing product/i);
    fireEvent.change(select, { target: { value: 'yes' } });

    // Go to step 2 again
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      const productInput = screen.getByLabelText(/What is the name of your existing product/i);
      fireEvent.change(productInput, { target: { value: 'My Product' } });
    });

    // Submit
    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedSubmitResponse).toHaveBeenCalled();
    });
  });
});

