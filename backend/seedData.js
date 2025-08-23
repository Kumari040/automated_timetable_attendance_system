const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const {userModel} = require('./models/user');
const Course = require('./models/course');
const Classroom = require('./models/classroom');
const StudentGroup = require('./models/studentGroup');
const Timetable = require('./models/timetable');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.mongo_url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected for seeding");
    } catch (error) {
        console.error("MongoDB connection failed", error);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        console.log("Clearing existing data...");
        await Promise.all([
            userModel.deleteMany({}),
            Course.deleteMany({}),
            Classroom.deleteMany({}),
            StudentGroup.deleteMany({}),
            Timetable.deleteMany({})
        ]);

        console.log("Creating admin user...");
        const adminPasswordHash = await bcrypt.hash('admin123', 12);
        const admin = await userModel.create({
            name: 'System Administrator',
            email: 'admin@college.edu',
            passwordHash: adminPasswordHash,
            role: 'admin',
            department: 'Administration',
            employeeId: 'ADM001'
        });

        console.log("Creating faculty users...");
        const facultyData = [
            {
                name: 'Dr. John Smith',
                email: 'john.smith@college.edu',
                role: 'faculty',
                department: 'Computer Science',
                employeeId: 'FAC001',
                phone: '+1234567890'
            },
            {
                name: 'Dr. Sarah Johnson',
                email: 'sarah.johnson@college.edu',
                role: 'faculty',
                department: 'Computer Science',
                employeeId: 'FAC002',
                phone: '+1234567891'
            },
            {
                name: 'Prof. Michael Brown',
                email: 'michael.brown@college.edu',
                role: 'faculty',
                department: 'Electronics',
                employeeId: 'FAC003',
                phone: '+1234567892'
            },
            {
                name: 'Dr. Emily Davis',
                email: 'emily.davis@college.edu',
                role: 'faculty',
                department: 'Mathematics',
                employeeId: 'FAC004',
                phone: '+1234567893'
            }
        ];

        const faculty = [];
        for (const fac of facultyData) {
            const passwordHash = await bcrypt.hash('faculty123', 12);
            const facultyMember = await userModel.create({
                ...fac,
                passwordHash
            });
            faculty.push(facultyMember);
        }

        console.log("Creating student groups...");
        const studentGroups = await StudentGroup.create([
            {
                name: 'CS-2024-A',
                department: 'Computer Science',
                semester: 5,
                year: 3,
                section: 'A',
                maxSize: 60,
                size: 0
            },
            {
                name: 'CS-2024-B',
                department: 'Computer Science',
                semester: 5,
                year: 3,
                section: 'B',
                maxSize: 60,
                size: 0
            },
            {
                name: 'ECE-2024-A',
                department: 'Electronics',
                semester: 3,
                year: 2,
                section: 'A',
                maxSize: 50,
                size: 0
            }
        ]);

        console.log("Creating student users...");
        const studentsData = [
            {
                name: 'Alice Cooper',
                email: 'alice.cooper@student.college.edu',
                role: 'student',
                department: 'Computer Science',
                rollNo: 'CS2024001',
                studentGroupId: studentGroups[0]._id,
                phone: '+1234567894'
            },
            {
                name: 'Bob Wilson',
                email: 'bob.wilson@student.college.edu',
                role: 'student',
                department: 'Computer Science',
                rollNo: 'CS2024002',
                studentGroupId: studentGroups[0]._id,
                phone: '+1234567895'
            },
            {
                name: 'Charlie Brown',
                email: 'charlie.brown@student.college.edu',
                role: 'student',
                department: 'Computer Science',
                rollNo: 'CS2024003',
                studentGroupId: studentGroups[1]._id,
                phone: '+1234567896'
            },
            {
                name: 'Diana Prince',
                email: 'diana.prince@student.college.edu',
                role: 'student',
                department: 'Electronics',
                rollNo: 'ECE2024001',
                studentGroupId: studentGroups[2]._id,
                phone: '+1234567897'
            }
        ];

        const students = [];
        for (const stud of studentsData) {
            const passwordHash = await bcrypt.hash('student123', 12);
            const student = await userModel.create({
                ...stud,
                passwordHash
            });
            students.push(student);
        }

        await StudentGroup.findByIdAndUpdate(studentGroups[0]._id, {
            $push: { students: [students[0]._id, students[1]._id] },
            size: 2
        });

        await StudentGroup.findByIdAndUpdate(studentGroups[1]._id, {
            $push: { students: [students[2]._id] },
            size: 1
        });

        await StudentGroup.findByIdAndUpdate(studentGroups[2]._id, {
            $push: { students: [students[3]._id] },
            size: 1
        });

        console.log("Creating classrooms...");
        const classrooms = await Classroom.create([
            {
                name: 'CS-Lab-1',
                roomNumber: '201',
                building: 'Computer Science Block',
                floor: 2,
                capacity: 60,
                type: 'lab',
                facilities: ['Computers', 'Projector', 'AC']
            },
            {
                name: 'Lecture-Hall-A',
                roomNumber: '101',
                building: 'Main Block',
                floor: 1,
                capacity: 100,
                type: 'lecture',
                facilities: ['Projector', 'AC', 'Microphone']
            },
            {
                name: 'ECE-Lab-1',
                roomNumber: '301',
                building: 'Electronics Block',
                floor: 3,
                capacity: 50,
                type: 'lab',
                facilities: ['Equipment', 'Projector']
            }
        ]);

        console.log("Creating courses...");
        const courses = await Course.create([
            {
                name: 'Data Structures and Algorithms',
                code: 'CS301',
                credits: 4,
                frequency: 3,
                duration: 60,
                department: 'Computer Science',
                semester: 5,
                year: 3,
                teacherId: faculty[0]._id,
                studentGroups: [studentGroups[0]._id, studentGroups[1]._id],
                description: 'Study of fundamental data structures and algorithms'
            },
            {
                name: 'Database Management Systems',
                code: 'CS302',
                credits: 3,
                frequency: 2,
                duration: 60,
                department: 'Computer Science',
                semester: 5,
                year: 3,
                teacherId: faculty[1]._id,
                studentGroups: [studentGroups[0]._id],
                description: 'Introduction to database concepts and SQL'
            },
            {
                name: 'Digital Electronics',
                code: 'ECE201',
                credits: 4,
                frequency: 3,
                duration: 90,
                department: 'Electronics',
                semester: 3,
                year: 2,
                teacherId: faculty[2]._id,
                studentGroups: [studentGroups[2]._id],
                description: 'Study of digital circuits and logic design'
            },
            {
                name: 'Engineering Mathematics III',
                code: 'MATH301',
                credits: 3,
                frequency: 2,
                duration: 60,
                department: 'Mathematics',
                semester: 5,
                year: 3,
                teacherId: faculty[3]._id,
                studentGroups: [studentGroups[0]._id, studentGroups[1]._id],
                description: 'Advanced mathematical concepts for engineering'
            }
        ]);

        console.log("Creating sample timetable entries...");
        await Timetable.create([
            {
                courseId: courses[0]._id,
                studentGroupId: studentGroups[0]._id,
                classroomId: classrooms[1]._id,
                teacherId: faculty[0]._id,
                day: 'monday',
                startTime: '09:00',
                endTime: '10:00',
                duration: 60,
                weekNumber: 1,
                semester: 5,
                academicYear: '2024-25'
            },
            {
                courseId: courses[1]._id,
                studentGroupId: studentGroups[0]._id,
                classroomId: classrooms[0]._id,
                teacherId: faculty[1]._id,
                day: 'tuesday',
                startTime: '10:00',
                endTime: '11:00',
                duration: 60,
                weekNumber: 1,
                semester: 5,
                academicYear: '2024-25'
            },
            {
                courseId: courses[2]._id,
                studentGroupId: studentGroups[2]._id,
                classroomId: classrooms[2]._id,
                teacherId: faculty[2]._id,
                day: 'wednesday',
                startTime: '11:00',
                endTime: '12:30',
                duration: 90,
                weekNumber: 1,
                semester: 3,
                academicYear: '2024-25'
            }
        ]);

        console.log("✅ Database seeded successfully!");
        console.log("\nLogin Credentials:");
        console.log("Admin: admin@college.edu / admin123");
        console.log("Faculty: john.smith@college.edu / faculty123");
        console.log("Student: alice.cooper@student.college.edu / student123");
        
    } catch (error) {
        console.error("Seeding error:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
    }
};

const runSeeder = async () => {
    await connectDB();
    await seedData();
};

if (require.main === module) {
    runSeeder();
}

module.exports = { seedData };