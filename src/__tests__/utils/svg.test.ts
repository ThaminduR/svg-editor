import { describe, it, expect } from 'vitest';
import { isGraphicsElement, getElementName } from '../../utils/svg';

describe('svg utilities', () => {
  describe('isGraphicsElement', () => {
    it('returns true for rect', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      expect(isGraphicsElement(el)).toBe(true);
    });
    it('returns true for circle', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      expect(isGraphicsElement(el)).toBe(true);
    });
    it('returns true for path', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      expect(isGraphicsElement(el)).toBe(true);
    });
    it('returns true for g', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      expect(isGraphicsElement(el)).toBe(true);
    });
    it('returns false for defs', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      expect(isGraphicsElement(el)).toBe(false);
    });
    it('returns false for style', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      expect(isGraphicsElement(el)).toBe(false);
    });
  });

  describe('getElementName', () => {
    it('returns tag#id format when id exists', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('id', 'header');
      expect(getElementName(el)).toBe('rect#header');
    });
    it('returns tag only when no id', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      expect(getElementName(el)).toBe('circle');
    });
  });
});
