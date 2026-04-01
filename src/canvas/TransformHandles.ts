import { createSvgElement } from '../utils/dom';
import type { CanvasView } from './CanvasView';
import type { SelectionManager } from '../core/SelectionManager';
import { HandleType } from '../types';
import { isGraphicsElement } from '../utils/svg';

interface HandleInfo {
  type: HandleType;
  x: number;
  y: number;
  cursor: string;
}

export class TransformHandles {
  private handlesGroup: SVGGElement;
  private handles: HandleInfo[] = [];
  private handleSize = 8;

  constructor(
    private canvasView: CanvasView,
    private selectionManager: SelectionManager
  ) {
    this.handlesGroup = createSvgElement('g', { class: 'transform-handles' });
    canvasView.overlayGroup.appendChild(this.handlesGroup);
  }

  update(): void {
    while (this.handlesGroup.firstChild) {
      this.handlesGroup.removeChild(this.handlesGroup.firstChild);
    }
    this.handles = [];

    const selected = this.selectionManager.selected;
    if (selected.length !== 1) return;

    const el = selected[0];
    if (!isGraphicsElement(el)) return;

    try {
      const bbox = el.getBBox();
      const ctm = el.getCTM();
      const workspaceCTM = this.canvasView.workspace.getCTM();

      if (!ctm || !workspaceCTM) return;

      const localToWorkspace = workspaceCTM.inverse().multiply(ctm);

      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;

      // Define handle positions in element-local coordinates
      const positions: [HandleType, number, number, string][] = [
        [HandleType.NW, bbox.x, bbox.y, 'nwse-resize'],
        [HandleType.N, cx, bbox.y, 'ns-resize'],
        [HandleType.NE, bbox.x + bbox.width, bbox.y, 'nesw-resize'],
        [HandleType.E, bbox.x + bbox.width, cy, 'ew-resize'],
        [HandleType.SE, bbox.x + bbox.width, bbox.y + bbox.height, 'nwse-resize'],
        [HandleType.S, cx, bbox.y + bbox.height, 'ns-resize'],
        [HandleType.SW, bbox.x, bbox.y + bbox.height, 'nesw-resize'],
        [HandleType.W, bbox.x, cy, 'ew-resize'],
      ];

      for (const [type, lx, ly, cursor] of positions) {
        const pt = new DOMPoint(lx, ly).matrixTransform(localToWorkspace);
        this.handles.push({ type, x: pt.x, y: pt.y, cursor });

        const handleEl = createSvgElement('rect', {
          x: String(pt.x - this.handleSize / 2),
          y: String(pt.y - this.handleSize / 2),
          width: String(this.handleSize),
          height: String(this.handleSize),
          fill: '#fff',
          stroke: '#6c8cff',
          'stroke-width': '1.5',
          rx: '1',
          'pointer-events': 'none',
          'data-handle': type,
        });
        this.handlesGroup.appendChild(handleEl);
      }

      // Rotation handle (above the top center)
      const topCenter = new DOMPoint(cx, bbox.y).matrixTransform(localToWorkspace);
      const rotateY = topCenter.y - 25;
      this.handles.push({ type: HandleType.ROTATE, x: topCenter.x, y: rotateY, cursor: 'crosshair' });

      // Line from top center to rotation handle
      const line = createSvgElement('line', {
        x1: String(topCenter.x),
        y1: String(topCenter.y),
        x2: String(topCenter.x),
        y2: String(rotateY),
        stroke: '#6c8cff',
        'stroke-width': '1',
        'pointer-events': 'none',
      });
      this.handlesGroup.appendChild(line);

      // Rotation handle circle
      const rotHandle = createSvgElement('circle', {
        cx: String(topCenter.x),
        cy: String(rotateY),
        r: '5',
        fill: '#fff',
        stroke: '#6c8cff',
        'stroke-width': '1.5',
        'pointer-events': 'none',
        'data-handle': HandleType.ROTATE,
      });
      this.handlesGroup.appendChild(rotHandle);
    } catch {
      // getBBox can throw
    }
  }

  hitTest(svgX: number, svgY: number): HandleType {
    const threshold = this.handleSize + 4;
    for (const h of this.handles) {
      const dx = svgX - h.x;
      const dy = svgY - h.y;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        return h.type;
      }
    }
    return HandleType.NONE;
  }

  getCursorForHandle(type: HandleType): string {
    const handle = this.handles.find((h) => h.type === type);
    return handle?.cursor || 'default';
  }

  getHandleCenter(type: HandleType): { x: number; y: number } | null {
    const handle = this.handles.find((h) => h.type === type);
    return handle ? { x: handle.x, y: handle.y } : null;
  }

  getElementCenter(): { x: number; y: number } | null {
    const selected = this.selectionManager.selected;
    if (selected.length !== 1) return null;
    const el = selected[0];
    if (!isGraphicsElement(el)) return null;
    try {
      const bbox = el.getBBox();
      const ctm = el.getCTM();
      const workspaceCTM = this.canvasView.workspace.getCTM();
      if (!ctm || !workspaceCTM) return null;
      const localToWorkspace = workspaceCTM.inverse().multiply(ctm);
      const center = new DOMPoint(
        bbox.x + bbox.width / 2,
        bbox.y + bbox.height / 2
      ).matrixTransform(localToWorkspace);
      return { x: center.x, y: center.y };
    } catch {
      return null;
    }
  }
}
