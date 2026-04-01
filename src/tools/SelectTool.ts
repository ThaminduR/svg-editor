import type { Tool } from './Tool';
import type { CanvasView } from '../canvas/CanvasView';
import type { SelectionManager } from '../core/SelectionManager';
import type { CommandManager } from '../core/CommandManager';
import type { TransformHandles } from '../canvas/TransformHandles';
import type { EditorState } from '../core/EditorState';
import { HandleType } from '../types';
import { TransformCommand } from '../core/commands/TransformCommand';
import { isGraphicsElement } from '../utils/svg';
import { angleBetweenPoints } from '../utils/math';

enum DragMode {
  NONE,
  SELECTING,
  MOVING,
  RESIZING,
  ROTATING,
  RUBBER_BAND,
}

export class SelectTool implements Tool {
  cursor = 'default';
  private dragMode = DragMode.NONE;
  private startSvgPt = { x: 0, y: 0 };
  private lastSvgPt = { x: 0, y: 0 };
  private activeHandle = HandleType.NONE;
  private originalTransforms = new Map<SVGElement, string | null>();
  private hasDragged = false;

  constructor(
    private canvasView: CanvasView,
    private selectionManager: SelectionManager,
    private commandManager: CommandManager,
    private transformHandles: TransformHandles,
    private state: EditorState
  ) {
    // Update overlays when selection or commands change
    state.on('selection-changed', () => this.updateOverlays());
    state.on('command-executed', () => this.updateOverlays());
  }

  onActivate(): void {
    this.cursor = 'default';
  }

  onDeactivate(): void {
    this.dragMode = DragMode.NONE;
  }

  onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;

    const svgPt = this.canvasView.getSvgPoint(e.clientX, e.clientY);
    this.startSvgPt = { x: svgPt.x, y: svgPt.y };
    this.lastSvgPt = { x: svgPt.x, y: svgPt.y };
    this.hasDragged = false;

    // Check transform handles first
    const handle = this.transformHandles.hitTest(svgPt.x, svgPt.y);
    if (handle !== HandleType.NONE) {
      if (handle === HandleType.ROTATE) {
        this.dragMode = DragMode.ROTATING;
      } else {
        this.dragMode = DragMode.RESIZING;
      }
      this.activeHandle = handle;
      this.storeOriginalTransforms();
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
      return;
    }

    // Hit test SVG elements
    const hitEl = this.hitTestElement(e.clientX, e.clientY);

    if (hitEl) {
      if (e.shiftKey) {
        this.selectionManager.toggleSelection(hitEl);
      } else if (!this.selectionManager.isSelected(hitEl)) {
        this.selectionManager.select(hitEl);
      }
      this.dragMode = DragMode.MOVING;
      this.storeOriginalTransforms();
    } else {
      // Click on empty space
      if (!e.shiftKey) {
        this.selectionManager.clearSelection();
      }
      this.dragMode = DragMode.RUBBER_BAND;
    }

