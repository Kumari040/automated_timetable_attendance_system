import { apiClient } from "./api";

export const registerUser = async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    return res.data;
};

export const loginUser = async (userData) => {
    const res = await apiClient.post('/auth/login', userData);
    return res.data;
};
