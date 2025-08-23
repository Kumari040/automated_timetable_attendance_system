import axios from "axios";

export const markAttendance = async (data) => {
  const res = await axios.post("/api/attendance", data);
  return res.data;
};