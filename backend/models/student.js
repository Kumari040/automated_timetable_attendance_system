const mongoose=require('mongoose');

const studentSchema=new mongoose.Schema({
    rollNo:{type:String,required:true,unique:true},
    name:{type:String,required:true},
    email:{type:String,required:true,unique:true},
    department:{type:String,required:true},
    semester:{type:Number,required:true},
    year:{type:Number,required:true},
    section:{type:String,required:true},
    phone:{type:String},
    address:{type:String},
    guardianName:{type:String},
    guardianPhone:{type:String},
    studentGroupId:{type:mongoose.Schema.Types.ObjectId, ref:'StudentGroup'},
    enrolledCourses:[{type:mongoose.Schema.Types.ObjectId, ref:'Course'}],
    attendancePercentage:{type:Number,default:0},
    isActive:{type:Boolean,default:true},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});

studentSchema.index({rollNo:1});
studentSchema.index({email:1});
studentSchema.index({department:1});
studentSchema.index({semester:1,year:1});

studentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const studentModel = mongoose.model('Student', studentSchema);
module.exports = { studentModel };
