import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelectionManager } from '../../core/SelectionManager';
import { EditorState } from '../../core/EditorState';

describe('SelectionManager', () => {
  let state: EditorState;
  let sm: SelectionManager;
  let el1: SVGElement, el2: SVGElement, el3: SVGElement;

  beforeEach(() => {
    state = new EditorState();
    sm = new SelectionManager(state);
    el1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  });

  it('select() sets single selection and clears previous', () => {
    sm.select(el1);
    sm.select(el2);
    expect(sm.selected).toEqual([el2]);
    expect(sm.count).toBe(1);
  });

  it('addToSelection() adds without clearing', () => {
    sm.select(el1);
    sm.addToSelection(el2);
    expect(sm.selected).toEqual([el1, el2]);
  });

  it('addToSelection() does not duplicate', () => {
    sm.select(el1);
    sm.addToSelection(el1);
    expect(sm.count).toBe(1);
  });

  it('deselect() removes specific element', () => {
    sm.select(el1);
    sm.addToSelection(el2);
    sm.deselect(el1);
    expect(sm.selected).toEqual([el2]);
  });

  it('clearSelection() empties selection', () => {
    sm.select(el1);
    sm.addToSelection(el2);
    sm.clearSelection();
    expect(sm.count).toBe(0);
  });

  it('selectAll() selects all graphics children', () => {
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    container.appendChild(el1);
    container.appendChild(el2);
    container.appendChild(el3);

    sm.selectAll(container);
    expect(sm.count).toBe(3);
  });

  it('selectAll() skips locked elements', () => {
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    el2.setAttribute('data-locked', 'true');
    container.appendChild(el1);
    container.appendChild(el2);

    sm.selectAll(container);
    expect(sm.count).toBe(1);
    expect(sm.isSelected(el1)).toBe(true);
    expect(sm.isSelected(el2)).toBe(false);
  });

  it('emits selection-changed events', () => {
    const handler = vi.fn();
    state.on('selection-changed', handler);

    sm.select(el1);
    expect(handler).toHaveBeenCalledWith([el1]);

    sm.addToSelection(el2);
    expect(handler).toHaveBeenCalledWith([el1, el2]);

    sm.clearSelection();
    expect(handler).toHaveBeenCalledWith([]);
  });

  it('toggleSelection toggles correctly', () => {
    sm.select(el1);
    sm.toggleSelection(el1);
    expect(sm.count).toBe(0);

    sm.toggleSelection(el1);
    expect(sm.isSelected(el1)).toBe(true);
  });
});
