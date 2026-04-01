export interface Tool {
  onPointerDown(e: PointerEvent): void;
  onPointerMove(e: PointerEvent): void;
  onPointerUp(e: PointerEvent): void;
  onActivate(): void;
  onDeactivate(): void;
  cursor: string;
}
