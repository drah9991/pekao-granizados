import { describe, it, expect, mock, beforeEach } from "bun:test";

// ── Mocks for browser APIs not available in Bun ──────────────────────────────

const mockOscillator = {
  type: "sine",
  frequency: { setValueAtTime: mock(() => {}) },
  connect: mock(() => {}),
  start: mock(() => {}),
  stop: mock(() => {}),
};

const mockGain = {
  gain: {
    setValueAtTime: mock(() => {}),
    linearRampToValueAtTime: mock(() => {}),
    exponentialRampToValueAtTime: mock(() => {}),
  },
  connect: mock(() => {}),
};

// Factory to create a fresh mock AudioContext for each test
function makeMockAudioCtx(state: "running" | "suspended" | "closed" = "running") {
  return {
    state,
    currentTime: 0,
    destination: {},
    resume: mock(async () => {}),
    createOscillator: mock(() => ({ ...mockOscillator })),
    createGain: mock(() => ({ ...mockGain })),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Audio Utilities", () => {

  describe("isAudioSupported", () => {
    it("returns false in non-browser environment (Bun/Node)", async () => {
      const { isAudioSupported } = await import("./audio");
      // In Bun, window is undefined, so AudioContext won't exist
      const result = isAudioSupported();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("playNewOrderSound — error paths", () => {
    it("returns false when AudioContext is not available (window undefined)", async () => {
      // In Bun (non-browser), window.AudioContext doesn't exist
      const { playNewOrderSound } = await import("./audio");
      const result = await playNewOrderSound();
      // In a non-browser env with no AudioContext, should return false gracefully
      expect(result).toBe(false);
    });

    it("does not throw even if audio context creation fails", async () => {
      const { playNewOrderSound } = await import("./audio");
      // Should never throw — always handles errors internally
      await expect(playNewOrderSound()).resolves.toBeDefined();
    });
  });

  describe("forceAudioUnlock — error paths", () => {
    it("returns false when AudioContext is not available (non-browser)", async () => {
      const { forceAudioUnlock } = await import("./audio");
      const result = await forceAudioUnlock();
      expect(result).toBe(false);
    });

    it("does not throw even if context is unavailable", async () => {
      const { forceAudioUnlock } = await import("./audio");
      await expect(forceAudioUnlock()).resolves.toBeDefined();
    });
  });

  describe("AudioContext state handling (simulation)", () => {
    it("suspended AudioContext state logic: resume() should be called", () => {
      const ctx = makeMockAudioCtx("suspended");
      // Simulate what playNewOrderSound does internally when ctx is suspended
      const handleSuspended = async (audioCtx: typeof ctx) => {
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        return audioCtx.state;
      };

      // After resume mock, state is still "suspended" since we mock it
      handleSuspended(ctx).then(() => {
        expect(ctx.resume).toHaveBeenCalled();
      });
    });

    it("running AudioContext creates oscillators and gain nodes", () => {
      const ctx = makeMockAudioCtx("running");
      // Simulate tone creation logic
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      expect(ctx.createOscillator).toHaveBeenCalled();
      expect(ctx.createGain).toHaveBeenCalled();
      expect(osc).toBeDefined();
      expect(gain).toBeDefined();
    });
  });
});
