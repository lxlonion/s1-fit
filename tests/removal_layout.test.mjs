import test from 'node:test';
import assert from 'node:assert/strict';
import { markerBounds, layoutRemovalEvents } from '../web/removal-layout.mjs';

const event = { id: 'removed', side: 'B', originX: 40, removedX: 160, textY: 150 };

test('short intervals retain native Bx/Sx instead of a lone x', () => {
  for (const side of ['B', 'S']) {
    assert.deepEqual(layoutRemovalEvents([{ ...event, side, removedX: 60 }], [], 400, 300, 12), []);
  }
});

test('expanded B and S avoid numbers on the entire horizontal span', () => {
  const number = { left: 90, right: 110, top: 130, bottom: 175 };
  const [buy] = layoutRemovalEvents([event], [number], 400, 300, 12);
  const [sell] = layoutRemovalEvents([{ ...event, side: 'S' }], [number], 400, 300, 12);
  assert.ok(buy.y - 6 > number.bottom);
  assert.ok(sell.y + 6 < number.top);
});

test('lack of vertical space falls back to native stacking without clamping into numbers', () => {
  const number = { left: 90, right: 110, top: 270, bottom: 293 };
  assert.deepEqual(layoutRemovalEvents([event], [number], 400, 300, 12), []);
});

test('overlapping removal spans receive separate rows', () => {
  const result = layoutRemovalEvents([event, { ...event, id: 'other' }], [], 400, 300, 12);
  assert.ok(result[1].y - result[0].y >= 17);
});

test('native marker bounds include the stacked number before a compact removal label', () => {
  const bars = new Map([['2026-09-21', { x: 100, top: 100, bottom: 200 }]]);
  for (const position of ['belowBar', 'aboveBar']) {
    const markers = ['20', 'Bx'].map((text, i) => ({ time: '2026-09-21', position, text, id: String(i) }));
    const [number, compact] = markerBounds(markers, bars, 12, 12, text => text.length * 7);
    assert.ok(position === 'belowBar'
      ? compact.textY - 6 > number.bottom
      : compact.textY + 6 < number.top);
  }
});
