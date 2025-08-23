// src/pages/ManageStudents.jsx

import React, { useContext } from 'react'; // Import useContext
import { StudentContext } from '../context/StudentContext'; // Import the context
import { Box, Typography, Button, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function ManageStudents() {
  // Get data and functions from the context
  const { students, deleteStudent } = useContext(StudentContext);

  const columns = [
    { field: 'rollNo', headerName: 'Roll No', width: 150 },
    { field: 'name', headerName: 'Name', width: 250 },
    { field: 'department', headerName: 'Department', width: 200 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <>
          <Link to={`/admin/students/edit/${params.row.id}`} state={{ student: params.row }}>
            <IconButton color="primary"><EditIcon /></IconButton>
          </Link>
          <IconButton onClick={() => deleteStudent(params.row.id)} color="error">
            <DeleteIcon />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Manage Students</Typography>
        <Button variant="contained" component={Link} to="/admin/students/new">
          Add Student
        </Button>
      </Box>
      <DataGrid
        rows={students} // Use students from context
        columns={columns}
        getRowId={(row) => row.id}
        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } }}}
        pageSizeOptions={[5, 10]}
        checkboxSelection
      />
    </Box>
  );
}

export default ManageStudents;
