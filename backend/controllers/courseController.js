const {Router} = require('express');
const courseRouter = Router();
const {z} = require('zod');
const Course = require('../models/course');
const {userModel} = require('../models/user');
const {authenticateToken, authorizeRoles} = require('../middleware/auth');

courseRouter.post("/", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const courseSchema = z.object({
            name: z.string().min(2).max(100),
            code: z.string().min(2).max(20),
            credits: z.number().min(1).max(6),
            frequency: z.number().min(1).max(7),
            duration: z.number().min(30).max(180).default(60),
            department: z.string().min(2).max(50),
            semester: z.number().min(1).max(8),
            year: z.number().min(1).max(5),
            teacherId: z.string(),
            description: z.string().optional()
        });

        const parsedBody = courseSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedBody.error.errors
            });
        }

        const teacher = await userModel.findById(req.body.teacherId);
        if (!teacher || teacher.role !== 'faculty') {
            return res.status(400).json({message: "Invalid teacher ID"});
        }

        const existingCourse = await Course.findOne({code: req.body.code});
        if (existingCourse) {
            return res.status(400).json({message: "Course code already exists"});
        }

        const course = await Course.create(req.body);
        await course.populate('teacherId', 'name email employeeId');

        res.status(201).json({
            message: "Course created successfully",
            course
        });
    } catch (error) {
        console.error('Course creation error:', error);
        res.status(500).json({message: "Error creating course"});
    }
});

courseRouter.get("/", authenticateToken, async (req, res) => {
    try {
        const { department, semester, year, teacherId } = req.query;
        const filter = { isActive: true };

        if (department) filter.department = department;
        if (semester) filter.semester = parseInt(semester);
        if (year) filter.year = parseInt(year);
        if (teacherId) filter.teacherId = teacherId;

        const courses = await Course.find(filter)
            .populate('teacherId', 'name email employeeId')
            .populate('studentGroups', 'name department semester year')
            .sort({ department: 1, semester: 1, name: 1 });

        res.json({ courses });
    } catch (error) {
        res.status(500).json({message: "Error fetching courses"});
    }
});

courseRouter.get("/:id", authenticateToken, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('teacherId', 'name email employeeId department')
            .populate('studentGroups', 'name department semester year size')
            .populate('prerequisites', 'name code');

        if (!course) {
            return res.status(404).json({message: "Course not found"});
        }

        res.json({ course });
    } catch (error) {
        res.status(500).json({message: "Error fetching course"});
    }
});

courseRouter.put("/:id", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const allowedUpdates = ['name', 'credits', 'frequency', 'duration', 'description', 'teacherId'];
        const updates = {};

        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        if (updates.teacherId) {
            const teacher = await userModel.findById(updates.teacherId);
            if (!teacher || teacher.role !== 'faculty') {
                return res.status(400).json({message: "Invalid teacher ID"});
            }
        }

        const course = await Course.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        ).populate('teacherId', 'name email employeeId');

        if (!course) {
            return res.status(404).json({message: "Course not found"});
        }

        res.json({
            message: "Course updated successfully",
            course
        });
    } catch (error) {
        res.status(500).json({message: "Error updating course"});
    }
});

courseRouter.delete("/:id", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({message: "Course not found"});
        }

        res.json({message: "Course deactivated successfully"});
    } catch (error) {
        res.status(500).json({message: "Error deactivating course"});
    }
});

module.exports = { courseRouter };