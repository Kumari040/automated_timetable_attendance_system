const {Router} = require('express');
const timetableRouter = Router();
const {z} = require('zod');
const {timetableModel: Timetable} = require('../models/timetable');
const Course = require('../models/course');
const {classroomModel: Classroom} = require('../models/classroom');
const {studentGroupModel: StudentGroup} = require('../models/studentGroup');
const {userModel} = require('../models/user');
const {authenticateToken, authorizeRoles} = require('../middleware/auth');
const { generateTimeSlots } = require('../utils/timeSlots');
const { checkCountConstraints } = require('../utils/constraints');

// Default configuration for timetable generation. These values can be
// overridden via environment variables to customise start/end times or the
// interval between slots.
const SLOT_START = process.env.TIMETABLE_START || '09:00';
const SLOT_END = process.env.TIMETABLE_END || '17:00';
const SLOT_STEP = parseInt(process.env.TIMETABLE_STEP || '60');

const isTimeConflict = (startTime1, endTime1, startTime2, endTime2) => {
    const start1 = new Date(`1970-01-01T${startTime1}:00`);
    const end1 = new Date(`1970-01-01T${endTime1}:00`);
    const start2 = new Date(`1970-01-01T${startTime2}:00`);
    const end2 = new Date(`1970-01-01T${endTime2}:00`);
    
    return (start1 < end2 && start2 < end1);
};

const isWithinAvailability = (entity, day, startTime, endTime) => {
    if (!entity) return true;

    if (entity.blackoutPeriods && entity.blackoutPeriods.length > 0) {
        const blackout = entity.blackoutPeriods.find(b => b.day === day);
        if (blackout) {
            for (const slot of blackout.slots) {
                if (isTimeConflict(startTime, endTime, slot.start, slot.end)) {
                    return false;
                }
            }
        }
    }

    if (entity.availability && entity.availability.length > 0) {
        const availability = entity.availability.find(a => a.day === day);
        if (!availability) return false;
        const within = availability.slots.some(slot => startTime >= slot.start && endTime <= slot.end);
        if (!within) return false;
    }

    return true;
};

const checkConflicts = async (
    courseId,
    studentGroupId,
    classroomId,
    teacherId,
    day,
    startTime,
    endTime,
    excludeTimetableId = null,
    pendingSchedule = [],
    entities = {}
) => {
    const conflicts = [];

    const query = {
        day,
        $and: [
            {
                $or: [
                    { courseId },
                    { studentGroupId },
                    { classroomId },
                    { teacherId }
                ]
            }
        ]
    };

    if (excludeTimetableId) {
        query._id = { $ne: excludeTimetableId };
    }

    const existingSlots = await Timetable.find(query)
        .populate('courseId', 'name code')
        .populate('studentGroupId', 'name')
        .populate('classroomId', 'name')
        .populate('teacherId', 'name');

    // Only consider pending entries for the same day
    const relevantPending = pendingSchedule.filter(slot => slot.day === day);
    const allSlots = existingSlots.concat(relevantPending);
    const allSlotsWithNew = allSlots.concat([
        { courseId, studentGroupId, classroomId, teacherId }
    ]);

    const limitConflicts = checkCountConstraints(allSlotsWithNew, {
        teacherId,
        studentGroupId,
        classroomId
    });
    conflicts.push(...limitConflicts);

    for (const slot of allSlots) {
        const slotCourseId = slot.courseId?._id ? slot.courseId._id.toString() : slot.courseId?.toString();
        const slotStudentGroupId = slot.studentGroupId?._id ? slot.studentGroupId._id.toString() : slot.studentGroupId?.toString();
        const slotClassroomId = slot.classroomId?._id ? slot.classroomId._id.toString() : slot.classroomId?.toString();
        const slotTeacherId = slot.teacherId?._id ? slot.teacherId._id.toString() : slot.teacherId?.toString();

        if (slot.day === day && isTimeConflict(startTime, endTime, slot.startTime, slot.endTime)) {
            if (slotCourseId === courseId.toString()) {
                const name = slot.courseId?.name ? ` ${slot.courseId.name}` : '';
                conflicts.push(`Course${name} already scheduled at this time`);
            }
            if (slotStudentGroupId === studentGroupId.toString()) {
                const name = slot.studentGroupId?.name ? ` ${slot.studentGroupId.name}` : '';
                conflicts.push(`Student group${name} already has a class at this time`);
            }
            if (slotClassroomId === classroomId.toString()) {
                const name = slot.classroomId?.name ? ` ${slot.classroomId.name}` : '';
                conflicts.push(`Classroom${name} is already booked at this time`);
            }
            if (slotTeacherId === teacherId.toString()) {
                const name = slot.teacherId?.name ? ` ${slot.teacherId.name}` : '';
                conflicts.push(`Teacher${name} already has a class at this time`);
            }
        }
    }

    const { teacher, classroom, studentGroup } = entities;

    if (teacher && !isWithinAvailability(teacher, day, startTime, endTime)) {
        const name = teacher.name ? ` ${teacher.name}` : '';
        conflicts.push(`Teacher${name} is not available at this time`);
    }
    if (classroom && !isWithinAvailability(classroom, day, startTime, endTime)) {
        const name = classroom.name ? ` ${classroom.name}` : '';
        conflicts.push(`Classroom${name} is not available at this time`);
    }
    if (studentGroup && !isWithinAvailability(studentGroup, day, startTime, endTime)) {
        const name = studentGroup.name ? ` ${studentGroup.name}` : '';
        conflicts.push(`Student group${name} is not available at this time`);
    }

    return conflicts;
};

