import { describe, it, expect } from 'vitest';
import { ColorPicker } from '../../panels/ColorPicker';

describe('ColorPicker color conversions', () => {
  const picker = new ColorPicker();

  describe('hsvToHex', () => {
    it('converts red correctly', () => {
      expect(picker.hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#ff0000');
    });
    it('converts green correctly', () => {
      expect(picker.hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00ff00');
    });
    it('converts blue correctly', () => {
      expect(picker.hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000ff');
    });
    it('converts white correctly', () => {
      expect(picker.hsvToHex({ h: 0, s: 0, v: 1 })).toBe('#ffffff');
    });
    it('converts black correctly', () => {
      expect(picker.hsvToHex({ h: 0, s: 0, v: 0 })).toBe('#000000');
    });
  });

  describe('hexToHsv', () => {
    it('parses red', () => {
      const hsv = picker.hexToHsv('#ff0000')!;
      expect(hsv.h).toBeCloseTo(0, 0);
      expect(hsv.s).toBeCloseTo(1, 1);
      expect(hsv.v).toBeCloseTo(1, 1);
    });
    it('parses green', () => {
      const hsv = picker.hexToHsv('#00ff00')!;
      expect(hsv.h).toBeCloseTo(120, 0);
      expect(hsv.s).toBeCloseTo(1, 1);
      expect(hsv.v).toBeCloseTo(1, 1);
    });
    it('parses blue', () => {
      const hsv = picker.hexToHsv('#0000ff')!;
      expect(hsv.h).toBeCloseTo(240, 0);
      expect(hsv.s).toBeCloseTo(1, 1);
      expect(hsv.v).toBeCloseTo(1, 1);
    });
    it('returns null for invalid hex', () => {
      expect(picker.hexToHsv('not-a-color')).toBeNull();
    });
    it('handles 3-character hex', () => {
      const hsv = picker.hexToHsv('#f00')!;
      expect(hsv.h).toBeCloseTo(0, 0);
      expect(hsv.s).toBeCloseTo(1, 1);
      expect(hsv.v).toBeCloseTo(1, 1);
    });
  });

  describe('round-trip', () => {
    it('hex -> hsv -> hex preserves color', () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000', '#ff6600', '#336699'];
      for (const hex of colors) {
        const hsv = picker.hexToHsv(hex)!;
        const result = picker.hsvToHex(hsv);
        expect(result).toBe(hex);
      }
    });
  });
});
