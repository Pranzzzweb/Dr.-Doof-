// Enhanced frontend script with backend integration
class MoodMateClient {
    constructor() {
        this.sessionId = null;
        this.apiBase = window.location.origin + '/api';
        this.currentMood = 'neutral';
        this.chatHistory = [];
        this.isTyping = false;
        
        this.init();
    }
    
    async init() {
        console.log('🧪 Dr. Doof\'s Mood Mate - Starting session...');
        await this.startSession();
        this.setupEventListeners();
        this.updateMoodStatus('neutral');
        this.updateSuggestions('neutral');
    }
    
    async startSession() {
        try {
            const response = await fetch(`${this.apiBase}/session/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to start session');
            }
            
            const data = await response.json();
            this.sessionId = data.sessionId;
            console.log('Session started:', this.sessionId);
            
        } catch (error) {
            console.error('Failed to start session:', error);
            // Fallback to offline mode
            this.sessionId = 'offline_' + Date.now();
            this.showOfflineNotice();
        }
    }
    
    setupEventListeners() {
        const input = document.getElementById('messageInput');
        const sendBtn = document.querySelector('.send-button');
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isTyping) {
                this.sendMessage();
            }
        });
        
        sendBtn.addEventListener('click', () => {
            if (!this.isTyping) {
                this.sendMessage();
            }
        });
    }
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (message === '' || this.isTyping) return;
        
        // Add user message to UI
        this.addMessageToUI('user', message);
        input.value = '';
        
        // Show typing indicator
        this.setTyping(true);
        
        try {
            // Send to backend
            const response = await fetch(`${this.apiBase}/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    message: message,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error('Backend request failed');
            }
            
            const data = await response.json();
            
            // Simulate typing delay
            setTimeout(() => {
                this.setTyping(false);
                this.addMessageToUI('doof', data.response, data.detectedMood);
                this.currentMood = data.detectedMood;
                this.updateMoodStatus(data.detectedMood);
                this.updateSuggestions(data.detectedMood, data.suggestions);
                
                // Log session stats
                console.log('Session stats:', data.sessionStats);
                
            }, 1500);
            
        } catch (error) {
            console.error('Message send failed:', error);
            // Fallback to offline mode
            this.handleOfflineMessage(message);
        }
    }
    
    handleOfflineMessage(message) {
        // Fallback mood detection and response
        const detectedMood = this.detectMoodOffline(message);
        const response = this.getOfflineResponse(detectedMood);
        
        setTimeout(() => {
            this.setTyping(false);
            this.addMessageToUI('doof', response, detectedMood);
            this.currentMood = detectedMood;
            this.updateMoodStatus(detectedMood);
            this.updateSuggestions(detectedMood);
        }, 1500);
    }
    
    detectMoodOffline(message) {
        const msg = message.toLowerCase();
        if (msg.includes('sad') || msg.includes('down') || msg.includes('depressed')) return 'sad';
        if (msg.includes('happy') || msg.includes('great') || msg.includes('awesome')) return 'happy';
        if (msg.includes('stress') || msg.includes('anxious') || msg.includes('worried')) return 'stressed';
        if (msg.includes('angry') || msg.includes('mad') || msg.includes('frustrated')) return 'angry';
        return 'neutral';
    }
    
    getOfflineResponse(mood) {
        const responses = {
            sad: "I sense you're feeling down. Even in offline mode, Dr. Doof is here for you! 💙",
            happy: "Your happiness shines through! Dr. Doof loves your positive energy! ✨",
            stressed: "Take a deep breath with me... in and out. You've got this! 🌬️",
            angry: "I understand your frustration. Let's channel that energy positively! ⚡",
            neutral: "I'm here to chat with you. What's on your mind today? 🤔"
        };
        return responses[mood] || responses.neutral;
    }
    
