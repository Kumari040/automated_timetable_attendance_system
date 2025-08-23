import axios from "axios";

export const addStudent = async (data) => {
  const res = await axios.post("/api/students", data);
  return res.data;
};

export const getStudents = async () => {
  const res = await axios.get("/api/students");
  return res.data;
};

export const updateStudent = async (id, data) => {
  const res = await axios.put(`/api/students/${id}`, data);
  return res.data;
};

// Delete a student by ID
export const deleteStudent = async (id) => {
  const res = await axios.delete(`/api/students/${id}`);
  return res.data;
};

