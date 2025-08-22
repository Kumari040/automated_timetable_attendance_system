const {Router}=require('express');
const authRouter=Router();
const {z}=require('zod');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');
const {userModel}=require('../models/user');
const {authenticateToken, authorizeRoles} = require('../middleware/auth');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

authRouter.post("/register", async function(req,res){
    // Allow open registration for now - you can restrict this later
    return handleRegistration(req, res);
});

// Alternative endpoint for admin-controlled registration
authRouter.post("/admin-register", authenticateToken, authorizeRoles('admin'), async function(req,res){
    return handleRegistration(req, res);
});

const handleRegistration = async function(req,res){
    try{
        const requiredBody=z.object({
            email:z.string().min(5).max(80).email(),
            name:z.string().min(2).max(100),
            password:z.string().min(6).max(100),
            role:z.enum(['admin','faculty','student']),
            department:z.string().min(2).max(50),
            employeeId:z.string().optional(),
            rollNo:z.string().optional(),
            phone:z.string().optional()
        });
        
        const safeParsedBody=requiredBody.safeParse(req.body);
        if(!safeParsedBody.success){
            return res.status(400).json({
                message:"Invalid inputs",
                error:safeParsedBody.error.errors
            });
        }
        
        const {email,name,password,role,department,employeeId,rollNo,phone}=req.body;

        if(role === 'faculty' && !employeeId){
            return res.status(400).json({message:"Employee ID is required for faculty"});
        }
        if(role === 'student' && !rollNo){
            return res.status(400).json({message:"Roll number is required for students"});
        }

        const orConditions = [{email}];
        if(employeeId) {
            orConditions.push({employeeId});
        }
        if(rollNo) {
            orConditions.push({rollNo});
        }
        
        const existingUser=await userModel.findOne({
            $or: orConditions
        });
        
        if(existingUser){
            return res.status(400).json({message:"User already exists with this email, employee ID, or roll number"});
        }
        
        const passwordHash=await bcrypt.hash(password,12);
        const newUser = await userModel.create({
            name,
            email,
            passwordHash,
            role,
            department,
            employeeId,
            rollNo,
            phone
        });
        
        res.status(201).json({
            message:"User registered successfully",
            user:{
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                department: newUser.department,
                employeeId: newUser.employeeId,
                rollNo: newUser.rollNo
            }
        });
    }catch(error){
        console.error('Registration error:', error);
        res.status(500).json({
            message:"Server error during registration",
            error:error.message
        });
    }
}

authRouter.post("/login", async function(req,res){
    try{
        const requiredBody=z.object({
            email:z.string().min(5).max(80).email(),
            password:z.string().min(6).max(100),
        });
        
        const parsedBody=requiredBody.safeParse(req.body);
        if(!parsedBody.success){
            return res.status(400).json({
                message:"Invalid inputs",
                error:parsedBody.error.errors
            });
        }
        
        const {email,password}=req.body;
        const user=await userModel.findOne({email}).select('+passwordHash');
        
        if(!user || !user.isActive){
            return res.status(401).json({message:"Invalid credentials or inactive account"});
        }
        
        const matchPassword=await bcrypt.compare(password,user.passwordHash);
        if(!matchPassword){
            return res.status(401).json({message:"Invalid credentials"});
        }
        
        res.json({
            message:"Login successful",
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department,
                employeeId: user.employeeId,
                rollNo: user.rollNo
            },
            token: generateToken(user._id, user.role),
        });
    }catch(error){
        console.error('Login error:', error);
        res.status(500).json({message:"Server error during login"});
    }
});

authRouter.get("/profile", authenticateToken, async function(req,res){
    try{
        res.json({
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role,
                department: req.user.department,
                employeeId: req.user.employeeId,
                rollNo: req.user.rollNo,
                phone: req.user.phone
            }
        });
    }catch(error){
        res.status(500).json({message:"Error fetching profile"});
    }
});

authRouter.put("/profile", authenticateToken, async function(req,res){
    try{
        const allowedUpdates = ['name', 'phone', 'availability', 'blackoutPeriods'];
        const updates = {};
        
        Object.keys(req.body).forEach(key => {
            if(allowedUpdates.includes(key)){
                updates[key] = req.body[key];
            }
        });
        
        const updatedUser = await userModel.findByIdAndUpdate(
            req.user._id,
            updates,
            {new: true, select: '-passwordHash'}
        );
        
        res.json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    }catch(error){
        res.status(500).json({message:"Error updating profile"});
    }
});

authRouter.put("/users/:id", authenticateToken, authorizeRoles('admin'), async function(req,res){
    try{
        const allowedUpdates = ['name', 'phone', 'availability', 'blackoutPeriods'];
        const updates = {};

        Object.keys(req.body).forEach(key => {
            if(allowedUpdates.includes(key)){
                updates[key] = req.body[key];
            }
        });

        const updatedUser = await userModel.findByIdAndUpdate(
            req.params.id,
            updates,
            {new: true, select: '-passwordHash'}
        );

        if(!updatedUser){
            return res.status(404).json({message: "User not found"});
        }

        res.json({
            message: "User updated successfully",
            user: updatedUser
        });
    }catch(error){
        res.status(500).json({message:"Error updating user"});
    }
});

authRouter.post("/change-password", authenticateToken, async function(req,res){
    try{
        const {currentPassword, newPassword} = req.body;
        
        if(!currentPassword || !newPassword){
            return res.status(400).json({message:"Current and new passwords are required"});
        }
        
        const user = await userModel.findById(req.user._id).select('+passwordHash');
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        
        if(!isValidPassword){
            return res.status(401).json({message:"Current password is incorrect"});
        }
        
        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        await userModel.findByIdAndUpdate(req.user._id, {passwordHash: newPasswordHash});
        
        res.json({message:"Password changed successfully"});
    }catch(error){
        res.status(500).json({message:"Error changing password"});
    }
});

authRouter.get("/users", authenticateToken, authorizeRoles('admin'), async function(req,res){
    try{
        const { role, department, isActive } = req.query;
        const filter = {};
        
        if (role) filter.role = role;
        if (department) filter.department = department;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        
        const users = await userModel.find(filter)
            .select('-passwordHash')
            .sort({ createdAt: -1 });
        
        res.json({
            message: "Users retrieved successfully",
            users,
            count: users.length
        });
    }catch(error){
        console.error('Get users error:', error);
        res.status(500).json({message:"Error retrieving users"});
    }
});

module.exports={authRouter};

