import { TypedEventEmitter } from '../utils/events';
import { EditorMode, LayerInfo, type EditorEventMap } from '../types';
import { isGraphicsElement, getElementName } from '../utils/svg';

export class EditorState extends TypedEventEmitter<EditorEventMap> {
  private _activeTool: EditorMode = EditorMode.SELECT;
  private _layers: LayerInfo[] = [];
  private _svgRoot: SVGSVGElement | null = null;
  private _zoom = 1;

  get activeTool(): EditorMode {
    return this._activeTool;
  }

  set activeTool(mode: EditorMode) {
    this._activeTool = mode;
    this.emit('tool-changed', mode);
  }

  get layers(): LayerInfo[] {
    return this._layers;
  }

  get svgRoot(): SVGSVGElement | null {
    return this._svgRoot;
  }

  get zoom(): number {
    return this._zoom;
  }

  set zoom(value: number) {
    this._zoom = value;
    this.emit('zoom-changed', value);
  }

  loadSvg(svg: SVGSVGElement): void {
    this._svgRoot = svg;
    this.refreshLayers();
    this.emit('svg-loaded', svg);
  }

  refreshLayers(): void {
    if (!this._svgRoot) {
      this._layers = [];
      this.emit('layers-changed', this._layers);
      return;
    }

    const layers: LayerInfo[] = [];
    const children = this._svgRoot.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as SVGElement;
      if (!isGraphicsElement(child)) continue;

      const id = child.getAttribute('id') || `layer-${i}`;
      layers.push({
        id,
        element: child,
        name: getElementName(child),
        visible: child.getAttribute('display') !== 'none',
        locked: child.hasAttribute('data-locked'),
      });
    }

    this._layers = layers;
    this.emit('layers-changed', this._layers);
  }
}
