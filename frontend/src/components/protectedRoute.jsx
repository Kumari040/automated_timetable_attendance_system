
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { CircularProgress, Box } from "@mui/material";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated, hasRole } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;