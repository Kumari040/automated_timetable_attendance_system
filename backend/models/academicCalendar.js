const mongoose=require('mongoose');

const academicCalendarSchema=new mongoose.Schema({
    academicYear:{type:String,required:true},
    semester:{type:Number,required:true},
    startDate:{type:Date,required:true},
    endDate:{type:Date,required:true},
    holidays:[{
        name:{type:String,required:true},
        date:{type:Date,required:true},
        type:{type:String,enum:['national','university','optional'],default:'university'}
    }],
    examSchedule:[{
        type:{type:String,enum:['midterm','final','quiz'],required:true},
        startDate:{type:Date,required:true},
        endDate:{type:Date,required:true}
    }],
    registrationPeriod:{
        startDate:{type:Date,required:true},
        endDate:{type:Date,required:true}
    },
    dropDeadline:{type:Date},
    withdrawalDeadline:{type:Date},
    isActive:{type:Boolean,default:true},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});

academicCalendarSchema.index({academicYear:1,semester:1});
academicCalendarSchema.index({startDate:1,endDate:1});

academicCalendarSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports=mongoose.model('AcademicCalendar',academicCalendarSchema);