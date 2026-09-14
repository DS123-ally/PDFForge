type CleanupFn = () => void;

const cleaners = new Set<CleanupFn>();

export function registerTemporaryCleanup(cleanup: CleanupFn) {
  cleaners.add(cleanup);

  return () => {
    cleaners.delete(cleanup);
  };
}

export function runTemporaryCleanup() {
  for (const cleanup of cleaners) {
    cleanup();
  }
}

export function getTemporaryCleanupCount() {
  return cleaners.size;
}

export function resetTemporaryCleanupForTests() {
  cleaners.clear();
}
