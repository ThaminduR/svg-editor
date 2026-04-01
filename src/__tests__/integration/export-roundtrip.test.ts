import { describe, it, expect } from 'vitest';
import { SvgImporter } from '../../io/SvgImporter';
import { SvgExporter } from '../../io/SvgExporter';

const TEST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect id="r1" x="10" y="10" width="30" height="30" fill="red"/>
  <circle id="c1" cx="50" cy="50" r="20" fill="blue"/>
</svg>`;

function createMockCanvasViewWithContent(contentChildren: Node[]) {
  const ns = 'http://www.w3.org/2000/svg';
  const workspace = document.createElementNS(ns, 'svg');
  const contentGroup = document.createElementNS(ns, 'g');
  contentGroup.setAttribute('class', 'content-layer');
  for (const child of contentChildren) {
    contentGroup.appendChild(child);
  }
  workspace.appendChild(contentGroup);

  return {
    workspace,
    contentGroup,
    getContentElement: () => contentGroup,
    viewBox: { x: 0, y: 0, width: 100, height: 100 },
  };
}

describe('Export round-trip', () => {
  const importer = new SvgImporter();

  it('import -> modify fill -> export -> re-import preserves fill', () => {
    const svg = importer.importFromString(TEST_SVG);
    const rect = svg.querySelector('#r1')!;
    rect.setAttribute('fill', 'green');

    const children = Array.from(svg.childNodes).map((n) => n.cloneNode(true));
    const mockView = createMockCanvasViewWithContent(children);
    const exporter = new SvgExporter(mockView as never);

    const exported = exporter.exportToString();
    const reimported = importer.importFromString(exported);
    const reRect = reimported.querySelector('#r1')!;
    expect(reRect.getAttribute('fill')).toBe('green');
  });

  it('exported SVG contains no editor artifacts', () => {
    const svg = importer.importFromString(TEST_SVG);
    const rect = svg.querySelector('#r1')!;
    rect.setAttribute('data-locked', 'true');
    rect.classList.add('selected');

    const children = Array.from(svg.childNodes).map((n) => n.cloneNode(true));
    const mockView = createMockCanvasViewWithContent(children);
    const exporter = new SvgExporter(mockView as never);

    const exported = exporter.exportToString();
    expect(exported).not.toContain('data-locked');
    expect(exported).not.toContain('class="selected"');
  });

  it('exported SVG has proper xmlns and viewBox', () => {
    const svg = importer.importFromString(TEST_SVG);
    const children = Array.from(svg.childNodes).map((n) => n.cloneNode(true));
    const mockView = createMockCanvasViewWithContent(children);
    const exporter = new SvgExporter(mockView as never);

    const exported = exporter.exportToString();
    expect(exported).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(exported).toContain('viewBox="0 0 100 100"');
  });
});
