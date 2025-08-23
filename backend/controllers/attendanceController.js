const {Router} = require('express');
const attendanceRouter = Router();
const {z} = require('zod');
const {attendanceModel: Attendance} = require('../models/attendance');
const {timetableModel: Timetable} = require('../models/timetable');
const {studentModel: Student} = require('../models/student');
const {userModel} = require('../models/user');
const {authenticateToken, authorizeRoles} = require('../middleware/auth');

attendanceRouter.post("/mark", authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
    try {
        const attendanceSchema = z.object({
            timetableId: z.string(),
            attendanceRecords: z.array(z.object({
                studentId: z.string(),
                status: z.enum(['present', 'absent', 'late', 'excused']),
                remarks: z.string().optional()
            }))
        });

        const parsedBody = attendanceSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedBody.error.errors
            });
        }

        const { timetableId, attendanceRecords } = req.body;

        const timetableEntry = await Timetable.findById(timetableId)
            .populate('courseId studentGroupId teacherId');

        if (!timetableEntry) {
            return res.status(404).json({message: "Timetable entry not found"});
        }

        if (req.user.role === 'faculty' && timetableEntry.teacherId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({message: "You can only mark attendance for your own classes"});
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.find({
            timetableId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (existingAttendance.length > 0) {
            return res.status(409).json({message: "Attendance already marked for this class today"});
        }

        const attendanceEntries = attendanceRecords.map(record => ({
            timetableId,
            courseId: timetableEntry.courseId._id,
            studentId: record.studentId,
            teacherId: timetableEntry.teacherId._id,
            studentGroupId: timetableEntry.studentGroupId._id,
            date: today,
            status: record.status,
            markedBy: req.user._id,
            remarks: record.remarks,
            semester: timetableEntry.semester,
            academicYear: timetableEntry.academicYear
        }));

        const savedAttendance = await Attendance.insertMany(attendanceEntries);

        for (const record of attendanceRecords) {
            const student = await Student.findById(record.studentId);
            if (student) {
                const totalClasses = await Attendance.countDocuments({
                    studentId: record.studentId,
                    courseId: timetableEntry.courseId._id,
                    semester: timetableEntry.semester,
                    academicYear: timetableEntry.academicYear
                });

                const presentClasses = await Attendance.countDocuments({
                    studentId: record.studentId,
                    courseId: timetableEntry.courseId._id,
                    status: { $in: ['present', 'late'] },
                    semester: timetableEntry.semester,
                    academicYear: timetableEntry.academicYear
                });

                const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
                
                await Student.findByIdAndUpdate(record.studentId, {
                    attendancePercentage: Math.round(attendancePercentage * 100) / 100
                });
            }
        }

        res.status(201).json({
            message: "Attendance marked successfully",
            recordsMarked: savedAttendance.length
        });
    } catch (error) {
        console.error('Attendance marking error:', error);
        res.status(500).json({message: "Error marking attendance"});
    }
});

attendanceRouter.get("/", authenticateToken, async (req, res) => {
    try {
        const { studentId, courseId, dateFrom, dateTo, status, semester, academicYear } = req.query;
        const filter = {};

        if (studentId) filter.studentId = studentId;
        if (courseId) filter.courseId = courseId;
        if (status) filter.status = status;
        if (semester) filter.semester = parseInt(semester);
        if (academicYear) filter.academicYear = academicYear;

        if (dateFrom || dateTo) {
            filter.date = {};
            if (dateFrom) filter.date.$gte = new Date(dateFrom);
            if (dateTo) filter.date.$lte = new Date(dateTo);
        }

        if (req.user.role === 'student') {
            filter.studentId = req.user._id;
        } else if (req.user.role === 'faculty') {
            filter.teacherId = req.user._id;
        }

        const attendance = await Attendance.find(filter)
            .populate('studentId', 'name rollNo')
            .populate('courseId', 'name code')
            .populate('teacherId', 'name')
            .populate('studentGroupId', 'name')
            .sort({ date: -1, createdAt: -1 });

        res.json({ attendance });
    } catch (error) {
        res.status(500).json({message: "Error fetching attendance"});
    }
});

