const mongoose=require('mongoose');

const attendanceSchema=new mongoose.Schema({
    timetableId:{type:mongoose.Schema.Types.ObjectId,ref:'Timetable',required:true},
    courseId:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},
    studentId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    teacherId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    studentGroupId:{type:mongoose.Schema.Types.ObjectId,ref:'StudentGroup',required:true},
    date:{type:Date,required:true},
    status:{type:String,enum:['present','absent','late','excused'],required:true},
    markedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    markedAt:{type:Date,default:Date.now},
    remarks:{type:String},
    isAutoMarked:{type:Boolean,default:false},
    latitude:{type:Number},
    longitude:{type:Number},
    semester:{type:Number,required:true},
    academicYear:{type:String,required:true},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});

attendanceSchema.index({studentId:1,date:1});
attendanceSchema.index({courseId:1,date:1});
attendanceSchema.index({timetableId:1});
attendanceSchema.index({studentGroupId:1,date:1});
attendanceSchema.index({semester:1,academicYear:1});

attendanceSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const attendanceModel = mongoose.model('Attendance', attendanceSchema);
module.exports = { attendanceModel };