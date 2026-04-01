import { test, expect, Page } from '@playwright/test';

const TEST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect id="r1" x="10" y="10" width="80" height="80" fill="#ff0000" stroke="#000000" stroke-width="2"/>
  <circle id="c1" cx="150" cy="50" r="40" fill="#00ff00"/>
  <rect id="r2" x="50" y="100" width="100" height="60" fill="#0000ff" opacity="0.8"/>
</svg>`;

// Load SVG via drag-drop simulation
async function loadTestSvg(page: Page) {
  await page.evaluate((svgContent) => {
    const canvasArea = document.getElementById('canvas-area')!;
    const file = new File([svgContent], 'test.svg', { type: 'image/svg+xml' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const dropEvent = new DragEvent('drop', {
      dataTransfer,
      bubbles: true,
      cancelable: true,
    });
    canvasArea.dispatchEvent(dropEvent);
  }, TEST_SVG);

  // Wait for SVG content to load
  await page.waitForSelector('.content-layer > *', { timeout: 5000 });
  // Small delay for state to propagate
  await page.waitForTimeout(200);
}

test.describe('SVG Editor - Page Load', () => {
  test('should load the editor with welcome screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('.workspace')).toBeVisible();
    await expect(page.locator('.canvas-welcome')).toBeVisible();
    await expect(page.locator('.canvas-welcome p')).toHaveText('Drop an SVG file here or click Import');
  });

  test('should have toolbar with all buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#toolbar')).toBeVisible();
    const buttons = page.locator('#toolbar button');
    await expect(buttons).not.toHaveCount(0);
  });

  test('should have layers and properties panels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#layers-panel')).toBeVisible();
    await expect(page.locator('#properties-panel')).toBeVisible();
  });

  test('properties panel shows empty state when nothing selected', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.properties-empty')).toBeVisible();
    await expect(page.locator('.properties-empty p')).toHaveText('Select an element to edit its properties');
  });
});

test.describe('SVG Editor - File Import', () => {
  test('should import SVG via drag and drop', async ({ page }) => {
    await page.goto('/');
    await loadTestSvg(page);

    // Welcome should be hidden
    await expect(page.locator('.canvas-welcome')).not.toBeVisible();

    // Content group should have children
    const contentChildren = page.locator('.content-layer > *');
    await expect(contentChildren).not.toHaveCount(0);
  });

  test('should populate layers panel after import', async ({ page }) => {
    await page.goto('/');
    await loadTestSvg(page);

    const layerRows = page.locator('.layer-row');
    await expect(layerRows).toHaveCount(3);
  });

  test('should have hidden file input for import', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.locator('input[type="file"][accept=".svg,image/svg+xml"]');
    await expect(fileInput).toHaveCount(1);
  });
});

test.describe('SVG Editor - Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadTestSvg(page);
  });

  test('should select element by clicking layer row', async ({ page }) => {
    const firstLayer = page.locator('.layer-row').first();
    await firstLayer.click();
    await expect(firstLayer).toHaveClass(/selected/);

    // Properties panel should show
    await expect(page.locator('.properties-empty')).not.toBeVisible();
    await expect(page.locator('.props-content')).toBeVisible();
  });

  test('should deselect when clicking empty canvas area', async ({ page }) => {
    const firstLayer = page.locator('.layer-row').first();
    await firstLayer.click();
    await expect(firstLayer).toHaveClass(/selected/);

    // Click on empty canvas area
    const workspace = page.locator('.workspace');
    const box = await workspace.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
    }

    await expect(page.locator('.properties-empty')).toBeVisible();
  });

  test('should show transform handles when single element selected', async ({ page }) => {
    const firstLayer = page.locator('.layer-row').first();
    await firstLayer.click();

    const handles = page.locator('.transform-handles rect');
    await expect(handles).not.toHaveCount(0);
  });
});

test.describe('SVG Editor - Layer Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadTestSvg(page);
  });

  test('should toggle layer visibility', async ({ page }) => {
    // First layer row corresponds to last content child (reversed display)
    const visBtn = page.locator('.layer-row').first().locator('.layer-action-btn').first();
    await visBtn.click();
    await page.waitForTimeout(100);

    const isHidden = await page.evaluate(() => {
      const content = document.querySelector('.content-layer');
      if (!content) return false;
      const lastChild = content.lastElementChild;
      return lastChild?.getAttribute('display') === 'none';
    });
    expect(isHidden).toBe(true);
  });

  test('should toggle layer lock', async ({ page }) => {
    const lockBtn = page.locator('.layer-row').first().locator('.layer-action-btn').nth(1);
    await lockBtn.click();
    await page.waitForTimeout(100);

    const isLocked = await page.evaluate(() => {
      const content = document.querySelector('.content-layer');
      if (!content) return false;
      const lastChild = content.lastElementChild;
      return lastChild?.hasAttribute('data-locked');
    });
    expect(isLocked).toBe(true);
  });

  test('locked layer cannot be selected by clicking its row', async ({ page }) => {
    const lockBtn = page.locator('.layer-row').first().locator('.layer-action-btn').nth(1);
    await lockBtn.click();
    await page.waitForTimeout(100);

    const firstRow = page.locator('.layer-row').first();
    await firstRow.click();

    await expect(firstRow).not.toHaveClass(/selected/);
  });
});

test.describe('SVG Editor - Properties Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadTestSvg(page);
  });

  test('should display element properties when selected', async ({ page }) => {
    const firstLayerRow = page.locator('.layer-row').first();
    await firstLayerRow.click();

    await expect(page.locator('.props-content')).toBeVisible();

    // Dimension inputs should be populated
    const widthInput = page.locator('.props-content input[type="number"][readonly]').nth(2);
    const val = await widthInput.inputValue();
    expect(parseFloat(val)).toBeGreaterThan(0);
  });

  test('should change opacity via slider', async ({ page }) => {
    const firstLayerRow = page.locator('.layer-row').first();
    await firstLayerRow.click();

    const opacitySlider = page.locator('.props-content input[type="range"]');
    await opacitySlider.fill('0.5');
    await opacitySlider.dispatchEvent('change');
    await page.waitForTimeout(100);

    const opacity = await page.evaluate(() => {
      const content = document.querySelector('.content-layer');
      if (!content) return null;
      const lastChild = content.lastElementChild;
      return lastChild?.getAttribute('opacity');
    });
    expect(opacity).toBe('0.5');
  });
});

test.describe('SVG Editor - Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadTestSvg(page);
  });

  test('should undo attribute change', async ({ page }) => {
    const firstLayerRow = page.locator('.layer-row').first();
    await firstLayerRow.click();

    // Change opacity via evaluate to avoid duplicate change events from Playwright fill()
    await page.evaluate(() => {
      const slider = document.querySelector('.props-content input[type="range"]') as HTMLInputElement;
      slider.value = '0.3';
      slider.dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(100);

    // Blur to ensure keyboard event reaches document handler
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);

    const opacity = await page.evaluate(() => {
      const content = document.querySelector('.content-layer');
      if (!content) return null;
      const lastChild = content.lastElementChild;
      return lastChild?.getAttribute('opacity');
    });
    expect(opacity).not.toBe('0.3');
  });

  test('should redo after undo', async ({ page }) => {
    const firstLayerRow = page.locator('.layer-row').first();
    await firstLayerRow.click();

    await page.evaluate(() => {
      const slider = document.querySelector('.props-content input[type="range"]') as HTMLInputElement;
      slider.value = '0.3';
      slider.dispatchEvent(new Event('change'));
    });
    await page.waitForTimeout(100);

    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);

    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(100);

    const opacity = await page.evaluate(() => {
      const content = document.querySelector('.content-layer');
      if (!content) return null;
      const lastChild = content.lastElementChild;
      return lastChild?.getAttribute('opacity');
    });
    expect(opacity).toBe('0.3');
  });
});

test.describe('SVG Editor - Keyboard Shortcuts', () => {
  test('V key should switch to select tool', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('h');
    await page.waitForTimeout(50);
    await page.keyboard.press('v');
    await page.waitForTimeout(50);
    const cursor = await page.locator('.workspace').evaluate((el) => el.style.cursor);
    expect(cursor).not.toBe('grab');
  });

  test('should handle delete key on selected elements', async ({ page }) => {
    await page.goto('/');
    await loadTestSvg(page);

    const initialCount = await page.locator('.layer-row').count();
    expect(initialCount).toBe(3);

    const firstLayerRow = page.locator('.layer-row').first();
    await firstLayerRow.click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    const newCount = await page.locator('.layer-row').count();
    expect(newCount).toBe(2);
  });

  test('Ctrl+A should select all elements', async ({ page }) => {
    await page.goto('/');
    await loadTestSvg(page);

    await page.keyboard.press('Control+a');
    await page.waitForTimeout(100);

    const selectedRows = page.locator('.layer-row.selected');
    const count = await selectedRows.count();
    expect(count).toBe(3);
  });
});

test.describe('SVG Editor - Zoom Controls', () => {
  test('should display zoom percentage', async ({ page }) => {
    await page.goto('/');
    const zoomDisplay = page.locator('.zoom-display');
    await expect(zoomDisplay).toBeVisible();
  });
});

test.describe('SVG Editor - Export', () => {
  test('should have exportable SVG content after import', async ({ page }) => {
    await page.goto('/');
    await loadTestSvg(page);

    const result = await page.evaluate(() => {
      const contentGroup = document.querySelector('.content-layer');
      const workspace = document.querySelector('.workspace');
      if (!contentGroup || !workspace) return null;
      return {
        hasContent: contentGroup.children.length > 0,
        hasViewBox: !!workspace.getAttribute('viewBox'),
        childCount: contentGroup.children.length,
      };
    });

    expect(result?.hasContent).toBe(true);
    expect(result?.hasViewBox).toBe(true);
    expect(result?.childCount).toBe(3);
  });
});
