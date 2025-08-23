const {Router}=require('express');
const studentRouter=Router();
const {z}=require('zod');
const studentModel=require('../models/student');

studentRouter.post('/',async function(req,res){
    try{
        const requiredBody=z.object({
            rollNo:z.string().min(1),
            name:z.string().min(1),
            department:z.string().min(1)
        });
        const parsed=requiredBody.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json({
                message:"Invalid inputs",
                error:parsed.error
            });
        }
        const student=await studentModel.create(parsed.data);
        res.status(201).json(student);
    }catch(error){
        res.status(500).json({
            message:"server error",
            error:error.message
        });
    }
});

studentRouter.get('/',async function(req,res){
    try{
        const students=await studentModel.find();
        res.json(students);
    }catch(error){
        res.status(500).json({
            message:"server error",
            error:error.message
        });
    }
});

module.exports={studentRouter};
