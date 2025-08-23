import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  ExpandMore,
  Psychology,
  AccountTree,
  Compare,
  Schedule,
  Science
} from '@mui/icons-material';
import { apiClient } from '../services/api';

const AdvancedTimetableGeneration = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  
  // Form states
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [department, setDepartment] = useState('Computer Science');
  
  // Algorithm-specific parameters
  const [gaParams, setGaParams] = useState({
    populationSize: 50,
    maxGenerations: 100,
    mutationRate: 0.1,
    crossoverRate: 0.8
  });
  
  const [gcAlgorithm, setGcAlgorithm] = useState('dsatur');

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setResults(null);
    setError('');
  };

  const generateTimetableGA = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        semester,
        academicYear,
        department,
        populationSize: gaParams.populationSize,
        maxGenerations: gaParams.maxGenerations,
        mutationRate: gaParams.mutationRate,
        crossoverRate: gaParams.crossoverRate
      });

      const response = await apiClient.get(`/timetable/generate/genetic?${params}`);
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error generating timetable with genetic algorithm');
    } finally {
      setLoading(false);
    }
  };

  const generateTimetableGC = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        semester,
        academicYear,
        department,
        algorithm: gcAlgorithm
      });

      const response = await apiClient.get(`/timetable/generate/graph-coloring?${params}`);
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error generating timetable with graph coloring');
    } finally {
      setLoading(false);
    }
  };

  const compareAlgorithms = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        semester,
        academicYear,
        department
      });

      const response = await apiClient.get(`/timetable/generate/compare?${params}`);
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error comparing algorithms');
    } finally {
      setLoading(false);
    }
  };

  const saveTimetable = async () => {
    if (!results?.schedule) return;
    
    try {
      await apiClient.post('/timetable/generate/save', { schedule: results.schedule });
      alert('Timetable saved successfully!');
    } catch (err) {
      alert('Error saving timetable: ' + (err.response?.data?.message || err.message));
    }
  };

  const renderGeneticAlgorithmTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Psychology sx={{ mr: 1 }} />
        Genetic Algorithm Timetable Generation
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Uses evolutionary algorithms to optimize timetable scheduling by evolving populations of solutions.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Algorithm Parameters</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Population Size"
                    type="number"
                    value={gaParams.populationSize}
                    onChange={(e) => setGaParams({...gaParams, populationSize: parseInt(e.target.value)})}
                    inputProps={{ min: 10, max: 200 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Max Generations"
                    type="number"
                    value={gaParams.maxGenerations}
                    onChange={(e) => setGaParams({...gaParams, maxGenerations: parseInt(e.target.value)})}
                    inputProps={{ min: 10, max: 500 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Mutation Rate"
                    type="number"
                    value={gaParams.mutationRate}
                    onChange={(e) => setGaParams({...gaParams, mutationRate: parseFloat(e.target.value)})}
                    inputProps={{ min: 0.01, max: 1, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Crossover Rate"
                    type="number"
                    value={gaParams.crossoverRate}
                    onChange={(e) => setGaParams({...gaParams, crossoverRate: parseFloat(e.target.value)})}
                    inputProps={{ min: 0.01, max: 1, step: 0.01 }}
                  />
                </Grid>
              </Grid>
              
              <Button
                variant="contained"
                onClick={generateTimetableGA}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Psychology />}
                sx={{ mt: 2 }}
                fullWidth
              >
                {loading ? 'Evolving Timetable...' : 'Generate with GA'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          {results && results.fitness && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Fitness Results</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Fitness Score:</strong> {results.fitness.fitness.toFixed(2)} (lower is better)
                  </Typography>
                  <Typography variant="body2" color={results.fitness.hardConstraintViolations === 0 ? 'success.main' : 'error.main'}>
                    <strong>Hard Violations:</strong> {results.fitness.hardConstraintViolations}
                  </Typography>
                  <Typography variant="body2" color={results.fitness.softConstraintViolations === 0 ? 'success.main' : 'warning.main'}>
                    <strong>Soft Violations:</strong> {results.fitness.softConstraintViolations}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Total Scheduled:</strong> {results.totalSlots}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Generations:</strong> {results.metadata?.generations || 'N/A'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );

  const renderGraphColoringTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <AccountTree sx={{ mr: 1 }} />
        Graph Coloring Timetable Generation
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Models scheduling conflicts as a graph and uses coloring algorithms to assign time slots.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Algorithm Selection</Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Graph Coloring Algorithm</InputLabel>
                <Select
                  value={gcAlgorithm}
                  onChange={(e) => setGcAlgorithm(e.target.value)}
                >
                  <MenuItem value="dsatur">DSATUR (Degree of Saturation)</MenuItem>
                  <MenuItem value="welsh-powell">Welsh-Powell</MenuItem>
                </Select>
              </FormControl>
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                {gcAlgorithm === 'dsatur' 
                  ? 'DSATUR prioritizes nodes with highest saturation (most colors used by neighbors)'
                  : 'Welsh-Powell sorts nodes by degree (number of conflicts) and colors greedily'
                }
              </Typography>
              
              <Button
                variant="contained"
                onClick={generateTimetableGC}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AccountTree />}
                fullWidth
              >
                {loading ? 'Coloring Graph...' : 'Generate with Graph Coloring'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          {results && results.metadata && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Graph Statistics</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Total Nodes:</strong> {results.metadata.totalNodes}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Conflict Edges:</strong> {results.metadata.totalEdges}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Colors Used:</strong> {results.metadata.colorsUsed}
                  </Typography>
                  <Typography variant="body2" color={results.unscheduled === 0 ? 'success.main' : 'warning.main'}>
                    <strong>Scheduled:</strong> {results.totalSlots}
                  </Typography>
                  <Typography variant="body2" color={results.unscheduled === 0 ? 'success.main' : 'error.main'}>
                    <strong>Unscheduled:</strong> {results.unscheduled}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );

  const renderComparisonTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        <Compare sx={{ mr: 1 }} />
        Algorithm Comparison
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Compare the performance of different timetable generation algorithms.
      </Typography>
      
      <Button
        variant="contained"
        onClick={compareAlgorithms}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <Science />}
        sx={{ mb: 3 }}
      >
        {loading ? 'Running Comparison...' : 'Compare All Algorithms'}
      </Button>

      {results && results.comparison && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Algorithm</strong></TableCell>
                <TableCell><strong>Scheduled</strong></TableCell>
                <TableCell><strong>Unscheduled</strong></TableCell>
                <TableCell><strong>Success Rate</strong></TableCell>
                <TableCell><strong>Special Metrics</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(results.comparison).map(([key, data]) => (
                <TableRow key={key}>
                  <TableCell>{data.algorithm || key}</TableCell>
                  <TableCell>{data.totalSlots || 'N/A'}</TableCell>
                  <TableCell>{data.unscheduled || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${data.success_rate || 'N/A'}%`}
                      color={data.success_rate === '100.0' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {data.fitness && `Fitness: ${data.fitness.toFixed(2)}`}
                    {data.hard_violations !== undefined && ` | Hard: ${data.hard_violations}`}
                    {data.metadata?.colorsUsed && ` | Colors: ${data.metadata.colorsUsed}`}
                    {data.error && <Chip label="Error" color="error" size="small" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {results && results.input_stats && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Input Statistics</Typography>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Typography variant="body2"><strong>Courses:</strong> {results.input_stats.courses}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="body2"><strong>Classrooms:</strong> {results.input_stats.classrooms}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="body2"><strong>Groups:</strong> {results.input_stats.student_groups}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="body2"><strong>Teachers:</strong> {results.input_stats.teachers}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <Science sx={{ mr: 1 }} />
        Advanced Timetable Generation
      </Typography>

      {/* Common Parameters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Generation Parameters</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Semester"
                type="number"
                value={semester}
                onChange={(e) => setSemester(parseInt(e.target.value))}
                inputProps={{ min: 1, max: 8 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Academic Year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2024-25"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              {results && results.schedule && (
                <Button
                  variant="outlined"
                  onClick={saveTimetable}
                  startIcon={<Schedule />}
                  fullWidth
                  sx={{ height: '56px' }}
                >
                  Save Timetable
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Algorithm Tabs */}
      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab label="Genetic Algorithm" icon={<Psychology />} />
            <Tab label="Graph Coloring" icon={<AccountTree />} />
            <Tab label="Compare Algorithms" icon={<Compare />} />
          </Tabs>

          {activeTab === 0 && renderGeneticAlgorithmTab()}
          {activeTab === 1 && renderGraphColoringTab()}
          {activeTab === 2 && renderComparisonTab()}
        </CardContent>
      </Card>

      {/* Results Display */}
      {results && results.schedule && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Generated Schedule ({results.schedule.length} entries)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Course</TableCell>
                    <TableCell>Day</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Classroom</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.schedule.slice(0, 20).map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.courseId}</TableCell>
                      <TableCell>{entry.day}</TableCell>
                      <TableCell>{entry.startTime} - {entry.endTime}</TableCell>
                      <TableCell>{entry.duration}min</TableCell>
                      <TableCell>{entry.classroomId}</TableCell>
                    </TableRow>
                  ))}
                  {results.schedule.length > 20 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                        ... and {results.schedule.length - 20} more entries
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default AdvancedTimetableGeneration;