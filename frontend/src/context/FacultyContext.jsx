/* eslint react-refresh/only-export-components: "off" */
import {createContext, useState, useEffect} from "react";
export const FacultyContext=createContext();
export const FacultyProvider=({children})=>{
    const [faculties,setFaculties]=useState([]);

    useEffect(()=>{
        const stored=localStorage.getItem("faculties");
        if(stored){
            setFaculties(JSON.parse(stored));
        }
    },[]);

    const persist=(data)=>{
        setFaculties(data);
        localStorage.setItem("faculties",JSON.stringify(data));
    };

    const addFaculty=(faculty)=>{
        const newFaculty={...faculty,id:Date.now().toString()};
        persist([...faculties,newFaculty]);
    };

    const updateFaculty=(updated)=>{
        const updatedList=faculties.map((f)=>f.id===updated.id?updated:f);
        persist(updatedList);
    };

    const deleteFaculty=(id)=>{
        const updatedList=faculties.filter((f)=>f.id!==id);
        persist(updatedList);
    };

    return(
        <FacultyContext.Provider value={{faculties,addFaculty,updateFaculty,deleteFaculty}}>
            {children}
        </FacultyContext.Provider>
    );
};
