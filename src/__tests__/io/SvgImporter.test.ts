import { describe, it, expect } from 'vitest';
import { SvgImporter } from '../../io/SvgImporter';

describe('SvgImporter', () => {
  const importer = new SvgImporter();

  const validSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect x="10" y="10" width="80" height="80" fill="red"/>
    <circle cx="50" cy="50" r="20" fill="blue"/>
  </svg>`;

  it('parses valid SVG string', () => {
    const svg = importer.importFromString(validSvg);
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('preserves viewBox attribute', () => {
    const svg = importer.importFromString(validSvg);
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('preserves element hierarchy', () => {
    const svg = importer.importFromString(validSvg);
    expect(svg.children.length).toBe(2);
    expect(svg.children[0].tagName.toLowerCase()).toBe('rect');
    expect(svg.children[1].tagName.toLowerCase()).toBe('circle');
  });

  it('strips script elements', () => {
    const svgWithScript = `<svg xmlns="http://www.w3.org/2000/svg">
      <script>alert('xss')</script>
      <rect width="10" height="10"/>
    </svg>`;
    const svg = importer.importFromString(svgWithScript);
    expect(svg.querySelector('script')).toBeNull();
  });

  it('strips event handler attributes', () => {
    const svgWithEvents = `<svg xmlns="http://www.w3.org/2000/svg">
      <rect onclick="alert('xss')" onload="alert('xss')" width="10" height="10"/>
    </svg>`;
    const svg = importer.importFromString(svgWithEvents);
    const rect = svg.querySelector('rect')!;
    expect(rect.hasAttribute('onclick')).toBe(false);
    expect(rect.hasAttribute('onload')).toBe(false);
  });

  it('throws on invalid XML', () => {
    expect(() => importer.importFromString('<not valid xml')).toThrow();
  });

  it('throws on non-SVG document', () => {
    expect(() => importer.importFromString('<html><body></body></html>')).toThrow();
  });

  it('handles SVG with nested groups', () => {
    const nested = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="group1">
        <rect width="50" height="50"/>
        <g id="group2">
          <circle r="10"/>
        </g>
      </g>
    </svg>`;
    const svg = importer.importFromString(nested);
    expect(svg.querySelector('#group2 circle')).not.toBeNull();
  });
});
