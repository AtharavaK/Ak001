const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes and services
const botRoutes = require('./routes/bot');
const databaseService = require('./services/databaseService');
const conversationService = require('./services/conversationService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/conversation', botRoutes);

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Socket.IO for real-time chat
const activeSessions = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('start-conversation', async () => {
    try {
      const sessionData = await conversationService.startConversation();
      activeSessions.set(socket.id, sessionData);

      socket.emit('bot-message', {
        type: 'bot',
        message: sessionData.currentMessage,
        step: sessionData.currentStep,
        progress: sessionData.progress
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      socket.emit('error', { message: 'Failed to start conversation. Please try again.' });
    }
  });

  socket.on('user-message', async (data) => {
    try {
      const sessionData = activeSessions.get(socket.id);
      if (!sessionData) {
        socket.emit('error', { message: 'Session not found. Please refresh the page.' });
        return;
      }

      const response = await conversationService.processMessage(sessionData, data.message);
      activeSessions.set(socket.id, response.sessionData);

      socket.emit('bot-message', {
        type: 'bot',
        message: response.message,
        step: response.sessionData.currentStep,
        progress: response.sessionData.progress,
        validation: response.validation,
        isComplete: response.sessionData.isComplete
      });

      // Send summary if conversation is complete
      if (response.sessionData.isComplete) {
        socket.emit('summary', {
          applicationData: response.sessionData.applicationData
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', { message: 'An error occurred. Please try again.' });
    }
  });

  socket.on('submit-application', async (data) => {
    try {
      const sessionData = activeSessions.get(socket.id);
      if (!sessionData) {
        socket.emit('error', { message: 'Session not found. Please refresh the page.' });
        return;
      }

      const result = await databaseService.saveApplication(sessionData.applicationData);

      if (result.success) {
        socket.emit('submission-success', {
          message: 'Your information has been successfully recorded. Thank you for applying!',
          applicationId: result.applicationId
        });

        // Clear session after successful submission
        activeSessions.delete(socket.id);
      } else {
        socket.emit('submission-error', {
          message: 'We encountered an issue saving your data. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      socket.emit('submission-error', {
        message: 'We encountered an issue saving your data. Please try again.'
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    activeSessions.delete(socket.id);
  });
});

// Initialize database
async function initializeDatabase() {
  try {
    await databaseService.initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred. Please try again.'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
async function startServer() {
  await initializeDatabase();

  server.listen(PORT, () => {
    console.log(`HR Bot server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer().catch(console.error);

module.exports = { app, server, io };