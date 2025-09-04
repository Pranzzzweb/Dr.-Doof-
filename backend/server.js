const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { chatWithDoof } = require('../ai/inference/model');

require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// In-memory storage (replace with database in production)
let sessions = new Map();

// Utility functions
function updateKeywordFrequency(message) {
    // ... (This function is fine, no changes)
}

function getTodayKey() {
    // ... (This function is fine, no changes)
}

function updateDailyStats(mood) {
    // ... (This function is fine, no changes)
}

// Routes

// Create new session
app.post('/api/session/start', (req, res) => {
    const sessionId = uuidv4();
    const session = {
        id: sessionId,
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        moodHistory: [],
        currentMood: 'neutral',
        chatHistory: [] // Add chat history to the session
    };

    sessions.set(sessionId, session);
    res.json({
        success: true,
        sessionId: sessionId,
        message: "Welcome to Dr. Doof's Mood Mate! How are you feeling today?"
    });
});

// AI-powered chat route (calls Dr. Doof LLM)
app.post('/api/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({ error: 'Missing sessionId or message in body' });
        }

        let session = sessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found. Please start a new session.' });
        }

        // Add the user's message to the session's chat history
        session.chatHistory.push({ role: 'user', content: message });

        // Call AI model with the full chat history
        const aiResult = await chatWithDoof({ userId: sessionId, messages: session.chatHistory });

        if (!aiResult.success) {
            return res.status(500).json({ ...aiResult, error: 'AI response generation failed.' });
        }

        const detectedMood = aiResult.detectedMood || 'neutral';
        const responseMessage = aiResult.message;
        const suggestions = aiResult.suggestions;
        
        // Add the AI's response to the chat history
        session.chatHistory.push({ role: 'assistant', content: responseMessage });

        // Update session state
        session.lastActivity = new Date();
        session.messageCount++;
        session.currentMood = detectedMood;
        session.moodHistory.push({ mood: detectedMood, timestamp: new Date() });

        // Update analytics (your analytics functions are fine, just make sure they exist)

        return res.json({
            success: true,
            message: responseMessage,
            detectedMood: detectedMood,
            suggestions: suggestions,
            sessionStats: {
                messageCount: session.messageCount,
                currentMood: detectedMood,
                sessionDuration: new Date() - session.startTime
            }
        });
    } catch (err) {
        console.error('AI chat error:', err);
        return res.status(500).json({
            success: false,
            error: 'An unexpected error occurred.',
            details: err.message
        });
    }
});

// Get session history
app.get('/api/session/:sessionId/history', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
        session: session,
        chatHistory: session.chatHistory || [],
        moodSummary: session.moodHistory.reduce((acc, entry) => {
            acc[entry.mood] = (acc[entry.mood] || 0) + 1;
            return acc;
        }, {})
    });
});

// Get mood analytics
app.get('/api/analytics/mood', (req, res) => {
    // ... (This route is fine, no changes)
});

// Get daily mood trends
app.get('/api/analytics/trends', (req, res) => {
    // ... (This route is fine, no changes)
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        activeSessions: sessions.size,
    });
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Cleanup old sessions (run every hour)
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [sessionId, session] of sessions.entries()) {
        if (session.lastActivity < oneHourAgo) {
            sessions.delete(sessionId);
            console.log(`Cleaned up inactive session: ${sessionId}`);
        }
    }
}, 60 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🧪 Dr. Doof's Mood Mate Backend is running on port ${PORT}`);
});
