const PRESET_COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#6600ff',
  '#009933', '#cc0066', '#336699', '#996633', '#666666',
  '#cccccc',
];

interface HSV {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

export class ColorPicker {
  private popup: HTMLDivElement | null = null;
  private hsv: HSV = { h: 0, s: 1, v: 1 };
  private alpha = 1;
  private satCanvas: HTMLCanvasElement | null = null;
  private satCursor: HTMLDivElement | null = null;
  private hueThumb: HTMLDivElement | null = null;
  private alphaThumb: HTMLDivElement | null = null;
  private hexInput: HTMLInputElement | null = null;
  private previewSwatch: HTMLDivElement | null = null;
  private onChangeCallback: ((color: string | null) => void) | null = null;
  private isDraggingSat = false;
  private isDraggingHue = false;
  private isDraggingAlpha = false;

  show(
    anchorEl: HTMLElement,
    currentColor: string | null,
    onChange: (color: string | null) => void
  ): void {
    this.close();
    this.onChangeCallback = onChange;

    if (currentColor && currentColor !== 'none') {
      const parsed = this.hexToHsv(currentColor);
      if (parsed) this.hsv = parsed;
      this.alpha = 1;
    }

    this.popup = document.createElement('div');
    this.popup.className = 'color-picker-popup';

    // Position near anchor
    const rect = anchorEl.getBoundingClientRect();
    this.popup.style.left = `${rect.left}px`;
    this.popup.style.top = `${rect.bottom + 6}px`;

    // Saturation area
    const satArea = document.createElement('div');
    satArea.className = 'saturation-area';
    this.satCanvas = document.createElement('canvas');
    this.satCanvas.width = 216;
    this.satCanvas.height = 160;
    satArea.appendChild(this.satCanvas);

    this.satCursor = document.createElement('div');
    this.satCursor.className = 'sat-cursor';
    satArea.appendChild(this.satCursor);
    this.popup.appendChild(satArea);

    // Hue slider
    const hueSlider = document.createElement('div');
    hueSlider.className = 'hue-slider';
    this.hueThumb = document.createElement('div');
    this.hueThumb.className = 'slider-thumb';
    hueSlider.appendChild(this.hueThumb);
    this.popup.appendChild(hueSlider);

    // Alpha slider
    const alphaSlider = document.createElement('div');
    alphaSlider.className = 'alpha-slider';
    const alphaGradient = document.createElement('div');
    alphaGradient.className = 'alpha-gradient';
    alphaSlider.appendChild(alphaGradient);
    this.alphaThumb = document.createElement('div');
    this.alphaThumb.className = 'slider-thumb';
    alphaSlider.appendChild(this.alphaThumb);
    this.popup.appendChild(alphaSlider);

    // Hex input row
    const hexRow = document.createElement('div');
    hexRow.className = 'hex-row';
    const hexLabel = document.createElement('label');
    hexLabel.textContent = 'Hex';
    this.hexInput = document.createElement('input');
    this.hexInput.type = 'text';
    this.hexInput.maxLength = 9;
    this.previewSwatch = document.createElement('div');
    this.previewSwatch.className = 'preview-swatch';
    hexRow.append(hexLabel, this.hexInput, this.previewSwatch);
    this.popup.appendChild(hexRow);

    // Preset colors
    const presets = document.createElement('div');
    presets.className = 'preset-colors';
    for (const color of PRESET_COLORS) {
      const swatch = document.createElement('button');
      swatch.className = 'preset-color';
      swatch.style.backgroundColor = color;
      swatch.onclick = () => {
        const parsed = this.hexToHsv(color);
        if (parsed) {
          this.hsv = parsed;
          this.alpha = 1;
          this.updateUI();
          this.emitColor();
        }
      };
      presets.appendChild(swatch);
    }
    this.popup.appendChild(presets);

    // None button
    const noneBtn = document.createElement('button');
    noneBtn.className = 'none-btn';
    noneBtn.textContent = 'No Color (none)';
    noneBtn.onclick = () => {
      this.onChangeCallback?.('none');
      this.close();
    };
    this.popup.appendChild(noneBtn);

    document.body.appendChild(this.popup);

    // Setup interactions
    this.setupSaturationDrag(satArea);
    this.setupHueDrag(hueSlider);
    this.setupAlphaDrag(alphaSlider);
    this.setupHexInput();

    // Close on outside click (delayed to avoid immediate close)
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', this.handleOutsideClick);
    });

