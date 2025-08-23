const test = require('node:test');
const assert = require('node:assert');
const { checkConflicts } = require('../controllers/timetableController');
const { timetableModel: Timetable } = require('../models/timetable');

const originalFind = Timetable.find;
function mockFindEmpty() {
  return {
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); }
  };
}

test('detects teacher conflict in pending schedule', async () => {
  Timetable.find = mockFindEmpty;
  const pending = [{
    courseId: 'c1',
    studentGroupId: 'sg1',
    classroomId: 'cl1',
    teacherId: 't1',
    day: 'monday',
    startTime: '09:00',
    endTime: '10:00'
  }];
  const conflicts = await checkConflicts('c2', 'sg2', 'cl2', 't1', 'monday', '09:00', '10:00', null, pending);
  assert(conflicts.some(c => c.includes('Teacher')));
  Timetable.find = originalFind;
});

test('detects student group conflict in pending schedule', async () => {
  Timetable.find = mockFindEmpty;
  const pending = [{
    courseId: 'c1',
    studentGroupId: 'sg1',
    classroomId: 'cl1',
    teacherId: 't1',
    day: 'monday',
    startTime: '09:00',
    endTime: '10:00'
  }];
  const conflicts = await checkConflicts('c2', 'sg1', 'cl2', 't2', 'monday', '09:00', '10:00', null, pending);
  assert(conflicts.some(c => c.includes('Student group')));
  Timetable.find = originalFind;
});

test('detects classroom conflict in pending schedule', async () => {
  Timetable.find = mockFindEmpty;
  const pending = [{
    courseId: 'c1',
    studentGroupId: 'sg1',
    classroomId: 'cl1',
    teacherId: 't1',
    day: 'monday',
    startTime: '09:00',
    endTime: '10:00'
  }];
  const conflicts = await checkConflicts('c2', 'sg2', 'cl1', 't2', 'monday', '09:00', '10:00', null, pending);
  assert(conflicts.some(c => c.includes('Classroom')));
  Timetable.find = originalFind;
});

test('enforces max daily lectures per teacher', async () => {
  Timetable.find = mockFindEmpty;
  const pending = [
    { teacherId: 't1', studentGroupId: 'sg1', classroomId: 'cl1', day: 'monday', startTime: '08:00', endTime: '09:00' },
    { teacherId: 't1', studentGroupId: 'sg2', classroomId: 'cl2', day: 'monday', startTime: '09:00', endTime: '10:00' },
    { teacherId: 't1', studentGroupId: 'sg3', classroomId: 'cl3', day: 'monday', startTime: '10:00', endTime: '11:00' },
    { teacherId: 't1', studentGroupId: 'sg4', classroomId: 'cl4', day: 'monday', startTime: '11:00', endTime: '12:00' }
  ];
  const conflicts = await checkConflicts('c5', 'sg5', 'cl5', 't1', 'monday', '12:00', '13:00', null, pending);
  assert(conflicts.some(c => c.includes('maximum daily lectures')));
  Timetable.find = originalFind;
});
