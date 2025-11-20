/**
 * Real-Time Collaboration Service
 * WebSocket-based presence detection and collaborative editing
 */

const socketIo = require('socket.io');

class CollaborationService {
  constructor() {
    this.io = null;
    this.activeUsers = new Map(); // reportId -> Set of userIds
    this.userSockets = new Map(); // userId -> socketId
    this.cursors = new Map(); // reportId -> Map(userId -> position)
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer) {
    this.io = socketIo(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3010'],
        credentials: true
      },
      path: '/socket.io'
    });

    this.setupEventHandlers();
    console.log('✅ Collaboration service initialized');
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Authenticate socket connection
      socket.on('authenticate', async (data) => {
        try {
          const { token, userId, userName } = data;
          // TODO: Verify JWT token
          
          socket.userId = userId;
          socket.userName = userName;
          this.userSockets.set(userId, socket.id);
          
          socket.emit('authenticated', { success: true });
          console.log(`✅ User authenticated: ${userName} (${userId})`);
        } catch (error) {
          socket.emit('authenticated', { success: false, error: error.message });
        }
      });

      // Join report room for collaboration
      socket.on('join-report', async (data) => {
        const { reportId } = data;
        
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Join room
        socket.join(`report:${reportId}`);
        
        // Track active user
        if (!this.activeUsers.has(reportId)) {
          this.activeUsers.set(reportId, new Set());
        }
        this.activeUsers.get(reportId).add(socket.userId);

        // Get current active users
        const activeUsers = Array.from(this.activeUsers.get(reportId));
        
        // Notify everyone in the room
        this.io.to(`report:${reportId}`).emit('user-joined', {
          userId: socket.userId,
          userName: socket.userName,
          activeUsers,
          timestamp: new Date().toISOString()
        });

        // Send current cursors to new user
        if (this.cursors.has(reportId)) {
          socket.emit('cursors-sync', {
            cursors: Array.from(this.cursors.get(reportId).entries())
              .map(([userId, position]) => ({ userId, position }))
          });
        }

        console.log(`📝 User ${socket.userName} joined report ${reportId}`);
      });

      // Leave report room
      socket.on('leave-report', (data) => {
        const { reportId } = data;
        this.handleLeaveReport(socket, reportId);
      });

      // Cursor position update
      socket.on('cursor-move', (data) => {
        const { reportId, field, position } = data;
        
        if (!this.cursors.has(reportId)) {
          this.cursors.set(reportId, new Map());
        }
        
        this.cursors.get(reportId).set(socket.userId, {
          field,
          position,
          userName: socket.userName
        });

        // Broadcast to others in the room
        socket.to(`report:${reportId}`).emit('cursor-updated', {
          userId: socket.userId,
          userName: socket.userName,
          field,
          position
        });
      });

      // Field lock (when user starts editing)
      socket.on('field-lock', (data) => {
        const { reportId, field } = data;
        
        socket.to(`report:${reportId}`).emit('field-locked', {
          userId: socket.userId,
          userName: socket.userName,
          field,
          timestamp: new Date().toISOString()
        });
      });

      // Field unlock
      socket.on('field-unlock', (data) => {
        const { reportId, field } = data;
        
        socket.to(`report:${reportId}`).emit('field-unlocked', {
          userId: socket.userId,
          field
        });
      });

      // Content change notification
      socket.on('content-change', (data) => {
        const { reportId, field, action, preview } = data;
        
        socket.to(`report:${reportId}`).emit('content-changed', {
          userId: socket.userId,
          userName: socket.userName,
          field,
          action, // 'typing', 'updated', 'saved'
          preview,
          timestamp: new Date().toISOString()
        });
      });

      // Typing indicator
      socket.on('typing-start', (data) => {
        const { reportId, field } = data;
        
        socket.to(`report:${reportId}`).emit('user-typing', {
          userId: socket.userId,
          userName: socket.userName,
          field
        });
      });

      socket.on('typing-stop', (data) => {
        const { reportId, field } = data;
        
        socket.to(`report:${reportId}`).emit('user-stopped-typing', {
          userId: socket.userId,
          field
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        
        if (socket.userId) {
          this.userSockets.delete(socket.userId);
          
          // Remove from all active reports
          for (const [reportId, users] of this.activeUsers.entries()) {
            if (users.has(socket.userId)) {
              this.handleLeaveReport(socket, reportId);
            }
          }
        }
      });
    });
  }

  /**
   * Handle user leaving report
   */
  handleLeaveReport(socket, reportId) {
    if (!socket.userId) return;

    socket.leave(`report:${reportId}`);
    
    if (this.activeUsers.has(reportId)) {
      this.activeUsers.get(reportId).delete(socket.userId);
      
      // Notify others
      socket.to(`report:${reportId}`).emit('user-left', {
        userId: socket.userId,
        userName: socket.userName,
        activeUsers: Array.from(this.activeUsers.get(reportId)),
        timestamp: new Date().toISOString()
      });

      // Clean up if no users left
      if (this.activeUsers.get(reportId).size === 0) {
        this.activeUsers.delete(reportId);
        this.cursors.delete(reportId);
      }
    }

    console.log(`📝 User ${socket.userName} left report ${reportId}`);
  }

  /**
   * Send notification to specific user
   */
  notifyUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Broadcast to all users in a report
   */
  broadcastToReport(reportId, event, data) {
    this.io.to(`report:${reportId}`).emit(event, data);
  }

  /**
   * Get active users for a report
   */
  getActiveUsers(reportId) {
    return this.activeUsers.has(reportId)
      ? Array.from(this.activeUsers.get(reportId))
      : [];
  }

  /**
   * Check if user is active in a report
   */
  isUserActive(reportId, userId) {
    return this.activeUsers.has(reportId) &&
           this.activeUsers.get(reportId).has(userId);
  }
}

module.exports = new CollaborationService();
