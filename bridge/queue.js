import PQueue from "p-queue";

// max 2 concurrent Gemini calls — avoids rate-limit bursts
const queue = new PQueue({ concurrency: 2 });

let stats = { queued: 0, completed: 0, errors: 0 };

/**
 * Enqueue an async task with exponential backoff on 429 / 503.
 * @param {() => Promise<any>} fn
 * @param {number} retries
 */
export function enqueue(fn, retries = 4) {
  stats.queued++;

  return queue.add(() => withBackoff(fn, retries)).then((result) => {
    stats.completed++;
    return result;
  }).catch((err) => {
    stats.errors++;
    throw err;
  });
}

async function withBackoff(fn, retries, attempt = 0) {
  try {
    return await fn();
  } catch (err) {
    const isRetryable =
      err?.status === 429 ||
      err?.status === 503 ||
      err?.message?.includes("quota") ||
      err?.message?.includes("RESOURCE_EXHAUSTED");

    if (isRetryable && attempt < retries) {
      const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 30_000);
      console.warn(`[queue] rate-limited — retry ${attempt + 1}/${retries} in ${Math.round(delay)}ms`);
      await sleep(delay);
      return withBackoff(fn, retries, attempt + 1);
    }

    throw err;
  }
}

export function getStats() {
  return {
    ...stats,
    pending: queue.pending,
    size: queue.size,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
