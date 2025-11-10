import { useState, useEffect } from 'react';
import { getProductDetail, createReport, logout, ProductDetail } from '../utils/api';
import { pollReport } from '../utils/pollReport';
import { Toast } from '../components/Toast';

interface ProductDetailPageProps {
  productId: string;
  onLogout: () => void;
  onBack?: () => void;
}

function ProductDetail({ productId, onLogout, onBack }: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError('');
      const data = await getProductDetail(productId);
      setProduct(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load product';
      setError(errorMessage);
      
      if (errorMessage === 'Unauthorized') {
        logout();
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!productId) return;

    try {
      setGenerating(true);
      setProgress(0);
      setError('');
      setToast({ type: 'info', message: 'Starting PDF generation...' });

      // Create report
      const reportResult = await createReport(productId);

      // If result is a Blob (PDF directly), download it
      if (reportResult instanceof Blob) {
        const url = window.URL.createObjectURL(reportResult);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-${productId}-report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setToast({ type: 'success', message: 'PDF downloaded successfully!' });
        setGenerating(false);
        return;
      }

      // Otherwise, it's a report object with id - poll for completion
      const report = reportResult as { id: string };
      
      setToast({ type: 'info', message: 'Generating PDF...' });
      
      const finalReport = await pollReport(report.id, {
        onProgress: (prog) => setProgress(prog),
      });

      // Open PDF in new tab
      if (finalReport.url) {
        window.open(finalReport.url, '_blank');
        setToast({ type: 'success', message: 'PDF generated successfully!' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PDF';
      setError(errorMessage);
      setToast({ type: 'error', message: errorMessage });
      
      if (errorMessage === 'Unauthorized') {
        logout();
        onLogout();
      }
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  const handleRetry = () => {
    handleGeneratePDF();
  };

  const formatAnswer = (value: any, questionType?: string): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return String(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading product details...</div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const latestResponse = product.responses?.[0];
  const answers = latestResponse?.answers || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="bg-white shadow rounded-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Created: {new Date(product.createdAt).toLocaleDateString()}
              </p>
              {product.description && (
                <p className="text-sm text-gray-600 mt-1">{product.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 1.042.18 2.047.503 3H4c0 1.657 1.343 3 3 3h1.586l-1.293 1.293c-.63.63-.184 1.707.707 1.707H10v-4H8c-.552 0-1-.448-1-1V9c0-1.657-1.343-3-3-3H4.503C4.18 7.953 4 8.958 4 10H0c0-1.042.18-2.047.503-3H4c0-1.657 1.343-3 3-3h1.586l-1.293-1.293c-.63-.63-.184-1.707.707-1.707H10v4H8c-.552 0-1 .448-1 1v4c0 .552.448 1 1 1h2v4H5.414c-.89 0-1.337-1.077-.707-1.707L6.586 15H5c-1.657 0-3-1.343-3-3z"
                      ></path>
                    </svg>
                    {progress > 0 ? `Generating... ${progress}%` : 'Generating...'}
                  </>
                ) : (
                  'Generate PDF'
                )}
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
              <div className="text-sm text-red-800 mb-2">{error}</div>
              <button
                onClick={handleRetry}
                className="text-sm text-red-700 hover:text-red-900 underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Answers Table */}
          {answers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Answer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {answers.map((answer) => (
                    <tr key={answer.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {answer.question?.label || `Question ${answer.questionId}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatAnswer(answer.value, answer.question?.type)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No responses found for this product.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;

