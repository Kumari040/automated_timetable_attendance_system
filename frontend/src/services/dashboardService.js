import { apiClient } from './api';

export const dashboardService = {
  // Admin dashboard data
  getAdminDashboard: async () => {
    const response = await apiClient.get('/dashboard/admin');
    return response.data;
  },

  // Faculty dashboard data
  getFacultyDashboard: async () => {
    const response = await apiClient.get('/dashboard/faculty');
    return response.data;
  },

  // Student dashboard data
  getStudentDashboard: async () => {
    const response = await apiClient.get('/dashboard/student');
    return response.data;
  },

  // Analytics data (admin only)
  getAnalytics: async (params = {}) => {
    const response = await apiClient.get('/dashboard/analytics', { params });
    return response.data;
  }
};

export default dashboardService;