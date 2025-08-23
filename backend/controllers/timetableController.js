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
const { GeneticTimetableScheduler } = require('../utils/geneticAlgorithm');
const { GraphColoringTimetableScheduler } = require('../utils/graphColoring');

// Default configuration for timetable generation. These values can be
// overridden via environment variables to customise start/end times or the
// interval between slots.
const SLOT_START = process.env.TIMETABLE_START || '09:00';
const SLOT_END = process.env.TIMETABLE_END || '17:00';
const SLOT_STEP = parseInt(process.env.TIMETABLE_STEP || '60');
// When enabled, the generator logs every conflict it encounters so admins can
// understand why slots are rejected. This can be toggled via an environment
// variable to avoid noisy logs in production.
const TIMETABLE_DEBUG = process.env.TIMETABLE_DEBUG === 'true';

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

    if (conflicts.length > 0 && TIMETABLE_DEBUG) {
        console.warn(
            `Conflict for course ${courseId} (group ${studentGroupId}) in classroom ${classroomId} with teacher ${teacherId} on ${day} at ${startTime}-${endTime}:`,
            conflicts
        );
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
            
            if (studentGroups.length === 0) {
                return res.json({ timetable: [] });
            }
            
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
        // Collect unscheduled attempts when debug mode is active to help admins
        // understand why generation produced no slots.
        const debugMode = TIMETABLE_DEBUG || req.query.debug === 'true';
        const debugInfo = [];

        for (const course of courses) {
            for (const studentGroup of course.studentGroups) {
                for (let i = 0; i < course.frequency; i++) {
                    let scheduled = false;
                    let lastConflicts = [];

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
                                    } else {
                                        lastConflicts = conflicts;
                                    }
                                }
                            }
                            if (scheduled) break;
                        }
                    }

                    if (!scheduled && debugMode) {
                        debugInfo.push({
                            courseId: course._id.toString(),
                            studentGroupId: studentGroup._id.toString(),
                            teacherId: course.teacherId._id.toString(),
                            conflicts: lastConflicts
                        });
                    }
                }
            }
        }

        res.json({
            message: "Timetable generated successfully",
            schedule: generatedSchedule,
            totalSlots: generatedSchedule.length,
            conflicts: debugMode ? debugInfo : undefined
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

// Genetic Algorithm Timetable Generation
timetableRouter.get("/generate/genetic", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { 
            semester, 
            academicYear, 
            department,
            populationSize = 50,
            maxGenerations = 100,
            mutationRate = 0.1,
            crossoverRate = 0.8
        } = req.query;

        if (!semester || !academicYear) {
            return res.status(400).json({message: "Semester and academic year are required"});
        }

        // Fetch required data
        const [courses, classrooms, studentGroups, teachers] = await Promise.all([
            Course.find({
                semester: parseInt(semester),
                department,
                isActive: true
            }).populate('teacherId studentGroups'),
            Classroom.find({ isActive: true }),
            StudentGroup.find({ 
                semester: parseInt(semester),
                department,
                isActive: true 
            }),
            userModel.find({ 
                role: 'faculty', 
                department,
                isActive: true 
            })
        ]);

        if (courses.length === 0) {
            return res.status(400).json({message: "No courses found for the specified criteria"});
        }

        // Configure genetic algorithm
        const gaConfig = {
            populationSize: parseInt(populationSize),
            maxGenerations: parseInt(maxGenerations),
            mutationRate: parseFloat(mutationRate),
            crossoverRate: parseFloat(crossoverRate),
            timeSlots: generateTimeSlots(SLOT_START, SLOT_END, SLOT_STEP, 60)
        };

        // Initialize and run genetic algorithm
        const geneticScheduler = new GeneticTimetableScheduler(
            courses, 
            classrooms, 
            studentGroups, 
            teachers, 
            gaConfig
        );

        const result = await geneticScheduler.evolve();

        // Format schedule for database
        const formattedSchedule = result.schedule.map(gene => ({
            courseId: gene.courseId,
            studentGroupId: gene.studentGroupId,
            classroomId: gene.classroomId,
            teacherId: gene.teacherId,
            day: gene.day,
            startTime: gene.startTime,
            endTime: gene.endTime,
            duration: gene.duration,
            weekNumber: 1,
            semester: parseInt(semester),
            academicYear
        }));

        res.json({
            message: "Genetic algorithm timetable generated successfully",
            schedule: formattedSchedule,
            fitness: result.fitness,
            metadata: result.metadata,
            totalSlots: formattedSchedule.length
        });

    } catch (error) {
        console.error('Genetic algorithm timetable generation error:', error);
        res.status(500).json({message: "Error generating timetable using genetic algorithm"});
    }
});

