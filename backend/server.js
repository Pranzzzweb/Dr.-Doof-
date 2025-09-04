const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { chatWithDoof } = require('../ai/inference/model');

require('dotenv').config(); // load backend/.env

const app = express();
app.set('trust proxy', 1); // trust the first proxy

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your frontend files

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// In-memory storage (replace with database in production)
let sessions = new Map();
let chatLogs = new Map();
let moodAnalytics = {
    totalSessions: 0,
    moodDistribution: {
        happy: 0,
        sad: 0,
        stressed: 0,
        neutral: 0,
        angry: 0
    },
    commonKeywords: {},
    dailyStats: {}
};

// Utility functions
function updateKeywordFrequency(message) {
    const words = message.toLowerCase().split(/\s+/);
    words.forEach(word => {
        if (word.length > 3) { // Only count words longer than 3 characters
            moodAnalytics.commonKeywords[word] = (moodAnalytics.commonKeywords[word] || 0) + 1;
        }
    });
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function updateDailyStats(mood) {
    const today = getTodayKey();
    if (!moodAnalytics.dailyStats[today]) {
        moodAnalytics.dailyStats[today] = {
            happy: 0, sad: 0, stressed: 0, angry: 0, neutral: 0, totalMessages: 0
        };
    }
    moodAnalytics.dailyStats[today][mood]++;
    moodAnalytics.dailyStats[today].totalMessages++;
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
        currentMood: 'neutral'
    };

    sessions.set(sessionId, session);
    chatLogs.set(sessionId, []);
    moodAnalytics.totalSessions++;

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
            return res.status(400).json({ error: 'Missing sessionId or message' });
        }

        let session = sessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found. Please start a new session.' });
        }

        let chatLog = chatLogs.get(sessionId) || [];
        chatLog.push({ role: "user", content: message, timestamp: new Date().toISOString() });

        const aiResult = await chatWithDoof({ userId: sessionId, messages: chatLog });

        if (!aiResult.success) {
            return res.status(500).json({ ...aiResult, error: 'AI response generation failed.' });
        }

        const detectedMood = aiResult.detectedMood || 'neutral';
        const responseMessage = aiResult.message;
        const suggestions = aiResult.suggestions;

        // Store AI response
        chatLog.push({
            role: "assistant",
            content: responseMessage,
            mood: detectedMood,
            timestamp: new Date().toISOString()
        });
        chatLogs.set(sessionId, chatLog);

        // Update session meta
        session.lastActivity = new Date();
        session.messageCount++;
        session.currentMood = detectedMood;
        session.moodHistory.push({ mood: detectedMood, timestamp: new Date() });

        // Update analytics
        moodAnalytics.moodDistribution[detectedMood]++;
        updateKeywordFrequency(message);
        updateDailyStats(detectedMood);

        return res.json({
            success: true,
            response: responseMessage,
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
    const chatLog = chatLogs.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
        session: session,
        chatHistory: chatLog || [],
        moodSummary: session.moodHistory.reduce((acc, entry) => {
            acc[entry.mood] = (acc[entry.mood] || 0) + 1;
            return acc;
        }, {})
    });
});

// Get mood analytics
app.get('/api/analytics/mood', (req, res) => {
    const topKeywords = Object.entries(moodAnalytics.commonKeywords)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [word, count]) => {
            obj[word] = count;
            return obj;
        }, {});

    res.json({
        ...moodAnalytics,
        topKeywords: topKeywords,
        averageSessionLength: sessions.size > 0 ?
            Array.from(sessions.values()).reduce((acc, session) =>
                acc + session.messageCount, 0) / sessions.size : 0
    });
});

// Get daily mood trends
app.get('/api/analytics/trends', (req, res) => {
    const { days = 7 } = req.query;
    const today = new Date();
    const trends = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];

        trends.push({
            date: dateKey,
            stats: moodAnalytics.dailyStats[dateKey] || {
                happy: 0, sad: 0, stressed: 0, angry: 0, neutral: 0, totalMessages: 0
            }
        });
    }

    res.json({ trends });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        activeSessions: sessions.size,
        totalAnalyzedMessages: Object.values(moodAnalytics.moodDistribution).reduce((a, b) => a + b, 0)
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Cleanup old sessions (run every hour)
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [sessionId, session] of sessions.entries()) {
        if (session.lastActivity < oneHourAgo) {
            sessions.delete(sessionId);
            chatLogs.delete(sessionId);
            console.log(`Cleaned up inactive session: ${sessionId}`);
        }
    }
}, 60 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🧪 Dr. Doof's Mood Mate Backend is running on port ${PORT}`);
    console.log(`📊 Analytics available at http://localhost:${PORT}/api/analytics/mood`);
    console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
});
