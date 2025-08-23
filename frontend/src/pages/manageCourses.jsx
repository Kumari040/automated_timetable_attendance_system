import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Grid,
  CircularProgress
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
import { apiClient } from '../services/api';
import { safeApiCall, validateDataGridRows, createErrorHandler } from '../utils/errorHelpers';
import ErrorBoundary from '../components/ErrorBoundary';

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pageError, setPageError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    credits: 3,
    frequency: 3,
    duration: 60,
    department: '',
    semester: 1,
    year: 1,
    teacherId: '',
    description: ''
  });

  const handleError = createErrorHandler(setError, 'ManageCourses');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const result = await safeApiCall(() => apiClient.get('/courses'), []);
    
    if (result.success) {
      const validatedCourses = validateDataGridRows(result.data.courses || []);
      setCourses(validatedCourses);
      setError('');
    } else {
      handleError(new Error(result.error));
      setCourses([]);
    }
    setLoading(false);
  }, []);

  const fetchTeachers = useCallback(async () => {
    setTeachersLoading(true);
    const result = await safeApiCall(() => apiClient.get('/auth/users?role=faculty'), []);
    
    if (result.success) {
      setTeachers(result.data.users || []);
    } else {
      console.error('Failed to fetch teachers:', result.error);
      setTeachers([]);
    }
    setTeachersLoading(false);
  }, []);

  useEffect(() => {
    const initializePage = async () => {
      try {
        await Promise.allSettled([fetchCourses(), fetchTeachers()]);
      } catch (err) {
        console.error('Failed to initialize page:', err);
        setPageError('Failed to load page data. Please refresh and try again.');
      }
    };
    
    initializePage();
  }, [fetchCourses, fetchTeachers]);

  const handleSubmit = async () => {
    try {
      setError('');
      if (editingCourse) {
        await apiClient.put(`/courses/${editingCourse._id}`, formData);
        setSuccess('Course updated successfully');
      } else {
        await apiClient.post('/courses', formData);
        setSuccess('Course created successfully');
      }
      handleClose();
      fetchCourses();
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      setError('Invalid course ID');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await apiClient.delete(`/courses/${id}`);
        setSuccess('Course deleted successfully');
        fetchCourses();
      } catch (err) {
        handleError(err, 'Failed to delete course');
      }
    }
  };

  const handleEdit = (course) => {
    try {
      if (!course || !course._id) {
        setError('Invalid course data');
        return;
      }
      
      setEditingCourse(course);
      setFormData({
        name: course.name || '',
        code: course.code || '',
        credits: course.credits || 3,
        frequency: course.frequency || 3,
        duration: course.duration || 60,
        department: course.department || '',
        semester: course.semester || 1,
        year: course.year || 1,
        teacherId: course.teacherId?._id || '',
        description: course.description || ''
      });
      setOpen(true);
    } catch (err) {
      handleError(err, 'Failed to load course data for editing');
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCourse(null);
    setFormData({
      name: '',
      code: '',
      credits: 3,
      frequency: 3,
      duration: 60,
      department: '',
      semester: 1,
      year: 1,
      teacherId: '',
      description: ''
    });
    setError('');
  };

  const columns = [
    { field: 'name', headerName: 'Course Name', width: 200, flex: 1 },
    { field: 'code', headerName: 'Code', width: 100 },
    { field: 'credits', headerName: 'Credits', width: 80 },
    { field: 'frequency', headerName: 'Frequency/Week', width: 120 },
    { field: 'department', headerName: 'Department', width: 150 },
    { field: 'semester', headerName: 'Semester', width: 100 },
    { 
      field: 'teacherName', 
      headerName: 'Teacher', 
      width: 150,
      valueGetter: (params) => {
        try {
          return params.row?.teacherId?.name || 'Not Assigned';
        } catch (err) {
          console.error('Error getting teacher name:', err);
          return 'Error';
        }
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => {
        try {
          return (
            <Box>
              <IconButton 
                size="small" 
                onClick={() => handleEdit(params.row)}
                disabled={!params.row?._id}
                title="Edit course"
              >
                <Edit />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => handleDelete(params.row._id)}
                disabled={!params.row?._id}
                title="Delete course"
              >
                <Delete />
              </IconButton>
            </Box>
          );
        } catch (err) {
          console.error('Error rendering actions:', err);
          return <Box>Error</Box>;
        }
      },
    },
  ];

  // Critical page error fallback
  if (pageError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Manage Courses</Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
        <Box display="flex" gap={2}>
          <Button 
            variant="contained" 
            startIcon={<Refresh />}
            onClick={() => {
              setPageError('');
              window.location.reload();
            }}
          >
            Refresh Page
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => setPageError('')}
          >
            Try Again
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Manage Courses</Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                fetchCourses();
                fetchTeachers();
              }}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpen(true)}
              disabled={loading}
            >
              Add Course
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={courses}
            columns={columns}
            getRowId={(row) => row._id || row.id}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[5, 10, 25]}
            loading={loading}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
            }}
          />
        </Box>

        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingCourse ? 'Edit Course' : 'Add New Course'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Course Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Course Code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Credits"
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value) || 3})}
                  inputProps={{ min: 1, max: 6 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Frequency per Week"
                  type="number"
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: parseInt(e.target.value) || 3})}
                  inputProps={{ min: 1, max: 7 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 60})}
                  inputProps={{ min: 30, max: 180 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Semester"
                  type="number"
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: parseInt(e.target.value) || 1})}
                  inputProps={{ min: 1, max: 8 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value) || 1})}
                  inputProps={{ min: 1, max: 5 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Teacher</InputLabel>
                  <Select
                    value={formData.teacherId}
                    label="Teacher"
                    onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                    disabled={teachersLoading}
                  >
                    {teachersLoading ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Loading teachers...
                      </MenuItem>
                    ) : teachers.length === 0 ? (
                      <MenuItem disabled>No teachers available</MenuItem>
                    ) : (
                      teachers.map((teacher) => (
                        <MenuItem key={teacher._id} value={teacher._id}>
                          {teacher.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {editingCourse ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
};

export default ManageCourses;