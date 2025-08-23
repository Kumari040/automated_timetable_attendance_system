
import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  Schedule,
  Assignment,
  People,
  Today
} from '@mui/icons-material';
import { apiClient } from '../services/api';

const TodayClassCard = ({ classItem }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {classItem.courseId?.name}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {classItem.startTime} - {classItem.endTime}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Room: {classItem.classroomId?.name}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Group: {classItem.studentGroupId?.name}
      </Typography>
    </CardContent>
  </Card>
);

const FacultyDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/dashboard/faculty');
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Faculty Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Today sx={{ mr: 1 }} />
              Today's Classes
            </Typography>
            {dashboardData?.todayClasses?.length > 0 ? (
              dashboardData.todayClasses.map((classItem, index) => (
                <TodayClassCard key={index} classItem={classItem} />
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No classes scheduled for today
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Schedule sx={{ mr: 1 }} />
              My Courses
            </Typography>
            <List dense>
              {dashboardData?.myCourses?.map((course, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={course.name}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Code: {course.code}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {course.studentGroups?.map((group, idx) => (
                            <Chip
                              key={idx}
                              label={group.name}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              )) || (
                <ListItem>
                  <ListItemText primary="No courses assigned" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Assignment sx={{ mr: 1 }} />
              Recent Attendance
            </Typography>
            <List dense>
              {dashboardData?.recentAttendance?.slice(0, 5).map((attendance, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`${attendance.studentId?.name} - ${attendance.courseId?.name}`}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          {new Date(attendance.date).toLocaleDateString()}
                        </Typography>
                        <Chip
                          label={attendance.status}
                          size="small"
                          color={
                            attendance.status === 'present' ? 'success' :
                            attendance.status === 'late' ? 'warning' : 'error'
                          }
                        />
                      </Box>
                    }
                  />
                </ListItem>
              )) || (
                <ListItem>
                  <ListItemText primary="No recent attendance records" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <People sx={{ mr: 1 }} />
              Students with Low Attendance
            </Typography>
            <List dense>
              {dashboardData?.lowAttendanceStudents?.slice(0, 5).map((student, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={student.studentName}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Roll No: {student.studentRollNo}
                        </Typography>
                        <Chip
                          label={`${student.attendancePercentage}%`}
                          size="small"
                          color="error"
                        />
                      </Box>
                    }
                  />
                </ListItem>
              )) || (
                <ListItem>
                  <ListItemText primary="No students with low attendance" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FacultyDashboard;

