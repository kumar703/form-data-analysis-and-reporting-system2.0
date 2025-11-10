import { pollReport } from '../pollReport';
import { getReport } from '../../utils/api';

// Mock the API
jest.mock('../../utils/api', () => ({
  getReport: jest.fn(),
}));

const mockedGetReport = getReport as jest.MockedFunction<typeof getReport>;

describe('pollReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return report when URL is available immediately', async () => {
    mockedGetReport.mockResolvedValue({
      id: 'report-1',
      name: 'Test Report',
      type: 'pdf',
      url: 'https://example.com/report.pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const promise = pollReport('report-1');
    jest.advanceTimersByTime(0);
    const result = await promise;

    expect(result.url).toBe('https://example.com/report.pdf');
    expect(mockedGetReport).toHaveBeenCalledTimes(1);
  });

  it('should poll until URL is available', async () => {
    mockedGetReport
      .mockResolvedValueOnce({
        id: 'report-1',
        name: 'Test Report',
        type: 'pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: 'report-1',
        name: 'Test Report',
        type: 'pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: 'report-1',
        name: 'Test Report',
        type: 'pdf',
        url: 'https://example.com/report.pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    const promise = pollReport('report-1', { intervalMs: 1500 });

    // First call
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    // Wait for interval
    jest.advanceTimersByTime(1500);
    await Promise.resolve();

    // Second call
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    // Wait for interval
    jest.advanceTimersByTime(1500);
    await Promise.resolve();

    // Third call - should have URL
    jest.advanceTimersByTime(0);
    const result = await promise;

    expect(result.url).toBe('https://example.com/report.pdf');
    expect(mockedGetReport).toHaveBeenCalledTimes(3);
  });

  it('should call onProgress callback when progress is available', async () => {
    const onProgress = jest.fn();
    
    mockedGetReport
      .mockResolvedValueOnce({
        id: 'report-1',
        name: 'Test Report',
        type: 'pdf',
        progress: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: 'report-1',
        name: 'Test Report',
        type: 'pdf',
        progress: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: 'report-1',
        name: 'Test Report',
        type: 'pdf',
        url: 'https://example.com/report.pdf',
        progress: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    const promise = pollReport('report-1', { intervalMs: 1500, onProgress });

    // First call
    jest.advanceTimersByTime(0);
    await Promise.resolve();
    expect(onProgress).toHaveBeenCalledWith(25);

    // Wait and second call
    jest.advanceTimersByTime(1500);
    await Promise.resolve();
    expect(onProgress).toHaveBeenCalledWith(50);

    // Wait and third call
    jest.advanceTimersByTime(1500);
    await Promise.resolve();
    expect(onProgress).toHaveBeenCalledWith(100);

    await promise;

    expect(onProgress).toHaveBeenCalledTimes(3);
  });

  it('should throw error on timeout', async () => {
    mockedGetReport.mockResolvedValue({
      id: 'report-1',
      name: 'Test Report',
      type: 'pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const promise = pollReport('report-1', { intervalMs: 1000, timeoutMs: 5000 });

    // Advance time past timeout
    jest.advanceTimersByTime(6000);

    await expect(promise).rejects.toThrow('Polling timeout');
  });

  it('should throw error when report status is failed', async () => {
    mockedGetReport.mockResolvedValue({
      id: 'report-1',
      name: 'Test Report',
      type: 'pdf',
      status: 'failed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const promise = pollReport('report-1');
    jest.advanceTimersByTime(0);

    await expect(promise).rejects.toThrow('Report generation failed');
  });

  it('should retry on network errors', async () => {
    mockedGetReport
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        id: 'report-1',
        name: 'Test Report',
        type: 'pdf',
        url: 'https://example.com/report.pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    const promise = pollReport('report-1', { intervalMs: 1000 });

    // First call - network error
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    // Wait and retry
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // Second call - network error
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    // Wait and retry
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // Third call - success
    jest.advanceTimersByTime(0);
    const result = await promise;

    expect(result.url).toBe('https://example.com/report.pdf');
    expect(mockedGetReport).toHaveBeenCalledTimes(3);
  });
});



