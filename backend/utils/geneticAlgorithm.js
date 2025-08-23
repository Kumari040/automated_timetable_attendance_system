const { checkConflicts } = require('../controllers/timetableController');

class GeneticTimetableScheduler {
    constructor(courses, classrooms, studentGroups, teachers, config = {}) {
        this.courses = courses;
        this.classrooms = classrooms;
        this.studentGroups = studentGroups;
        this.teachers = teachers;
        this.config = {
            populationSize: config.populationSize || 50,
            maxGenerations: config.maxGenerations || 100,
            mutationRate: config.mutationRate || 0.1,
            crossoverRate: config.crossoverRate || 0.8,
            elitismRate: config.elitismRate || 0.2,
            timeSlots: config.timeSlots || ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
            days: config.days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        };
    }

    // Create a random chromosome (complete timetable solution)
    createRandomChromosome() {
        const chromosome = [];
        
        for (const course of this.courses) {
            for (const studentGroup of course.studentGroups) {
                // Schedule each course for its required frequency
                for (let freq = 0; freq < (course.frequency || 1); freq++) {
                    const gene = {
                        courseId: course._id,
                        studentGroupId: studentGroup._id,
                        teacherId: course.teacherId._id,
                        classroomId: this.getRandomClassroom(studentGroup.size)._id,
                        day: this.getRandomDay(),
                        startTime: this.getRandomTimeSlot(),
                        duration: course.duration || 60
                    };
                    
                    gene.endTime = this.calculateEndTime(gene.startTime, gene.duration);
                    chromosome.push(gene);
                }
            }
        }
        
        return chromosome;
    }

    // Calculate fitness score for a chromosome (lower is better)
    async calculateFitness(chromosome) {
        let conflicts = 0;
        let hardConstraintViolations = 0;
        let softConstraintViolations = 0;

        // Check each gene for conflicts
        for (let i = 0; i < chromosome.length; i++) {
            const gene = chromosome[i];
            
            // Get entities for availability checking
            const teacher = this.teachers.find(t => t._id.toString() === gene.teacherId.toString());
            const classroom = this.classrooms.find(c => c._id.toString() === gene.classroomId.toString());
            const studentGroup = this.studentGroups.find(sg => sg._id.toString() === gene.studentGroupId.toString());
            
            const conflictList = await checkConflicts(
                gene.courseId,
                gene.studentGroupId,
                gene.classroomId,
                gene.teacherId,
                gene.day,
                gene.startTime,
                gene.endTime,
                null,
                chromosome.slice(0, i).concat(chromosome.slice(i + 1)), // Other genes as pending schedule
                { teacher, classroom, studentGroup }
            );

            conflicts += conflictList.length;
            
            // Categorize violations
            const hardViolations = conflictList.filter(c => 
                c.includes('already scheduled') || 
                c.includes('already has a class') || 
                c.includes('already booked')
            ).length;
            
            const softViolations = conflictList.filter(c => 
                c.includes('not available')
            ).length;

            hardConstraintViolations += hardViolations;
            softConstraintViolations += softViolations;
        }

        // Calculate distribution scores for better scheduling
        const dayDistribution = this.calculateDayDistribution(chromosome);
        const teacherWorkload = this.calculateTeacherWorkload(chromosome);
        
        // Fitness function (lower is better)
        const fitness = 
            (hardConstraintViolations * 1000) +  // Hard constraints penalty
            (softConstraintViolations * 100) +   // Soft constraints penalty
            (dayDistribution * 10) +             // Day distribution penalty
            (teacherWorkload * 5);               // Teacher workload penalty

        return {
            fitness,
            conflicts,
            hardConstraintViolations,
            softConstraintViolations,
            details: {
                dayDistribution,
                teacherWorkload
            }
        };
    }

    // Calculate how well classes are distributed across days
    calculateDayDistribution(chromosome) {
        const dayCount = {};
        this.config.days.forEach(day => dayCount[day] = 0);
        
        chromosome.forEach(gene => {
            dayCount[gene.day]++;
        });

        // Calculate variance - lower variance is better
        const values = Object.values(dayCount);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        
        return Math.sqrt(variance);
    }

    // Calculate teacher workload distribution
    calculateTeacherWorkload(chromosome) {
        const teacherWorkload = {};
        
        chromosome.forEach(gene => {
            const teacherId = gene.teacherId.toString();
            if (!teacherWorkload[teacherId]) {
                teacherWorkload[teacherId] = 0;
            }
            teacherWorkload[teacherId]++;
        });

        // Calculate variance in teacher workload
        const workloads = Object.values(teacherWorkload);
        if (workloads.length === 0) return 0;
        
        const mean = workloads.reduce((a, b) => a + b, 0) / workloads.length;
        const variance = workloads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / workloads.length;
        
        return Math.sqrt(variance);
    }

    // Single-point crossover between two chromosomes
    crossover(parent1, parent2) {
        if (Math.random() > this.config.crossoverRate) {
            return [parent1, parent2];
        }

        const crossoverPoint = Math.floor(Math.random() * Math.min(parent1.length, parent2.length));
        
        const child1 = [...parent1.slice(0, crossoverPoint), ...parent2.slice(crossoverPoint)];
        const child2 = [...parent2.slice(0, crossoverPoint), ...parent1.slice(crossoverPoint)];

        return [child1, child2];
    }

