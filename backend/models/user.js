const mongoose=require('mongoose');
const bcrypt=require('bcrypt');

const userSchema=new mongoose.Schema({
    name:{type:String,required:true},
    email:{type:String, required:true, unique:true},
    passwordHash:{type:String, required:true, select:false},
    role:{type:String,enum:['admin','faculty','student'],required:true},
    employeeId:{type:String, required:function(){return this.role === 'faculty' || this.role === 'admin'}},
    rollNo:{type:String, required:function(){return this.role === 'student'}},
    department:{type:String, required:true},
    phone:{type:String},
    availability:[
        {
            day:{type:String, enum:['monday','tuesday','wednesday','thursday','friday','saturday']},
            slots:[{
                start:{type:String},
                end:{type:String}
            }]
        }
    ],
    blackoutPeriods:[
        {
            day:{type:String, enum:['monday','tuesday','wednesday','thursday','friday','saturday']},
            slots:[{
                start:{type:String},
                end:{type:String}
            }]
        }
    ],
    subjects:[{type:mongoose.Schema.Types.ObjectId, ref:'Course'}],
    isActive:{type:Boolean, default:true},
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
});

userSchema.index({email:1});
userSchema.index({role:1});
userSchema.index({department:1});

userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

userSchema.methods.matchPassword=async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.passwordHash);
}

const userModel=mongoose.model('User',userSchema);
module.exports={
    userModel
};