import type { Command } from './Command';

export class CompositeCommand implements Command {
  description: string;

  constructor(
    private commands: Command[],
    description?: string
  ) {
    this.description = description || 'Multiple changes';
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
