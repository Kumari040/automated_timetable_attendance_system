const mongoose=require('mongoose');



const timetableSchema=new mongoose.Schema({
    courseId:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},
    studentGroupId:{type:mongoose.Schema.Types.ObjectId, ref:'StudentGroup',required:true},
    classroomId:{type:mongoose.Schema.Types.ObjectId,ref:'Classroom',required:true},
    teacherId:{type:mongoose.Schema.Types.ObjectId, ref:'User',required:true},
    day:{type:String,enum:['monday','tuesday','wednesday','thursday','friday','saturday'],required:true},
    startTime:{type:String,required:true},
    endTime:{type:String,required:true},
    duration:{type:Number,required:true,default:60},
    weekNumber:{type:Number,required:true},
    semester:{type:Number,required:true},
    academicYear:{type:String,required:true},
    isRecurring:{type:Boolean,default:true},
    status:{type:String,enum:['scheduled','completed','cancelled','rescheduled'],default:'scheduled'},
    notes:{type:String},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});


timetableSchema.index({day:1,startTime:1});
timetableSchema.index({courseId:1});
timetableSchema.index({studentGroupId:1});
timetableSchema.index({teacherId:1});
timetableSchema.index({classroomId:1});
timetableSchema.index({semester:1,academicYear:1});

timetableSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const timetableModel = mongoose.model('Timetable', timetableSchema);
module.exports = { timetableModel };