attendanceRouter.get("/summary", authenticateToken, async (req, res) => {
    try {
        const { studentId, courseId, semester, academicYear } = req.query;
        const filter = {};

        if (studentId) filter.studentId = studentId;
        if (courseId) filter.courseId = courseId;
        if (semester) filter.semester = parseInt(semester);
        if (academicYear) filter.academicYear = academicYear;

        if (req.user.role === 'student') {
            filter.studentId = req.user._id;
        } else if (req.user.role === 'faculty') {
            filter.teacherId = req.user._id;
        }

        const summary = await Attendance.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: {
                        studentId: '$studentId',
                        courseId: '$courseId'
                    },
                    totalClasses: { $sum: 1 },
                    presentClasses: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['present', 'late']] },
                                1,
                                0
                            ]
                        }
                    },
                    absentClasses: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', 'absent'] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $addFields: {
                    attendancePercentage: {
                        $multiply: [
                            { $divide: ['$presentClasses', '$totalClasses'] },
                            100
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.studentId',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: '_id.courseId',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            {
                $project: {
                    studentName: { $arrayElemAt: ['$student.name', 0] },
                    studentRollNo: { $arrayElemAt: ['$student.rollNo', 0] },
                    courseName: { $arrayElemAt: ['$course.name', 0] },
                    courseCode: { $arrayElemAt: ['$course.code', 0] },
                    totalClasses: 1,
                    presentClasses: 1,
                    absentClasses: 1,
                    attendancePercentage: { $round: ['$attendancePercentage', 2] }
                }
            }
        ]);

        res.json({ summary });
    } catch (error) {
        res.status(500).json({message: "Error fetching attendance summary"});
    }
});

attendanceRouter.get("/defaulters", authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    try {
        const { threshold = 75, semester, academicYear, department } = req.query;
        const filter = {};

        if (semester) filter.semester = parseInt(semester);
        if (academicYear) filter.academicYear = academicYear;

        const defaulters = await Attendance.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: {
                        studentId: '$studentId',
                        courseId: '$courseId'
                    },
                    totalClasses: { $sum: 1 },
                    presentClasses: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['present', 'late']] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $addFields: {
                    attendancePercentage: {
                        $multiply: [
                            { $divide: ['$presentClasses', '$totalClasses'] },
                            100
                        ]
                    }
                }
            },
            {
                $match: {
                    attendancePercentage: { $lt: parseFloat(threshold) }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.studentId',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: '_id.courseId',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            {
                $match: department ? {
                    'student.department': department
                } : {}
            },
            {
                $project: {
                    studentName: { $arrayElemAt: ['$student.name', 0] },
                    studentRollNo: { $arrayElemAt: ['$student.rollNo', 0] },
                    studentEmail: { $arrayElemAt: ['$student.email', 0] },
                    department: { $arrayElemAt: ['$student.department', 0] },
                    courseName: { $arrayElemAt: ['$course.name', 0] },
                    courseCode: { $arrayElemAt: ['$course.code', 0] },
                    totalClasses: 1,
                    presentClasses: 1,
                    attendancePercentage: { $round: ['$attendancePercentage', 2] }
                }
            },
            {
                $sort: { attendancePercentage: 1 }
            }
        ]);

        res.json({ 
            defaulters,
            threshold: parseFloat(threshold),
            count: defaulters.length
        });
    } catch (error) {
        res.status(500).json({message: "Error fetching defaulters"});
    }
});

attendanceRouter.put("/:id", authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
    try {
        const { status, remarks } = req.body;

        if (!['present', 'absent', 'late', 'excused'].includes(status)) {
            return res.status(400).json({message: "Invalid attendance status"});
        }

        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) {
            return res.status(404).json({message: "Attendance record not found"});
        }

        if (req.user.role === 'faculty' && attendance.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({message: "You can only update attendance for your own classes"});
        }

        const updatedAttendance = await Attendance.findByIdAndUpdate(
            req.params.id,
            { status, remarks },
            { new: true }
        ).populate('studentId courseId');

        const student = await Student.findById(attendance.studentId);
        if (student) {
            const totalClasses = await Attendance.countDocuments({
                studentId: attendance.studentId,
                courseId: attendance.courseId,
                semester: attendance.semester,
                academicYear: attendance.academicYear
            });

            const presentClasses = await Attendance.countDocuments({
                studentId: attendance.studentId,
                courseId: attendance.courseId,
                status: { $in: ['present', 'late'] },
                semester: attendance.semester,
                academicYear: attendance.academicYear
            });

            const attendancePercentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
            
            await Student.findByIdAndUpdate(attendance.studentId, {
                attendancePercentage: Math.round(attendancePercentage * 100) / 100
            });
        }

        res.json({
            message: "Attendance updated successfully",
            attendance: updatedAttendance
        });
    } catch (error) {
        res.status(500).json({message: "Error updating attendance"});
    }
});

attendanceRouter.delete("/:id", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const deletedAttendance = await Attendance.findByIdAndDelete(req.params.id);

        if (!deletedAttendance) {
            return res.status(404).json({message: "Attendance record not found"});
        }

        res.json({message: "Attendance record deleted successfully"});
    } catch (error) {
        res.status(500).json({message: "Error deleting attendance record"});
    }
});

module.exports = { attendanceRouter };