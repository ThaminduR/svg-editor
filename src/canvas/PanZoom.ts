import type { CanvasView } from './CanvasView';
import type { EditorState } from '../core/EditorState';
import { clamp } from '../utils/math';

export class PanZoom {
  private isPanning = false;
  private lastX = 0;
  private lastY = 0;
  private minZoom = 0.1;
  private maxZoom = 50;

  constructor(
    private canvasView: CanvasView,
    private state: EditorState
  ) {
    this.setupWheelZoom();
    this.setupMiddleMousePan();
    this.setupTouchPinch();
  }

  pan(dx: number, dy: number): void {
    const vb = this.canvasView.viewBox;
    const containerRect = this.canvasView.workspace.getBoundingClientRect();
    const scaleX = vb.width / containerRect.width;
    const scaleY = vb.height / containerRect.height;

    vb.x -= dx * scaleX;
    vb.y -= dy * scaleY;
    this.canvasView.viewBox = vb;
  }

  zoomAt(centerClientX: number, centerClientY: number, factor: number): void {
    const vb = this.canvasView.viewBox;
    const containerRect = this.canvasView.workspace.getBoundingClientRect();

    const currentZoom = containerRect.width / vb.width;
    const newZoom = clamp(currentZoom * factor, this.minZoom, this.maxZoom);
    const actualFactor = newZoom / currentZoom;

    // Get the SVG point under the cursor before zoom
    const svgPt = this.canvasView.getSvgPoint(centerClientX, centerClientY);

    // Scale the viewBox
    const newWidth = vb.width / actualFactor;
    const newHeight = vb.height / actualFactor;

    // Adjust position to keep the cursor point fixed
    const ratioX = (svgPt.x - vb.x) / vb.width;
    const ratioY = (svgPt.y - vb.y) / vb.height;

    vb.x = svgPt.x - ratioX * newWidth;
    vb.y = svgPt.y - ratioY * newHeight;
    vb.width = newWidth;
    vb.height = newHeight;

    this.canvasView.viewBox = vb;
    this.state.zoom = containerRect.width / newWidth;
  }

  startPan(clientX: number, clientY: number): void {
    this.isPanning = true;
    this.lastX = clientX;
    this.lastY = clientY;
  }

  movePan(clientX: number, clientY: number): void {
    if (!this.isPanning) return;
    const dx = clientX - this.lastX;
    const dy = clientY - this.lastY;
    this.pan(dx, dy);
    this.lastX = clientX;
    this.lastY = clientY;
  }

  endPan(): void {
    this.isPanning = false;
  }

  get panning(): boolean {
    return this.isPanning;
  }

  private setupWheelZoom(): void {
    this.canvasView.workspace.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
          // Zoom
          const factor = e.deltaY < 0 ? 1.1 : 0.9;
          this.zoomAt(e.clientX, e.clientY, factor);
        } else {
          // Pan
          this.pan(-e.deltaX, -e.deltaY);
        }
      },
      { passive: false }
    );
  }

  private setupMiddleMousePan(): void {
    this.canvasView.workspace.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.startPan(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.movePan(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 1 && this.isPanning) {
        this.endPan();
      }
    });
  }

  private setupTouchPinch(): void {
    let lastDist = 0;
    let lastCenter = { x: 0, y: 0 };

    this.canvasView.workspace.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        lastDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        lastCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
      }
    });

    this.canvasView.workspace.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const center = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        if (lastDist > 0) {
          const factor = dist / lastDist;
          this.zoomAt(center.x, center.y, factor);
        }

        // Pan
        this.pan(center.x - lastCenter.x, center.y - lastCenter.y);

        lastDist = dist;
        lastCenter = center;
      }
    }, { passive: false });
  }
}
