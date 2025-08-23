class TimetableGraph {
    constructor(courses, classrooms, studentGroups, teachers) {
        this.courses = courses;
        this.classrooms = classrooms;
        this.studentGroups = studentGroups;
        this.teachers = teachers;
        this.nodes = [];
        this.edges = [];
        this.colors = []; // Time slots
        this.initializeGraph();
    }

    // Initialize graph nodes (each course-group combination)
    initializeGraph() {
        this.nodes = [];
        let nodeId = 0;
        
        for (const course of this.courses) {
            for (const studentGroup of course.studentGroups) {
                // Create multiple nodes for courses with frequency > 1
                for (let freq = 0; freq < (course.frequency || 1); freq++) {
                    this.nodes.push({
                        id: nodeId++,
                        courseId: course._id,
                        studentGroupId: studentGroup._id,
                        teacherId: course.teacherId._id,
                        duration: course.duration || 60,
                        requiredCapacity: studentGroup.size,
                        courseName: course.name,
                        groupName: studentGroup.name,
                        teacherName: course.teacherId.name,
                        frequency: freq
                    });
                }
            }
        }

        this.buildConflictGraph();
    }

    // Build edges representing conflicts between nodes
    buildConflictGraph() {
        this.edges = [];
        
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                if (this.hasConflict(this.nodes[i], this.nodes[j])) {
                    this.edges.push({ from: i, to: j });
                }
            }
        }
    }

    // Check if two nodes have scheduling conflicts
    hasConflict(node1, node2) {
        // Same teacher conflict
        if (node1.teacherId.toString() === node2.teacherId.toString()) {
            return true;
        }
        
        // Same student group conflict
        if (node1.studentGroupId.toString() === node2.studentGroupId.toString()) {
            return true;
        }

        // Same course conflict (different frequency instances can't be at same time)
        if (node1.courseId.toString() === node2.courseId.toString()) {
            return true;
        }

        return false;
    }

    // Welsh-Powell graph coloring algorithm
    welshPowellColoring(availableTimeSlots) {
        console.log('Starting Welsh-Powell graph coloring algorithm...');
        
        // Sort nodes by degree (number of conflicts) in descending order
        const nodesByDegree = this.nodes.map((node, index) => ({
            ...node,
            index,
            degree: this.getNodeDegree(index)
        })).sort((a, b) => b.degree - a.degree);

        const coloring = new Array(this.nodes.length).fill(-1);
        const timeSlotAssignments = {};

        // Create time slot options (colors)
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const colors = [];
        let colorId = 0;

        for (const day of days) {
            for (const timeSlot of availableTimeSlots) {
                colors.push({
                    id: colorId++,
                    day,
                    startTime: timeSlot,
                    endTime: this.calculateEndTime(timeSlot, 60) // Default 60 min duration
                });
            }
        }

        // Color each node
        for (const node of nodesByDegree) {
            const availableColors = this.getAvailableColors(node.index, coloring, colors);
            
            if (availableColors.length > 0) {
                // Choose the first available color (greedy approach)
                const selectedColor = availableColors[0];
                coloring[node.index] = selectedColor.id;
                
                timeSlotAssignments[node.index] = {
                    nodeId: node.id,
                    courseId: node.courseId,
                    studentGroupId: node.studentGroupId,
                    teacherId: node.teacherId,
                    day: selectedColor.day,
                    startTime: selectedColor.startTime,
                    endTime: this.calculateEndTime(selectedColor.startTime, node.duration),
                    duration: node.duration,
                    classroomId: null, // To be assigned later
                    color: selectedColor.id
                };
            } else {
                console.warn(`Could not assign time slot to node ${node.id} (${node.courseName} - ${node.groupName})`);
            }
        }

        return this.assignClassrooms(timeSlotAssignments);
    }

    // DSATUR (Degree of Saturation) graph coloring algorithm
    dsaturColoring(availableTimeSlots) {
        console.log('Starting DSATUR graph coloring algorithm...');
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const colors = [];
        let colorId = 0;

        for (const day of days) {
            for (const timeSlot of availableTimeSlots) {
                colors.push({
                    id: colorId++,
                    day,
                    startTime: timeSlot,
                    endTime: this.calculateEndTime(timeSlot, 60)
                });
            }
        }

        const coloring = new Array(this.nodes.length).fill(-1);
        const saturation = new Array(this.nodes.length).fill(0);
        const timeSlotAssignments = {};
        const colored = new Set();

        // Start with the node having maximum degree
        let currentNode = this.getMaxDegreeNode();
        
        while (colored.size < this.nodes.length) {
            if (currentNode !== -1) {
                const availableColors = this.getAvailableColors(currentNode, coloring, colors);
                
                if (availableColors.length > 0) {
                    const selectedColor = availableColors[0];
                    coloring[currentNode] = selectedColor.id;
                    colored.add(currentNode);
                    
                    const node = this.nodes[currentNode];
                    timeSlotAssignments[currentNode] = {
                        nodeId: node.id,
                        courseId: node.courseId,
                        studentGroupId: node.studentGroupId,
                        teacherId: node.teacherId,
                        day: selectedColor.day,
                        startTime: selectedColor.startTime,
                        endTime: this.calculateEndTime(selectedColor.startTime, node.duration),
                        duration: node.duration,
                        classroomId: null,
                        color: selectedColor.id
                    };

                    // Update saturation of neighboring nodes
                    this.updateSaturation(currentNode, coloring, saturation);
                }
            }

            // Find next node with highest saturation (break ties with degree)
            currentNode = this.getMaxSaturationNode(colored, saturation);
        }

        return this.assignClassrooms(timeSlotAssignments);
    }

    // Get available colors (time slots) for a node
    getAvailableColors(nodeIndex, coloring, colors) {
        const usedColors = new Set();
        const node = this.nodes[nodeIndex];

        // Check colors used by conflicting nodes
        for (const edge of this.edges) {
            let conflictingNodeIndex = -1;
            if (edge.from === nodeIndex && coloring[edge.to] !== -1) {
                conflictingNodeIndex = edge.to;
            } else if (edge.to === nodeIndex && coloring[edge.from] !== -1) {
                conflictingNodeIndex = edge.from;
            }

            if (conflictingNodeIndex !== -1) {
                usedColors.add(coloring[conflictingNodeIndex]);
            }
        }

        // Filter available colors based on constraints
        return colors.filter(color => {
            if (usedColors.has(color.id)) return false;
            
            // Check if classroom availability aligns with this time slot
            const suitableClassrooms = this.classrooms.filter(classroom => 
                classroom.capacity >= node.requiredCapacity &&
                this.isClassroomAvailable(classroom, color.day, color.startTime, color.endTime)
            );

            return suitableClassrooms.length > 0;
        });
    }

    // Assign classrooms to scheduled time slots
    assignClassrooms(timeSlotAssignments) {
        const classroomUsage = {}; // Track classroom usage per day/time
        const schedule = [];

        for (const [nodeIndex, assignment] of Object.entries(timeSlotAssignments)) {
            const node = this.nodes[nodeIndex];
            const suitableClassrooms = this.classrooms.filter(classroom => 
                classroom.capacity >= node.requiredCapacity &&
                this.isClassroomAvailable(classroom, assignment.day, assignment.startTime, assignment.endTime)
            );

            // Find the best available classroom
            let selectedClassroom = null;
            for (const classroom of suitableClassrooms) {
                const usageKey = `${classroom._id}_${assignment.day}_${assignment.startTime}`;
                if (!classroomUsage[usageKey]) {
                    selectedClassroom = classroom;
                    classroomUsage[usageKey] = true;
                    break;
                }
            }

            if (selectedClassroom) {
                assignment.classroomId = selectedClassroom._id;
                assignment.classroomName = selectedClassroom.name;
                schedule.push(assignment);
            } else {
                console.warn(`No available classroom for ${node.courseName} - ${node.groupName} on ${assignment.day} at ${assignment.startTime}`);
            }
        }

        return {
            schedule,
            totalSlots: schedule.length,
            unscheduled: this.nodes.length - schedule.length,
            metadata: {
                algorithm: 'graph_coloring',
                totalNodes: this.nodes.length,
                totalEdges: this.edges.length,
                colorsUsed: new Set(schedule.map(s => s.color)).size
            }
        };
    }

    // Check if classroom is available at given time
    isClassroomAvailable(classroom, day, startTime, endTime) {
        // Check blackout periods
        if (classroom.blackoutPeriods) {
            const blackout = classroom.blackoutPeriods.find(b => b.day === day);
            if (blackout) {
                for (const slot of blackout.slots) {
                    if (this.isTimeOverlap(startTime, endTime, slot.start, slot.end)) {
                        return false;
                    }
                }
            }
        }

        // Check availability periods
        if (classroom.availability && classroom.availability.length > 0) {
            const availability = classroom.availability.find(a => a.day === day);
            if (!availability) return false;
            
            const isWithinAvailability = availability.slots.some(slot => 
                startTime >= slot.start && endTime <= slot.end
            );
            if (!isWithinAvailability) return false;
        }

        return true;
    }

    // Helper methods
    getNodeDegree(nodeIndex) {
        return this.edges.filter(edge => 
            edge.from === nodeIndex || edge.to === nodeIndex
        ).length;
    }

    getMaxDegreeNode() {
        let maxDegree = -1;
        let maxNode = -1;
        
        for (let i = 0; i < this.nodes.length; i++) {
            const degree = this.getNodeDegree(i);
            if (degree > maxDegree) {
                maxDegree = degree;
                maxNode = i;
            }
        }
        
        return maxNode;
    }

    updateSaturation(coloredNode, coloring, saturation) {
        for (const edge of this.edges) {
            let neighborIndex = -1;
            if (edge.from === coloredNode) {
                neighborIndex = edge.to;
            } else if (edge.to === coloredNode) {
                neighborIndex = edge.from;
            }

            if (neighborIndex !== -1 && coloring[neighborIndex] === -1) {
                // Count unique colors in the neighborhood
                const neighborColors = new Set();
                for (const neighborEdge of this.edges) {
                    let adjNode = -1;
                    if (neighborEdge.from === neighborIndex && coloring[neighborEdge.to] !== -1) {
                        adjNode = neighborEdge.to;
                    } else if (neighborEdge.to === neighborIndex && coloring[neighborEdge.from] !== -1) {
                        adjNode = neighborEdge.from;
                    }
                    
                    if (adjNode !== -1) {
                        neighborColors.add(coloring[adjNode]);
                    }
                }
                saturation[neighborIndex] = neighborColors.size;
            }
        }
    }

    getMaxSaturationNode(colored, saturation) {
        let maxSaturation = -1;
        let maxDegree = -1;
        let selectedNode = -1;

        for (let i = 0; i < this.nodes.length; i++) {
            if (!colored.has(i)) {
                const sat = saturation[i];
                const deg = this.getNodeDegree(i);
                
                if (sat > maxSaturation || (sat === maxSaturation && deg > maxDegree)) {
                    maxSaturation = sat;
                    maxDegree = deg;
                    selectedNode = i;
                }
            }
        }

        return selectedNode;
    }

    isTimeOverlap(start1, end1, start2, end2) {
        const s1 = new Date(`1970-01-01T${start1}:00`);
        const e1 = new Date(`1970-01-01T${end1}:00`);
        const s2 = new Date(`1970-01-01T${start2}:00`);
        const e2 = new Date(`1970-01-01T${end2}:00`);
        
        return (s1 < e2 && s2 < e1);
    }

    calculateEndTime(startTime, duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endHour = hours + Math.floor(duration / 60);
        const endMinute = minutes + (duration % 60);
        return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    }
}

class GraphColoringTimetableScheduler {
    constructor(courses, classrooms, studentGroups, teachers, config = {}) {
        this.courses = courses;
        this.classrooms = classrooms;
        this.studentGroups = studentGroups;
        this.teachers = teachers;
        this.config = {
            algorithm: config.algorithm || 'dsatur', // 'welsh-powell' or 'dsatur'
            timeSlots: config.timeSlots || ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
        };
    }

    async generateTimetable() {
        console.log(`Starting graph coloring timetable generation using ${this.config.algorithm.toUpperCase()} algorithm...`);
        
        const graph = new TimetableGraph(this.courses, this.classrooms, this.studentGroups, this.teachers);
        
        let result;
        if (this.config.algorithm === 'welsh-powell') {
            result = graph.welshPowellColoring(this.config.timeSlots);
        } else {
            result = graph.dsaturColoring(this.config.timeSlots);
        }

        console.log('Graph coloring timetable generation completed!');
        console.log(`Total scheduled: ${result.totalSlots}`);
        console.log(`Unscheduled: ${result.unscheduled}`);
        console.log(`Colors used: ${result.metadata.colorsUsed}`);

        return result;
    }
}

module.exports = { GraphColoringTimetableScheduler, TimetableGraph };