    this.updateUI();
  }

  close(): void {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
      document.removeEventListener('mousedown', this.handleOutsideClick);
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    if (this.popup && !this.popup.contains(e.target as Node)) {
      this.close();
    }
  };

  private setupSaturationDrag(area: HTMLDivElement): void {
    const update = (e: MouseEvent | PointerEvent) => {
      const rect = this.satCanvas!.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      this.hsv.s = x;
      this.hsv.v = 1 - y;
      this.updateUI();
      this.emitColor();
    };

    area.addEventListener('pointerdown', (e) => {
      this.isDraggingSat = true;
      area.setPointerCapture(e.pointerId);
      update(e);
    });
    area.addEventListener('pointermove', (e) => {
      if (this.isDraggingSat) update(e);
    });
    area.addEventListener('pointerup', () => {
      this.isDraggingSat = false;
    });
  }

  private setupHueDrag(slider: HTMLDivElement): void {
    const update = (e: MouseEvent | PointerEvent) => {
      const rect = slider.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.hsv.h = x * 360;
      this.updateUI();
      this.emitColor();
    };

    slider.addEventListener('pointerdown', (e) => {
      this.isDraggingHue = true;
      slider.setPointerCapture(e.pointerId);
      update(e);
    });
    slider.addEventListener('pointermove', (e) => {
      if (this.isDraggingHue) update(e);
    });
    slider.addEventListener('pointerup', () => {
      this.isDraggingHue = false;
    });
  }

  private setupAlphaDrag(slider: HTMLDivElement): void {
    const update = (e: MouseEvent | PointerEvent) => {
      const rect = slider.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.alpha = x;
      this.updateUI();
      this.emitColor();
    };

    slider.addEventListener('pointerdown', (e) => {
      this.isDraggingAlpha = true;
      slider.setPointerCapture(e.pointerId);
      update(e);
    });
    slider.addEventListener('pointermove', (e) => {
      if (this.isDraggingAlpha) update(e);
    });
    slider.addEventListener('pointerup', () => {
      this.isDraggingAlpha = false;
    });
  }

  private setupHexInput(): void {
    this.hexInput!.addEventListener('change', () => {
      const val = this.hexInput!.value.trim();
      const parsed = this.hexToHsv(val);
      if (parsed) {
        this.hsv = parsed;
        this.updateUI();
        this.emitColor();
      }
    });
  }

  private updateUI(): void {
    // Update saturation canvas
    if (this.satCanvas) {
      const ctx = this.satCanvas.getContext('2d')!;
      const { width, height } = this.satCanvas;

      // Hue background
      const hueColor = this.hsvToHex({ h: this.hsv.h, s: 1, v: 1 });
      ctx.fillStyle = hueColor;
      ctx.fillRect(0, 0, width, height);

      // Saturation gradient (white to transparent, left to right)
      const satGrad = ctx.createLinearGradient(0, 0, width, 0);
      satGrad.addColorStop(0, 'rgba(255,255,255,1)');
      satGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = satGrad;
      ctx.fillRect(0, 0, width, height);

      // Value gradient (transparent to black, top to bottom)
      const valGrad = ctx.createLinearGradient(0, 0, 0, height);
      valGrad.addColorStop(0, 'rgba(0,0,0,0)');
      valGrad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = valGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Update saturation cursor
    if (this.satCursor && this.satCanvas) {
      this.satCursor.style.left = `${this.hsv.s * 100}%`;
      this.satCursor.style.top = `${(1 - this.hsv.v) * 100}%`;
    }

    // Update hue thumb
    if (this.hueThumb) {
      this.hueThumb.style.left = `${(this.hsv.h / 360) * 100}%`;
    }

    // Update alpha slider background
    if (this.alphaThumb) {
      const hex = this.hsvToHex(this.hsv);
      const gradient = this.alphaThumb.parentElement!.querySelector('.alpha-gradient') as HTMLDivElement;
      if (gradient) {
        gradient.style.background = `linear-gradient(to right, transparent, ${hex})`;
      }
      this.alphaThumb.style.left = `${this.alpha * 100}%`;
    }

    // Update hex input
    const hexColor = this.getCurrentHex();
    if (this.hexInput) {
      this.hexInput.value = hexColor;
    }

    // Update preview swatch
    if (this.previewSwatch) {
      this.previewSwatch.style.backgroundColor = hexColor;
      this.previewSwatch.style.opacity = String(this.alpha);
    }
  }

  private emitColor(): void {
    const hex = this.getCurrentHex();
    this.onChangeCallback?.(hex);
  }

  private getCurrentHex(): string {
    const hex = this.hsvToHex(this.hsv);
    if (this.alpha < 1) {
      const alphaHex = Math.round(this.alpha * 255).toString(16).padStart(2, '0');
      return hex + alphaHex;
    }
    return hex;
  }

  // Color conversion utilities
  hsvToHex(hsv: HSV): string {
    const { h, s, v } = hsv;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  hexToHsv(hex: string): HSV | null {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length < 6) return null;

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : d / max;
    const v = max;

    return { h, s, v };
  }
}
