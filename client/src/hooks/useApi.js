import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook to manage API fetch state (loading, error, data).
 * 
 * @param {string|function} urlOrFn - The API endpoint URL or a function returning a Promise
 * @param {object} options - Fetch options (method, headers, body, etc)
 * @param {boolean} options.immediate - Whether to run the request immediately on mount (default: true)
 * @returns {object} { data, loading, error, execute }
 */
export function useApi(urlOrFn, options = {}) {
  const { immediate = true, ...fetchOptions } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  
  const { logout } = useAuth();
  // Using a ref to hold options to prevent infinite useEffect loops
  const optionsRef = useRef(fetchOptions);
  
  const execute = useCallback(async (dynamicUrlOrFn = urlOrFn, dynamicOptions = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const isFunction = typeof dynamicUrlOrFn === 'function';
      let result;

      if (isFunction) {
        result = await dynamicUrlOrFn();
      } else {
        const finalUrl = dynamicUrlOrFn.startsWith('http') 
          ? dynamicUrlOrFn 
          : `/api${dynamicUrlOrFn.startsWith('/') ? '' : '/'}${dynamicUrlOrFn}`;
          
        const finalOptions = {
          ...optionsRef.current,
          ...dynamicOptions,
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('accessToken') ? { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } : {}),
            ...optionsRef.current.headers,
            ...(dynamicOptions?.headers || {})
          }
        };

        const response = await fetch(finalUrl, finalOptions);
        
        if (response.status === 401 || response.status === 403) {
           logout();
           throw new Error('Authentication expired. Please log in again.');
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `API Error: ${response.status}`);
        }

        // Handle empty responses (like 204 No Content)
        const text = await response.text();
        result = text ? JSON.parse(text) : null;
      }

      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [urlOrFn, logout]);

  useEffect(() => {
    if (immediate) {
      execute().catch(() => {}); // Catch handled in state
    }
  }, [execute, immediate]);

  return { data, loading, error, execute, setData };
}
