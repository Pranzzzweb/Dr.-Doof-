// ai/inference/model.js - Standalone Dr. Doof AI (no external APIs needed)
const { triageRisk, crisisResponse } = require("../safety/filter");
const { loadMemory, saveMemory } = require("../memory/memory");

// Dr. Doof's personality responses
const DOOF_RESPONSES = {
  greeting: [
    "Ah, hello there! I am Dr. Heinz Doofenshmirtz, but you can call me Dr. Doof! I've traded my evil schemes for something much better - helping you with your mood! How are you feeling today? 😊",
    "Welcome to my mood-improvement laboratory! I'm Dr. Doof, and today we're going to make your day better than any of my inventions ever could! What's on your mind?",
    "Greetings! Dr. Doof here! You know, I used to build -inators to take over the Tri-State Area, but now I build conversations to take over... well, sadness! How can I help?"
  ],
  
  sad: [
    "Ah, I sense sadness in your words! You know, even evil scientists get the blues sometimes. But here's the thing - every one of my failed inventions taught me something new! Your sadness is temporary, but your strength is permanent! 💙",
    "Don't worry! Even my most diabolical plans failed spectacularly, but I never gave up! Here's what I learned: 'Every setback is a setup for a comeback!' Want to hear about the time my Sad-Away-inator actually worked? 🌟",
    "Hey, let me tell you something - I once built a machine to steal everyone's socks, and even THAT didn't work out! But you know what? Each failure brought me closer to finding my true purpose: helping people like you! 🧦✨"
  ],
  
  happy: [
    "Excellent! Your happiness levels are off the charts! This calls for a celebration dance! 🎉 *does awkward evil scientist dance*",
    "Wunderbar! Your good mood is more powerful than any of my -inators ever were! Let's keep this positive energy going - tell me what made you so happy! ✨",
    "Fantastic! You know what? Your happiness is contagious! It's spreading faster than my Happiness-inator ever could have! Keep spreading that joy! 🌟"
  ],
  
  stressed: [
    "Stress detected! Time for my Anti-Stress-inator 3000! Take a deep breath with me... in for 4... hold for 4... out for 4... Feel the stress molecules leaving your body! 🌬️",
    "Ah, stress! I know it well from building all those complex inventions under pressure! Here's Dr. Doof's stress-busting technique: imagine your stress as one of my inventions - it seems big and scary, but it always falls apart eventually! 🧘",
    "You know what's more stressful than Perry the Platypus foiling my plans? Nothing! And I survived that daily! You've got this! Try the 5-4-3-2-1 technique with me: 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste! 👃"
  ],
  
  angry: [
    "Whoa there! I sense some anger! You know what I used to do with anger? Build giant robots and elaborate schemes! But now I bake cookies instead - much more satisfying and way less property damage! 🍪",
    "Anger is like my old Rage-inator - powerful but ultimately destructive to the person using it! Let's transform that energy into something better. What would make this situation just 1% better? ⚡",
    "I get it! Sometimes you just want to build a giant robot and... wait, that's just me. How about we count to 10 in German? Eins, zwei, drei... it's very therapeutic! 🤖"
  ],
  
  neutral: [
    "Ah, the calm before the emotional storm! I see you're in a neutral state - that's like Switzerland, but for feelings! Tell me, what's occupying that brilliant mind of yours today? 🤔",
    "Neutral mood detected! You know what's NOT neutral? My enthusiasm to help you have an amazing day! What's one thing you're curious about right now? ⚡",
    "I sense balanced emotional energy - very zen! You know, I once tried to build a Personality-inator, but it turns out the best personalities are the authentic ones. What's authentically you today? 🔬"
  ]
};

// Simple mood detection patterns
const MOOD_PATTERNS = {
  sad: /\b(sad|down|depressed|upset|crying|hurt|disappointed|gloomy|miserable|heartbroken|lonely|empty|hopeless)\b/gi,
  happy: /\b(happy|great|awesome|excited|joy|amazing|fantastic|wonderful|thrilled|elated|cheerful|delighted|pleased)\b/gi,
  stressed: /\b(stressed|anxious|worried|nervous|overwhelmed|panic|tense|pressure|burden|frantic|exhausted)\b/gi,
  angry: /\b(angry|mad|furious|irritated|annoyed|rage|pissed|frustrated|livid|hate)\b/gi,
  confused: /\b(confused|lost|uncertain|unclear|puzzled|bewildered)\b/gi
};

