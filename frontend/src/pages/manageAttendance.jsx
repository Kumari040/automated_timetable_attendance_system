import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { Assignment, Today } from '@mui/icons-material';
import { useAuth } from '../context/authContext';
import { apiClient } from '../services/api';

const ManageAttendance = () => {
  const { user } = useAuth();
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTodayClasses();
  }, []);

  const fetchTodayClasses = async () => {
    setLoading(true);
    try {
      const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
      const response = await apiClient.get('/timetable', {
        params: {
          day: today,
          teacherId: user.role === 'faculty' ? user.id : undefined
        }
      });
      setTodayClasses(response.data.timetable || []);
    } catch (err) {
      setError('Failed to fetch today\'s classes');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = (classId) => {
    // This would open an attendance marking interface
    console.log('Mark attendance for class:', classId);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {user.role === 'faculty' ? 'Mark Attendance' : 'Manage Attendance'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Today sx={{ mr: 1 }} />
              Today's Classes
            </Typography>
            {todayClasses.length > 0 ? (
              <List>
                {todayClasses.map((classItem, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={classItem.courseId?.name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {classItem.startTime} - {classItem.endTime}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Room: {classItem.classroomId?.name}
                          </Typography>
                        </Box>
                      }
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleMarkAttendance(classItem._id)}
                    >
                      Mark Attendance
                    </Button>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No classes scheduled for today
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Assignment sx={{ mr: 1 }} />
              Attendance Reports
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              View and download attendance reports for different time periods.
            </Typography>
            <Button variant="outlined">
              View Reports
            </Button>
          </Paper>
        </Grid>

        {user.role === 'admin' && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Attendance Analytics
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Detailed attendance analytics and trends will be displayed here.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ManageAttendance;