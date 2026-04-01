import { describe, it, expect } from 'vitest';
import { clamp, pointDistance, angleBetweenPoints, rectContainsPoint, rectsIntersect } from '../../utils/math';

describe('math utilities', () => {
  describe('clamp', () => {
    it('constrains value below min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });
    it('constrains value above max', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
    it('passes through value in range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });
    it('handles equal min and max', () => {
      expect(clamp(5, 3, 3)).toBe(3);
    });
  });

  describe('pointDistance', () => {
    it('computes Euclidean distance', () => {
      expect(pointDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });
    it('returns 0 for same point', () => {
      expect(pointDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    });
  });

  describe('angleBetweenPoints', () => {
    it('returns 0 for point to the right', () => {
      expect(angleBetweenPoints({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
    });
    it('returns 90 for point below', () => {
      expect(angleBetweenPoints({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(90);
    });
    it('returns -90 for point above', () => {
      expect(angleBetweenPoints({ x: 0, y: 0 }, { x: 0, y: -1 })).toBe(-90);
    });
  });

  describe('rectContainsPoint', () => {
    const rect = { x: 0, y: 0, width: 10, height: 10 };

    it('returns true for point inside', () => {
      expect(rectContainsPoint(rect, { x: 5, y: 5 })).toBe(true);
    });
    it('returns true for point on edge', () => {
      expect(rectContainsPoint(rect, { x: 0, y: 0 })).toBe(true);
    });
    it('returns false for point outside', () => {
      expect(rectContainsPoint(rect, { x: 15, y: 5 })).toBe(false);
    });
  });

  describe('rectsIntersect', () => {
    it('returns true for overlapping rects', () => {
      expect(rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 10, height: 10 }
      )).toBe(true);
    });
    it('returns false for non-overlapping rects', () => {
      expect(rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 }
      )).toBe(false);
    });
    it('returns true for contained rect', () => {
      expect(rectsIntersect(
        { x: 0, y: 0, width: 20, height: 20 },
        { x: 5, y: 5, width: 5, height: 5 }
      )).toBe(true);
    });
    it('returns false for touching edges (not overlapping)', () => {
      expect(rectsIntersect(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 0, width: 10, height: 10 }
      )).toBe(false);
    });
  });
});
