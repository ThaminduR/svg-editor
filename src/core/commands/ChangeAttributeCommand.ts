import type { Command } from './Command';

export class ChangeAttributeCommand implements Command {
  description: string;

  constructor(
    private element: SVGElement,
    private attribute: string,
    private oldValue: string | null,
    private newValue: string | null
  ) {
    this.description = `Change ${attribute}`;
  }

  execute(): void {
    if (this.newValue === null) {
      this.element.removeAttribute(this.attribute);
    } else {
      this.element.setAttribute(this.attribute, this.newValue);
    }
  }

  undo(): void {
    if (this.oldValue === null) {
      this.element.removeAttribute(this.attribute);
    } else {
      this.element.setAttribute(this.attribute, this.oldValue);
    }
  }
}
