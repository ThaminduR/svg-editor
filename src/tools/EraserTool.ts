import type { Tool } from './Tool';
import type { CanvasView } from '../canvas/CanvasView';
import type { CommandManager } from '../core/CommandManager';
import type { EditorState } from '../core/EditorState';
import { createSvgElement } from '../utils/dom';

/**
 * Eraser tool that uses SVG masks to hide portions of elements.
 *
 * When the user draws an eraser stroke over the canvas, each element
 * under the stroke gets a <mask> applied. The mask starts as a white
 * rect (fully visible) and the eraser adds black paths (hidden areas).
 */

interface EraserCommand {
  execute(): void;
  undo(): void;
  description: string;
}

class ApplyEraserCommand implements EraserCommand {
  description = 'Erase';
  private affectedElements: {
    element: SVGElement;
    oldMask: string | null;
    newMaskId: string;
    maskElement: SVGMaskElement;
    createdDefs: boolean;
  }[] = [];

  constructor(
    private workspace: SVGSVGElement,
    private contentGroup: SVGGElement,
    private eraserPath: string,
    private eraserWidth: number,
    private viewBox: { x: number; y: number; width: number; height: number }
  ) {}

  execute(): void {
    this.affectedElements = [];

    // Ensure <defs> exists
    let defs = this.workspace.querySelector('defs');
    const createdDefs = !defs;
    if (!defs) {
      defs = createSvgElement('defs', {});
      this.workspace.insertBefore(defs, this.contentGroup);
    }

    // Find elements that should be affected (all visible content elements)
    const children = Array.from(this.contentGroup.children) as SVGElement[];
    for (const child of children) {
      if (child.getAttribute('display') === 'none') continue;
      if (child.hasAttribute('data-locked')) continue;

      const existingMaskAttr = child.getAttribute('mask');
      let maskEl: SVGMaskElement;
      let maskId: string;

      if (existingMaskAttr && existingMaskAttr.startsWith('url(#eraser-mask-')) {
        // Append to existing eraser mask
        maskId = existingMaskAttr.replace('url(#', '').replace(')', '');
        maskEl = defs!.querySelector(`#${maskId}`) as SVGMaskElement;
        if (!maskEl) continue;
      } else {
        // Create new mask
        maskId = `eraser-mask-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        maskEl = createSvgElement('mask', { id: maskId }) as unknown as SVGMaskElement;

        // White rect = show everything by default
        const whiteRect = createSvgElement('rect', {
          x: String(this.viewBox.x - this.viewBox.width),
          y: String(this.viewBox.y - this.viewBox.height),
          width: String(this.viewBox.width * 3),
          height: String(this.viewBox.height * 3),
          fill: 'white',
        });
        maskEl.appendChild(whiteRect);
        defs!.appendChild(maskEl);
      }

      // Add the eraser stroke as a black path (hidden area)
      const eraserStroke = createSvgElement('path', {
        d: this.eraserPath,
        stroke: 'black',
        'stroke-width': String(this.eraserWidth),
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        fill: 'none',
        class: 'eraser-stroke',
      });
      maskEl.appendChild(eraserStroke);

      // Apply mask to element
      child.setAttribute('mask', `url(#${maskId})`);

      this.affectedElements.push({
        element: child,
        oldMask: existingMaskAttr,
        newMaskId: maskId,
        maskElement: maskEl,
        createdDefs,
      });
    }
  }

  undo(): void {
    const defs = this.workspace.querySelector('defs');
    for (const entry of this.affectedElements) {
      if (entry.oldMask) {
        entry.element.setAttribute('mask', entry.oldMask);
      } else {
        entry.element.removeAttribute('mask');
      }

      // If we created this mask, remove it entirely
      if (!entry.oldMask) {
        entry.maskElement.remove();
      } else {
        // Remove just the last eraser stroke we added
        const strokes = entry.maskElement.querySelectorAll('.eraser-stroke');
        if (strokes.length > 0) {
          strokes[strokes.length - 1].remove();
        }
      }
    }

    // Remove defs if we created it and it's now empty
    if (defs && defs.children.length === 0) {
      defs.remove();
    }
  }
}

export class EraserTool implements Tool {
  cursor = 'crosshair';
  private isDrawing = false;
  private pathPoints: { x: number; y: number }[] = [];
  private previewPath: SVGPathElement | null = null;
  private _eraserWidth = 10;

  constructor(
    private canvasView: CanvasView,
    private commandManager: CommandManager,
    private state: EditorState
  ) {}

  get eraserWidth(): number {
    return this._eraserWidth;
  }

  set eraserWidth(w: number) {
    this._eraserWidth = Math.max(1, Math.min(100, w));
  }

  onActivate(): void {
    this.canvasView.workspace.style.cursor = 'crosshair';
  }

  onDeactivate(): void {
    this.cleanupPreview();
    this.canvasView.workspace.style.cursor = '';
  }

  onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.isDrawing = true;
    const pt = this.canvasView.getSvgPoint(e.clientX, e.clientY);
    this.pathPoints = [{ x: pt.x, y: pt.y }];
    this.createPreview();
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;
    const pt = this.canvasView.getSvgPoint(e.clientX, e.clientY);
    this.pathPoints.push({ x: pt.x, y: pt.y });
    this.updatePreview();
  }

  onPointerUp(e: PointerEvent): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);

    if (this.pathPoints.length < 2) {
      this.cleanupPreview();
      return;
    }

    const pathD = this.buildPathD();
    this.cleanupPreview();

    const cmd = new ApplyEraserCommand(
      this.canvasView.workspace,
      this.canvasView.contentGroup,
      pathD,
      this._eraserWidth,
      this.canvasView.originalViewBox
    );
    this.commandManager.execute(cmd);
    this.state.refreshLayers();
  }

  private buildPathD(): string {
    if (this.pathPoints.length === 0) return '';
    const pts = this.pathPoints;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L${pts[i].x},${pts[i].y}`;
    }
    return d;
  }

  private createPreview(): void {
    this.cleanupPreview();
    const overlay = this.canvasView.overlayGroup;
    this.previewPath = createSvgElement('path', {
      fill: 'none',
      stroke: 'rgba(255, 100, 100, 0.5)',
      'stroke-width': String(this._eraserWidth),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'pointer-events': 'none',
      class: 'eraser-preview',
    }) as unknown as SVGPathElement;
    overlay.appendChild(this.previewPath);
  }

  private updatePreview(): void {
    if (!this.previewPath) return;
    this.previewPath.setAttribute('d', this.buildPathD());
  }

  private cleanupPreview(): void {
    if (this.previewPath) {
      this.previewPath.remove();
      this.previewPath = null;
    }
  }
}
