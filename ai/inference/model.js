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
// This is a placeholder and can be improved with a more sophisticated sentiment analysis library.
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
    // Load persona and mental health guidelines from markdown files
    const personaPrompt = await loadPrompt('./ai/prompts/persona.md');
    const mentalHealthPrompt = await loadPrompt('./ai/prompts/mental.md');

    // Get the latest user message
    const lastUserMessage = messages.find(m => m.role === 'user');
    const userText = lastUserMessage ? lastUserMessage.content : '';

    // 1) Safety triage first
    const triage = triageRisk(userText);
    if (triage.level === "crisis") {
      return crisisResponse();
    }
    
    // 2) Load user memory
    const userMemory = loadMemory(userId);

    // Construct the prompt for the LLM
    const modelPrompt = `
      ${personaPrompt}

      ### Mental Health Guidelines
      ${mentalHealthPrompt}

      ### Conversation History
      ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

      ### Your Turn
      Based on the persona and history, what is your next response?
    `;
    
    // Replace with your preferred LLM API call
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=`;
    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: modelPrompt }]
            }
        ],
        systemInstruction: {
            parts: [{ text: "Act as Dr. Doof, a friendly, calm, and supportive mental health companion." }]
        },
        tools: [{
            "google_search": {}
        }]
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Extract generated text from the response
    const generatedText = result.candidates[0].content.parts[0].text;
    
    // Detect mood from AI's generated response
    const detectedMood = detectMoodFromAIResponse(generatedText);
    
    // Check if the user mentioned their name and save it to memory
    const nameMatch = /my name is\s+([A-Za-z][A-Za-z\-']*)/i.exec(userText);
    if (nameMatch) {
      saveMemory(userId, { name: nameMatch[1] });
    }
    
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
