const EVENT_ATTRS = [
  'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
  'onmousemove', 'onmouseout', 'onkeydown', 'onkeypress', 'onkeyup',
  'onload', 'onunload', 'onfocus', 'onblur', 'onerror',
];

export class SvgImporter {
  importFromString(svgString: string): SVGSVGElement {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');

    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      throw new Error('Invalid SVG: ' + errorNode.textContent);
    }

    const svg = doc.documentElement;
    if (svg.tagName.toLowerCase() !== 'svg') {
      throw new Error('Document is not an SVG');
    }

    this.sanitize(svg);
    return svg as unknown as SVGSVGElement;
  }

  async importFromFile(file: File): Promise<SVGSVGElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const svg = this.importFromString(reader.result as string);
          resolve(svg);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private sanitize(el: Element): void {
    // Remove script elements
    const scripts = el.querySelectorAll('script');
    scripts.forEach((s) => s.remove());

    // Remove event handler attributes
    const allElements = el.querySelectorAll('*');
    const toProcess = [el, ...Array.from(allElements)];

    for (const node of toProcess) {
      for (const attr of EVENT_ATTRS) {
        node.removeAttribute(attr);
      }
    }
  }
}
