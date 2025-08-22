const test = require('node:test');
const assert = require('node:assert');

const { timetableRouter } = require('../controllers/timetableController');
const { studentGroupModel: StudentGroup } = require('../models/studentGroup');
const { timetableModel: Timetable } = require('../models/timetable');

// Helper to extract the GET / handler
function getTimetableHandler() {
  const layer = timetableRouter.stack.find(
    (l) => l.route && l.route.path === '/' && l.route.methods.get
  );
  // index 1 skips authenticateToken middleware
  return layer.route.stack[1].handle;
}

const getHandler = getTimetableHandler();

test('student receives timetable for own group only', async () => {
  // Mock StudentGroup.find to return the student’s group
  const originalSGFind = StudentGroup.find;
  StudentGroup.find = async () => [{ _id: 'g1' }];

  // Mock Timetable.find to capture filter and return sample timetable
  const originalTTFind = Timetable.find;
  Timetable.find = (filter) => {
    assert.deepStrictEqual(filter, { studentGroupId: 'g1' });
    return {
      populate() { return this; },
      sort() { return Promise.resolve([{ _id: 'tt1', studentGroupId: 'g1' }]); }
    };
  };

  const req = { query: { studentGroupId: 'g1' }, user: { _id: 's1', role: 'student' } };
  let jsonResponse;
  const res = { json: (data) => { jsonResponse = data; } };

  await getHandler(req, res);

  assert.deepStrictEqual(jsonResponse, { timetable: [{ _id: 'tt1', studentGroupId: 'g1' }] });

  StudentGroup.find = originalSGFind;
  Timetable.find = originalTTFind;
});

test('student cannot access other group timetable', async () => {
  const originalSGFind = StudentGroup.find;
  StudentGroup.find = async () => [{ _id: 'g1' }];

  const originalTTFind = Timetable.find;
  Timetable.find = () => {
    assert.fail('Timetable.find should not be called');
  };

  const req = { query: { studentGroupId: 'g2' }, user: { _id: 's1', role: 'student' } };
  let jsonResponse;
  const res = { json: (data) => { jsonResponse = data; } };

  await getHandler(req, res);

  assert.deepStrictEqual(jsonResponse, { timetable: [] });

  StudentGroup.find = originalSGFind;
  Timetable.find = originalTTFind;
});

