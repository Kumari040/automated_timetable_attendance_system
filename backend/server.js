const express=require('express');
const cors=require('cors');
require('dotenv').config();
const connectDB=require("./config_db");

connectDB();

const{authRouter}=require("./controllers/authControl");
const{studentRouter}=require("./controllers/studentController");
const{courseRouter}=require("./controllers/courseController");
const{timetableRouter}=require("./controllers/timetableController");
const{attendanceRouter}=require("./controllers/attendanceController");
const{classroomRouter}=require("./controllers/classroomController");
const{studentGroupRouter}=require("./controllers/studentGroupController");
const{dashboardRouter}=require("./controllers/dashboardController");

const app = express();

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use("/api/auth",authRouter);
app.use("/api/students",studentRouter);
app.use("/api/courses",courseRouter);
app.use("/api/timetable",timetableRouter);
app.use("/api/attendance",attendanceRouter);
app.use("/api/classrooms",classroomRouter);
app.use("/api/student-groups",studentGroupRouter);
app.use("/api/dashboard",dashboardRouter);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Timetable & Attendance System API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
