import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Card,
  CardContent,
  Chip,
  LinearProgress
} from '@mui/material';
import { Assignment, TrendingUp } from '@mui/icons-material';
import { useAuth } from '../context/authContext';
import { apiClient } from '../services/api';

const AttendanceCard = ({ course, summary }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {course}
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
      <Box display="flex" gap={1}>
        <Chip label={`Present: ${summary.presentClasses}`} color="success" size="small" />
        <Chip label={`Absent: ${summary.absentClasses}`} color="error" size="small" />
      </Box>
    </CardContent>
  </Card>
);

const ViewAttendance = () => {
  const { user } = useAuth();
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const [summaryResponse, recentResponse] = await Promise.all([
        apiClient.get('/attendance/summary'),
        apiClient.get('/attendance')
      ]);

      setAttendanceSummary(summaryResponse.data.summary || []);
      setRecentAttendance(recentResponse.data.attendance || []);
    } catch (err) {
      setError('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const overallAttendance = attendanceSummary.length > 0 ?
    attendanceSummary.reduce((sum, item) => sum + item.attendancePercentage, 0) / attendanceSummary.length : 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <Assignment sx={{ mr: 1 }} />
        My Attendance
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <TrendingUp sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" component="div" color={
              overallAttendance >= 75 ? 'success.main' :
              overallAttendance >= 60 ? 'warning.main' : 'error.main'
            }>
              {Math.round(overallAttendance)}%
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Overall Attendance
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Course-wise Attendance
            </Typography>
            {attendanceSummary.length > 0 ? (
              attendanceSummary.map((summary, index) => (
                <AttendanceCard
                  key={index}
                  course={`${summary.courseName} (${summary.courseCode})`}
                  summary={summary}
                />
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No attendance data available
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Attendance Records
            </Typography>
            {recentAttendance.length > 0 ? (
              <Grid container spacing={2}>
                {recentAttendance.slice(0, 10).map((record, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1">
                          {record.courseId?.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {new Date(record.date).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={record.status}
                            color={
                              record.status === 'present' ? 'success' :
                              record.status === 'late' ? 'warning' : 'error'
                            }
                            size="small"
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No attendance records available
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ViewAttendance;