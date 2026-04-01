import type { Command } from './Command';

export class DeleteElementCommand implements Command {
  description = 'Delete element';
  private parent: Node;
  private nextSibling: Node | null;

  constructor(private element: SVGElement) {
    this.parent = element.parentNode!;
    this.nextSibling = element.nextSibling;
  }

  execute(): void {
    this.element.remove();
  }

  undo(): void {
    if (this.nextSibling) {
      this.parent.insertBefore(this.element, this.nextSibling);
    } else {
      this.parent.appendChild(this.element);
    }
  }
}
