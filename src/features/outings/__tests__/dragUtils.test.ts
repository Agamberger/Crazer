import {
  AUTO_SCROLL_EDGE,
  AUTO_SCROLL_STEP,
  DROP_SLOT_TOLERANCE,
  findSlotAt,
  nextScrollOffset,
  Rect,
  scrollStepNearEdge,
} from '../utils/dragUtils';

const rect = (y: number): Rect => ({ x: 10, y, width: 300, height: 44 });

describe('findSlotAt', () => {
  const slots = new Map([
    [0, rect(100)],
    [1, rect(300)],
  ]);

  it('returns the slot under the point', () => {
    expect(findSlotAt(slots, 50, 120)).toBe(0);
    expect(findSlotAt(slots, 50, 320)).toBe(1);
  });

  it('accepts a release just above or below a slot', () => {
    expect(findSlotAt(slots, 50, 100 - DROP_SLOT_TOLERANCE + 1)).toBe(0);
    expect(findSlotAt(slots, 50, 344 + DROP_SLOT_TOLERANCE - 1)).toBe(1);
  });

  it('returns null outside every slot', () => {
    expect(findSlotAt(slots, 50, 200)).toBeNull();
    expect(findSlotAt(slots, 400, 120)).toBeNull();
  });
});

describe('scrollStepNearEdge', () => {
  const page: Rect = { x: 0, y: 50, width: 375, height: 700 };

  it('scrolls up near the top edge and down near the bottom edge', () => {
    expect(scrollStepNearEdge(page, 50 + AUTO_SCROLL_EDGE - 1)).toBe(-AUTO_SCROLL_STEP);
    expect(scrollStepNearEdge(page, 750 - AUTO_SCROLL_EDGE + 1)).toBe(AUTO_SCROLL_STEP);
  });

  it('does not scroll in the middle or before the page is measured', () => {
    expect(scrollStepNearEdge(page, 400)).toBe(0);
    expect(scrollStepNearEdge({ x: 0, y: 0, width: 0, height: 0 }, 10)).toBe(0);
  });
});

describe('nextScrollOffset', () => {
  it('stops at the end of the content', () => {
    expect(nextScrollOffset(190, 16, 1000, 800)).toBe(200);
    expect(nextScrollOffset(200, 16, 1000, 800)).toBe(200);
  });

  it('stops at the top', () => {
    expect(nextScrollOffset(10, -16, 1000, 800)).toBe(0);
  });

  it('does not scroll content shorter than the page', () => {
    expect(nextScrollOffset(0, 16, 500, 800)).toBe(0);
  });
});
