export enum EditorMode {
  SELECT = 'select',
  HAND = 'hand',
}

export interface LayerInfo {
  id: string;
  element: SVGElement;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface SelectionState {
  elements: SVGElement[];
  boundingBox: DOMRect | null;
}

export interface ElementProperties {
  fill: string | null;
  stroke: string | null;
  strokeWidth: string | null;
  opacity: string | null;
  transform: string | null;
}

export enum HandleType {
  N = 'n',
  S = 's',
  E = 'e',
  W = 'w',
  NE = 'ne',
  NW = 'nw',
  SE = 'se',
  SW = 'sw',
  ROTATE = 'rotate',
  NONE = 'none',
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EditorEventMap = {
  'selection-changed': SVGElement[];
  'layers-changed': LayerInfo[];
  'tool-changed': EditorMode;
  'zoom-changed': number;
  'svg-loaded': SVGSVGElement;
  'command-executed': void;
  'undo-redo-changed': { canUndo: boolean; canRedo: boolean };
};
