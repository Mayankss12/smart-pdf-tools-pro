const BASE_POLL_DELAY_MS = 1_500;
const MAX_POLL_DELAY_MS = 15_000;

export function getConversionPollDelay(
  transientFailureCount: number,
  randomValue = Math.random(),
) {
  const attempt = Math.max(0, Math.floor(transientFailureCount));
  const exponential = Math.min(
    MAX_POLL_DELAY_MS,
    BASE_POLL_DELAY_MS * 2 ** Math.min(attempt, 4),
  );
  const boundedRandom = Math.max(0, Math.min(1, randomValue));
  const jitter = exponential * (boundedRandom * 0.3);
  return Math.round(Math.min(MAX_POLL_DELAY_MS, exponential + jitter));
}

export function isTransientPollStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}
