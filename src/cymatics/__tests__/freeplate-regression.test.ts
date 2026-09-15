import { describe, expect, it } from 'vitest';
import { frequencyToModes, drivenCircularModes, VIRTUAL_PLATES, type VirtualPlate } from '../chladni';

describe('free-boundary circular plate regression', () => {
  it('frequencyToModes does not throw with default maxOrder on free boundary', () => {
    expect(() => frequencyToModes(657, 'circular', { boundary: 'free', fundamentalHz: 100 })).not.toThrow();
    const modes = frequencyToModes(657, 'circular', { boundary: 'free', fundamentalHz: 100 });
    expect(Array.isArray(modes)).toBe(true);
  });
  it('drivenCircularModes does not throw on steel-disc-17 (free boundary) with defaults', () => {
    const plate = VIRTUAL_PLATES.find((p: VirtualPlate) => p.id === 'steel-disc-17')!;
    expect(plate.boundary).toBe('free');
    expect(() => drivenCircularModes(440, plate)).not.toThrow();
    expect(drivenCircularModes(440, plate).length).toBeGreaterThan(0);
  });
});
