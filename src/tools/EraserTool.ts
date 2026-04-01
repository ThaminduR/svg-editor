import type { Tool } from './Tool';
import type { CanvasView } from '../canvas/CanvasView';
import type { CommandManager } from '../core/CommandManager';
import type { EditorState } from '../core/EditorState';
import type { Command } from '../core/commands/Command';
import { createSvgElement } from '../utils/dom';

/**
 * Eraser tool that splits SVG paths by removing segments that intersect
 * the eraser stroke. The remaining portions become separate path elements.
 *
 * For non-path elements (rect, circle, etc.) it converts them to paths first.
 */

// ── Geometry helpers ─────────────────────────────────────────────────

interface Pt { x: number; y: number }

function distSq(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Shortest distance from point P to segment AB. */
function pointToSegmentDist(p: Pt, a: Pt, b: Pt): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return Math.sqrt(distSq(p, a));
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(distSq(p, { x: a.x + t * abx, y: a.y + t * aby }));
}

/** Check if point is within `radius` of any segment of the eraser polyline. */
function isInsideEraserStroke(p: Pt, eraserPts: Pt[], radius: number): boolean {
  for (let i = 0; i < eraserPts.length - 1; i++) {
    if (pointToSegmentDist(p, eraserPts[i], eraserPts[i + 1]) < radius) {
      return true;
    }
  }
  // Also check against individual eraser points (handles single-point / click erase)
  if (eraserPts.length === 1) {
    return Math.sqrt(distSq(p, eraserPts[0])) < radius;
  }
  return false;
}

// ── Path sampling ────────────────────────────────────────────────────

/**
 * Sample a path element into evenly-spaced points.
 * Uses the native `getTotalLength()` and `getPointAtLength()` APIs.
 */
function samplePath(pathEl: SVGPathElement, step: number): Pt[] {
  const totalLen = pathEl.getTotalLength();
  if (totalLen === 0) return [];
  const pts: Pt[] = [];
  for (let d = 0; d <= totalLen; d += step) {
    const p = pathEl.getPointAtLength(d);
    pts.push({ x: p.x, y: p.y });
  }
  // Always include the very last point
  const last = pathEl.getPointAtLength(totalLen);
  const tail = pts[pts.length - 1];
  if (!tail || Math.abs(tail.x - last.x) > 0.01 || Math.abs(tail.y - last.y) > 0.01) {
    pts.push({ x: last.x, y: last.y });
  }
  return pts;
}

