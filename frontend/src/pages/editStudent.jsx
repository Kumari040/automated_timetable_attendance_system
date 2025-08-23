// src/pages/EditStudent.jsx

import React, { useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StudentContext } from '../context/StudentContext';
import { Box, Button, TextField, Typography, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

function EditStudent() {
  const { updateStudent } = useContext(StudentContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { student } = location.state;

  const [rollNo, setRollNo] = useState(student.rollNo);
  const [name, setName] = useState(student.name);
  const [department, setDepartment] = useState(student.department);

  const handleSubmit = (event) => {
    event.preventDefault();
    updateStudent({ id: student.id, rollNo, name, department });
    navigate('/admin/students');
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Edit Student Details</Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          label="Roll Number"
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Department</InputLabel>
          <Select
            value={department}
            label="Department"
            onChange={(e) => setDepartment(e.target.value)}
          >
            <MenuItem value={'Computer Science'}>Computer Science</MenuItem>
            <MenuItem value={'Mechanical Engg.'}>Mechanical Engg.</MenuItem>
            <MenuItem value={'Electrical Engg.'}>Electrical Engg.</MenuItem>
            <MenuItem value={'Electronics'}>Electronics</MenuItem>
            <MenuItem value={'Civil Engg.'}>Civil Engg.</MenuItem>
          </Select>
        </FormControl>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Save Changes
        </Button>
      </Box>
    </Paper>
  );
}

export default EditStudent;
