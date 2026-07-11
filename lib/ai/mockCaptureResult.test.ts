import { describe, expect, it } from "@jest/globals";
import { captureResultSchema } from "./captureResultSchema";
import { getMockCaptureResult, mockCaptures } from "./mockCaptureResult";

describe("mockCaptureResult", () => {
  it("every fixture conforms to captureResultSchema", () => {
    for (const capture of mockCaptures) {
      const result = captureResultSchema.safeParse(capture.result);
      expect(result.success).toBe(true);
    }
  });

  it("getMockCaptureResult returns a matching fixture for a known source", () => {
    const result = getMockCaptureResult("spond");
    expect(result.source_guess).toBe("spond");
  });

  it("getMockCaptureResult falls back to the first fixture for an unmatched source", () => {
    const result = getMockCaptureResult("annet");
    expect(result).toEqual(mockCaptures[0]?.result);
  });
});
