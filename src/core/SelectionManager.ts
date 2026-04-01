import type { EditorState } from './EditorState';
import { isGraphicsElement } from '../utils/svg';

export class SelectionManager {
  private _selected: SVGElement[] = [];

  constructor(private state: EditorState) {}

  get selected(): SVGElement[] {
    return [...this._selected];
  }

  get count(): number {
    return this._selected.length;
  }

  isSelected(el: SVGElement): boolean {
    return this._selected.includes(el);
  }

  select(el: SVGElement): void {
    this._selected = [el];
    this.emitChange();
  }

  addToSelection(el: SVGElement): void {
    if (!this._selected.includes(el)) {
      this._selected.push(el);
      this.emitChange();
    }
  }

  deselect(el: SVGElement): void {
    const idx = this._selected.indexOf(el);
    if (idx !== -1) {
      this._selected.splice(idx, 1);
      this.emitChange();
    }
  }

  toggleSelection(el: SVGElement): void {
    if (this.isSelected(el)) {
      this.deselect(el);
    } else {
      this.addToSelection(el);
    }
  }

  clearSelection(): void {
    if (this._selected.length > 0) {
      this._selected = [];
      this.emitChange();
    }
  }

  selectAll(container: SVGElement): void {
    this._selected = [];
    const children = container.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as SVGElement;
      if (isGraphicsElement(child) && !child.hasAttribute('data-locked')) {
        this._selected.push(child);
      }
    }
    this.emitChange();
  }

  private emitChange(): void {
    this.state.emit('selection-changed', [...this._selected]);
  }
}
