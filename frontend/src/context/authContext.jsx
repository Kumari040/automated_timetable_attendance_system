/* eslint react-refresh/only-export-components: "off" */
import {createContext, useState, useEffect, useContext} from "react";
import axios from "axios";

export const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);
    const [studentGroupId, setStudentGroupId] = useState(null);
    
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("user");
            const storedToken = localStorage.getItem("token");
            const storedGroupId = localStorage.getItem("studentGroupId");

            if (storedUser && storedUser !== "undefined" && storedToken) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setToken(storedToken);
                if (parsedUser.role === 'student' && storedGroupId) {
                    setStudentGroupId(storedGroupId);
                }
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            }
        } catch (err) {
            console.error("Invalid user data in localStorage:", err);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("studentGroupId");
        } finally {
            setLoading(false);
        }
    }, []);

    const login = (userData, authToken) => {
        setUser(userData);
        setToken(authToken);
        if (userData.role === 'student') {
            setStudentGroupId(userData.studentGroupId || null);
            if (userData.studentGroupId) {
                localStorage.setItem("studentGroupId", userData.studentGroupId);
            } else {
                localStorage.removeItem("studentGroupId");
            }
        } else {
            setStudentGroupId(null);
            localStorage.removeItem("studentGroupId");
        }
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", authToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        setStudentGroupId(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("studentGroupId");
        delete axios.defaults.headers.common['Authorization'];
    };

    const isAuthenticated = () => {
        return user !== null && token !== null;
    };

    const hasRole = (roles) => {
        if (!user) return false;
        if (Array.isArray(roles)) {
            return roles.includes(user.role);
        }
        return user.role === roles;
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            studentGroupId,
            loading,
            login,
            logout,
            isAuthenticated,
            hasRole
        }}>
            {children}
        </AuthContext.Provider>
    );
};
