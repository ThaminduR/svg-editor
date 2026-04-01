import type { Command } from './Command';

export class TransformCommand implements Command {
  description = 'Transform element';

  constructor(
    private element: SVGElement,
    private oldTransform: string | null,
    private newTransform: string
  ) {}

  execute(): void {
    this.element.setAttribute('transform', this.newTransform);
  }

  undo(): void {
    if (this.oldTransform === null) {
      this.element.removeAttribute('transform');
    } else {
      this.element.setAttribute('transform', this.oldTransform);
    }
  }
}
