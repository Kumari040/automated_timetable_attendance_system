<<<<<<< HEAD
import { useState} from 'react';
=======
import { useState } from 'react';
>>>>>>> d011fe8753333c8cde9d881c3c57d05a506bd1bc
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { Schedule, Add, AutoFixHigh } from '@mui/icons-material';
import { apiClient } from '../services/api';
<<<<<<< HEAD
import TimetableEditor from '../components/timetableEditor';
=======
import TimetableEditor from '../components/TimetableEditor';

>>>>>>> d011fe8753333c8cde9d881c3c57d05a506bd1bc
const ManageTimetable = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pageError, setPageError] = useState('');
<<<<<<< HEAD
  const [refreshKey, setRefreshKey] =useState(0);
=======
  const [refreshKey, setRefreshKey] = useState(0);

>>>>>>> d011fe8753333c8cde9d881c3c57d05a506bd1bc
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
<<<<<<< HEAD
        setRefreshKey((k)=>k+1);
=======
        setRefreshKey((k) => k + 1);
>>>>>>> d011fe8753333c8cde9d881c3c57d05a506bd1bc
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

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Schedule sx={{ mr: 1 }} />
              Current Timetable
            </Typography>
<<<<<<< HEAD
            <Typography variant="body2" color="textSecondary" sx={{mb: 2}}>
              Edit individual timetable entries below.
            </Typography>
            <TimetableEditor refreshKey={refreshKey}/>
=======
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Edit individual timetable entries below.
            </Typography>
            <TimetableEditor refreshKey={refreshKey} />
>>>>>>> d011fe8753333c8cde9d881c3c57d05a506bd1bc
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ManageTimetable;