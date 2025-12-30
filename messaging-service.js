const MessagingService = {
    activeUsers: new Map(),
    conversationRooms: new Map(),
    messageHistory: new Map(),
    maxUsersPerRoom: 5,

    initializeRoom: function(roomId, roomName = 'Vent Room') {
        if (!this.conversationRooms.has(roomId)) {
            this.conversationRooms.set(roomId, {
                id: roomId,
                name: roomName,
                createdAt: new Date(),
                participants: new Set(),
                messageCount: 0,
                isPublic: true
            });
            this.messageHistory.set(roomId, []);
        }
        return this.conversationRooms.get(roomId);
    },

    addUserToRoom: function(userId, userName, roomId, isAnonymous = false) {
        const room = this.initializeRoom(roomId);
        
        if (room.participants.size >= this.maxUsersPerRoom) {
            return { success: false, message: 'Room is full (max 5 users)' };
        }

        if (!this.activeUsers.has(userId)) {
            this.activeUsers.set(userId, {
                userId: userId,
                userName: userName,
                roomId: roomId,
                joinedAt: new Date(),
                isAnonymous: isAnonymous,
                messageCount: 0,
                lastActive: new Date()
            });
        }

        room.participants.add(userId);
        return { 
            success: true, 
            message: 'User added to room',
            activeUsers: Array.from(room.participants).length 
        };
    },

    removeUserFromRoom: function(userId, roomId) {
        const room = this.conversationRooms.get(roomId);
        if (room) {
            room.participants.delete(userId);
        }
        this.activeUsers.delete(userId);
    },

    sendMessage: function(userId, roomId, text, messageType = 'text') {
        const room = this.conversationRooms.get(roomId);
        const user = this.activeUsers.get(userId);

        if (!room || !user) {
            return { success: false, message: 'Invalid room or user' };
        }

        if (text.trim().length === 0) {
            return { success: false, message: 'Message cannot be empty' };
        }

        if (text.length > 500) {
            return { success: false, message: 'Message too long (max 500 characters)' };
        }

        const message = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId: userId,
            userName: user.isAnonymous ? 'Anonymous User #' + userId.slice(0, 6) : user.userName,
            roomId: roomId,
            text: text,
            type: messageType,
            timestamp: new Date(),
            isAnonymous: user.isAnonymous,
            reactions: []
        };

        const roomMessages = this.messageHistory.get(roomId) || [];
        roomMessages.push(message);
        this.messageHistory.set(roomId, roomMessages.slice(-100));

        room.messageCount++;
        user.messageCount++;
        user.lastActive = new Date();

        return { 
            success: true, 
            message: message,
            activeUsers: Array.from(room.participants).length 
        };
    },

    getRoomMessages: function(roomId, limit = 50) {
        const messages = this.messageHistory.get(roomId) || [];
        return messages.slice(-limit);
    },

    getActiveUsers: function(roomId) {
        const room = this.conversationRooms.get(roomId);
        if (!room) return [];
        
        return Array.from(room.participants).map(userId => {
            const user = this.activeUsers.get(userId);
            return {
                userId: user.userId,
                userName: user.isAnonymous ? 'Anonymous User #' + user.userId.slice(0, 6) : user.userName,
                isAnonymous: user.isAnonymous,
                lastActive: user.lastActive,
                messageCount: user.messageCount
            };
        });
    },

    getRoomStats: function(roomId) {
        const room = this.conversationRooms.get(roomId);
        const messages = this.messageHistory.get(roomId) || [];
        
        if (!room) return null;

        return {
            roomId: room.id,
            roomName: room.name,
            activeUserCount: room.participants.size,
            totalMessages: room.messageCount,
            createdAt: room.createdAt,
            participantCount: room.participants.size,
            messageHistory: messages.length
        };
    },

    clearRoomMessages: function(roomId) {
        if (this.messageHistory.has(roomId)) {
            this.messageHistory.set(roomId, []);
            const room = this.conversationRooms.get(roomId);
            if (room) {
                room.messageCount = 0;
            }
            return { success: true, message: 'Messages cleared' };
        }
        return { success: false, message: 'Room not found' };
    },

    closeRoom: function(roomId) {
        const room = this.conversationRooms.get(roomId);
        if (room) {
            room.participants.forEach(userId => {
                this.activeUsers.delete(userId);
            });
            this.conversationRooms.delete(roomId);
            this.messageHistory.delete(roomId);
            return { success: true, message: 'Room closed' };
        }
        return { success: false, message: 'Room not found' };
    },

    addMessageReaction: function(messageId, roomId, emoji) {
        const messages = this.messageHistory.get(roomId) || [];
        const message = messages.find(m => m.id === messageId);
        
        if (message) {
            if (!message.reactions) {
                message.reactions = [];
            }
            message.reactions.push({ emoji: emoji, timestamp: new Date() });
            return { success: true, message: 'Reaction added' };
        }
        return { success: false, message: 'Message not found' };
    }
};
