import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeAttributeCommand } from '../../core/commands/ChangeAttributeCommand';

describe('ChangeAttributeCommand', () => {
  let el: SVGElement;

  beforeEach(() => {
    el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  });

  it('execute() sets the attribute', () => {
    const cmd = new ChangeAttributeCommand(el, 'fill', null, '#ff0000');
    cmd.execute();
    expect(el.getAttribute('fill')).toBe('#ff0000');
  });

  it('undo() restores previous value', () => {
    el.setAttribute('fill', '#00ff00');
    const cmd = new ChangeAttributeCommand(el, 'fill', '#00ff00', '#ff0000');
    cmd.execute();
    expect(el.getAttribute('fill')).toBe('#ff0000');
    cmd.undo();
    expect(el.getAttribute('fill')).toBe('#00ff00');
  });

  it('handles null oldValue - removeAttribute on undo', () => {
    const cmd = new ChangeAttributeCommand(el, 'fill', null, '#ff0000');
    cmd.execute();
    expect(el.getAttribute('fill')).toBe('#ff0000');
    cmd.undo();
    expect(el.hasAttribute('fill')).toBe(false);
  });

  it('handles null newValue - removeAttribute on execute', () => {
    el.setAttribute('fill', '#00ff00');
    const cmd = new ChangeAttributeCommand(el, 'fill', '#00ff00', null);
    cmd.execute();
    expect(el.hasAttribute('fill')).toBe(false);
    cmd.undo();
    expect(el.getAttribute('fill')).toBe('#00ff00');
  });
});
