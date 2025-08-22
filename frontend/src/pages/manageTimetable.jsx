
import { useState } from 'react';

import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { Schedule, Add, AutoFixHigh } from '@mui/icons-material';
import { apiClient } from '../services/api';

import TimetableEditor from '../components/timetableEditor';


const ManageTimetable = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pageError, setPageError] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  const [availabilityForm, setAvailabilityForm] = useState({
    entityType: 'teacher',
    entityId: '',
    day: 'monday',
    start: '09:00',
    end: '10:00',
    type: 'availability'
  });

  const handleAvailabilityChange = (e) => {
    setAvailabilityForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveAvailability = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { entityType, entityId, day, start, end, type } = availabilityForm;
      const pathMap = {
        teacher: '/auth/users',
        classroom: '/classrooms',
        studentGroup: '/student-groups'
      };
      const field = type === 'blackout' ? 'blackoutPeriods' : 'availability';
      const payload = {};
      payload[field] = [{ day, slots: [{ start, end }] }];
      await apiClient.put(`${pathMap[entityType]}/${entityId}`, payload);
      setSuccess('Availability updated successfully');
    } catch (err) {
      console.error('Availability update error:', err);
      setError(err.response?.data?.message || 'Failed to update availability');
    } finally {
      setLoading(false);
    }
  };


  const handleGenerateTimetable = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await apiClient.get('/timetable/generate', {
        params: {
          semester: 5,
          academicYear: '2024-25',
          department: 'Computer Science'
        }
      });
      
      if (response.data.schedule?.length > 0) {
        // Save the generated timetable
        await apiClient.post('/timetable/generate/save', {
          schedule: response.data.schedule
        });
        setSuccess(`Timetable generated successfully! ${response.data.totalSlots} slots created.`);

        setRefreshKey((k) => k + 1);

      } else {
        setError('No timetable slots could be generated. Please check constraints.');
      }
    } catch (err) {
      console.error('Timetable generation error:', err);
      setError(err.response?.data?.message || 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  };

  // If there's a critical page error, show error state
  if (pageError) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Manage Timetable</Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => {
            setPageError('');
            window.location.reload();
          }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Manage Timetable
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <AutoFixHigh sx={{ mr: 1 }} />
              Auto-Generate Timetable
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Automatically generate a conflict-free timetable based on courses, faculty availability, and classroom constraints.
            </Typography>
            <Button
              variant="contained"
              onClick={handleGenerateTimetable}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <AutoFixHigh />}
            >
              {loading ? 'Generating...' : 'Generate Timetable'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Add sx={{ mr: 1 }} />
              Manual Entry
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Manually add or edit individual timetable entries with custom scheduling.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
            >
              Add Manual Entry
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Availability Settings
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="entityType-label">Entity</InputLabel>
              <Select
                labelId="entityType-label"
                label="Entity"
                name="entityType"
                value={availabilityForm.entityType}
                onChange={handleAvailabilityChange}
              >
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="classroom">Classroom</MenuItem>
                <MenuItem value="studentGroup">Student Group</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Entity ID"
              name="entityId"
              fullWidth
              sx={{ mb: 2 }}
              value={availabilityForm.entityId}
              onChange={handleAvailabilityChange}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="day-label">Day</InputLabel>
              <Select
                labelId="day-label"
                label="Day"
                name="day"
                value={availabilityForm.day}
                onChange={handleAvailabilityChange}
              >
                {['monday','tuesday','wednesday','thursday','friday','saturday'].map(d => (
                  <MenuItem key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  label="Start"
                  type="time"
                  name="start"
                  fullWidth
                  value={availabilityForm.start}
                  onChange={handleAvailabilityChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End"
                  type="time"
                  name="end"
                  fullWidth
                  value={availabilityForm.end}
                  onChange={handleAvailabilityChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="type-label">Type</InputLabel>
              <Select
                labelId="type-label"
                label="Type"
                name="type"
                value={availabilityForm.type}
                onChange={handleAvailabilityChange}
              >
                <MenuItem value="availability">Available</MenuItem>
                <MenuItem value="blackout">Blackout</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleSaveAvailability} disabled={loading}>
              Save
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Schedule sx={{ mr: 1 }} />
              Current Timetable
            </Typography>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Edit individual timetable entries below.
            </Typography>
            <TimetableEditor refreshKey={refreshKey} />

          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ManageTimetable;