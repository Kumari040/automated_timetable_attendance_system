import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  IconButton,
  TextField,
  MenuItem,
  Button,
} from '@mui/material';
import { Edit, Save, Close } from '@mui/icons-material';
import { apiClient } from '../services/api';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const TimetableEditor = ({ refreshKey }) => {
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ day: '', startTime: '', classroomId: '' });

  useEffect(() => {
    fetchEntries();
  }, [refreshKey]);

  const fetchEntries = async () => {
    try {
      const res = await apiClient.get('/timetable');
      setEntries(res.data.timetable || []);
    } catch (err) {
      console.error('Failed to fetch timetable', err);
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry._id);
    setFormData({
      day: entry.day,
      startTime: entry.startTime,
      classroomId: entry.classroomId?._id || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ day: '', startTime: '', classroomId: '' });
  };

  const saveEdit = async () => {
    try {
      await apiClient.put(`/timetable/${editingId}`, formData);
      await fetchEntries();
    } catch (err) {
      console.error('Failed to update timetable entry', err);
    } finally {
      cancelEdit();
    }
  };

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Course</TableCell>
            <TableCell>Group</TableCell>
            <TableCell>Teacher</TableCell>
            <TableCell>Classroom</TableCell>
            <TableCell>Day</TableCell>
            <TableCell>Start Time</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry._id}>
              <TableCell>{entry.courseId?.name}</TableCell>
              <TableCell>{entry.studentGroupId?.name}</TableCell>
              <TableCell>{entry.teacherId?.name}</TableCell>
              <TableCell>{entry.classroomId?.name}</TableCell>
              <TableCell>
                {editingId === entry._id ? (
                  <TextField
                    select
                    size="small"
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  >
                    {days.map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </TextField>
                ) : (
                  entry.day
                )}
              </TableCell>
              <TableCell>
                {editingId === entry._id ? (
                  <TextField
                    size="small"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                ) : (
                  entry.startTime
                )}
              </TableCell>
              <TableCell>
                {editingId === entry._id ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button startIcon={<Save />} size="small" onClick={saveEdit} variant="contained">
                      Save
                    </Button>
                    <Button startIcon={<Close />} size="small" onClick={cancelEdit} variant="outlined">
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <IconButton onClick={() => startEdit(entry)} size="small">
                    <Edit />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TimetableEditor;

