// src/pages/EditableTimetable.jsx

import React, { useState, useContext } from 'react';
import { TimetableContext } from '../context/TimetableContext';
import { FacultyContext } from '../context/FacultyContext';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Modal, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const allSubjects = ['Physics', 'Maths', 'Chemistry', 'Biology'];

function EditableTimetable() {
  const { schedule, days, timeSlots, updateScheduleSlot } = useContext(TimetableContext);
  const { faculties } = useContext(FacultyContext);

  const [open, setOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentFaculty, setCurrentFaculty] = useState('');

  const handleOpen = (day, time) => {
    const classInfo = schedule.find(item => item.day === day && item.time === time);
    setSelectedSlot({ day, time });
    setCurrentSubject(classInfo?.subject || '');
    setCurrentFaculty(classInfo?.faculty || '');
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleSave = () => {
    const { day, time } = selectedSlot;
    const success = updateScheduleSlot(day, time, currentSubject, currentFaculty);
    if (success) {
      handleClose();
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Edit Timetable</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              {days.map(day => <TableCell key={day} align="center">{day}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeSlots.map(time => (
              <TableRow key={time}>
                <TableCell component="th" scope="row">{time}</TableCell>
                {days.map(day => {
                  const classInfo = schedule.find(c => c.day === day && c.time === time);
                  return (
                    <TableCell
                      key={day}
                      align="center"
                      onClick={() => handleOpen(day, time)}
                      // The colon was missing in the line below
                      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}
                    >
                      {classInfo ? (
                        <Box>
                          <Typography sx={{ fontWeight: 'bold' }}>{classInfo.subject}</Typography>
                          <Typography variant="body2">{classInfo.faculty}</Typography>
                        </Box>
                      ) : '--'}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Modal open={open} onClose={handleClose}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 }}>
          <Typography variant="h6" component="h2">Edit Slot: {selectedSlot?.day} at {selectedSlot?.time}</Typography>
          <FormControl fullWidth margin="normal"><InputLabel>Subject</InputLabel><Select value={currentSubject} label="Subject" onChange={(e) => setCurrentSubject(e.target.value)}><MenuItem value=""><em>None (Clear Slot)</em></MenuItem>{allSubjects.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl>
          <FormControl fullWidth margin="normal"><InputLabel>Faculty</InputLabel><Select value={currentFaculty} label="Faculty" onChange={(e) => setCurrentFaculty(e.target.value)}><MenuItem value=""><em>None (Clear Slot)</em></MenuItem>{faculties.map(f => <MenuItem key={f.id} value={f.name}>{f.name}</MenuItem>)}</Select></FormControl>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}><Button onClick={handleClose} sx={{ mr: 1 }}>Cancel</Button><Button onClick={handleSave} variant="contained">Save</Button></Box>
        </Box>
      </Modal>
    </Box>
  );
}

export default EditableTimetable;
