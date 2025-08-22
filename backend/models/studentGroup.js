const mongoose=require('mongoose');

const studentGroupSchema=new mongoose.Schema({
    name:{type:String,required:true,unique:true},
    department:{type:String,required:true},
    semester:{type:Number,required:true},
    year:{type:Number,required:true},
    section:{type:String,required:true},
    size:{type:Number,required:true},
    maxSize:{type:Number,required:true,default:60},
    students:[{type:mongoose.Schema.Types.ObjectId, ref:'Student'}],
    courses:[{type:mongoose.Schema.Types.ObjectId, ref:'Course'}],
    classRepresentative:{type:mongoose.Schema.Types.ObjectId, ref:'Student'},
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

studentGroupSchema.index({department:1});
studentGroupSchema.index({semester:1,year:1});
studentGroupSchema.index({section:1});

studentGroupSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const studentGroupModel = mongoose.model('StudentGroup', studentGroupSchema);
module.exports = { studentGroupModel };