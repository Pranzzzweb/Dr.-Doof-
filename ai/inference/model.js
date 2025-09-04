const { triageRisk, crisisResponse } = require("../safety/filter");
const { loadMemory, saveMemory } = require("../memory/memory");
const fs = require('fs').promises;

// Function to read a markdown file and return its content as a string
async function loadPrompt(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf8');
    return content;
  } catch (error) {
    console.error(`Error loading prompt from ${filepath}:`, error);
    return '';
  }
}

// Function to detect mood from the AI's response using a simple regex-based approach.
function detectMoodFromAIResponse(text) {
  const moodKeywords = {
    sad: ['sad', 'down', 'depressed', 'upset', 'crying'],
    happy: ['happy', 'great', 'awesome', 'excited', 'joy', 'fantastic'],
    stressed: ['stressed', 'anxious', 'worried', 'overwhelmed'],
    angry: ['angry', 'mad', 'furious', 'irritated'],
    neutral: ['okay', 'fine', 'alright']
  };

  for (const mood in moodKeywords) {
    for (const keyword of moodKeywords[mood]) {
      if (text.toLowerCase().includes(keyword)) {
        return mood;
      }
    }
  }

  return 'neutral';
}

// Main chat function to interact with a large language model
async function chatWithDoof({ userId = 'anonymous', messages = [] }) {
  try {
    const personaPrompt = await loadPrompt('./ai/prompts/persona.md');
    const mentalHealthPrompt = await loadPrompt('./ai/prompts/mental.md');
    
    const combinedSystemPrompt = `
      ${personaPrompt}
      ${mentalHealthPrompt}
      
      You are Dr. Doofenshmirtz, a friendly and supportive mental health companion. Always respond in character, with a lighthearted "evil scientist" flair, but never offer medical advice. Your primary goal is to be a supportive listener, and to offer small, practical steps when appropriate, such as breathing exercises or grounding techniques.
      
      Here's a reference of past conversations:
      ${(await fs.readFile('./ai/data/convo.json', 'utf8'))}
    `;

    const lastUserMessage = messages.find(m => m.role === 'user');
    const userText = lastUserMessage ? lastUserMessage.content : '';

    // 1) Safety triage
    const triage = triageRisk(userText);
    if (triage.level === "crisis") {
      return crisisResponse();
    }
    
    // 2) Load user memory (if needed, this is already implemented)
    // const userMemory = loadMemory(userId);

    // Get API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: userText }] }],
      systemInstruction: { parts: [{ text: combinedSystemPrompt }] },
      tools: [{ google_search: {} }],
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`API request failed with status: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || "My Inator for generating responses seems to be... on the fritz! Back to the drawing board, I suppose! What was it you were saying?";
    
    // Detect mood from AI's generated response
    const detectedMood = detectMoodFromAIResponse(generatedText);
    
    // Log for debugging
    console.log(`🧪 Dr. Doof Chat - User: ${userId}, Mood: ${detectedMood}, Message: "${userText.substring(0, 50)}..."`);
    
    return {
      success: true,
      message: generatedText,
      detectedMood: detectedMood,
      suggestions: generateSuggestions(detectedMood),
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

// Simple mood-based suggestion generator
function generateSuggestions(mood) {
    const suggestions = {
        sad: ['Tell me a joke', 'I need motivation', 'Help me feel better', 'Share something positive'],
        happy: ['Tell me more good things', 'Share the joy', 'Keep the energy up', 'Celebrate with me'],
        stressed: ['Help me relax', 'Breathing exercises', 'Distract me', 'Calm my mind'],
        angry: ['Help me cool down', 'Count to ten', 'Tell me about cookies', 'Channel this energy'],
        neutral: ['How are you?', 'Tell me about your day', 'Surprise me', 'Ask me anything']
    };
    
    return suggestions[mood] || suggestions.neutral;
}

module.exports = { chatWithDoof };
