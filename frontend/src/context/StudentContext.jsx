/* eslint react-refresh/only-export-components: "off" */
import { createContext, useState, useEffect } from "react";
import {
  addStudent as addStudentService,
  getStudents,
  updateStudent as updateStudentService,
  deleteStudent as deleteStudentService,
} from "../services/studentService";

export const StudentContext = createContext();

export const StudentProvider = ({ children }) => {
    const [students, setStudents] = useState([]);

    useEffect(()=>{
        const fetchStudents = async () => {
            const data = await getStudents();
            if (Array.isArray(data)) {
                setStudents(data.map((s) => ({ ...s, id: s._id })));
            } else {
                console.error("Invalid students response:", data);
                setStudents([]);
            }
        };
        fetchStudents().catch((err) => {
            console.error("Failed to fetch students:", err);
        });
    },[]);

    const addStudent = async (student) => {
        const created = await addStudentService(student);
        const createdWithId = { ...created, id: created._id };
        setStudents((prev) => [...prev, createdWithId]);
    };

    const updateStudent = async (student) => {
        const updated = await updateStudentService(student.id, student);
        const updatedWithId = { ...updated, id: updated._id };
        setStudents((prev) => prev.map((s) => (s.id === student.id ? updatedWithId : s)));
    };

    const deleteStudent = async (id) => {
        try {
            await deleteStudentService(id);
            setStudents((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <StudentContext.Provider value={{ students, addStudent, updateStudent, deleteStudent }}>
            {children}
        </StudentContext.Provider>
    );
};
