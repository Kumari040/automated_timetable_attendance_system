const mongoose = require('mongoose');

const courseSchema=new mongoose.Schema({
    name:{type:String,required:true},
    code:{type:String,required:true,unique:true},
    credits:{type:Number,required:true,min:1,max:6},
    frequency:{type:Number,required:true,min:1,max:7},
    duration:{type:Number,required:true,default:60},
    department:{type:String,required:true},
    semester:{type:Number,required:true},
    year:{type:Number,required:true},
    teacherId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    studentGroups:[{type:mongoose.Schema.Types.ObjectId, ref:'StudentGroup'}],
    description:{type:String},
    prerequisites:[{type:mongoose.Schema.Types.ObjectId, ref:'Course'}],
    isActive:{type:Boolean,default:true},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});

courseSchema.index({code:1});
courseSchema.index({department:1});
courseSchema.index({semester:1,year:1});

courseSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports=mongoose.model('Course',courseSchema);
