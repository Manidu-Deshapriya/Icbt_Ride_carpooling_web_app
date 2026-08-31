const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { validateBody } = require('../middleware/validate');

/**
 * GET /api/chats/ride/:rideId - Get chat for specific ride
 */
router.get('/ride/:rideId', async (req, res, next) => {
  try {
    const { rideId } = req.params;
    if (!db) return res.status(200).json({ success: true, data: [] });

    const snap = await db.collection('chats').where('rideId', '==', rideId).get();
    const chats = [];
    snap.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      data: chats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chats/:userId - Get all chats for user
 */
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('chats').where('participants', 'array-contains', userId).get();
    const chats = [];
    snap.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chats - Create new chat session
 */
router.post('/', validateBody(['rideId', 'driverId', 'passengerId']), async (req, res, next) => {
  try {
    const { rideId, driverId, driverName, passengerId, passengerName } = req.body;

    const chatData = {
      rideId,
      driverId,
      driverName: driverName || 'Driver',
      passengerId,
      passengerName: passengerName || 'Passenger',
      participants: [driverId, passengerId],
      status: 'active',
      lastMessage: '',
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    let id = `chat_${Date.now()}`;
    if (db) {
      const docRef = await db.collection('chats').add(chatData);
      id = docRef.id;
    }

    res.status(201).json({
      success: true,
      message: 'Chat room initialized',
      data: { id, ...chatData }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chats/:chatId/messages - Get chat messages
 */
router.get('/:chatId/messages', async (req, res, next) => {
  try {
    const { chatId } = req.params;
    if (!db) return res.status(200).json({ success: true, count: 0, data: [] });

    const snap = await db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp', 'asc').get();
    const messages = [];
    snap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chats/:chatId/messages - Send message (with access control check)
 */
router.post('/:chatId/messages', validateBody(['senderId', 'text']), async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { senderId, senderName, text } = req.body;

    if (!db) {
      return res.status(201).json({ success: true, message: 'Message sent' });
    }

    // Access Control: Verify chat exists and is active
    const chatDoc = await db.collection('chats').doc(chatId).get();
    if (!chatDoc.exists) {
      return res.status(404).json({ success: false, error: 'Chat not found', code: 'CHAT_NOT_FOUND' });
    }

    const chatData = chatDoc.data();
    if (chatData.status === 'closed' || chatData.status === 'completed') {
      return res.status(403).json({
        success: false,
        error: 'Chat is disabled because the ride has concluded or been cancelled.',
        code: 'CHAT_DISABLED'
      });
    }

    const msgData = {
      senderId,
      senderName: senderName || 'User',
      text,
      timestamp: new Date().toISOString(),
      read: false
    };

    const msgRef = await db.collection('chats').doc(chatId).collection('messages').add(msgData);

    // Update parent chat snippet
    await db.collection('chats').doc(chatId).update({
      lastMessage: text,
      lastMessageAt: msgData.timestamp
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { id: msgRef.id, ...msgData }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/chats/:chatId/read - Mark messages as read
 */
router.put('/:chatId/read', async (req, res, next) => {
  try {
    const { chatId } = req.params;

    if (db) {
      const snap = await db.collection('chats').doc(chatId).collection('messages').where('read', '==', false).get();
      const batch = db.batch();
      snap.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
