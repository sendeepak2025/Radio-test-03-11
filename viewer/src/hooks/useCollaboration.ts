import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ActiveUser {
  userId: string;
  name: string;
  avatar?: string;
  cursor?: { x: number; y: number; fieldId?: string };
  activity: 'viewing' | 'editing' | 'idle';
  lastActivity: Date;
}

interface FieldLock {
  fieldId: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

interface TypingIndicator {
  userId: string;
  userName: string;
  fieldId: string;
}

interface UseCollaborationOptions {
  reportId?: string;
  enabled?: boolean;
  onUserJoin?: (user: ActiveUser) => void;
  onUserLeave?: (userId: string) => void;
  onCursorMove?: (userId: string, position: { x: number; y: number; fieldId?: string }) => void;
  onFieldLock?: (lock: FieldLock) => void;
  onFieldUnlock?: (fieldId: string) => void;
  onTyping?: (indicator: TypingIndicator) => void;
  onTypingStop?: (userId: string, fieldId: string) => void;
}

export function useCollaboration(options: UseCollaborationOptions = {}) {
  const {
    reportId,
    enabled = true,
    onUserJoin,
    onUserLeave,
    onCursorMove,
    onFieldLock,
    onFieldUnlock,
    onTyping,
    onTypingStop
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Map<string, ActiveUser>>(new Map());
  const [fieldLocks, setFieldLocks] = useState<Map<string, FieldLock>>(new Map());
  const [typingIndicators, setTypingIndicators] = useState<Map<string, TypingIndicator>>(new Map());

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize socket connection
  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token found for collaboration');
      return;
    }

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Collaboration socket connected');
      setConnected(true);
      reconnectAttempts.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Collaboration socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Collaboration connection error:', error);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    // Collaboration events
    newSocket.on('user-joined', (user: ActiveUser) => {
      console.log('👤 User joined:', user.name);
      setActiveUsers((prev) => new Map(prev).set(user.userId, user));
      onUserJoin?.(user);
    });

    newSocket.on('user-left', (userId: string) => {
      console.log('👤 User left:', userId);
      setActiveUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
      onUserLeave?.(userId);
    });

    newSocket.on('cursor-moved', ({ userId, position }) => {
      setActiveUsers((prev) => {
        const user = prev.get(userId);
        if (!user) return prev;
        
        const next = new Map(prev);
        next.set(userId, { ...user, cursor: position, lastActivity: new Date() });
        return next;
      });
      onCursorMove?.(userId, position);
    });

    newSocket.on('field-locked', (lock: FieldLock) => {
      setFieldLocks((prev) => new Map(prev).set(lock.fieldId, lock));
      onFieldLock?.(lock);
    });

    newSocket.on('field-unlocked', (fieldId: string) => {
      setFieldLocks((prev) => {
        const next = new Map(prev);
        next.delete(fieldId);
        return next;
      });
      onFieldUnlock?.(fieldId);
    });

    newSocket.on('typing-started', (indicator: TypingIndicator) => {
      const key = `${indicator.userId}:${indicator.fieldId}`;
      setTypingIndicators((prev) => new Map(prev).set(key, indicator));
      onTyping?.(indicator);
    });

    newSocket.on('typing-stopped', ({ userId, fieldId }) => {
      const key = `${userId}:${fieldId}`;
      setTypingIndicators((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      onTypingStop?.(userId, fieldId);
    });

    newSocket.on('users-list', (users: ActiveUser[]) => {
      const usersMap = new Map(users.map(u => [u.userId, u]));
      setActiveUsers(usersMap);
    });

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [enabled]);

  // Join report room
  useEffect(() => {
    if (!socket || !connected || !reportId) return;

    socket.emit('join-report', reportId);

    return () => {
      socket.emit('leave-report', reportId);
    };
  }, [socket, connected, reportId]);

  // Send cursor position
  const sendCursorPosition = useCallback((position: { x: number; y: number; fieldId?: string }) => {
    if (!socket || !connected || !reportId) return;
    socket.emit('cursor-move', { reportId, position });
  }, [socket, connected, reportId]);

  // Lock field
  const lockField = useCallback((fieldId: string) => {
    if (!socket || !connected || !reportId) return;
    socket.emit('field-lock', { reportId, fieldId });
  }, [socket, connected, reportId]);

  // Unlock field
  const unlockField = useCallback((fieldId: string) => {
    if (!socket || !connected || !reportId) return;
    socket.emit('field-unlock', { reportId, fieldId });
  }, [socket, connected, reportId]);

  // Start typing
  const startTyping = useCallback((fieldId: string) => {
    if (!socket || !connected || !reportId) return;
    socket.emit('typing-start', { reportId, fieldId });
  }, [socket, connected, reportId]);

  // Stop typing
  const stopTyping = useCallback((fieldId: string) => {
    if (!socket || !connected || !reportId) return;
    socket.emit('typing-stop', { reportId, fieldId });
  }, [socket, connected, reportId]);

  // Check if field is locked by another user
  const isFieldLocked = useCallback((fieldId: string): { locked: boolean; user?: string } => {
    const lock = fieldLocks.get(fieldId);
    if (!lock) return { locked: false };
    
    // Check if it's locked by current user
    const currentUserId = localStorage.getItem('userId');
    if (lock.userId === currentUserId) return { locked: false };
    
    return { locked: true, user: lock.userName };
  }, [fieldLocks]);

  // Get typing users for a field
  const getTypingUsers = useCallback((fieldId: string): string[] => {
    const users: string[] = [];
    typingIndicators.forEach((indicator) => {
      if (indicator.fieldId === fieldId) {
        users.push(indicator.userName);
      }
    });
    return users;
  }, [typingIndicators]);

  return {
    socket,
    connected,
    activeUsers: Array.from(activeUsers.values()),
    fieldLocks,
    sendCursorPosition,
    lockField,
    unlockField,
    startTyping,
    stopTyping,
    isFieldLocked,
    getTypingUsers
  };
}
