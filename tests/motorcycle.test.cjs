'use strict';

// Regression tests for the pure race simulation; no Android emulator required.
// The renderer and game presentation are intentionally outside this test scope.
const test = require('node:test');
const assert = require('node:assert/strict');
const Race = require('../motorcycle.js');

test('starts in the center lane and keeps movement inside three lanes', () => {
  const state = Race.create();
  assert.equal(state.lane, 1);
  assert.equal(state.status, 'running');
  Race.move(state, -1);
  Race.move(state, -1);
  assert.equal(state.lane, 0);
  Race.move(state, 1);
  Race.move(state, 1);
  Race.move(state, 1);
  assert.equal(state.lane, 2);
});

test('boost has a cooldown and does not restart during cooldown', () => {
  const state = Race.create();
  assert.equal(Race.boost(state), true);
  assert.equal(state.boostUntil, Race.BOOST_DURATION);
  assert.equal(Race.boost(state), false);
  assert.equal(state.boostUntil, Race.BOOST_DURATION);
});

test('same seed and inputs yield identical race states', () => {
  const a = Race.create();
  const b = Race.create();
  for (let i = 0; i < 120; i++) {
    if (i === 20) { Race.move(a, -1); Race.move(b, -1); }
    if (i === 40) { Race.boost(a); Race.boost(b); }
    Race.tick(a, 0.1);
    Race.tick(b, 0.1);
  }
  assert.deepEqual(a, b);
  assert.ok(a.objects.length > 0);
});

test('restoring a race does not alias its object list', () => {
  const saved = { objects: [{ id: 'car-1', lane: 0, z: 80 }] };
  const state = Race.create(saved);
  state.objects[0].lane = 2;
  assert.equal(saved.objects[0].lane, 0);
});

test('the race finishes at sixty seconds exactly once', () => {
  const state = Race.create();
  let finished = 0;
  for (let i = 0; i < 601; i++) {
    Race.tick(state, 0.1, { finish: () => finished++ });
  }
  assert.equal(state.elapsed, Race.DURATION);
  assert.equal(state.status, 'finish');
  assert.equal(finished, 1);
});