    // Mutate a chromosome by changing random genes
    mutate(chromosome) {
        const mutatedChromosome = [...chromosome];
        
        for (let i = 0; i < mutatedChromosome.length; i++) {
            if (Math.random() < this.config.mutationRate) {
                const gene = { ...mutatedChromosome[i] };
                
                // Randomly mutate one aspect of the gene
                const mutationType = Math.floor(Math.random() * 3);
                
                switch (mutationType) {
                    case 0: // Mutate time slot
                        gene.startTime = this.getRandomTimeSlot();
                        gene.endTime = this.calculateEndTime(gene.startTime, gene.duration);
                        break;
                    case 1: // Mutate day
                        gene.day = this.getRandomDay();
                        break;
                    case 2: // Mutate classroom
                        const studentGroup = this.studentGroups.find(sg => 
                            sg._id.toString() === gene.studentGroupId.toString()
                        );
                        if (studentGroup) {
                            gene.classroomId = this.getRandomClassroom(studentGroup.size)._id;
                        }
                        break;
                }
                
                mutatedChromosome[i] = gene;
            }
        }
        
        return mutatedChromosome;
    }

    // Tournament selection for choosing parents
    tournamentSelection(population, fitnessScores, tournamentSize = 3) {
        const tournament = [];
        
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(Math.random() * population.length);
            tournament.push({
                chromosome: population[randomIndex],
                fitness: fitnessScores[randomIndex]
            });
        }

        // Return the best chromosome from tournament (lowest fitness)
        tournament.sort((a, b) => a.fitness.fitness - b.fitness.fitness);
        return tournament[0].chromosome;
    }

    // Main genetic algorithm execution
    async evolve() {
        console.log('Starting genetic algorithm for timetable optimization...');
        
        // Initialize population
        let population = [];
        for (let i = 0; i < this.config.populationSize; i++) {
            population.push(this.createRandomChromosome());
        }

        let bestFitness = Infinity;
        let bestChromosome = null;
        let generationsSinceImprovement = 0;
        
        for (let generation = 0; generation < this.config.maxGenerations; generation++) {
            // Calculate fitness for all chromosomes
            const fitnessScores = [];
            for (const chromosome of population) {
                const fitness = await this.calculateFitness(chromosome);
                fitnessScores.push(fitness);
                
                // Track best solution
                if (fitness.fitness < bestFitness) {
                    bestFitness = fitness.fitness;
                    bestChromosome = [...chromosome];
                    generationsSinceImprovement = 0;
                } else {
                    generationsSinceImprovement++;
                }
            }

            console.log(`Generation ${generation + 1}: Best fitness = ${bestFitness.toFixed(2)}`);

            // Early termination if no improvement
            if (generationsSinceImprovement > 20 && bestFitness < 100) {
                console.log('Early termination: No significant improvement detected');
                break;
            }

            // Create new generation
            const newPopulation = [];
            
            // Elitism: Keep best chromosomes
            const eliteCount = Math.floor(this.config.populationSize * this.config.elitismRate);
            const sortedIndices = fitnessScores
                .map((fitness, index) => ({ fitness: fitness.fitness, index }))
                .sort((a, b) => a.fitness - b.fitness)
                .slice(0, eliteCount)
                .map(item => item.index);
            
            sortedIndices.forEach(index => {
                newPopulation.push([...population[index]]);
            });

            // Generate offspring through crossover and mutation
            while (newPopulation.length < this.config.populationSize) {
                const parent1 = this.tournamentSelection(population, fitnessScores);
                const parent2 = this.tournamentSelection(population, fitnessScores);
                
                const [child1, child2] = this.crossover(parent1, parent2);
                
                newPopulation.push(this.mutate(child1));
                if (newPopulation.length < this.config.populationSize) {
                    newPopulation.push(this.mutate(child2));
                }
            }

            population = newPopulation;
        }

        const finalFitness = await this.calculateFitness(bestChromosome);
        
        console.log('Genetic algorithm completed!');
        console.log(`Final best fitness: ${finalFitness.fitness}`);
        console.log(`Hard constraint violations: ${finalFitness.hardConstraintViolations}`);
        console.log(`Soft constraint violations: ${finalFitness.softConstraintViolations}`);

        return {
            schedule: bestChromosome,
            fitness: finalFitness,
            metadata: {
                algorithm: 'genetic',
                generations: Math.min(this.config.maxGenerations, generationsSinceImprovement + 1),
                populationSize: this.config.populationSize
            }
        };
    }

    // Helper methods
    getRandomDay() {
        return this.config.days[Math.floor(Math.random() * this.config.days.length)];
    }

    getRandomTimeSlot() {
        return this.config.timeSlots[Math.floor(Math.random() * this.config.timeSlots.length)];
    }

    getRandomClassroom(requiredCapacity) {
        const suitableClassrooms = this.classrooms.filter(c => c.capacity >= requiredCapacity);
        return suitableClassrooms.length > 0 
            ? suitableClassrooms[Math.floor(Math.random() * suitableClassrooms.length)]
            : this.classrooms[Math.floor(Math.random() * this.classrooms.length)];
    }

    calculateEndTime(startTime, duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endHour = hours + Math.floor(duration / 60);
        const endMinute = minutes + (duration % 60);
        return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    }
}

module.exports = { GeneticTimetableScheduler };