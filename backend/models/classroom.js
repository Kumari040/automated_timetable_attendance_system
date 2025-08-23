const mongoose = require('mongoose');

const classroomSchema=new mongoose.Schema({
    name:{type:String,required:true,unique:true},
    roomNumber:{type:String,required:true},
    building:{type:String,required:true},
    floor:{type:Number,required:true},
    capacity:{type:Number,required:true},
    type:{type:String,enum:['lecture','lab','seminar','auditorium'],default:'lecture'},
    facilities:[{type:String}],
    department:{type:String},
    isAvailable:{type:Boolean,default:true},
    availability:[
        {
            day:{type:String, enum:['monday','tuesday','wednesday','thursday','friday','saturday']},
            slots:[{ start:{type:String}, end:{type:String} }]
        }
    ],
    blackoutPeriods:[
        {
            day:{type:String, enum:['monday','tuesday','wednesday','thursday','friday','saturday']},
            slots:[{ start:{type:String}, end:{type:String} }]
        }
    ],
    isActive:{type:Boolean,default:true},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});

classroomSchema.index({name:1});
classroomSchema.index({building:1,floor:1});
classroomSchema.index({type:1});

classroomSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const classroomModel = mongoose.model('Classroom', classroomSchema);
module.exports = { classroomModel };
