const jwt = require('jsonwebtoken');
const {userModel} = require('../models/user');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id).select('-passwordHash');
        
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid or inactive user' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Required roles: ${roles.join(', ')}` 
            });
        }
        next();
    };
};

const authorizeAdminOrSelf = (req, res, next) => {
    const requestedUserId = req.params.id || req.params.userId;
    
    if (req.user.role === 'admin' || req.user._id.toString() === requestedUserId) {
        next();
    } else {
        return res.status(403).json({ 
            message: 'Access denied. Admin privileges or self-access required.' 
        });
    }
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    authorizeAdminOrSelf
};