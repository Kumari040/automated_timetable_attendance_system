const {Router} = require('express');
const studentGroupRouter = Router();
const {z} = require('zod');
const StudentGroup = require('../models/studentGroup');
const Student = require('../models/student');
const {userModel} = require('../models/user');
const {authenticateToken, authorizeRoles} = require('../middleware/auth');

studentGroupRouter.post("/", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const timeSlotSchema = z.object({
            start: z.string(),
            end: z.string()
        });
        const daySlotSchema = z.object({
            day: z.enum(['monday','tuesday','wednesday','thursday','friday','saturday']),
            slots: z.array(timeSlotSchema)
        });
        const studentGroupSchema = z.object({
            name: z.string().min(2).max(100),
            department: z.string().min(2).max(50),
            semester: z.number().min(1).max(8),
            year: z.number().min(1).max(5),
            section: z.string().min(1).max(10),
            maxSize: z.number().min(1).max(100).default(60),
            availability: z.array(daySlotSchema).optional(),
            blackoutPeriods: z.array(daySlotSchema).optional()
        });

        const parsedBody = studentGroupSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedBody.error.errors
            });
        }

        const existingGroup = await StudentGroup.findOne({
            name: req.body.name
        });

        if (existingGroup) {
            return res.status(400).json({message: "Student group with this name already exists"});
        }

        const studentGroup = await StudentGroup.create({
            ...req.body,
            size: 0
        });

        res.status(201).json({
            message: "Student group created successfully",
            studentGroup
        });
    } catch (error) {
        console.error('Student group creation error:', error);
        res.status(500).json({message: "Error creating student group"});
    }
});

studentGroupRouter.get("/", authenticateToken, async (req, res) => {
    try {
        const { department, semester, year, section } = req.query;
        const filter = { isActive: true };

        if (department) filter.department = department;
        if (semester) filter.semester = parseInt(semester);
        if (year) filter.year = parseInt(year);
        if (section) filter.section = section;

        const studentGroups = await StudentGroup.find(filter)
            .populate('students', 'name rollNo email')
            .populate('courses', 'name code')
            .populate('classRepresentative', 'name rollNo')
            .sort({ department: 1, year: 1, semester: 1, section: 1 });

        res.json({ studentGroups });
    } catch (error) {
        res.status(500).json({message: "Error fetching student groups"});
    }
});

studentGroupRouter.get("/:id", authenticateToken, async (req, res) => {
    try {
        const studentGroup = await StudentGroup.findById(req.params.id)
            .populate('students', 'name rollNo email phone')
            .populate('courses', 'name code credits')
            .populate('classRepresentative', 'name rollNo email');

        if (!studentGroup) {
            return res.status(404).json({message: "Student group not found"});
        }

        res.json({ studentGroup });
    } catch (error) {
        res.status(500).json({message: "Error fetching student group"});
    }
});

studentGroupRouter.post("/:id/students", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { studentIds } = req.body;

        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({message: "Student IDs array is required"});
        }

        const studentGroup = await StudentGroup.findById(req.params.id);
        if (!studentGroup) {
            return res.status(404).json({message: "Student group not found"});
        }

        const students = await userModel.find({
            _id: { $in: studentIds },
            role: 'student'
        });

        if (students.length !== studentIds.length) {
            return res.status(400).json({message: "Some student IDs are invalid"});
        }

        const currentSize = studentGroup.size;
        if (currentSize + studentIds.length > studentGroup.maxSize) {
            return res.status(400).json({
                message: `Adding these students would exceed maximum group size of ${studentGroup.maxSize}`
            });
        }

        const newStudentIds = studentIds.filter(id => !studentGroup.students.includes(id));
        
        await StudentGroup.findByIdAndUpdate(req.params.id, {
            $push: { students: { $each: newStudentIds } },
            $inc: { size: newStudentIds.length }
        });

        await userModel.updateMany(
            { _id: { $in: newStudentIds } },
            { studentGroupId: req.params.id }
        );

        res.json({
            message: `${newStudentIds.length} students added to the group successfully`
        });
    } catch (error) {
        res.status(500).json({message: "Error adding students to group"});
    }
});

studentGroupRouter.delete("/:id/students/:studentId", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const studentGroup = await StudentGroup.findById(req.params.id);
        if (!studentGroup) {
            return res.status(404).json({message: "Student group not found"});
        }

        const student = await userModel.findById(req.params.studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({message: "Student not found"});
        }

        await StudentGroup.findByIdAndUpdate(req.params.id, {
            $pull: { students: req.params.studentId },
            $inc: { size: -1 }
        });

        await userModel.findByIdAndUpdate(req.params.studentId, {
            $unset: { studentGroupId: 1 }
        });

        res.json({message: "Student removed from group successfully"});
    } catch (error) {
        res.status(500).json({message: "Error removing student from group"});
    }
});

studentGroupRouter.put("/:id", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const allowedUpdates = ['name', 'maxSize', 'classRepresentative', 'availability', 'blackoutPeriods'];
        const updates = {};

        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        if (updates.classRepresentative) {
            const cr = await userModel.findById(updates.classRepresentative);
            if (!cr || cr.role !== 'student') {
                return res.status(400).json({message: "Invalid class representative ID"});
            }
        }

        const studentGroup = await StudentGroup.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        ).populate('students courses classRepresentative');

        if (!studentGroup) {
            return res.status(404).json({message: "Student group not found"});
        }

        res.json({
            message: "Student group updated successfully",
            studentGroup
        });
    } catch (error) {
        res.status(500).json({message: "Error updating student group"});
    }
});

studentGroupRouter.delete("/:id", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const studentGroup = await StudentGroup.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!studentGroup) {
            return res.status(404).json({message: "Student group not found"});
        }

        await userModel.updateMany(
            { studentGroupId: req.params.id },
            { $unset: { studentGroupId: 1 } }
        );

        res.json({message: "Student group deactivated successfully"});
    } catch (error) {
        res.status(500).json({message: "Error deactivating student group"});
    }
});

module.exports = { studentGroupRouter };