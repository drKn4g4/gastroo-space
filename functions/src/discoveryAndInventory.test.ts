import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeReactiveMenuState,
  computeSafeToEatDecision,
  resolveSafeToEatVenueId,
} from './discoveryAndInventory';

test('resolveSafeToEatVenueId prefers venueId', () => {
  assert.equal(
    resolveSafeToEatVenueId({ orgId: 'org-1', venueId: 'venue-1', restaurantId: 'rest-1' }),
    'venue-1',
  );
});

test('resolveSafeToEatVenueId falls back to restaurantId', () => {
  assert.equal(
    resolveSafeToEatVenueId({ orgId: 'org-1', restaurantId: 'rest-legacy' }),
    'rest-legacy',
  );
});

test('computeSafeToEatDecision returns safe when projected ready time fits before close window', () => {
  const result = computeSafeToEatDecision({
    nowMinutes: 18 * 60,
    prepWindowMin: 20,
    currentWaitTime: 15,
    closeMinutes: 22 * 60,
    kitchenOffsetMin: 30,
  });

  assert.equal(result.safe, true);
  assert.equal(result.reasonCode, 'SAFE_TO_EAT');
  assert.equal(result.formula.projectedReadyMinute, 1115);
  assert.equal(result.formula.latestSafeOrderMinute, 1290);
});

test('computeSafeToEatDecision returns unsafe when projected ready time exceeds safe window', () => {
  const result = computeSafeToEatDecision({
    nowMinutes: 21 * 60,
    prepWindowMin: 25,
    currentWaitTime: 20,
    closeMinutes: 22 * 60,
    kitchenOffsetMin: 30,
  });

  assert.equal(result.safe, false);
  assert.equal(result.reasonCode, 'UNSAFE_WINDOW');
  assert.equal(result.formula.projectedReadyMinute, 1305);
  assert.equal(result.formula.latestSafeOrderMinute, 1290);
});

test('computeReactiveMenuState hides and disables menu item when ingredients are unavailable', () => {
  const result = computeReactiveMenuState(
    { available: true, visible: true, reactiveHidden: false },
    false,
  );

  assert.deepEqual(result, {
    available: false,
    visible: false,
    reactiveHidden: true,
  });
});

test('computeReactiveMenuState restores visibility after reactive hide when ingredients return', () => {
  const result = computeReactiveMenuState(
    { available: false, visible: false, reactiveHidden: true },
    true,
  );

  assert.deepEqual(result, {
    available: true,
    visible: true,
    reactiveHidden: false,
  });
});
