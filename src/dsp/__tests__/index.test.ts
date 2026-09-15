import { describe, it, expect } from "vitest";
import * as dsp from "../index";

describe("dsp barrel exports", () => {
  it("re-exports the public API of every module", () => {
    // fft
    for (const k of [
      "nextPow2",
      "isPow2",
      "fftInPlace",
      "fftReal",
      "ifftReal",
      "hannWindow",
      "applyWindow",
      "magnitudeSpectrum",
      "magnitudeSpectrumDb",
    ]) {
      expect(typeof (dsp as Record<string, unknown>)[k], k).toBe("function");
    }
    // biquad
    for (const k of ["designBiquad", "Biquad", "BiquadCascade", "biquadMagnitudeAt"]) {
      expect(typeof (dsp as Record<string, unknown>)[k], k).toBe("function");
    }
    // loudness
    for (const k of ["designKWeighting", "analyzeLoudness", "truePeakOf"]) {
      expect(typeof (dsp as Record<string, unknown>)[k], k).toBe("function");
    }
    expect(dsp.ABSOLUTE_GATE_LUFS).toBe(-70);
    expect(dsp.RELATIVE_GATE_LU).toBe(-10);
    // metrics
    for (const k of [
      "rms",
      "peak",
      "dcOffset",
      "crestFactor",
      "crestFactorDb",
      "snrDb",
      "thd",
      "thdN",
      "wowFlutter",
      "azimuthErrorDeg",
      "phaseCoherence",
    ]) {
      expect(typeof (dsp as Record<string, unknown>)[k], k).toBe("function");
    }
  });
});