timetableRouter.post("/", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const timetableSchema = z.object({
            courseId: z.string(),
            studentGroupId: z.string(),
            classroomId: z.string(),
            teacherId: z.string(),
            day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
            startTime: z.string(),
            duration: z.number().min(30).max(180).default(60),
            weekNumber: z.number().min(1).max(52),
            semester: z.number().min(1).max(8),
            academicYear: z.string(),
            notes: z.string().optional()
        });

        const parsedBody = timetableSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedBody.error.errors
            });
        }

        const { courseId, studentGroupId, classroomId, teacherId, day, startTime, duration } = req.body;
        
        const startHour = parseInt(startTime.split(':')[0]);
        const startMinute = parseInt(startTime.split(':')[1]);
        const endHour = startHour + Math.floor(duration / 60);
        const endMinute = startMinute + (duration % 60);
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        const [course, studentGroup, classroom, teacher] = await Promise.all([
            Course.findById(courseId),
            StudentGroup.findById(studentGroupId),
            Classroom.findById(classroomId),
            userModel.findById(teacherId)
        ]);

        if (!course || !studentGroup || !classroom || !teacher) {
            return res.status(400).json({message: "Invalid course, student group, classroom, or teacher ID"});
        }

        if (teacher.role !== 'faculty') {
            return res.status(400).json({message: "Assigned teacher must be faculty"});
        }

        const conflicts = await checkConflicts(
            courseId,
            studentGroupId,
            classroomId,
            teacherId,
            day,
            startTime,
            endTime,
            null,
            [],
            { teacher, classroom, studentGroup }
        );
        if (conflicts.length > 0) {
            return res.status(409).json({
                message: "Scheduling conflicts detected",
                conflicts
            });
        }

        const timetableEntry = await Timetable.create({
            ...req.body,
            endTime
        });

        const populatedEntry = await Timetable.findById(timetableEntry._id)
            .populate('courseId', 'name code')
            .populate('studentGroupId', 'name department semester')
            .populate('classroomId', 'name roomNumber building')
            .populate('teacherId', 'name email');

        res.status(201).json({
            message: "Timetable entry created successfully",
            timetable: populatedEntry
        });
    } catch (error) {
        console.error('Timetable creation error:', error);
        res.status(500).json({message: "Error creating timetable entry"});
    }
});

timetableRouter.get("/", authenticateToken, async (req, res) => {
    try {
        const { studentGroupId, teacherId, classroomId, day, semester, academicYear } = req.query;
        const filter = {};

        if (teacherId) filter.teacherId = teacherId;
        if (classroomId) filter.classroomId = classroomId;
        if (day) filter.day = day;
        if (semester) filter.semester = parseInt(semester);
        if (academicYear) filter.academicYear = academicYear;

        if (req.user.role === 'faculty') {
            filter.teacherId = req.user._id;
            if (studentGroupId) filter.studentGroupId = studentGroupId;
        } else if (req.user.role === 'student') {
            const studentGroups = await StudentGroup.find({
                students: req.user._id
            });
            const allowedGroupIds = studentGroups.map(sg => sg._id.toString());

            if (studentGroupId) {
                if (!allowedGroupIds.includes(studentGroupId.toString())) {
                    return res.json({ timetable: [] });
                }
                filter.studentGroupId = studentGroupId;
            } else {
                filter.studentGroupId = { $in: allowedGroupIds };
            }
        } else if (studentGroupId) {
            filter.studentGroupId = studentGroupId;
        }

        const timetable = await Timetable.find(filter)
            .populate('courseId', 'name code credits')
            .populate('studentGroupId', 'name department semester year')
            .populate('classroomId', 'name roomNumber building')
            .populate('teacherId', 'name email')
            .sort({ day: 1, startTime: 1 });

        res.json({ timetable });
    } catch (error) {
        console.error('Timetable fetch error:', error);
        res.status(500).json({message: "Error fetching timetable"});
    }
});

