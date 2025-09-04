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
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'"],
            imgSrc: ["'self'", "data:"]
        }
    }
}));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api', limiter); // Only apply rate limiting to API routes

// In-memory storage (replace with database in production)
let sessions = new Map();
let dailyStats = new Map();
let keywordFrequency = new Map();

// Utility functions
function updateKeywordFrequency(message) {
    const words = message.toLowerCase().split(/\s+/);
    words.forEach(word => {
        if (word.length > 3) { // Only track words longer than 3 characters
            keywordFrequency.set(word, (keywordFrequency.get(word) || 0) + 1);
        }
    });
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function updateDailyStats(mood) {
    const today = getTodayKey();
    if (!dailyStats.has(today)) {
        dailyStats.set(today, {});
    }
    const dayStats = dailyStats.get(today);
    dayStats[mood] = (dayStats[mood] || 0) + 1;
}

// API Routes

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
        chatHistory: []
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

        // Update analytics
        updateDailyStats(detectedMood);
        updateKeywordFrequency(message);

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
            message: "My Conversation-inator seems to be malfunctioning! *nervous evil laugh* Let me try that again - how are you feeling today?",
            detectedMood: 'neutral',
            suggestions: ['Try again', 'Tell me how you feel', 'Start over', 'Help']
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
    const allMoods = {};
    sessions.forEach(session => {
        session.moodHistory.forEach(entry => {
            allMoods[entry.mood] = (allMoods[entry.mood] || 0) + 1;
        });
    });

    res.json({
        moodDistribution: allMoods,
        totalSessions: sessions.size,
        dailyStats: Object.fromEntries(dailyStats),
        topKeywords: Array.from(keywordFrequency.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
    });
});

// Get daily mood trends
app.get('/api/analytics/trends', (req, res) => {
    const trends = Array.from(dailyStats.entries()).map(([date, moods]) => ({
        date,
        moods
    }));

    res.json({
        trends,
        summary: {
            totalDays: dailyStats.size,
            activeSessions: sessions.size
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        activeSessions: sessions.size,
        uptime: process.uptime()
    });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// IMPORTANT: This catch-all route should be LAST and only for SPA routing
app.get('*', (req, res) => {
    // Only serve index.html for non-API routes and non-file extensions
    if (!req.path.startsWith('/api') && !req.path.includes('.')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
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
    console.log(`📱 Frontend available at: http://localhost:${PORT}`);
    console.log(`🔧 API available at: http://localhost:${PORT}/api`);
});
