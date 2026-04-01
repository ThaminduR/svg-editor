import type { Command } from './Command';

export class ReorderCommand implements Command {
  description = 'Reorder layer';
  private parent: Node;
  private oldNextSibling: Node | null;

  constructor(
    private element: SVGElement,
    private newNextSibling: Node | null
  ) {
    this.parent = element.parentNode!;
    this.oldNextSibling = element.nextSibling;
  }

  execute(): void {
    if (this.newNextSibling) {
      this.parent.insertBefore(this.element, this.newNextSibling);
    } else {
      this.parent.appendChild(this.element);
    }
  }

  undo(): void {
    if (this.oldNextSibling) {
      this.parent.insertBefore(this.element, this.oldNextSibling);
    } else {
      this.parent.appendChild(this.element);
    }
  }
}
