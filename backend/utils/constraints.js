const DEFAULT_CONSTRAINTS = {
  maxTeacherDailyLectures: parseInt(process.env.MAX_TEACHER_DAILY_LECTURES || '4'),
  maxGroupDailyLectures: parseInt(process.env.MAX_GROUP_DAILY_LECTURES || '5'),
  maxClassroomDailyLectures: parseInt(process.env.MAX_CLASSROOM_DAILY_LECTURES || '6'),
};

function checkCountConstraints(allSlots, ids) {
  const conflicts = [];
  const { teacherId, studentGroupId, classroomId } = ids;

  if (teacherId) {
    const teacherCount = allSlots.filter(s => s.teacherId?.toString() === teacherId.toString()).length;
    if (teacherCount > DEFAULT_CONSTRAINTS.maxTeacherDailyLectures) {
      conflicts.push(`Teacher exceeds maximum daily lectures of ${DEFAULT_CONSTRAINTS.maxTeacherDailyLectures}`);
    }
  }

  if (studentGroupId) {
    const groupCount = allSlots.filter(s => s.studentGroupId?.toString() === studentGroupId.toString()).length;
    if (groupCount > DEFAULT_CONSTRAINTS.maxGroupDailyLectures) {
      conflicts.push(`Student group exceeds maximum daily lectures of ${DEFAULT_CONSTRAINTS.maxGroupDailyLectures}`);
    }
  }

  if (classroomId) {
    const classroomCount = allSlots.filter(s => s.classroomId?.toString() === classroomId.toString()).length;
    if (classroomCount > DEFAULT_CONSTRAINTS.maxClassroomDailyLectures) {
      conflicts.push(`Classroom exceeds maximum daily lectures of ${DEFAULT_CONSTRAINTS.maxClassroomDailyLectures}`);
    }
  }

  return conflicts;
}

module.exports = { DEFAULT_CONSTRAINTS, checkCountConstraints };
