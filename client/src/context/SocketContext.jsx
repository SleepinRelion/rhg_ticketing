import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const { success, error } = useToast();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || '';
    
    // Create socket connection
    const newSocket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // We only want to show the toast if we are reconnecting after a drop
      if (newSocket.recovered) {
        success('Live connection restored.');
      }
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        error('Connection to server lost. Reconnecting...');
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
      success('Live connection restored.');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
