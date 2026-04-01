import { describe, it, expect, beforeEach } from 'vitest';
import { SvgExporter } from '../../io/SvgExporter';

// Mock CanvasView for testing
function createMockCanvasView() {
  const ns = 'http://www.w3.org/2000/svg';
  const workspace = document.createElementNS(ns, 'svg');
  const contentGroup = document.createElementNS(ns, 'g');
  contentGroup.setAttribute('class', 'content-layer');
  workspace.appendChild(contentGroup);

  return {
    workspace,
    contentGroup,
    getContentElement: () => contentGroup,
    viewBox: { x: 0, y: 0, width: 100, height: 100 },
  };
}

describe('SvgExporter', () => {
  let mockView: ReturnType<typeof createMockCanvasView>;
  let exporter: SvgExporter;

  beforeEach(() => {
    mockView = createMockCanvasView();
    exporter = new SvgExporter(mockView as never);
  });

  it('produces valid SVG string with xmlns', () => {
    const ns = 'http://www.w3.org/2000/svg';
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('width', '50');
    rect.setAttribute('height', '50');
    rect.setAttribute('fill', 'red');
    mockView.contentGroup.appendChild(rect);

    const result = exporter.exportToString();
    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(result).toContain('viewBox="0 0 100 100"');
  });

  it('preserves modified attributes', () => {
    const ns = 'http://www.w3.org/2000/svg';
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('fill', '#ff00ff');
    rect.setAttribute('stroke', '#00ff00');
    mockView.contentGroup.appendChild(rect);

    const result = exporter.exportToString();
    expect(result).toContain('fill="#ff00ff"');
    expect(result).toContain('stroke="#00ff00"');
  });

  it('strips editor-specific attributes', () => {
    const ns = 'http://www.w3.org/2000/svg';
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('data-locked', 'true');
    rect.classList.add('selected');
    mockView.contentGroup.appendChild(rect);

    const result = exporter.exportToString();
    expect(result).not.toContain('data-locked');
    expect(result).not.toContain('selected');
  });

  it('output is parseable by DOMParser', () => {
    const ns = 'http://www.w3.org/2000/svg';
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '25');
    mockView.contentGroup.appendChild(circle);

    const result = exporter.exportToString();
    const parser = new DOMParser();
    const doc = parser.parseFromString(result, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelector('circle')).not.toBeNull();
  });
});
