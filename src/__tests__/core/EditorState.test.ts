import { describe, it, expect, vi } from 'vitest';
import { EditorState } from '../../core/EditorState';
import { EditorMode } from '../../types';

describe('EditorState', () => {
  it('subscribe/emit works for tool-changed', () => {
    const state = new EditorState();
    const handler = vi.fn();
    state.on('tool-changed', handler);

    state.activeTool = EditorMode.HAND;
    expect(handler).toHaveBeenCalledWith(EditorMode.HAND);
  });

  it('subscribe/emit works for zoom-changed', () => {
    const state = new EditorState();
    const handler = vi.fn();
    state.on('zoom-changed', handler);

    state.zoom = 2.5;
    expect(handler).toHaveBeenCalledWith(2.5);
  });

  it('unsubscribe stops callbacks', () => {
    const state = new EditorState();
    const handler = vi.fn();
    const unsub = state.on('zoom-changed', handler);

    state.zoom = 1.5;
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    state.zoom = 2;
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('refreshLayers populates layers from SVG children', () => {
    const state = new EditorState();
    const handler = vi.fn();
    state.on('layers-changed', handler);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', 'box');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    svg.append(rect, circle);

    state.loadSvg(svg);

    expect(state.layers.length).toBe(2);
    expect(state.layers[0].name).toBe('rect#box');
    expect(state.layers[1].name).toBe('circle');
  });
});
