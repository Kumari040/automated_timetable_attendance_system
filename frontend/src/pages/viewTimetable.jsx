import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { Schedule } from '@mui/icons-material';
import { useAuth } from '../context/authContext';
import { apiClient } from '../services/api';

const TimeSlot = ({ time, classes }) => (
  <Card sx={{ mb: 1, minHeight: 80 }}>
    <CardContent sx={{ p: 2 }}>
      <Typography variant="subtitle2" color="textSecondary">
        {time}
      </Typography>
      {classes.map((classItem, index) => (
        <Box key={index} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {classItem.courseId?.name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {classItem.classroomId?.name} - {classItem.teacherId?.name}
          </Typography>
        </Box>
      ))}
    </CardContent>
  </Card>
);

const ViewTimetable = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const params = {};
      if (user.role === 'faculty') {
        params.teacherId = user.id;
      }
      // For students, don't pass studentGroupId - let backend determine it from user ID

      const response = await apiClient.get('/timetable', { params });
      setTimetable(response.data.timetable || []);
    } catch (err) {
      setError('Failed to fetch timetable');
    } finally {
      setLoading(false);
    }
  };

  const getClassesForTimeSlot = (day, time) => {
    return timetable.filter(item => 
      item.day === day && item.startTime === time
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <Schedule sx={{ mr: 1 }} />
        My Timetable
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={1}>
            <Box sx={{ height: 60, display: 'flex', alignItems: 'center' }}>
              <Typography variant="subtitle2">Time</Typography>
            </Box>
            {timeSlots.map(time => (
              <Box key={time} sx={{ height: 80, display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                <Typography variant="caption">{time}</Typography>
              </Box>
            ))}
          </Grid>

          {days.map(day => (
            <Grid item xs key={day}>
              <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.light', color: 'white' }}>
                <Typography variant="subtitle2">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Typography>
              </Box>
              {timeSlots.map(time => {
                const classes = getClassesForTimeSlot(day, time);
                return (
                  <Box key={`${day}-${time}`} sx={{ minHeight: 80, p: 1, borderBottom: '1px solid #eee' }}>
                    {classes.map((classItem, index) => (
                      <Card key={index} sx={{ mb: 1, bgcolor: 'primary.light', color: 'white' }}>
                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {classItem.courseId?.name}
                          </Typography>
                          <br />
                          <Typography variant="caption">
                            {classItem.classroomId?.name}
                          </Typography>
                          {user.role === 'student' && (
                            <>
                              <br />
                              <Typography variant="caption">
                                {classItem.teacherId?.name}
                              </Typography>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                );
              })}
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default ViewTimetable;