// Graph Coloring Timetable Generation
timetableRouter.get("/generate/graph-coloring", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { 
            semester, 
            academicYear, 
            department,
            algorithm = 'dsatur' // 'welsh-powell' or 'dsatur'
        } = req.query;

        if (!semester || !academicYear) {
            return res.status(400).json({message: "Semester and academic year are required"});
        }

        // Fetch required data
        const [courses, classrooms, studentGroups, teachers] = await Promise.all([
            Course.find({
                semester: parseInt(semester),
                department,
                isActive: true
            }).populate('teacherId studentGroups'),
            Classroom.find({ isActive: true }),
            StudentGroup.find({ 
                semester: parseInt(semester),
                department,
                isActive: true 
            }),
            userModel.find({ 
                role: 'faculty', 
                department,
                isActive: true 
            })
        ]);

        if (courses.length === 0) {
            return res.status(400).json({message: "No courses found for the specified criteria"});
        }

        // Configure graph coloring algorithm
        const gcConfig = {
            algorithm: algorithm,
            timeSlots: generateTimeSlots(SLOT_START, SLOT_END, SLOT_STEP, 60)
        };

        // Initialize and run graph coloring algorithm
        const graphColoringScheduler = new GraphColoringTimetableScheduler(
            courses, 
            classrooms, 
            studentGroups, 
            teachers, 
            gcConfig
        );

        const result = await graphColoringScheduler.generateTimetable();

        // Format schedule for database
        const formattedSchedule = result.schedule.map(item => ({
            courseId: item.courseId,
            studentGroupId: item.studentGroupId,
            classroomId: item.classroomId,
            teacherId: item.teacherId,
            day: item.day,
            startTime: item.startTime,
            endTime: item.endTime,
            duration: item.duration,
            weekNumber: 1,
            semester: parseInt(semester),
            academicYear
        }));

        res.json({
            message: `Graph coloring (${algorithm.toUpperCase()}) timetable generated successfully`,
            schedule: formattedSchedule,
            metadata: result.metadata,
            totalSlots: result.totalSlots,
            unscheduled: result.unscheduled
        });

    } catch (error) {
        console.error('Graph coloring timetable generation error:', error);
        res.status(500).json({message: "Error generating timetable using graph coloring"});
    }
});

// Compare different algorithms
timetableRouter.get("/generate/compare", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { semester, academicYear, department } = req.query;

        if (!semester || !academicYear) {
            return res.status(400).json({message: "Semester and academic year are required"});
        }

        // Fetch required data
        const [courses, classrooms, studentGroups, teachers] = await Promise.all([
            Course.find({
                semester: parseInt(semester),
                department,
                isActive: true
            }).populate('teacherId studentGroups'),
            Classroom.find({ isActive: true }),
            StudentGroup.find({ 
                semester: parseInt(semester),
                department,
                isActive: true 
            }),
            userModel.find({ 
                role: 'faculty', 
                department,
                isActive: true 
            })
        ]);

        if (courses.length === 0) {
            return res.status(400).json({message: "No courses found for the specified criteria"});
        }

        const timeSlots = generateTimeSlots(SLOT_START, SLOT_END, SLOT_STEP, 60);
        const results = {};

        // Run Graph Coloring (DSATUR)
        try {
            const dsaturScheduler = new GraphColoringTimetableScheduler(
                courses, classrooms, studentGroups, teachers,
                { algorithm: 'dsatur', timeSlots }
            );
            const dsaturResult = await dsaturScheduler.generateTimetable();
            results.dsatur = {
                algorithm: 'DSATUR Graph Coloring',
                totalSlots: dsaturResult.totalSlots,
                unscheduled: dsaturResult.unscheduled,
                success_rate: ((dsaturResult.totalSlots / (dsaturResult.totalSlots + dsaturResult.unscheduled)) * 100).toFixed(1),
                metadata: dsaturResult.metadata
            };
        } catch (error) {
            results.dsatur = { error: error.message };
        }

        // Run Graph Coloring (Welsh-Powell)
        try {
            const wpScheduler = new GraphColoringTimetableScheduler(
                courses, classrooms, studentGroups, teachers,
                { algorithm: 'welsh-powell', timeSlots }
            );
            const wpResult = await wpScheduler.generateTimetable();
            results.welsh_powell = {
                algorithm: 'Welsh-Powell Graph Coloring',
                totalSlots: wpResult.totalSlots,
                unscheduled: wpResult.unscheduled,
                success_rate: ((wpResult.totalSlots / (wpResult.totalSlots + wpResult.unscheduled)) * 100).toFixed(1),
                metadata: wpResult.metadata
            };
        } catch (error) {
            results.welsh_powell = { error: error.message };
        }

        // Run Genetic Algorithm (smaller parameters for comparison)
        try {
            const gaScheduler = new GeneticTimetableScheduler(
                courses, classrooms, studentGroups, teachers,
                { populationSize: 20, maxGenerations: 30, timeSlots }
            );
            const gaResult = await gaScheduler.evolve();
            results.genetic = {
                algorithm: 'Genetic Algorithm',
                totalSlots: gaResult.schedule.length,
                fitness: gaResult.fitness.fitness,
                hard_violations: gaResult.fitness.hardConstraintViolations,
                soft_violations: gaResult.fitness.softConstraintViolations,
                success_rate: gaResult.fitness.hardConstraintViolations === 0 ? '100.0' : 'N/A',
                metadata: gaResult.metadata
            };
        } catch (error) {
            results.genetic = { error: error.message };
        }

        res.json({
            message: "Algorithm comparison completed",
            comparison: results,
            input_stats: {
                courses: courses.length,
                classrooms: classrooms.length,
                student_groups: studentGroups.length,
                teachers: teachers.length,
                time_slots: timeSlots.length
            }
        });

    } catch (error) {
        console.error('Algorithm comparison error:', error);
        res.status(500).json({message: "Error comparing timetable generation algorithms"});
    }
});

module.exports = { timetableRouter, checkConflicts };