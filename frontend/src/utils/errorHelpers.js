// Utility functions to help prevent and handle errors that cause blank screens

export const safeApiCall = async (apiCall, fallbackValue = null) => {
  try {
    const result = await apiCall();
    return { success: true, data: result, error: null };
  } catch (error) {
    console.error('API call failed:', error);
    return { 
      success: false, 
      data: fallbackValue, 
      error: error.response?.data?.message || error.message || 'Unknown error' 
    };
  }
};

export const safeSetState = (setter, value, fallback = null) => {
  try {
    setter(value);
  } catch (error) {
    console.error('State setting failed:', error);
    setter(fallback);
  }
};

export const validateDataGridRows = (rows) => {
  if (!Array.isArray(rows)) {
    console.warn('DataGrid rows is not an array:', rows);
    return [];
  }
  
  return rows.filter(row => {
    if (!row || typeof row !== 'object') {
      console.warn('Invalid row found:', row);
      return false;
    }
    
    if (!row._id && !row.id) {
      console.warn('Row missing required ID:', row);
      return false;
    }
    
    return true;
  });
};

export const createErrorHandler = (setError, context = '') => {
  return (error, customMessage = '') => {
    const message = customMessage || error.response?.data?.message || error.message || 'An error occurred';
    console.error(`Error in ${context}:`, error);
    setError(message);
  };
};

export const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};