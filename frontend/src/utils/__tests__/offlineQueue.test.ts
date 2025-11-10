import { enqueueSave, getQueueLength, flushQueue } from '../offlineQueue';
import { submitResponse } from '../../utils/api';

// Mock the API
jest.mock('../../utils/api', () => ({
  submitResponse: jest.fn(),
}));

const mockedSubmitResponse = submitResponse as jest.MockedFunction<typeof submitResponse>;

describe('offlineQueue', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset mocks
    jest.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('enqueueSave', () => {
    it('should add a job to the queue', () => {
      expect(getQueueLength()).toBe(0);

      enqueueSave({
        productId: 'product-1',
        payload: [{ questionKey: 'q1', answer: 'test' }],
      });

      expect(getQueueLength()).toBe(1);
    });

    it('should generate unique IDs for jobs', () => {
      enqueueSave({
        productId: 'product-1',
        payload: [{ questionKey: 'q1', answer: 'test1' }],
      });

      enqueueSave({
        productId: 'product-2',
        payload: [{ questionKey: 'q2', answer: 'test2' }],
      });

      expect(getQueueLength()).toBe(2);
    });
  });

  describe('getQueueLength', () => {
    it('should return 0 for empty queue', () => {
      expect(getQueueLength()).toBe(0);
    });

    it('should return correct length after enqueueing', () => {
      enqueueSave({
        productId: 'product-1',
        payload: [{ questionKey: 'q1', answer: 'test' }],
      });
      expect(getQueueLength()).toBe(1);

      enqueueSave({
        productId: 'product-2',
        payload: [{ questionKey: 'q2', answer: 'test2' }],
      });
      expect(getQueueLength()).toBe(2);
    });
  });

  describe('flushQueue', () => {
    it('should skip when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      enqueueSave({
        productId: 'product-1',
        payload: [{ questionKey: 'q1', answer: 'test' }],
      });

      await flushQueue();

      expect(mockedSubmitResponse).not.toHaveBeenCalled();
      expect(getQueueLength()).toBe(1);
    });

    it('should process jobs successfully', async () => {
      mockedSubmitResponse.mockResolvedValue(undefined);

      enqueueSave({
        productId: 'product-1',
        payload: [{ questionKey: 'q1', answer: 'test' }],
      });

      await flushQueue();

      expect(mockedSubmitResponse).toHaveBeenCalledWith('product-1', [
        { questionId: 'q1', value: 'test' },
      ]);
      expect(getQueueLength()).toBe(0);
    });

    it('should retry failed jobs with exponential backoff', async () => {
      mockedSubmitResponse.mockRejectedValue(new Error('Network error'));

      enqueueSave({
        productId: 'product-1',
        payload: [{ questionKey: 'q1', answer: 'test' }],
      });

      await flushQueue();

      expect(mockedSubmitResponse).toHaveBeenCalledTimes(1);
      expect(getQueueLength()).toBe(1);

      // Get the job from storage to check it has nextAttemptAt
      const queue = JSON.parse(localStorage.getItem('autosave_queue') || '[]');
      expect(queue[0].attempts).toBe(1);
      expect(queue[0].nextAttemptAt).toBeDefined();
    });

    it('should stop retrying after max attempts', async () => {
      mockedSubmitResponse.mockRejectedValue(new Error('Network error'));

      enqueueSave({
        productId: 'product-1',
        payload: [{ questionKey: 'q1', answer: 'test' }],
      });

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await flushQueue();
        // Manually update the job to bypass nextAttemptAt check
        const queue = JSON.parse(localStorage.getItem('autosave_queue') || '[]');
        if (queue.length > 0) {
          queue[0].nextAttemptAt = undefined;
          localStorage.setItem('autosave_queue', JSON.stringify(queue));
        }
      }

      expect(mockedSubmitResponse).toHaveBeenCalledTimes(5);
      expect(getQueueLength()).toBe(1);

      // Job should still be in queue but marked as failed
      const queue = JSON.parse(localStorage.getItem('autosave_queue') || '[]');
      expect(queue[0].attempts).toBe(5);
    });

    it('should eventually succeed after retries', async () => {
      // First call fails, second succeeds
      mockedSubmitResponse
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      enqueueSave({
        productId: 'product-1',
        payload: [{ questionKey: 'q1', answer: 'test' }],
      });

      // First flush - fails
      await flushQueue();
      expect(getQueueLength()).toBe(1);

      // Manually update job to bypass backoff delay
      const queue = JSON.parse(localStorage.getItem('autosave_queue') || '[]');
      queue[0].nextAttemptAt = undefined;
      localStorage.setItem('autosave_queue', JSON.stringify(queue));

      // Second flush - succeeds
      await flushQueue();
      expect(getQueueLength()).toBe(0);
      expect(mockedSubmitResponse).toHaveBeenCalledTimes(2);
    });

    it('should skip jobs that are waiting for retry', async () => {
      mockedSubmitResponse.mockRejectedValue(new Error('Network error'));

      enqueueSave({
        productId: 'product-1',
        payload: [{ questionKey: 'q1', answer: 'test' }],
      });

      await flushQueue();

      // Job should have nextAttemptAt set in the future
      const queue = JSON.parse(localStorage.getItem('autosave_queue') || '[]');
      expect(queue[0].nextAttemptAt).toBeGreaterThan(Date.now());

      // Try to flush again immediately - should skip
      const initialCalls = mockedSubmitResponse.mock.calls.length;
      await flushQueue();
      expect(mockedSubmitResponse).toHaveBeenCalledTimes(initialCalls);
    });
  });
});