function detectMood(text) {
  if (!text || typeof text !== 'string') return 'neutral';
  
  const scores = {};
  let maxScore = 0;
  let detectedMood = 'neutral';
  
  // Score each mood
  Object.entries(MOOD_PATTERNS).forEach(([mood, pattern]) => {
    const matches = text.match(pattern);
    scores[mood] = matches ? matches.length : 0;
    
    if (scores[mood] > maxScore) {
      maxScore = scores[mood];
      detectedMood = mood;
    }
  });
  
  return detectedMood;
}

function generateSuggestions(mood) {
  const suggestions = {
    sad: ['Tell me a joke', 'I need motivation', 'Help me feel better', 'Share something positive'],
    happy: ['Tell me more good things', 'Share the joy', 'Keep the energy up', 'Celebrate with me'],
    stressed: ['Help me relax', 'Breathing exercises', 'Distract me', 'Calm my mind'],
    angry: ['Help me cool down', 'Count to ten', 'Tell me about cookies', 'Channel this energy'],
    confused: ['Help me understand', 'Break it down for me', 'What should I do?', 'Make it simple'],
    neutral: ['How are you feeling?', 'Tell me about your day', 'Surprise me', 'Ask me anything']
  };
  
  return suggestions[mood] || suggestions.neutral;
}

function generateDoofResponse(mood, userMessage = '', userMemory = {}) {
  // Handle greetings
  if (userMessage.toLowerCase().match(/\b(hello|hi|hey|greetings|good morning|good afternoon|good evening)\b/)) {
    let greeting = DOOF_RESPONSES.greeting[Math.floor(Math.random() * DOOF_RESPONSES.greeting.length)];
    
    // Personalize if we know their name
    if (userMemory.name) {
      greeting = greeting.replace('there!', `there, ${userMemory.name}!`);
    }
    
    return {
      message: greeting,
      mood: 'neutral',
      suggestions: ['How are you feeling?', 'Tell me about your day', 'I need help with something', 'Make me laugh']
    };
  }
  
  const responses = DOOF_RESPONSES[mood] || DOOF_RESPONSES.neutral;
  let response = responses[Math.floor(Math.random() * responses.length)];
  
  // Add personalization if we know their name
  if (userMemory.name && Math.random() > 0.5) {
    response = response.replace('you', `you, ${userMemory.name}`);
  }
  
  return {
    message: response,
    mood: mood,
    confidence: 0.8,
    suggestions: generateSuggestions(mood)
  };
}

// Main chat function
async function chatWithDoof({ userId = 'anonymous', messages = [] }) {
  try {
    // Get the latest user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userText = lastUserMessage ? lastUserMessage.content : '';
    
    // 1) Safety triage first
    const triage = triageRisk(userText);
    if (triage.level === "crisis") {
      return crisisResponse();
    }
    
    // 2) Load user memory
    const userMemory = loadMemory(userId);
    
    // 3) Detect mood
    const detectedMood = detectMood(userText);
    
    // 4) Generate response
    const response = generateDoofResponse(detectedMood, userText, userMemory);
    
    // 5) Update memory if user mentions their name
    const nameMatch = /my name is\s+([A-Za-z][A-Za-z\-']*)/i.exec(userText);
    if (nameMatch) {
      saveMemory(userId, { name: nameMatch[1] });
    }
    
    // Log for debugging
    console.log(`🧪 Dr. Doof Chat - User: ${userId}, Mood: ${detectedMood}, Message: "${userText.substring(0, 50)}..."`);
    
    return {
      success: true,
      message: response.message,
      detectedMood: detectedMood,
      confidence: response.confidence || 0.8,
      suggestions: response.suggestions,
      triage: triage,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Dr. Doof AI Error:', error);
    return {
      success: false,
      message: "Ah, my Conversation-inator seems to be malfunctioning! *nervous evil laugh* Let me try that again - how are you feeling today?",
      detectedMood: 'neutral',
      error: error.message,
      triage: { level: "none", reasons: [] }
    };
  }
}

module.exports = { chatWithDoof };
