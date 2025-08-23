
        
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
  Alert
} from '@mui/material';
import {
  People,
  School,
  Schedule,
  Assessment,
  Warning
} from '@mui/icons-material';
import { apiClient } from '../services/api';

const StatsCard = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center">
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: '50%',
            p: 1,
            mr: 2
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          <Typography color="textSecondary">
            {title}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/dashboard/admin');
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
        Admin Dashboard
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Students"
            value={dashboardData?.summary?.totalStudents || 0}
            icon={<People />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Faculty"
            value={dashboardData?.summary?.totalFaculty || 0}
            icon={<People />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Courses"
            value={dashboardData?.summary?.totalCourses || 0}
            icon={<School />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Today's Classes"
            value={dashboardData?.summary?.todayClasses || 0}
            icon={<Schedule />}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Attendance Statistics (This Week)
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Present: {dashboardData?.attendanceStats?.present || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Absent: {dashboardData?.attendanceStats?.absent || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Late: {dashboardData?.attendanceStats?.late || 0}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Low Attendance Students
            </Typography>
            <List dense>
              {dashboardData?.lowAttendanceStudents?.slice(0, 5).map((student, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={student.name}
                    secondary={`${student.rollNo} - ${student.attendancePercentage}%`}
                  />
                </ListItem>
              )) || (
                <ListItem>
                  <ListItemText primary="No low attendance students" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Registrations
            </Typography>
            <List dense>
              {dashboardData?.recentRegistrations?.slice(0, 5).map((user, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={user.name}
                    secondary={`${user.role} - ${user.department}`}
                  />
                </ListItem>
              )) || (
                <ListItem>
                  <ListItemText primary="No recent registrations" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Department Distribution
            </Typography>
            <List dense>
              {dashboardData?.departmentDistribution?.slice(0, 5).map((dept, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={dept._id}
                    secondary={`${dept.count} students`}
                  />
                </ListItem>
              )) || (
                <ListItem>
                  <ListItemText primary="No department data" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
