import { getMaxConcurrentThumbnails } from "@/lib/performance/memory";

let activeCount = 0;
const waiting: Array<() => void> = [];

export async function runThumbnailTask<T>(task: () => Promise<T>) {
  await acquireThumbnailSlot();

  try {
    return await task();
  } finally {
    releaseThumbnailSlot();
  }
}

function acquireThumbnailSlot() {
  if (activeCount < getMaxConcurrentThumbnails()) {
    activeCount += 1;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    waiting.push(() => {
      activeCount += 1;
      resolve();
    });
  });
}

function releaseThumbnailSlot() {
  activeCount = Math.max(0, activeCount - 1);
  const next = waiting.shift();
  next?.();
}

export function resetThumbnailQueueForTests() {
  activeCount = 0;
  waiting.length = 0;
}
