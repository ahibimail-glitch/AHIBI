const LivestreamChat = require('../models/LivestreamChat');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const setupLivestreamChat = (io) => {
  const chatNamespace = io.of('/livestream-chat');

  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.log('Socket auth failed: No token provided');
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Socket auth: Token decoded for user ID:', decoded.id);
      
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log('Socket auth failed: User not found for ID:', decoded.id);
        return next(new Error('User not found'));
      }

      socket.user = user;
      console.log('Socket auth successful for user:', user.name);
      next();
    } catch (error) {
      console.log('Socket auth error:', error.message);
      next(new Error('Invalid token'));
    }
  });

  chatNamespace.on('connection', (socket) => {
    console.log(`User connected to chat: ${socket.user.name} (${socket.user._id})`);

    socket.on('join-stream', (streamId) => {
      socket.join(`stream-${streamId}`);
      console.log(`User ${socket.user.name} joined stream ${streamId}`);
      
      socket.emit('joined-stream', {
        streamId,
        message: 'Successfully joined chat'
      });
    });

    socket.on('leave-stream', (streamId) => {
      socket.leave(`stream-${streamId}`);
      console.log(`User ${socket.user.name} left stream ${streamId}`);
    });

    socket.on('send-message', async (data) => {
      try {
        const { streamId, message } = data;

        if (!message || message.trim().length === 0) {
          return socket.emit('error', { message: 'Message cannot be empty' });
        }

        if (message.length > 500) {
          return socket.emit('error', { message: 'Message too long (max 500 characters)' });
        }

        const chatMessage = new LivestreamChat({
          streamId,
          userId: socket.user._id,
          userName: socket.user.name,
          userEmail: socket.user.email,
          message: message.trim(),
          timestamp: new Date()
        });

        await chatMessage.save();

        const messageData = {
          _id: chatMessage._id,
          streamId: chatMessage.streamId,
          userId: chatMessage.userId,
          userName: chatMessage.userName,
          userEmail: chatMessage.userEmail,
          message: chatMessage.message,
          timestamp: chatMessage.timestamp,
          isDeleted: chatMessage.isDeleted
        };

        chatNamespace.to(`stream-${streamId}`).emit('new-message', messageData);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('delete-message', async (data) => {
      try {
        const { messageId, streamId } = data;
        const message = await LivestreamChat.findById(messageId);

        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        if (message.userId.toString() !== socket.user._id.toString() && socket.user.role !== 'admin') {
          return socket.emit('error', { message: 'Not authorized to delete this message' });
        }

        message.isDeleted = true;
        message.deletedBy = socket.user._id;
        message.deletedAt = new Date();
        await message.save();

        chatNamespace.to(`stream-${streamId}`).emit('message-deleted', {
          messageId,
          deletedBy: socket.user._id
        });
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    socket.on('typing', (data) => {
      const { streamId, isTyping } = data;
      socket.to(`stream-${streamId}`).emit('user-typing', {
        userId: socket.user._id,
        userName: socket.user.name,
        isTyping
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from chat: ${socket.user.name}`);
    });
  });

  return chatNamespace;
};

module.exports = setupLivestreamChat;
