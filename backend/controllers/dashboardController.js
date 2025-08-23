const {Router} = require('express');
const dashboardRouter = Router();
const Course = require('../models/course');
const {studentModel} = require('../models/student');
const {timetableModel} = require('../models/timetable');
const {attendanceModel} = require('../models/attendance');
const {classroomModel} = require('../models/classroom');
const {userModel} = require('../models/user');
const {authenticateToken, authorizeRoles} = require('../middleware/auth');

dashboardRouter.get("/admin", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

        const [
            totalStudents,
            totalFaculty,
            totalCourses,
            totalClassrooms,
            todayClasses,
            weekAttendance,
            lowAttendanceStudents,
            recentRegistrations
        ] = await Promise.all([
            userModel.countDocuments({ role: 'student', isActive: true }),
            userModel.countDocuments({ role: 'faculty', isActive: true }),
            Course.countDocuments({ isActive: true }),
            classroomModel.countDocuments({ isActive: true }),
            timetableModel.countDocuments({
                day: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()],
                status: 'scheduled'
            }),
            attendanceModel.aggregate([
                {
                    $match: {
                        date: { $gte: startOfWeek, $lte: endOfWeek }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            studentModel.find({ attendancePercentage: { $lt: 75 } })
                .sort({ attendancePercentage: 1 })
                .limit(10)
                .select('name rollNo attendancePercentage department'),
            userModel.find({ isActive: true })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name email role department createdAt')
        ]);

        const attendanceStats = weekAttendance.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const departments = await userModel.aggregate([
            { $match: { role: 'student', isActive: true } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            summary: {
                totalStudents,
                totalFaculty,
                totalCourses,
                totalClassrooms,
                todayClasses
            },
            attendanceStats: {
                present: attendanceStats.present || 0,
                absent: attendanceStats.absent || 0,
                late: attendanceStats.late || 0,
                excused: attendanceStats.excused || 0
            },
            lowAttendanceStudents,
            recentRegistrations,
            departmentDistribution: departments
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({message: "Error fetching admin dashboard data"});
    }
});

dashboardRouter.get("/faculty", authenticateToken, authorizeRoles('faculty'), async (req, res) => {
    try {
        const today = new Date();
        const todayDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];

        const [
            myCourses,
            todayClasses,
            recentAttendance,
            myStudents
        ] = await Promise.all([
            Course.find({ teacherId: req.user._id, isActive: true })
                .populate('studentGroups', 'name size'),
            timetableModel.find({
                teacherId: req.user._id,
                day: todayDay,
                status: 'scheduled'
            })
                .populate('courseId', 'name code')
                .populate('classroomId', 'name roomNumber')
                .populate('studentGroupId', 'name')
                .sort({ startTime: 1 }),
            attendanceModel.find({
                teacherId: req.user._id,
                date: {
                    $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
                    $lte: today
                }
            })
                .populate('studentId', 'name rollNo')
                .populate('courseId', 'name code')
                .sort({ date: -1 })
                .limit(20),
            attendanceModel.aggregate([
                { $match: { teacherId: req.user._id } },
                {
                    $group: {
                        _id: '$studentId',
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
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                {
                    $project: {
                        studentName: { $arrayElemAt: ['$student.name', 0] },
                        studentRollNo: { $arrayElemAt: ['$student.rollNo', 0] },
                        attendancePercentage: { $round: ['$attendancePercentage', 2] }
                    }
                },
                { $sort: { attendancePercentage: 1 } },
                { $limit: 10 }
            ])
        ]);

        res.json({
            myCourses,
            todayClasses,
            recentAttendance,
            lowAttendanceStudents: myStudents
        });
    } catch (error) {
        console.error('Faculty dashboard error:', error);
        res.status(500).json({message: "Error fetching faculty dashboard data"});
    }
});

dashboardRouter.get("/student", authenticateToken, authorizeRoles('student'), async (req, res) => {
    try {
        const today = new Date();
        const todayDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];

        // Find student group that contains this user
        const studentGroup = await require('../models/studentGroup').studentGroupModel
            .findOne({ 
                students: req.user._id
            });
        
        if (!studentGroup) {
            // Return empty dashboard data if student not assigned to group yet
            return res.json({
                todayClasses: [],
                recentAttendance: [],
                upcomingClasses: [],
                attendanceSummary: []
            });
        }

        const studentGroupId = studentGroup._id;

        const [
            todayClasses,
            myAttendance,
            upcomingClasses,
            attendanceSummary
        ] = await Promise.all([
            timetableModel.find({
                studentGroupId: studentGroupId,
                day: todayDay,
                status: 'scheduled'
            })
                .populate('courseId', 'name code')
                .populate('classroomId', 'name roomNumber building')
                .populate('teacherId', 'name')
                .sort({ startTime: 1 }),
            attendanceModel.find({
                studentId: req.user._id,
                date: {
                    $gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
                    $lte: today
                }
            })
                .populate('courseId', 'name code')
                .sort({ date: -1 })
                .limit(10),
            timetableModel.find({
                studentGroupId: studentGroupId,
                status: 'scheduled'
            })
                .populate('courseId', 'name code')
                .populate('classroomId', 'name roomNumber')
                .populate('teacherId', 'name')
                .sort({ day: 1, startTime: 1 })
                .limit(5),
            attendanceModel.aggregate([
                { $match: { studentId: req.user._id } },
                {
                    $group: {
                        _id: '$courseId',
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
                    $lookup: {
                        from: 'courses',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'course'
                    }
                },
                {
                    $project: {
                        courseName: { $arrayElemAt: ['$course.name', 0] },
                        courseCode: { $arrayElemAt: ['$course.code', 0] },
                        totalClasses: 1,
                        presentClasses: 1,
                        attendancePercentage: { $round: ['$attendancePercentage', 2] }
                    }
                }
            ])
        ]);

        res.json({
            todayClasses,
            recentAttendance: myAttendance,
            upcomingClasses,
            attendanceSummary
        });
    } catch (error) {
        console.error('Student dashboard error:', error);
        res.status(500).json({message: "Error fetching student dashboard data"});
    }
});

dashboardRouter.get("/analytics", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { startDate, endDate, department } = req.query;
        const filter = {};

        if (startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const attendanceTrends = await attendanceModel.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    statuses: {
                        $push: {
                            status: '$_id.status',
                            count: '$count'
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const departmentWiseAttendance = await attendanceModel.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'users',
                    localField: 'studentId',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $group: {
                    _id: {
                        department: { $arrayElemAt: ['$student.department', 0] },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.department',
                    statuses: {
                        $push: {
                            status: '$_id.status',
                            count: '$count'
                        }
                    },
                    total: { $sum: '$count' }
                }
            }
        ]);

        res.json({
            attendanceTrends,
            departmentWiseAttendance
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({message: "Error fetching analytics data"});
    }
});

module.exports = { dashboardRouter };