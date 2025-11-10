import { useEffect, useCallback, useState } from 'react';
import { enqueueSave, flushQueue, getQueueLength } from '../utils/offlineQueue';
import { submitResponse, Answer } from '../utils/api';

interface UseAutosaveOptions {
  productId: string | null;
  answers: Record<string, any>;
  enabled?: boolean;
}

export function useAutosave({ productId, answers, enabled = true }: UseAutosaveOptions) {
  const [queueLength, setQueueLength] = useState(getQueueLength());
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const updateQueueLength = useCallback(() => {
    setQueueLength(getQueueLength());
  }, []);

  const autosave = useCallback(async () => {
    if (!enabled || !productId) {
      return;
    }

    try {
      const payload: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));

      await submitResponse(productId, payload);
      setLastSaved(Date.now());
      return { success: true };
    } catch (error) {
      // Network or server error - enqueue for retry
      console.log('Autosave failed, enqueueing for retry:', error);
      
      const queuePayload = Object.entries(answers).map(([questionKey, answer]) => ({
        questionKey,
        answer,
      }));

      enqueueSave({
        productId,
        payload: queuePayload,
      });
      updateQueueLength();
      return { success: false, error };
    }
  }, [enabled, productId, answers, updateQueueLength]);

  useEffect(() => {
    if (!enabled || !productId || Object.keys(answers).length === 0) {
      return;
    }

    // Debounce autosave
    const timeoutId = setTimeout(() => {
      autosave();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [answers, productId, enabled, autosave]);

  // Listen for online event
  useEffect(() => {
    const handleOnline = async () => {
      console.log('Online - flushing queue');
      await flushQueue();
      updateQueueLength();
    };

    window.addEventListener('online', handleOnline);
    
    // Also try to flush on mount if online
    if (navigator.onLine) {
      flushQueue().then(() => updateQueueLength());
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [updateQueueLength]);

  const handleFlushQueue = useCallback(async () => {
    await flushQueue();
    updateQueueLength();
  }, [updateQueueLength]);

  return {
    queueLength,
    lastSaved,
    flushQueue: handleFlushQueue,
  };
}

