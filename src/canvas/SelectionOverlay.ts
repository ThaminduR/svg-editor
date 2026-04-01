import { createSvgElement } from '../utils/dom';
import type { CanvasView } from './CanvasView';
import type { SelectionManager } from '../core/SelectionManager';
import { isGraphicsElement } from '../utils/svg';

export class SelectionOverlay {
  private overlayGroup: SVGGElement;

  constructor(
    private canvasView: CanvasView,
    private selectionManager: SelectionManager
  ) {
    this.overlayGroup = createSvgElement('g', { class: 'selection-overlay' });
    canvasView.overlayGroup.appendChild(this.overlayGroup);
  }

  update(): void {
    // Clear existing overlay
    while (this.overlayGroup.firstChild) {
      this.overlayGroup.removeChild(this.overlayGroup.firstChild);
    }

    const selected = this.selectionManager.selected;
    for (const el of selected) {
      if (!isGraphicsElement(el)) continue;
      this.drawSelectionRect(el as SVGGraphicsElement);
    }
  }

  drawRubberBand(x: number, y: number, width: number, height: number): void {
    this.clearRubberBand();
    const rect = createSvgElement('rect', {
      x: String(x),
      y: String(y),
      width: String(Math.abs(width)),
      height: String(Math.abs(height)),
      fill: 'rgba(108, 140, 255, 0.1)',
      stroke: '#6c8cff',
      'stroke-width': '1',
      'stroke-dasharray': '4,4',
      class: 'rubber-band',
      'pointer-events': 'none',
    });
    this.overlayGroup.appendChild(rect);
  }

  clearRubberBand(): void {
    const existing = this.overlayGroup.querySelector('.rubber-band');
    if (existing) existing.remove();
  }

  private drawSelectionRect(el: SVGGraphicsElement): void {
    try {
      const bbox = el.getBBox();
      const ctm = el.getCTM();
      const workspaceCTM = this.canvasView.workspace.getCTM();

      if (!ctm || !workspaceCTM) return;

      // Transform bbox corners to workspace coordinates
      const localToWorkspace = workspaceCTM.inverse().multiply(ctm);

      const corners = [
        new DOMPoint(bbox.x, bbox.y).matrixTransform(localToWorkspace),
        new DOMPoint(bbox.x + bbox.width, bbox.y).matrixTransform(localToWorkspace),
        new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(localToWorkspace),
        new DOMPoint(bbox.x, bbox.y + bbox.height).matrixTransform(localToWorkspace),
      ];

      const points = corners.map((p) => `${p.x},${p.y}`).join(' ');

      const polygon = createSvgElement('polygon', {
        points,
        fill: 'none',
        stroke: '#6c8cff',
        'stroke-width': '1.5',
        'stroke-dasharray': '6,3',
        'pointer-events': 'none',
        class: 'selection-rect',
      });

      this.overlayGroup.appendChild(polygon);
    } catch {
      // getBBox can throw for elements with no geometry
    }
  }
}
