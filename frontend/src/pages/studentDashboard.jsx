
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
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Schedule,
  Assignment,
  Today,
  TrendingUp
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
        Room: {classItem.classroomId?.name} - {classItem.classroomId?.building}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Faculty: {classItem.teacherId?.name}
      </Typography>
    </CardContent>
  </Card>
);

const AttendanceCard = ({ summary }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {summary.courseName} ({summary.courseCode})
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="body2">
            Attendance: {summary.attendancePercentage}%
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {summary.presentClasses}/{summary.totalClasses}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={summary.attendancePercentage}
          color={
            summary.attendancePercentage >= 75 ? 'success' :
            summary.attendancePercentage >= 60 ? 'warning' : 'error'
          }
        />
      </Box>
    </CardContent>
  </Card>
);

const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/dashboard/student');
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

  const overallAttendance = dashboardData?.attendanceSummary?.length > 0 ?
    dashboardData.attendanceSummary.reduce((sum, item) => sum + item.attendancePercentage, 0) /
    dashboardData.attendanceSummary.length : 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
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
              <TrendingUp sx={{ mr: 1 }} />
              Overall Attendance
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h3" component="div" color={
                overallAttendance >= 75 ? 'success.main' :
                overallAttendance >= 60 ? 'warning.main' : 'error.main'
              }>
                {Math.round(overallAttendance)}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Overall attendance across all courses
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Assignment sx={{ mr: 1 }} />
              Course-wise Attendance
            </Typography>
            {dashboardData?.attendanceSummary?.length > 0 ? (
              dashboardData.attendanceSummary.map((summary, index) => (
                <AttendanceCard key={index} summary={summary} />
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No attendance data available
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Schedule sx={{ mr: 1 }} />
              Upcoming Classes
            </Typography>
            <List dense>
              {dashboardData?.upcomingClasses?.slice(0, 5).map((classItem, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={classItem.courseId?.name}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          {classItem.day} - {classItem.startTime}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {classItem.classroomId?.name} - {classItem.teacherId?.name}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              )) || (
                <ListItem>
                  <ListItemText primary="No upcoming classes" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Assignment sx={{ mr: 1 }} />
              Recent Attendance Records
            </Typography>
            <List dense>
              {dashboardData?.recentAttendance?.slice(0, 10).map((attendance, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={attendance.courseId?.name}
                    secondary={
                      <Box display="flex" alignItems="center" gap={1}>
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
                  <ListItemText primary="No attendance records available" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentDashboard;

