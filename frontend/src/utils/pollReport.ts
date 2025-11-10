import { getReport, Report } from './api';

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (progress: number) => void;
}

const DEFAULT_INTERVAL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 60000;

export async function pollReport(
  reportId: string,
  options: PollOptions = {}
): Promise<Report> {
  const { intervalMs = DEFAULT_INTERVAL_MS, timeoutMs = DEFAULT_TIMEOUT_MS, onProgress } = options;

  const startTime = Date.now();

  while (true) {
    const elapsed = Date.now() - startTime;
    
    if (elapsed >= timeoutMs) {
      throw new Error('Polling timeout: Report generation took too long');
    }

    try {
      const report = await getReport(reportId);

      // If progress callback provided and report has progress, call it
      if (onProgress && report.progress !== undefined) {
        onProgress(report.progress);
      }

      // If report has URL, it's ready
      if (report.url) {
        return report;
      }

      // If report status indicates failure
      if (report.status === 'failed' || report.status === 'error') {
        throw new Error('Report generation failed');
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      // If it's a timeout or failure error, throw it
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('failed'))) {
        throw error;
      }
      // For other errors (network, etc.), wait and retry
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}