timetableRouter.get("/generate", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { semester, academicYear, department } = req.query;

        if (!semester || !academicYear) {
            return res.status(400).json({message: "Semester and academic year are required"});
        }

        const courses = await Course.find({
            semester: parseInt(semester),
            department,
            isActive: true
        }).populate('teacherId studentGroups');

        const classrooms = await Classroom.find({ isActive: true });
        const generatedSchedule = [];

        for (const course of courses) {
            for (const studentGroup of course.studentGroups) {
                for (let i = 0; i < course.frequency; i++) {
                    let scheduled = false;
                    
                    for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']) {
                        if (scheduled) break;
                        
                        const possibleSlots = generateTimeSlots(SLOT_START, SLOT_END, SLOT_STEP, course.duration);
                        for (const startTime of possibleSlots) {
                            const endHour = parseInt(startTime.split(':')[0]) + Math.floor(course.duration / 60);
                            const endMinute = parseInt(startTime.split(':')[1]) + (course.duration % 60);
                            const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                            
                            for (const classroom of classrooms) {
                                if (classroom.capacity >= studentGroup.size) {
                                    const conflicts = await checkConflicts(
                                        course._id,
                                        studentGroup._id,
                                        classroom._id,
                                        course.teacherId._id,
                                        day,
                                        startTime,
                                        endTime,
                                        null,
                                        generatedSchedule,
                                        { teacher: course.teacherId, classroom, studentGroup }
                                    );
                                    
                                    if (conflicts.length === 0) {
                                        const scheduleEntry = {
                                            courseId: course._id,
                                            studentGroupId: studentGroup._id,
                                            classroomId: classroom._id,
                                            teacherId: course.teacherId._id,
                                            day,
                                            startTime,
                                            endTime,
                                            duration: course.duration,
                                            weekNumber: 1,
                                            semester: parseInt(semester),
                                            academicYear
                                        };
                                        
                                        generatedSchedule.push(scheduleEntry);
                                        scheduled = true;
                                        break;
                                    }
                                }
                            }
                            if (scheduled) break;
                        }
                    }
                }
            }
        }

        res.json({
            message: "Timetable generated successfully",
            schedule: generatedSchedule,
            totalSlots: generatedSchedule.length
        });
    } catch (error) {
        console.error('Timetable generation error:', error);
        res.status(500).json({message: "Error generating timetable"});
    }
});

timetableRouter.post("/generate/save", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { schedule } = req.body;

        if (!schedule || !Array.isArray(schedule)) {
            return res.status(400).json({message: "Valid schedule array is required"});
        }

        const savedEntries = await Timetable.insertMany(schedule);

        res.status(201).json({
            message: "Generated timetable saved successfully",
            entriesSaved: savedEntries.length
        });
    } catch (error) {
        console.error('Save timetable error:', error);
        res.status(500).json({message: "Error saving generated timetable"});
    }
});

timetableRouter.put("/:id", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const allowedUpdates = ['day', 'startTime', 'duration', 'classroomId', 'notes', 'status'];
        const updates = {};

        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        if (updates.startTime && updates.duration) {
            const startHour = parseInt(updates.startTime.split(':')[0]);
            const startMinute = parseInt(updates.startTime.split(':')[1]);
            const endHour = startHour + Math.floor(updates.duration / 60);
            const endMinute = startMinute + (updates.duration % 60);
            updates.endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        }

        const existingEntry = await Timetable.findById(req.params.id);
        if (!existingEntry) {
            return res.status(404).json({message: "Timetable entry not found"});
        }

        if (updates.day || updates.startTime || updates.classroomId) {
            const [teacher, classroom, studentGroup] = await Promise.all([
                userModel.findById(existingEntry.teacherId),
                Classroom.findById(updates.classroomId || existingEntry.classroomId),
                StudentGroup.findById(existingEntry.studentGroupId)
            ]);
            const conflicts = await checkConflicts(
                existingEntry.courseId,
                existingEntry.studentGroupId,
                updates.classroomId || existingEntry.classroomId,
                existingEntry.teacherId,
                updates.day || existingEntry.day,
                updates.startTime || existingEntry.startTime,
                updates.endTime || existingEntry.endTime,
                req.params.id,
                [],
                { teacher, classroom, studentGroup }
            );

            if (conflicts.length > 0) {
                return res.status(409).json({
                    message: "Scheduling conflicts detected",
                    conflicts
                });
            }
        }

        const updatedEntry = await Timetable.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        ).populate('courseId studentGroupId classroomId teacherId');

        res.json({
            message: "Timetable entry updated successfully",
            timetable: updatedEntry
        });
    } catch (error) {
        res.status(500).json({message: "Error updating timetable entry"});
    }
});

timetableRouter.delete("/:id", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const deletedEntry = await Timetable.findByIdAndDelete(req.params.id);

        if (!deletedEntry) {
            return res.status(404).json({message: "Timetable entry not found"});
        }

        res.json({message: "Timetable entry deleted successfully"});
    } catch (error) {
        res.status(500).json({message: "Error deleting timetable entry"});
    }
});

module.exports = { timetableRouter, checkConflicts };