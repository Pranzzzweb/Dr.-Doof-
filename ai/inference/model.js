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

// Function to detect mood from the user's message (not AI response)
function detectMoodFromUserMessage(text) {
  const moodKeywords = {
    sad: ['sad', 'down', 'depressed', 'upset', 'crying', 'miserable', 'heartbroken', 'devastated', 'hopeless'],
    happy: ['happy', 'great', 'awesome', 'excited', 'joy', 'fantastic', 'amazing', 'wonderful', 'thrilled', 'delighted'],
    stressed: ['stressed', 'anxious', 'worried', 'overwhelmed', 'panic', 'nervous', 'tense', 'frantic'],
    angry: ['angry', 'mad', 'furious', 'irritated', 'annoyed', 'frustrated', 'rage', 'pissed'],
    neutral: ['okay', 'fine', 'alright', 'normal', 'decent']
  };

  const lowerText = text.toLowerCase();
  
  for (const mood in moodKeywords) {
    for (const keyword of moodKeywords[mood]) {
      if (lowerText.includes(keyword)) {
        return mood;
      }
    }
  }

  return 'neutral';
}

// Main chat function to interact with Gemini API
async function chatWithDoof({ userId = 'anonymous', messages = [] }) {
  try {
    console.log('🧪 Dr. Doof AI - Processing request for user:', userId);
    
    // Load prompts
    const personaPrompt = await loadPrompt('./ai/prompts/persona.md');
    const mentalHealthPrompt = await loadPrompt('./ai/prompts/mental.md');
    
    // Get the latest user message
    const lastUserMessage = messages.find(m => m.role === 'user');
    const userText = lastUserMessage ? lastUserMessage.content : '';
    
    console.log('User message:', userText.substring(0, 100) + '...');

    // 1) Safety triage first
    const triage = triageRisk(userText);
    if (triage.level === "crisis") {
      console.log('⚠️ Crisis detected, returning crisis response');
      return crisisResponse();
    }
    
    // 2) Detect mood from user input (not AI response)
    const detectedMood = detectMoodFromUserMessage(userText);
    console.log('Detected mood:', detectedMood);

    // Get API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    
    // Build conversation history for Gemini
    const conversationHistory = messages.map(msg => {
      if (msg.role === 'user') {
        return { role: 'user', parts: [{ text: msg.content }] };
      } else {
        return { role: 'model', parts: [{ text: msg.content }] };
      }
    });

    // Create system instruction combining both prompts
    const systemInstruction = `
${personaPrompt}

${mentalHealthPrompt}

You are Dr. Heinz Doofenshmirtz from Phineas and Ferb, but you've given up your evil schemes to become a supportive mental health companion. 

IMPORTANT PERSONALITY TRAITS:
- Speak with Dr. Doof's distinctive style and mannerisms
- Use occasional "evil scientist" references but in a supportive context
- Be warm, empathetic, and genuinely caring
- Reference your "Inators" when talking about coping strategies
- Use phrases like "Ah, Perry the Platypus would be proud of your progress!"
- Occasionally mention your backstory or Phineas and Ferb characters
- Keep responses conversational and engaging, not clinical

RESPONSE GUIDELINES:
- Always stay in character as Dr. Doofenshmirtz
- Be supportive and understanding
- Offer practical advice when appropriate
- Use humor to lighten the mood when suitable
- Never break character or mention you're an AI
- Keep responses between 2-4 sentences typically
- End with encouragement or a question to continue the conversation
    `.trim();

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: conversationHistory,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 200,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    console.log('📡 Calling Gemini API...');
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', response.status, errorText);
      throw new Error(`API request failed with status: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Gemini API Response received');
    
    // Extract the generated text
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || 
      "My Conversation-inator seems to be... on the fritz! *adjusts lab coat* Back to the drawing board, I suppose! What was it you were saying?";
    
    console.log('Generated response:', generatedText.substring(0, 100) + '...');
    
    // Generate suggestions based on detected mood
    const suggestions = generateSuggestions(detectedMood);
    
    // Log for debugging
    console.log(`🧪 Dr. Doof Chat Complete - User: ${userId}, Mood: ${detectedMood}, Response Length: ${generatedText.length}`);
    
    return {
      success: true,
      message: generatedText,
      detectedMood: detectedMood,
      suggestions: suggestions,
      triage: triage,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Dr. Doof AI Error:', error);
    
    // Return a character-appropriate error message
    return {
      success: false,
      message: "Curse you, technical difficulties! *shakes fist* My Conversation-inator has encountered a minor setback. But fear not! Even when my inventions malfunction, I'm still here to listen. How are you feeling right now?",
      detectedMood: 'neutral',
      suggestions: ['Tell me how you feel', 'Try again', 'What\'s on your mind?', 'Start over'],
      error: error.message,
      triage: { level: "none", reasons: [] }
    };
  }
}

// Enhanced mood-based suggestion generator
function generateSuggestions(mood) {
    const suggestions = {
        sad: [
          'Tell me what\'s bothering you',
          'Let\'s try some deep breathing',
          'Share a happy memory with me',
          'Want to hear about my latest Inator?'
        ],
        happy: [
          'Tell me more about what made you happy!',
          'Let\'s celebrate your good mood!',
          'Share the joy with me!',
          'What else is going well?'
        ],
        stressed: [
          'Let\'s try the Relax-inator technique',
          'Tell me what\'s stressing you out',
          'Want to try some breathing exercises?',
          'Let\'s break this down step by step'
        ],
        angry: [
          'Tell me what\'s making you angry',
          'Let\'s channel that energy positively',
          'Want to try counting to ten?',
          'Sometimes my evil schemes help me vent'
        ],
        neutral: [
          'How was your day today?',
          'What\'s on your mind?',
          'Tell me something interesting',
          'Want to hear a story about Perry?'
        ]
    };
    
    return suggestions[mood] || suggestions.neutral;
}

module.exports = { chatWithDoof };
