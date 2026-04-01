import type { Command } from './Command';

export class AddElementCommand implements Command {
  description = 'Add element';

  constructor(
    private parent: SVGElement,
    private element: SVGElement
  ) {}

  execute(): void {
    this.parent.appendChild(this.element);
  }

  undo(): void {
    this.element.remove();
  }
}