    (e.target as Element)?.setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e: PointerEvent): void {
    const svgPt = this.canvasView.getSvgPoint(e.clientX, e.clientY);
    const dx = svgPt.x - this.lastSvgPt.x;
    const dy = svgPt.y - this.lastSvgPt.y;

    if (Math.abs(svgPt.x - this.startSvgPt.x) > 2 || Math.abs(svgPt.y - this.startSvgPt.y) > 2) {
      this.hasDragged = true;
    }

    switch (this.dragMode) {
      case DragMode.MOVING:
        this.handleMove(dx, dy);
        break;
      case DragMode.RESIZING:
        this.handleResize(svgPt);
        break;
      case DragMode.ROTATING:
        this.handleRotate(svgPt);
        break;
      case DragMode.RUBBER_BAND:
        this.handleRubberBand(svgPt);
        break;
      case DragMode.NONE:
        this.updateCursor(e);
        break;
    }

    this.lastSvgPt = { x: svgPt.x, y: svgPt.y };
  }

  onPointerUp(e: PointerEvent): void {
    if (this.hasDragged) {
      switch (this.dragMode) {
        case DragMode.MOVING:
        case DragMode.RESIZING:
        case DragMode.ROTATING:
          this.commitTransforms();
          break;
        case DragMode.RUBBER_BAND:
          this.finishRubberBand();
          break;
      }
    }

    this.dragMode = DragMode.NONE;
    this.activeHandle = HandleType.NONE;
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    this.updateOverlays();
  }

  private hitTestElement(clientX: number, clientY: number): SVGElement | null {
    const elements = document.elementsFromPoint(clientX, clientY);
    for (const el of elements) {
      // Walk up to find a direct child of the content group
      let current: Element | null = el;
      while (current && current.parentElement !== (this.canvasView.contentGroup as unknown as HTMLElement)) {
        current = current.parentElement;
      }
      if (
        current &&
        current.parentElement === (this.canvasView.contentGroup as unknown as HTMLElement) &&
        isGraphicsElement(current) &&
        !current.hasAttribute('data-locked')
      ) {
        return current as SVGElement;
      }
    }
    return null;
  }

  private handleMove(dx: number, dy: number): void {
    const totalDx = this.lastSvgPt.x + dx - this.startSvgPt.x;
    const totalDy = this.lastSvgPt.y + dy - this.startSvgPt.y;
    for (const el of this.selectionManager.selected) {
      const original = this.originalTransforms.get(el) || '';
      el.setAttribute('transform', `translate(${totalDx}, ${totalDy}) ${original}`);
    }
    this.updateOverlays();
  }

  private handleResize(svgPt: { x: number; y: number }): void {
    const selected = this.selectionManager.selected;
    if (selected.length !== 1) return;

    const el = selected[0] as SVGGraphicsElement;
    if (!isGraphicsElement(el)) return;

    try {
      const bbox = el.getBBox();
      if (bbox.width === 0 || bbox.height === 0) return;

      const center = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };

      // Calculate scale relative to the element's actual dimensions
      const dx = svgPt.x - this.startSvgPt.x;
      const dy = svgPt.y - this.startSvgPt.y;

      let sx = 1, sy = 1;
      const halfW = bbox.width / 2;
      const halfH = bbox.height / 2;

      switch (this.activeHandle) {
        case HandleType.E: case HandleType.NE: case HandleType.SE:
          sx = (halfW + dx) / halfW; break;
        case HandleType.W: case HandleType.NW: case HandleType.SW:
          sx = (halfW - dx) / halfW; break;
      }
      switch (this.activeHandle) {
        case HandleType.S: case HandleType.SE: case HandleType.SW:
          sy = (halfH + dy) / halfH; break;
        case HandleType.N: case HandleType.NE: case HandleType.NW:
          sy = (halfH - dy) / halfH; break;
      }

      // Constrain to positive scales
      sx = Math.max(0.01, sx);
      sy = Math.max(0.01, sy);

      const original = this.originalTransforms.get(el) || '';
      el.setAttribute(
        'transform',
        `translate(${center.x}, ${center.y}) scale(${sx}, ${sy}) translate(${-center.x}, ${-center.y}) ${original}`
      );
      this.updateOverlays();
    } catch {
      // ignore
    }
  }

  private handleRotate(svgPt: { x: number; y: number }): void {
    const selected = this.selectionManager.selected;
    if (selected.length !== 1) return;

    const el = selected[0] as SVGGraphicsElement;
    const elementCenter = this.transformHandles.getElementCenter();
    if (!elementCenter) return;

    const startAngle = angleBetweenPoints(elementCenter, this.startSvgPt);
    const currentAngle = angleBetweenPoints(elementCenter, svgPt);
    const rotation = currentAngle - startAngle;

    const original = this.originalTransforms.get(el) || '';
    el.setAttribute(
      'transform',
      `rotate(${rotation}, ${elementCenter.x}, ${elementCenter.y}) ${original}`
    );
    this.updateOverlays();
  }

  private handleRubberBand(svgPt: { x: number; y: number }): void {
    const x = Math.min(this.startSvgPt.x, svgPt.x);
    const y = Math.min(this.startSvgPt.y, svgPt.y);
    const width = Math.abs(svgPt.x - this.startSvgPt.x);
    const height = Math.abs(svgPt.y - this.startSvgPt.y);

    // Import SelectionOverlay dynamically to avoid circular imports
    const overlay = this.canvasView.overlayGroup.querySelector('.selection-overlay');
    if (overlay) {
      // Clear existing rubber band
      const existing = overlay.querySelector('.rubber-band');
      if (existing) existing.remove();

      const ns = 'http://www.w3.org/2000/svg';
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', String(height));
      rect.setAttribute('fill', 'rgba(108, 140, 255, 0.1)');
      rect.setAttribute('stroke', '#6c8cff');
      rect.setAttribute('stroke-width', '1');
      rect.setAttribute('stroke-dasharray', '4,4');
      rect.setAttribute('class', 'rubber-band');
      rect.setAttribute('pointer-events', 'none');
      overlay.appendChild(rect);
    }
  }

  private finishRubberBand(): void {
    const rubber = this.canvasView.overlayGroup.querySelector('.rubber-band');
    if (!rubber) return;

    const rx = parseFloat(rubber.getAttribute('x') || '0');
    const ry = parseFloat(rubber.getAttribute('y') || '0');
    const rw = parseFloat(rubber.getAttribute('width') || '0');
    const rh = parseFloat(rubber.getAttribute('height') || '0');

    rubber.remove();

    // Find all elements that intersect the rubber band
    const content = this.canvasView.getContentElement();
    const children = content.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as SVGElement;
      if (!isGraphicsElement(child) || child.hasAttribute('data-locked')) continue;

      try {
        const bbox = (child as SVGGraphicsElement).getBBox();
        const ctm = (child as SVGGraphicsElement).getCTM();
        const workspaceCTM = this.canvasView.workspace.getCTM();
        if (!ctm || !workspaceCTM) continue;

        const localToWorkspace = workspaceCTM.inverse().multiply(ctm);
        const topLeft = new DOMPoint(bbox.x, bbox.y).matrixTransform(localToWorkspace);
        const bottomRight = new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(localToWorkspace);

        const elRect = {
          x: Math.min(topLeft.x, bottomRight.x),
          y: Math.min(topLeft.y, bottomRight.y),
          width: Math.abs(bottomRight.x - topLeft.x),
          height: Math.abs(bottomRight.y - topLeft.y),
        };

        // Check intersection
        if (
          rx < elRect.x + elRect.width &&
          rx + rw > elRect.x &&
          ry < elRect.y + elRect.height &&
          ry + rh > elRect.y
        ) {
          this.selectionManager.addToSelection(child);
        }
      } catch {
        // ignore
      }
    }
  }

  private storeOriginalTransforms(): void {
    this.originalTransforms.clear();
    for (const el of this.selectionManager.selected) {
      this.originalTransforms.set(el, el.getAttribute('transform'));
    }
  }

  private commitTransforms(): void {
    for (const el of this.selectionManager.selected) {
      const oldTransform = this.originalTransforms.get(el) ?? null;
      const newTransform = el.getAttribute('transform') || '';

      if (oldTransform !== newTransform) {
        // Restore old transform, then execute command (so undo works)
        if (oldTransform === null) {
          el.removeAttribute('transform');
        } else {
          el.setAttribute('transform', oldTransform);
        }
        this.commandManager.execute(
          new TransformCommand(el, oldTransform, newTransform)
        );
      }
    }
    this.originalTransforms.clear();
    this.state.refreshLayers();
  }

  private updateCursor(e: PointerEvent): void {
    const svgPt = this.canvasView.getSvgPoint(e.clientX, e.clientY);
    const handle = this.transformHandles.hitTest(svgPt.x, svgPt.y);
    if (handle !== HandleType.NONE) {
      this.canvasView.workspace.style.cursor = this.transformHandles.getCursorForHandle(handle);
    } else {
      const hit = this.hitTestElement(e.clientX, e.clientY);
      this.canvasView.workspace.style.cursor = hit ? 'move' : 'default';
    }
  }

  updateOverlays(): void {
    // Trigger overlay and handles update
    const selOverlay = this.canvasView.overlayGroup.querySelector('.selection-overlay');
    if (selOverlay) {
      // Clear selection rects
      const rects = selOverlay.querySelectorAll('.selection-rect');
      rects.forEach((r) => r.remove());

      // Redraw selection rects
      for (const el of this.selectionManager.selected) {
        if (!isGraphicsElement(el)) continue;
        try {
          const bbox = (el as SVGGraphicsElement).getBBox();
          const ctm = (el as SVGGraphicsElement).getCTM();
          const workspaceCTM = this.canvasView.workspace.getCTM();
          if (!ctm || !workspaceCTM) continue;

          const localToWorkspace = workspaceCTM.inverse().multiply(ctm);
          const corners = [
            new DOMPoint(bbox.x, bbox.y).matrixTransform(localToWorkspace),
            new DOMPoint(bbox.x + bbox.width, bbox.y).matrixTransform(localToWorkspace),
            new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(localToWorkspace),
            new DOMPoint(bbox.x, bbox.y + bbox.height).matrixTransform(localToWorkspace),
          ];

          const ns = 'http://www.w3.org/2000/svg';
          const polygon = document.createElementNS(ns, 'polygon');
          polygon.setAttribute('points', corners.map((p) => `${p.x},${p.y}`).join(' '));
          polygon.setAttribute('fill', 'none');
          polygon.setAttribute('stroke', '#6c8cff');
          polygon.setAttribute('stroke-width', '1.5');
          polygon.setAttribute('stroke-dasharray', '6,3');
          polygon.setAttribute('pointer-events', 'none');
          polygon.setAttribute('class', 'selection-rect');
          selOverlay.appendChild(polygon);
        } catch {
          // ignore
        }
      }
    }

    this.transformHandles.update();
  }
}
