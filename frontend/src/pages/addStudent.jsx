// src/pages/AddStudent.jsx

import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentContext } from '../context/StudentContext';
import { Box, Button, TextField, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Alert } from '@mui/material';

function AddStudent() {
  const { addStudent } = useContext(StudentContext);
  const navigate = useNavigate();
  const [rollNo, setRollNo] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await addStudent({ rollNo, name, department });
      navigate('/admin/students');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add student');
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Add a New Student</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField margin="normal" required fullWidth label="Roll Number" value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
        <TextField margin="normal" required fullWidth label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <FormControl fullWidth margin="normal">
          <InputLabel>Department</InputLabel>
          <Select value={department} label="Department" onChange={(e) => setDepartment(e.target.value)}>
            <MenuItem value={'Computer Science'}>Computer Science</MenuItem>
            <MenuItem value={'Mechanical Engg.'}>Mechanical Engg.</MenuItem>
            <MenuItem value={'Electrical Engg.'}>Electrical Engg.</MenuItem>
            <MenuItem value={'Electronics'}>Electronics</MenuItem>
            <MenuItem value={'Civil Engg.'}>Civil Engg.</MenuItem>
          </Select>
        </FormControl>
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>Add Student</Button>
      </Box>
    </Paper>
  );
}

export default AddStudent;
