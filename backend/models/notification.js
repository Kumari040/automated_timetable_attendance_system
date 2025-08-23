const mongoose=require('mongoose');

const notificationSchema=new mongoose.Schema({
    title:{type:String,required:true},
    message:{type:String,required:true},
    type:{type:String,enum:['attendance','timetable','alert','general'],required:true},
    priority:{type:String,enum:['low','medium','high','urgent'],default:'medium'},
    recipients:[{
        userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
        isRead:{type:Boolean,default:false},
        readAt:{type:Date}
    }],
    sentBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    relatedEntity:{
        entityType:{type:String,enum:['Course','Timetable','Attendance','User']},
        entityId:{type:mongoose.Schema.Types.ObjectId}
    },
    isGlobal:{type:Boolean,default:false},
    scheduledFor:{type:Date},
    isActive:{type:Boolean,default:true},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});

notificationSchema.index({type:1});
notificationSchema.index({'recipients.userId':1});
notificationSchema.index({createdAt:-1});
notificationSchema.index({priority:1});

notificationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports=mongoose.model('Notification',notificationSchema);