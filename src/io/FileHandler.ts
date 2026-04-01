import type { SvgImporter } from './SvgImporter';
import type { SvgExporter } from './SvgExporter';

export class FileHandler {
  private fileInput: HTMLInputElement;

  constructor(
    private container: HTMLElement,
    private importer: SvgImporter,
    private onLoad: (svg: SVGSVGElement) => void
  ) {
    // Create hidden file input
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.svg,image/svg+xml';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);

    this.fileInput.addEventListener('change', () => this.handleFileSelect());
    this.setupDragDrop();
  }

  triggerImport(): void {
    this.fileInput.click();
  }

  triggerExport(exporter: SvgExporter): void {
    const svgString = exporter.exportToString();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited.svg';
    a.click();

    URL.revokeObjectURL(url);
  }

  private async handleFileSelect(): Promise<void> {
    const file = this.fileInput.files?.[0];
    if (!file) return;

    try {
      const svg = await this.importer.importFromFile(file);
      this.onLoad(svg);
    } catch (e) {
      console.error('Failed to import SVG:', e);
    }

    // Reset input so same file can be re-selected
    this.fileInput.value = '';
  }

  private setupDragDrop(): void {
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.container.classList.add('drag-over');
    });

    this.container.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.container.classList.remove('drag-over');
    });

    this.container.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.container.classList.remove('drag-over');

      const file = e.dataTransfer?.files[0];
      if (!file) return;
      const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
      if (!isSvg) return;

      try {
        const svg = await this.importer.importFromFile(file);
        this.onLoad(svg);
      } catch (err) {
        console.error('Failed to import dropped SVG:', err);
      }
    });
  }
}
