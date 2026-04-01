import { createSvgElement } from '../utils/dom';
import { EditorState } from '../core/EditorState';
import type { ViewBox } from '../types';

export class CanvasView {
  readonly workspace: SVGSVGElement;
  readonly contentGroup: SVGGElement;
  readonly overlayGroup: SVGGElement;
  private container: HTMLElement;
  private state: EditorState;
  private _viewBox: ViewBox = { x: 0, y: 0, width: 800, height: 600 };
  private welcomeEl: HTMLElement | null = null;

  constructor(container: HTMLElement, state: EditorState) {
    this.container = container;
    this.state = state;

    this.workspace = createSvgElement('svg', {
      class: 'workspace',
    });

    this.contentGroup = createSvgElement('g', { class: 'content-layer' });
    this.overlayGroup = createSvgElement('g', { class: 'overlay-layer' });

    this.workspace.appendChild(this.contentGroup);
    this.workspace.appendChild(this.overlayGroup);
    container.appendChild(this.workspace);

    this.showWelcome();
    this.updateViewBox();
    this.setupResizeObserver();
  }

  get viewBox(): ViewBox {
    return { ...this._viewBox };
  }

  set viewBox(vb: ViewBox) {
    this._viewBox = vb;
    this.updateViewBox();
  }

  loadSvgContent(svgElement: SVGSVGElement): void {
    this.hideWelcome();

    // Clear existing content
    while (this.contentGroup.firstChild) {
      this.contentGroup.removeChild(this.contentGroup.firstChild);
    }

    // Extract viewBox from source SVG
    const vb = svgElement.getAttribute('viewBox');
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number);
      if (parts.length === 4) {
        this._viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
      }
    } else {
      const w = parseFloat(svgElement.getAttribute('width') || '800');
      const h = parseFloat(svgElement.getAttribute('height') || '600');
      this._viewBox = { x: 0, y: 0, width: w, height: h };
    }

    // Move children into content group
    const children = Array.from(svgElement.childNodes);
    for (const child of children) {
      this.contentGroup.appendChild(child);
    }

    // Copy defs if any
    const defs = svgElement.querySelector('defs');
    if (defs) {
      // Ensure defs are in the workspace SVG (before content group)
      const existingDefs = this.workspace.querySelector('defs');
      if (existingDefs) existingDefs.remove();
      this.workspace.insertBefore(defs, this.contentGroup);
    }

    this.updateViewBox();
    this.fitToView();
  }

  fitToView(): void {
    const containerRect = this.container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const contentVB = this._viewBox;
    const containerAspect = containerRect.width / containerRect.height;
    const contentAspect = contentVB.width / contentVB.height;

    let newWidth: number, newHeight: number;
    if (contentAspect > containerAspect) {
      // Content is wider - fit to width with padding
      newWidth = contentVB.width * 1.1;
      newHeight = newWidth / containerAspect;
    } else {
      // Content is taller - fit to height with padding
      newHeight = contentVB.height * 1.1;
      newWidth = newHeight * containerAspect;
    }

    const centerX = contentVB.x + contentVB.width / 2;
    const centerY = contentVB.y + contentVB.height / 2;

    this._viewBox = {
      x: centerX - newWidth / 2,
      y: centerY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    };

    this.updateViewBox();
    this.state.zoom = containerRect.width / this._viewBox.width;
  }

  getSvgPoint(clientX: number, clientY: number): DOMPoint {
    const pt = this.workspace.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = this.workspace.getScreenCTM();
    if (ctm) {
      return pt.matrixTransform(ctm.inverse());
    }
    return pt;
  }

  getContentElement(): SVGGElement {
    return this.contentGroup;
  }

  private updateViewBox(): void {
    const { x, y, width, height } = this._viewBox;
    this.workspace.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  }

  private setupResizeObserver(): void {
    const observer = new ResizeObserver(() => {
      // Maintain aspect ratio on resize
      if (this.state.svgRoot) {
        const containerRect = this.container.getBoundingClientRect();
        if (containerRect.width > 0 && containerRect.height > 0) {
          this.state.zoom = containerRect.width / this._viewBox.width;
        }
      }
    });
    observer.observe(this.container);
  }

  private showWelcome(): void {
    const welcome = document.createElement('div');
    welcome.className = 'canvas-welcome';
    welcome.innerHTML = `
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="48" height="48" rx="4"/>
        <path d="M24 40 L32 20 L40 40"/>
        <circle cx="32" cy="36" r="2"/>
      </svg>
      <p>Drop an SVG file here or click Import</p>
      <span class="shortcut">Ctrl+O to open</span>
    `;
    this.container.appendChild(welcome);
    this.welcomeEl = welcome;
  }

  private hideWelcome(): void {
    if (this.welcomeEl) {
      this.welcomeEl.remove();
      this.welcomeEl = null;
    }
  }
}
