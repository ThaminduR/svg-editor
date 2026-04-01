export const SVG_NS = 'http://www.w3.org/2000/svg';

const GRAPHICS_TAGS = new Set([
  'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'path', 'text', 'tspan', 'image', 'use', 'g', 'foreignObject',
]);

export function isGraphicsElement(el: Element): el is SVGGraphicsElement {
  return GRAPHICS_TAGS.has(el.tagName.toLowerCase());
}

export function getElementBounds(el: SVGGraphicsElement): DOMRect | null {
  try {
    return el.getBBox();
  } catch {
    return null;
  }
}

export function getAbsoluteTransform(el: SVGGraphicsElement): DOMMatrix {
  const ctm = el.getCTM();
  return ctm ? ctm : new DOMMatrix();
}

export function getElementName(el: SVGElement): string {
  const tag = el.tagName.toLowerCase();
  const id = el.getAttribute('id');
  return id ? `${tag}#${id}` : tag;
}

export function getComputedAttribute(el: SVGElement, attr: string): string | null {
  const direct = el.getAttribute(attr);
  if (direct !== null) return direct;

  if ((el as unknown as ElementCSSInlineStyle).style) {
    const val = (el as unknown as ElementCSSInlineStyle).style.getPropertyValue(attr);
    if (val) return val;
  }

  return null;
}
