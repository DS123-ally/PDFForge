import { describe, expect, it } from "vitest";

import {
  initialProcessingState,
  processingReducer,
} from "@/lib/workers/processing-state";

describe("processingReducer", () => {
  it("tracks progress and clamps values", () => {
    const started = processingReducer(initialProcessingState, {
      type: "start",
    });
    const progressed = processingReducer(started, {
      message: "Working",
      progress: 120,
      type: "progress",
    });

    expect(progressed).toMatchObject({
      message: "Working",
      progress: 100,
      status: "processing",
    });
  });

  it("stores a worker result on completion", () => {
    const state = processingReducer(initialProcessingState, {
      result: {
        fileCount: 2,
        totalBytes: 1024,
        totalPages: 6,
      },
      type: "complete",
    });

    expect(state).toMatchObject({
      progress: 100,
      result: {
        fileCount: 2,
        totalPages: 6,
      },
      status: "success",
    });
  });

  it("keeps worker errors user-readable", () => {
    const state = processingReducer(initialProcessingState, {
      code: "processing_failed",
      message: "The local worker failed.",
      type: "error",
    });

    expect(state.error).toEqual({
      code: "processing_failed",
      message: "The local worker failed.",
    });
    expect(state.status).toBe("error");
  });
});
