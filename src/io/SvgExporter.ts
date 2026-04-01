import type { CanvasView } from '../canvas/CanvasView';

export class SvgExporter {
  constructor(private canvasView: CanvasView) {}

  exportToString(): string {
    const contentGroup = this.canvasView.getContentElement();
    const vb = this.canvasView.originalViewBox;

    // Build a clean SVG document
    const serializer = new XMLSerializer();
    const svgNs = 'http://www.w3.org/2000/svg';

    const svgDoc = document.implementation.createDocument(svgNs, 'svg', null);
    const root = svgDoc.documentElement;
    root.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);

    // Copy defs if present
    const defs = this.canvasView.workspace.querySelector('defs');
    if (defs) {
      root.appendChild(svgDoc.importNode(defs, true));
    }

    // Copy content children (skip overlay elements)
    for (let i = 0; i < contentGroup.children.length; i++) {
      const child = contentGroup.children[i];
      const clone = svgDoc.importNode(child, true);
      this.cleanElement(clone);
      root.appendChild(clone);
    }

    let svgString = serializer.serializeToString(root);

    // Add XML declaration
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

    return this.prettyPrint(svgString);
  }

  private cleanElement(el: Node): void {
    if (el instanceof Element) {
      // Remove editor-specific attributes
      el.removeAttribute('data-locked');
      el.classList.remove('selected', 'hovered');
      if (el.getAttribute('class') === '') {
        el.removeAttribute('class');
      }

      for (let i = 0; i < el.children.length; i++) {
        this.cleanElement(el.children[i]);
      }
    }
  }

  private prettyPrint(xml: string): string {
    // Simple indentation
    let formatted = '';
    let indent = 0;
    const parts = xml.replace(/(>)(<)/g, '$1\n$2').split('\n');

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }

      formatted += '  '.repeat(indent) + trimmed + '\n';

      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
        indent++;
      }
    }

    return formatted;
  }
}
