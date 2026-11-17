/** A rectangle in window coordinates (`measureInWindow`). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Extra vertical margin around a drop slot, so that a release near it still counts. */
export const DROP_SLOT_TOLERANCE = 16;
/** Distance to the top / bottom edge of the page that starts the auto-scroll. */
export const AUTO_SCROLL_EDGE = 72;
/** Pixels scrolled at each auto-scroll tick. */
export const AUTO_SCROLL_STEP = 16;

/**
 * Drop slot under a point.
 * @param slots rectangle of each slot, by drop index.
 * @param x horizontal position of the finger.
 * @param y vertical position of the finger.
 * @returns the index of the slot under the point (with a vertical tolerance), else `null`.
 */
export const findSlotAt = (
  slots: ReadonlyMap<number, Rect>,
  x: number,
  y: number,
): number | null => {
  for (const [index, rect] of slots) {
    const insideX = x >= rect.x && x <= rect.x + rect.width;
    const insideY =
      y >= rect.y - DROP_SLOT_TOLERANCE && y <= rect.y + rect.height + DROP_SLOT_TOLERANCE;
    if (insideX && insideY) return index;
  }
  return null;
};

/**
 * Auto-scroll step while dragging.
 * @param page rectangle of the scrolling page.
 * @param y vertical position of the finger.
 * @returns a negative step near the top edge, a positive one near the bottom edge, else 0.
 */
export const scrollStepNearEdge = (page: Rect, y: number): number => {
  if (page.height <= 0) return 0;
  if (y < page.y + AUTO_SCROLL_EDGE) return -AUTO_SCROLL_STEP;
  if (y > page.y + page.height - AUTO_SCROLL_EDGE) return AUTO_SCROLL_STEP;
  return 0;
};

/**
 * Next auto-scroll offset, kept between the top and the end of the content.
 * @param current current offset.
 * @param step offset change (`scrollStepNearEdge`).
 * @param contentHeight height of the scrolled content.
 * @param viewportHeight height of the visible page.
 */
export const nextScrollOffset = (
  current: number,
  step: number,
  contentHeight: number,
  viewportHeight: number,
): number => {
  const maxOffset = Math.max(0, contentHeight - viewportHeight);
  return Math.min(maxOffset, Math.max(0, current + step));
};