/** Build a path `d` attribute from a run of points using line segments. */
function pointsToPathD(pts: Pt[]): string {
  if (pts.length === 0) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L${pts[i].x},${pts[i].y}`;
  }
  return d;
}

// ── Command ──────────────────────────────────────────────────────────

interface ErasedEntry {
  original: SVGElement;
  /** Next sibling before removal, used to restore exact DOM position. */
  nextSibling: Node | null;
  parent: Node;
  newPaths: SVGElement[];
}

class ErasePathCommand implements Command {
  description = 'Erase path';
  private entries: ErasedEntry[] = [];

  constructor(
    private contentGroup: SVGGElement,
    private eraserPts: Pt[],
    private eraserRadius: number,
    private sampleStep: number
  ) {}

  execute(): void {
    this.entries = [];
    const children = Array.from(this.contentGroup.children) as SVGElement[];

    for (const child of children) {
      if (child.getAttribute('display') === 'none') continue;
      if (child.hasAttribute('data-locked')) continue;

      const pathEl = this.toPathElement(child);
      if (!pathEl) continue;

      const sampled = samplePath(pathEl, this.sampleStep);
      if (sampled.length === 0) continue;

      // Split sampled points into "surviving" runs
      const runs: Pt[][] = [];
      let currentRun: Pt[] = [];

      for (const pt of sampled) {
        if (isInsideEraserStroke(pt, this.eraserPts, this.eraserRadius)) {
          // Erased — break the current run
          if (currentRun.length > 1) {
            runs.push(currentRun);
          }
          currentRun = [];
        } else {
          currentRun.push(pt);
        }
      }
      if (currentRun.length > 1) {
        runs.push(currentRun);
      }

      // If nothing was erased, skip this element
      if (runs.length === 1 && runs[0].length === sampled.length) continue;

      // Build replacement paths
      const newPaths: SVGElement[] = [];
      for (const run of runs) {
        const d = pointsToPathD(run);
        const newPath = createSvgElement('path', { d }) as SVGElement;

        // Copy visual attributes from original
        this.copyAttributes(child, newPath);
        newPaths.push(newPath);
      }

      // Record for undo
      const entry: ErasedEntry = {
        original: child,
        nextSibling: child.nextSibling,
        parent: child.parentNode!,
        newPaths,
      };
      this.entries.push(entry);

      // Replace original with new paths
      for (const np of newPaths) {
        this.contentGroup.insertBefore(np, child);
      }
      child.remove();
    }
  }

  undo(): void {
    for (const entry of this.entries) {
      // Remove replacement paths
      for (const np of entry.newPaths) {
        np.remove();
      }
      // Restore original element at its original position
      if (entry.nextSibling) {
        entry.parent.insertBefore(entry.original, entry.nextSibling);
      } else {
        entry.parent.appendChild(entry.original);
      }
    }
    this.entries = [];
  }

  /** Copy visual/transform attributes from src to dst, skipping geometry. */
  private copyAttributes(src: SVGElement, dst: SVGElement): void {
    const skip = new Set([
      'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry',
      'x1', 'y1', 'x2', 'y2', 'points', 'd',
      'class', 'data-locked',
    ]);
    for (let i = 0; i < src.attributes.length; i++) {
      const attr = src.attributes[i];
      if (!skip.has(attr.name)) {
        dst.setAttribute(attr.name, attr.value);
      }
    }
    // For paths with fill, if original was not a path the fill is already inherited.
    // For stroked shapes turned into paths, keep fill="none" if original had no fill.
  }

  /**
   * Obtain a temporary SVGPathElement for sampling.
   * For <path> returns itself; for other shapes, creates a temporary
   * equivalent <path> in the DOM so getTotalLength/getPointAtLength work.
   */
  private toPathElement(el: SVGElement): SVGPathElement | null {
    if (el instanceof SVGPathElement) return el;

    // For basic shapes, generate an equivalent path `d`
    const d = this.shapeToPathD(el);
    if (!d) return null;

    // We need a real DOM-attached element for getTotalLength
    const tmp = createSvgElement('path', { d }) as unknown as SVGPathElement;
    // Copy transform so sampling is in the right coordinate space
    const tf = el.getAttribute('transform');
    if (tf) tmp.setAttribute('transform', tf);
    // Temporarily attach to workspace for measurement
    el.parentElement?.appendChild(tmp);
    // Tag it for cleanup
    tmp.setAttribute('data-tmp-eraser', 'true');
    return tmp;
  }

  private shapeToPathD(el: SVGElement): string | null {
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case 'rect': {
        const x = parseFloat(el.getAttribute('x') || '0');
        const y = parseFloat(el.getAttribute('y') || '0');
        const w = parseFloat(el.getAttribute('width') || '0');
        const h = parseFloat(el.getAttribute('height') || '0');
        if (w === 0 || h === 0) return null;
        return `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`;
      }
      case 'circle': {
        const cx = parseFloat(el.getAttribute('cx') || '0');
        const cy = parseFloat(el.getAttribute('cy') || '0');
        const r = parseFloat(el.getAttribute('r') || '0');
        if (r === 0) return null;
        return `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`;
      }
      case 'ellipse': {
        const cx = parseFloat(el.getAttribute('cx') || '0');
        const cy = parseFloat(el.getAttribute('cy') || '0');
        const rx = parseFloat(el.getAttribute('rx') || '0');
        const ry = parseFloat(el.getAttribute('ry') || '0');
        if (rx === 0 || ry === 0) return null;
        return `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;
      }
      case 'line': {
        const x1 = parseFloat(el.getAttribute('x1') || '0');
        const y1 = parseFloat(el.getAttribute('y1') || '0');
        const x2 = parseFloat(el.getAttribute('x2') || '0');
        const y2 = parseFloat(el.getAttribute('y2') || '0');
        return `M${x1},${y1} L${x2},${y2}`;
      }
      case 'polyline':
      case 'polygon': {
        const pts = el.getAttribute('points');
        if (!pts) return null;
        const coords = pts.trim().split(/[\s,]+/).map(Number);
        if (coords.length < 4) return null;
        let d = `M${coords[0]},${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
          d += ` L${coords[i]},${coords[i + 1]}`;
        }
        if (tag === 'polygon') d += ' Z';
        return d;
      }
      default:
        return null;
    }
  }
}

// ── Tool ─────────────────────────────────────────────────────────────

export class EraserTool implements Tool {
  cursor = 'crosshair';
  private isDrawing = false;
  private pathPoints: Pt[] = [];
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

    if (this.pathPoints.length === 0) {
      this.cleanupPreview();
      return;
    }

    this.cleanupPreview();

    // Choose sampling resolution based on eraser width (finer = smoother cuts)
    const sampleStep = Math.max(0.5, this._eraserWidth / 4);

    const cmd = new ErasePathCommand(
      this.canvasView.contentGroup,
      [...this.pathPoints],
      this._eraserWidth / 2,
      sampleStep
    );
    this.commandManager.execute(cmd);

    // Clean up any temporary elements created during sampling
    const tmps = this.canvasView.contentGroup.querySelectorAll('[data-tmp-eraser]');
    tmps.forEach((t) => t.remove());

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
