import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './App.css'
import HomePage from "./pages/homepage";
import LoginPage from "./pages/loginPage";

import RegisterPage2 from "./pages/registerPage2";
import { AuthProvider } from "./context/authContext";
import AdminDashboard from "./pages/adminDashboard";
import FacultyDashboard from "./pages/facultyDashboard";
import StudentDashboard from "./pages/studentDashboard";
import ProtectedRoute from "./components/protectedRoute";

import Layout from "./components/layout";
import ManageUsers from "./pages/manageUsers";
import ManageCourses from "./pages/manageCourses";
import ManageTimetable from "./pages/manageTimetable";
import ManageAttendance from "./pages/manageAttendance";
import ViewTimetable from "./pages/viewTimetable";
import ViewAttendance from "./pages/viewAttendance";
import Profile from "./pages/profile";

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage2 />} />
            
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="courses" element={<ManageCourses />} />
              <Route path="timetable" element={<ManageTimetable />} />
              <Route path="attendance" element={<ManageAttendance />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="/faculty" element={<ProtectedRoute allowedRoles={['faculty']}><Layout /></ProtectedRoute>}>
              <Route index element={<FacultyDashboard />} />
              <Route path="dashboard" element={<FacultyDashboard />} />
              <Route path="timetable" element={<ViewTimetable />} />
              <Route path="attendance" element={<ManageAttendance />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><Layout /></ProtectedRoute>}>
              <Route index element={<StudentDashboard />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="timetable" element={<ViewTimetable />} />
              <Route path="attendance" element={<ViewAttendance />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="/" element={<HomePage />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>

  );
}

export default App;