// Match the marker stack used by the pinned Lightweight Charts 4.2.3 release.
// These bounds let the horizontal annotations avoid its native markers.
export function markerBounds(markers, bars, spacing, fontSize, measureText) {
  const odd = value => Math.ceil(value) - (Math.ceil(value) % 2 === 0 ? 1 : 0);
  const size = odd(Math.min(30, Math.max(12, spacing)));
  const shapeHeight = size - size % 2;
  const margin = Math.max(3, odd(Math.min(30, Math.max(12, spacing)) * 0.1));
  const offsets = new Map();
  return markers.flatMap(marker => {
    const bar = bars.get(marker.time);
    if (!bar) return [];
    const key = `${marker.time}:${marker.position}`;
    const offset = offsets.get(key) ?? margin;
    const height = shapeHeight * Math.max(0, marker.size ?? 1);
    const below = marker.position === 'belowBar';
    const direction = below ? 1 : -1;
    const shapeY = (below ? bar.bottom : bar.top) + direction * (offset + height / 2);
    const textY = shapeY + direction * (height / 2 + fontSize * 0.6 + (below ? margin : 0));
    const textHalf = marker.text ? fontSize / 2 : 0;
    const halfWidth = Math.max(height / 2 + 2, measureText(marker.text || '') / 2);
    offsets.set(key, offset + height + margin + (marker.text ? fontSize * 1.2 : 0));
    return [{
      id: marker.id, textY,
      left: bar.x - halfWidth, right: bar.x + halfWidth,
      top: Math.min(shapeY - height / 2 - 2, textY - textHalf),
      bottom: Math.max(shapeY + height / 2 + 2, textY + textHalf),
    }];
  });
}

export function layoutRemovalEvents(events, obstacles, width, height, fontSize) {
  const occupied = [...obstacles];
  const expanded = [];
  const padding = 5;
  for (const event of events) {
    const { originX, removedX, textY, side, id } = event;
    // Both labels and a recognizable arrow must fit between the two dates.
    // Otherwise leave the native Bx/Sx marker on the original signal date.
    if (![originX, removedX, textY].every(Number.isFinite)
      || originX < 10 || removedX > width - 10 || removedX - originX < 48) continue;
    const left = originX - fontSize;
    const right = removedX + fontSize;
    let y = textY;
    for (const box of occupied) {
      if (box.id === id || box.right < left || box.left > right) continue;
      y = side === 'B'
        ? Math.max(y, box.bottom + fontSize / 2 + padding)
        : Math.min(y, box.top - fontSize / 2 - padding);
    }
    // Do not clamp into other markers when the pane has no free lane.
    if (y < fontSize || y > height - fontSize) continue;
    expanded.push({ ...event, y });
    occupied.push({ left, right, top: y - fontSize / 2, bottom: y + fontSize / 2 });
  }
  return expanded;
}
