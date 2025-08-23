const {Router} = require('express');
const classroomRouter = Router();
const {z} = require('zod');
const Classroom = require('../models/classroom');
const {authenticateToken, authorizeRoles} = require('../middleware/auth');

classroomRouter.post("/", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const timeSlotSchema = z.object({
            start: z.string(),
            end: z.string()
        });
        const daySlotSchema = z.object({
            day: z.enum(['monday','tuesday','wednesday','thursday','friday','saturday']),
            slots: z.array(timeSlotSchema)
        });
        const classroomSchema = z.object({
            name: z.string().min(2).max(50),
            roomNumber: z.string().min(1).max(20),
            building: z.string().min(1).max(50),
            floor: z.number().min(0).max(20),
            capacity: z.number().min(1).max(500),
            type: z.enum(['lecture', 'lab', 'seminar', 'auditorium']).default('lecture'),
            facilities: z.array(z.string()).optional(),
            department: z.string().optional(),
            availability: z.array(daySlotSchema).optional(),
            blackoutPeriods: z.array(daySlotSchema).optional()
        });

        const parsedBody = classroomSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsedBody.error.errors
            });
        }

        const existingClassroom = await Classroom.findOne({
            $or: [
                { name: req.body.name },
                { roomNumber: req.body.roomNumber, building: req.body.building }
            ]
        });

        if (existingClassroom) {
            return res.status(400).json({message: "Classroom with this name or room number already exists"});
        }

        const classroom = await Classroom.create(req.body);

        res.status(201).json({
            message: "Classroom created successfully",
            classroom
        });
    } catch (error) {
        console.error('Classroom creation error:', error);
        res.status(500).json({message: "Error creating classroom"});
    }
});

classroomRouter.get("/", authenticateToken, async (req, res) => {
    try {
        const { building, floor, type, department, capacity } = req.query;
        const filter = { isActive: true };

        if (building) filter.building = building;
        if (floor) filter.floor = parseInt(floor);
        if (type) filter.type = type;
        if (department) filter.department = department;
        if (capacity) filter.capacity = { $gte: parseInt(capacity) };

        const classrooms = await Classroom.find(filter)
            .sort({ building: 1, floor: 1, roomNumber: 1 });

        res.json({ classrooms });
    } catch (error) {
        res.status(500).json({message: "Error fetching classrooms"});
    }
});

classroomRouter.get("/:id", authenticateToken, async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);

        if (!classroom) {
            return res.status(404).json({message: "Classroom not found"});
        }

        res.json({ classroom });
    } catch (error) {
        res.status(500).json({message: "Error fetching classroom"});
    }
});

classroomRouter.put("/:id", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const allowedUpdates = ['name', 'capacity', 'facilities', 'isAvailable', 'department', 'availability', 'blackoutPeriods'];
        const updates = {};

        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        const classroom = await Classroom.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        );

        if (!classroom) {
            return res.status(404).json({message: "Classroom not found"});
        }

        res.json({
            message: "Classroom updated successfully",
            classroom
        });
    } catch (error) {
        res.status(500).json({message: "Error updating classroom"});
    }
});

classroomRouter.delete("/:id", authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const classroom = await Classroom.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!classroom) {
            return res.status(404).json({message: "Classroom not found"});
        }

        res.json({message: "Classroom deactivated successfully"});
    } catch (error) {
        res.status(500).json({message: "Error deactivating classroom"});
    }
});

module.exports = { classroomRouter };