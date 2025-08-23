const test = require('node:test');
const assert = require('node:assert');
const { generateTimeSlots } = require('../utils/timeSlots');

test('generates slots for 30-minute classes', () => {
  const slots = generateTimeSlots('09:00', '10:30', 30, 30);
  assert.deepStrictEqual(slots, ['09:00', '09:30', '10:00']);
});

test('generates slots that fit 90-minute classes', () => {
  const slots = generateTimeSlots('09:00', '12:00', 30, 90);
  assert.deepStrictEqual(slots, ['09:00', '09:30', '10:00', '10:30']);
});
