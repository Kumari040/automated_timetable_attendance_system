// src/pages/ManageFaculty.jsx

import React, { useContext } from 'react';
import { FacultyContext } from '../context/FacultyContext';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function ManageFaculty() {
  const { faculties, deleteFaculty } = useContext(FacultyContext);

  const columns = [
    { field: 'name', headerName: 'Name', width: 250 },
    { field: 'department', headerName: 'Department', width: 200 },
    { field: 'experience', headerName: 'Experience', width: 150 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <>
          <Link to={`/admin/faculty/edit/${params.row.id}`} state={{ faculty: params.row }}>
            <IconButton color="primary"><EditIcon /></IconButton>
          </Link>
          <IconButton onClick={() => deleteFaculty(params.row.id)} color="error">
            <DeleteIcon />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Manage Faculty</Typography>
        <Button variant="contained" component={Link} to="/admin/faculty/new">
          Add Faculty
        </Button>
      </Box>
      <DataGrid rows={faculties} columns={columns} pageSizeOptions={[5, 10]} checkboxSelection />
    </Box>
  );
}

export default ManageFaculty;
