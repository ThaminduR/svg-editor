import { describe, it, expect, beforeEach } from 'vitest';
import { ReorderCommand } from '../../core/commands/ReorderCommand';

describe('ReorderCommand', () => {
  let parent: SVGElement;
  let a: SVGElement, b: SVGElement, c: SVGElement;

  beforeEach(() => {
    parent = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    a = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    b = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    a.setAttribute('id', 'a');
    b.setAttribute('id', 'b');
    c.setAttribute('id', 'c');
    parent.append(a, b, c);
  });

  it('moves element to new position', () => {
    // Move c before a (c goes to first)
    const cmd = new ReorderCommand(c, a);
    cmd.execute();
    expect(Array.from(parent.children).map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('undo restores original position', () => {
    const cmd = new ReorderCommand(c, a);
    cmd.execute();
    cmd.undo();
    expect(Array.from(parent.children).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('moves element to end when newNextSibling is null', () => {
    const cmd = new ReorderCommand(a, null);
    cmd.execute();
    expect(Array.from(parent.children).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
});
