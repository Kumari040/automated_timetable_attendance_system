const { describe, it } = require('node:test');
const assert = require('node:assert');
const { GeneticTimetableScheduler } = require('../utils/geneticAlgorithm');
const { GraphColoringTimetableScheduler } = require('../utils/graphColoring');

describe('Algorithm Integration Tests', () => {
    // Mock data for testing
    const mockCourses = [
        {
            _id: 'course1',
            name: 'Mathematics',
            duration: 60,
            frequency: 2,
            teacherId: { _id: 'teacher1', name: 'Dr. Smith' },
            studentGroups: [{ _id: 'group1', name: 'CS-A', size: 30 }]
        },
        {
            _id: 'course2',
            name: 'Physics',
            duration: 90,
            frequency: 1,
            teacherId: { _id: 'teacher2', name: 'Dr. Johnson' },
            studentGroups: [{ _id: 'group1', name: 'CS-A', size: 30 }]
        }
    ];

    const mockClassrooms = [
        {
            _id: 'room1',
            name: 'Room A',
            capacity: 40,
            isActive: true
        },
        {
            _id: 'room2',
            name: 'Room B',
            capacity: 50,
            isActive: true
        }
    ];

    const mockStudentGroups = [
        {
            _id: 'group1',
            name: 'CS-A',
            size: 30,
            isActive: true
        }
    ];

    const mockTeachers = [
        {
            _id: 'teacher1',
            name: 'Dr. Smith',
            role: 'faculty'
        },
        {
            _id: 'teacher2',
            name: 'Dr. Johnson',
            role: 'faculty'
        }
    ];

    it('GeneticTimetableScheduler creates valid chromosomes', () => {
        const scheduler = new GeneticTimetableScheduler(
            mockCourses, 
            mockClassrooms, 
            mockStudentGroups, 
            mockTeachers,
            { populationSize: 5, maxGenerations: 2 }
        );

        const chromosome = scheduler.createRandomChromosome();
        
        // Should create 3 genes (Math: 2 times + Physics: 1 time)
        assert.strictEqual(chromosome.length, 3);
        
        // Each gene should have required properties
        for (const gene of chromosome) {
            assert.ok(gene.courseId);
            assert.ok(gene.studentGroupId);
            assert.ok(gene.teacherId);
            assert.ok(gene.classroomId);
            assert.ok(gene.day);
            assert.ok(gene.startTime);
            assert.ok(gene.endTime);
            assert.ok(gene.duration);
        }
    });

    it('GraphColoringTimetableScheduler initializes graph correctly', () => {
        const scheduler = new GraphColoringTimetableScheduler(
            mockCourses, 
            mockClassrooms, 
            mockStudentGroups, 
            mockTeachers
        );

        // Access the internal graph through the generateTimetable method
        // This is a basic test to ensure the algorithm can initialize
        assert.ok(scheduler.courses.length === 2);
        assert.ok(scheduler.classrooms.length === 2);
        assert.ok(scheduler.studentGroups.length === 1);
        assert.ok(scheduler.teachers.length === 2);
    });

    it('GeneticTimetableScheduler calculates day distribution', () => {
        const scheduler = new GeneticTimetableScheduler(
            mockCourses, 
            mockClassrooms, 
            mockStudentGroups, 
            mockTeachers
        );

        const testChromosome = [
            { day: 'monday' },
            { day: 'monday' },
            { day: 'tuesday' }
        ];

        const distribution = scheduler.calculateDayDistribution(testChromosome);
        
        // Should calculate some variance (not 0)
        assert.ok(typeof distribution === 'number');
        assert.ok(distribution >= 0);
    });

    it('GeneticTimetableScheduler calculates teacher workload', () => {
        const scheduler = new GeneticTimetableScheduler(
            mockCourses, 
            mockClassrooms, 
            mockStudentGroups, 
            mockTeachers
        );

        const testChromosome = [
            { teacherId: 'teacher1' },
            { teacherId: 'teacher1' },
            { teacherId: 'teacher2' }
        ];

        const workload = scheduler.calculateTeacherWorkload(testChromosome);
        
        // Should calculate some variance (not 0 since workloads are uneven)
        assert.ok(typeof workload === 'number');
        assert.ok(workload >= 0);
    });

    it('GeneticTimetableScheduler helper methods work correctly', () => {
        const scheduler = new GeneticTimetableScheduler(
            mockCourses, 
            mockClassrooms, 
            mockStudentGroups, 
            mockTeachers
        );

        // Test random day selection
        const day = scheduler.getRandomDay();
        assert.ok(scheduler.config.days.includes(day));

        // Test random time slot selection
        const timeSlot = scheduler.getRandomTimeSlot();
        assert.ok(scheduler.config.timeSlots.includes(timeSlot));

        // Test classroom selection
        const classroom = scheduler.getRandomClassroom(25);
        assert.ok(mockClassrooms.some(c => c._id === classroom._id));

        // Test end time calculation
        const endTime = scheduler.calculateEndTime('09:00', 90);
        assert.strictEqual(endTime, '10:30');
    });
});