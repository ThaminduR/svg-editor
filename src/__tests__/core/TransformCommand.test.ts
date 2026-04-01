import { describe, it, expect, beforeEach } from 'vitest';
import { TransformCommand } from '../../core/commands/TransformCommand';

describe('TransformCommand', () => {
  let el: SVGElement;

  beforeEach(() => {
    el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  });

  it('execute() applies new transform', () => {
    const cmd = new TransformCommand(el, null, 'translate(10, 20)');
    cmd.execute();
    expect(el.getAttribute('transform')).toBe('translate(10, 20)');
  });

  it('undo() restores old transform', () => {
    el.setAttribute('transform', 'rotate(45)');
    const cmd = new TransformCommand(el, 'rotate(45)', 'translate(10, 20)');
    cmd.execute();
    expect(el.getAttribute('transform')).toBe('translate(10, 20)');
    cmd.undo();
    expect(el.getAttribute('transform')).toBe('rotate(45)');
  });

  it('undo() removes transform when old was null', () => {
    const cmd = new TransformCommand(el, null, 'scale(2)');
    cmd.execute();
    cmd.undo();
    expect(el.hasAttribute('transform')).toBe(false);
  });
});