    addMessageToUI(sender, message, mood = null) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (sender === 'user') {
            messageDiv.innerHTML = `<div class="message-bubble">${this.escapeHtml(message)}</div>`;
        } else {
            const moodColors = {
                sad: '#6c5ce7', happy: '#00b894', stressed: '#fd79a8', 
                angry: '#e84393', neutral: '#74b9ff'
            };
            const moodEmojis = {
                sad: '😢', happy: '😊', stressed: '😰', 
                angry: '😠', neutral: '😐'
            };
            
            const color = moodColors[mood] || moodColors.neutral;
            const emoji = moodEmojis[mood] || moodEmojis.neutral;
            
            messageDiv.innerHTML = `
                <div class="avatar">🧪</div>
                <div class="message-bubble">
                    ${message}
                    <div class="mood-indicator" style="background: ${color};">${emoji}</div>
                </div>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Store in chat history
        this.chatHistory.push({
            sender, message, mood, timestamp: new Date()
        });
    }
    
    setTyping(isTyping) {
        this.isTyping = isTyping;
        const typingIndicator = document.getElementById('typingIndicator');
        const sendButton = document.querySelector('.send-button');
        
        typingIndicator.style.display = isTyping ? 'block' : 'none';
        sendButton.disabled = isTyping;
        sendButton.style.opacity = isTyping ? '0.6' : '1';
    }
    
    updateMoodStatus(mood) {
        const moodStatus = document.getElementById('moodStatus');
        const moodEmojis = {
            sad: '😢', happy: '😊', stressed: '😰', 
            angry: '😠', neutral: '😐'
        };
        
        const emoji = moodEmojis[mood] || moodEmojis.neutral;
        moodStatus.textContent = `Mood: ${mood.charAt(0).toUpperCase() + mood.slice(1)} ${emoji}`;
    }
    
    updateSuggestions(mood, customSuggestions = null) {
        const suggestions = document.getElementById('suggestions');
        
        const defaultSuggestions = {
            sad: ['Tell me a joke', 'I need motivation', 'Help me feel better', 'Share something positive'],
            happy: ['Tell me more good things', 'Share the joy', 'Keep the energy up', 'Celebrate with me'],
            stressed: ['Help me relax', 'Breathing exercises', 'Distract me', 'Calm my mind'],
            angry: ['Help me cool down', 'Count to ten', 'Tell me about cookies', 'Channel this energy'],
            neutral: ['How are you?', 'Tell me about your day', 'Surprise me', 'Ask me anything']
        };
        
        const suggestionList = customSuggestions || defaultSuggestions[mood] || defaultSuggestions.neutral;
        
        suggestions.innerHTML = suggestionList.map(suggestion => 
            `<div class="suggestion-chip" onclick="moodMate.sendSuggestion('${suggestion}')">${suggestion}</div>`
        ).join('');
    }
    
    sendSuggestion(suggestion) {
        const input = document.getElementById('messageInput');
        input.value = suggestion;
        this.sendMessage();
    }
    
    showOfflineNotice() {
        const header = document.querySelector('.header');
        const notice = document.createElement('div');
        notice.style.cssText = `
            background: #ffeaa7; color: #2d3436; padding: 8px; margin-top: 10px; 
            border-radius: 5px; font-size: 0.8em; text-align: center;
        `;
        notice.textContent = '⚠️ Running in offline mode - limited functionality';
        header.appendChild(notice);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API for external access
    async getSessionHistory() {
        if (!this.sessionId.startsWith('offline_')) {
            try {
                const response = await fetch(`${this.apiBase}/session/${this.sessionId}/history`);
                return await response.json();
            } catch (error) {
                console.error('Failed to fetch session history:', error);
            }
        }
        return { chatHistory: this.chatHistory, offline: true };
    }
    
    async getAnalytics() {
        try {
            const response = await fetch(`${this.apiBase}/analytics/mood`);
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            return null;
        }
    }
}

// Initialize when DOM is ready
let moodMate;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🧪 Dr. Doof\'s Mood Mate - Frontend Loading...');
    moodMate = new MoodMateClient();
    
    // Make it globally accessible for suggestion chips
    window.moodMate = moodMate;
    
    // Legacy function support
    window.sendSuggestion = (suggestion) => moodMate.sendSuggestion(suggestion);
    window.sendMessage = () => moodMate.sendMessage();
    window.handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            moodMate.sendMessage();
        }
    };
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoodMateClient;
}
