// src/pages/EditFaculty.jsx

import React, { useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FacultyContext } from '../context/FacultyContext';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';

function EditFaculty() {
  const { updateFaculty } = useContext(FacultyContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { faculty } = location.state;

  const [name, setName] = useState(faculty.name);
  const [department, setDepartment] = useState(faculty.department);
  const [experience, setExperience] = useState(faculty.experience);

  const handleSubmit = (event) => {
    event.preventDefault();
    updateFaculty({ id: faculty.id, name, department, experience });
    navigate('/admin/faculty');
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Edit Faculty Details</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField fullWidth margin="normal" label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField fullWidth margin="normal" label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} required />
        <TextField fullWidth margin="normal" label="Experience" value={experience} onChange={(e) => setExperience(e.target.value)} required />
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>Save Changes</Button>
      </Box>
    </Paper>
  );
}

export default EditFaculty;
