const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
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
        neutral: 0
    },
    commonKeywords: {},
    dailyStats: {}
};

// Enhanced mood detection with more sophisticated analysis
const moodKeywords = {
    sad: ['sad', 'depressed', 'down', 'crying', 'upset', 'hurt', 'disappointed', 'gloomy', 'miserable', 'heartbroken'],
    happy: ['happy', 'great', 'awesome', 'excited', 'joy', 'amazing', 'fantastic', 'wonderful', 'thrilled', 'elated'],
    stressed: ['stressed', 'anxious', 'worried', 'nervous', 'overwhelmed', 'panic', 'tense', 'pressure', 'burden', 'frantic'],
    angry: ['angry', 'mad', 'furious', 'irritated', 'annoyed', 'rage', 'pissed', 'frustrated', 'livid'],
    neutral: ['okay', 'fine', 'normal', 'alright', 'meh']
};

const moodResponses = {
    sad: {
        responses: [
            "Ah, I sense sadness in your words! You know, even evil scientists get the blues sometimes. Here's what helped me: *plays uplifting music* 🎵",
            "Don't worry! Even my most diabolical plans failed, but I never gave up! Here's a motivational quote: 'Every failure is a step closer to success!' 💪",
            "Hey, let me tell you a joke! Why don't scientists trust atoms? Because they make up everything! *chuckles evilly* 😄",
            "I understand you're feeling down. Even Dr. Doof has rough days! Remember, emotions are like my inventions - they don't last forever! 🔬"
        ],
        suggestions: ['Tell me more jokes', 'I need motivation', 'Play calming music', 'Share a success story']
    },
    happy: {
        responses: [
            "Excellent! Your happiness levels are off the charts! This calls for a celebration! 🎉",
            "Wonderful! You know what? Your good mood is more powerful than any of my -inators! Keep it up! ✨",
            "Fantastic! Let's keep this positive energy going! Want to hear about my latest GOOD deed? 😊",
            "Your happiness is contagious! It's spreading faster than my Happiness-inator ever could! 🌟"
        ],
        suggestions: ['Tell me about your good deed', 'Share more positivity', 'Celebrate with me!', 'Spread the joy']
    },
    stressed: {
        responses: [
            "Stress detected! Time for my Anti-Stress-inator! Take a deep breath in... and out... Feel better? 🌬️",
            "Ah, stress! I know it well from building all those inventions. Here's a breathing exercise: Breathe in for 4, hold for 4, out for 4. Try it! 🧘",
            "Stress is like a failed invention - the more you focus on it, the worse it gets! Let's distract that brilliant mind of yours! 🎯",
            "I've been there! Building death rays is stressful work. Try the 5-4-3-2-1 technique: 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste! 👃"
        ],
        suggestions: ['More breathing exercises', 'Distract me', 'Relaxation tips', 'Mindfulness techniques']
    },
    angry: {
        responses: [
            "Whoa there! I sense some anger! You know, I used to channel anger into evil schemes, but now I make cookies instead! 🍪",
            "Anger is like my old Rage-inator - powerful but destructive! Let's turn that energy into something positive! ⚡",
            "I get it! Sometimes you just want to build a giant robot and... wait, that's just me. Try counting to 10 instead! 🤖"
        ],
        suggestions: ['Help me calm down', 'Count with me', 'Tell me about cookies', 'Channel this energy']
    },
    neutral: {
        responses: [
            "I see you're in a neutral state! That's perfectly fine! Tell me, what's on your mind today? 🤔",
            "Ah, the calm before the storm of emotions! How can Dr. Doof brighten your day? ⚡",
            "Neutral mood detected! You know what's NOT neutral? My enthusiasm to help you! What would you like to talk about? 🔬"
        ],
        suggestions: ['How are you feeling?', 'Tell me about your day', 'Surprise me!', 'Ask me anything']
    }
};

// Utility functions
function detectMood(message) {
    const msg = message.toLowerCase();
    let moodScores = {};
    
    // Initialize scores
    Object.keys(moodKeywords).forEach(mood => {
        moodScores[mood] = 0;
    });
    
    // Score based on keywords
    Object.entries(moodKeywords).forEach(([mood, keywords]) => {
        keywords.forEach(keyword => {
            if (msg.includes(keyword)) {
                moodScores[mood] += keyword.length; // Longer keywords get higher weight
            }
        });
    });
    
    // Find highest scoring mood
    let detectedMood = 'neutral';
    let maxScore = 0;
    
    Object.entries(moodScores).forEach(([mood, score]) => {
        if (score > maxScore) {
            maxScore = score;
            detectedMood = mood;
        }
    });
    
    return detectedMood;
}

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

// Send message and get response
app.post('/api/chat/message', (req, res) => {
    const { sessionId, message, timestamp } = req.body;
    
    if (!sessionId || !message) {
        return res.status(400).json({ error: 'Missing sessionId or message' });
    }
    
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    // Detect mood
    const detectedMood = detectMood(message);
    
    // Update session
    session.lastActivity = new Date();
    session.messageCount++;
    session.currentMood = detectedMood;
    session.moodHistory.push({ mood: detectedMood, timestamp: new Date() });
    
    // Update analytics
    moodAnalytics.moodDistribution[detectedMood]++;
    updateKeywordFrequency(message);
    updateDailyStats(detectedMood);
    
    // Store chat log
    const chatLog = chatLogs.get(sessionId);
    chatLog.push({
        sender: 'user',
        message: message,
        mood: detectedMood,
        timestamp: timestamp || new Date()
    });
    
    // Generate response
    const moodData = moodResponses[detectedMood] || moodResponses.neutral;
    const response = moodData.responses[Math.floor(Math.random() * moodData.responses.length)];
    
    // Store bot response
    chatLog.push({
        sender: 'doof',
        message: response,
        mood: detectedMood,
        timestamp: new Date()
    });
    
    res.json({
        success: true,
        response: response,
        detectedMood: detectedMood,
        suggestions: moodData.suggestions,
        sessionStats: {
            messageCount: session.messageCount,
            currentMood: detectedMood,
            sessionDuration: new Date() - session.startTime
        }
    });
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

app.listen(PORT, () => {
    console.log(`🧪 Dr. Doof's Mood Mate Backend is running on port ${PORT}`);
    console.log(`📊 Analytics available at http://localhost:${PORT}/api/analytics/mood`);
    console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
});
