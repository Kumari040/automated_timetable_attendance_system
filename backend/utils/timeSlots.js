function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTimeString(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function generateTimeSlots(start = '09:00', end = '17:00', step = 60, duration = step) {
  const slots = [];
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  for (let t = startMin; t + duration <= endMin; t += step) {
    slots.push(toTimeString(t));
  }
  return slots;
}

module.exports = { generateTimeSlots };
