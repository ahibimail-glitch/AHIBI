import assert from "node:assert/strict";
import test from "node:test";
import {
  capacityRowIsEditable,
  committedCapacityCount,
  formatCapacityMetric,
} from "./nuscTicketCapacityMetrics.ts";

test("formats valid capacity metrics and safely renders missing counts", () => {
  assert.equal(formatCapacityMetric(1234567), "12,34,567");
  assert.equal(formatCapacityMetric(undefined), "—");
  assert.equal(formatCapacityMetric(null), "—");
  assert.equal(formatCapacityMetric(Number.NaN), "—");
});

test("missing commitment counts keep capacity rows read-only", () => {
  assert.equal(committedCapacityCount({ sold: 3, held: 2, offlineReserved: 1 }), 6);
  assert.equal(committedCapacityCount({ sold: 3, held: undefined, offlineReserved: 1 }), null);
  assert.equal(capacityRowIsEditable({
    capacity: 10,
    maxCapacity: 20,
    sold: 3,
    held: 2,
    offlineReserved: 1,
    available: 4,
  }), true);
  assert.equal(capacityRowIsEditable({
    capacity: 10,
    maxCapacity: 20,
    sold: 3,
    offlineReserved: 1,
    available: 4,
  }), false);
});
