<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dr. Doof's Mood Mate</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Comic Sans MS', cursive, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .chat-container {
            width: 90%;
            max-width: 800px;
            height: 90vh;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .header {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            padding: 20px;
            text-align: center;
            color: white;
            position: relative;
        }

        .header h1 {
            font-size: 1.8em;
            margin-bottom: 5px;
        }

        .header p {
            font-size: 0.9em;
            opacity: 0.9;
        }

        .doof-avatar {
            width: 60px;
            height: 60px;
            background: #4834d4;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;
            margin-bottom: 10px;
            border: 3px solid white;
            animation: bounce 2s infinite;
        }

        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }

        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f8f9fa;
        }

        .message {
            margin-bottom: 15px;
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .user-message {
            text-align: right;
        }

        .user-message .message-bubble {
            background: #007bff;
            color: white;
            padding: 12px 16px;
            border-radius: 18px 18px 5px 18px;
            display: inline-block;
            max-width: 70%;
            word-wrap: break-word;
        }

        .doof-message {
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }

        .doof-message .avatar {
            width: 40px;
            height: 40px;
            background: #4834d4;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.2em;
            flex-shrink: 0;
        }

        .doof-message .message-bubble {
            background: white;
            color: #333;
            padding: 12px 16px;
            border-radius: 18px 18px 18px 5px;
            max-width: 70%;
            word-wrap: break-word;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: relative;
        }

        .mood-indicator {
            position: absolute;
            top: -8px;
            right: -8px;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8em;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        .input-area {
            padding: 20px;
            background: white;
            border-top: 1px solid #e9ecef;
        }

        .input-container {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .message-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 25px;
            font-size: 1em;
            outline: none;
            transition: border-color 0.3s;
        }

        .message-input:focus {
            border-color: #007bff;
        }

        .send-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            transition: background-color 0.3s;
        }

        .send-button:hover {
            background: #0056b3;
        }

        .typing-indicator {
            display: none;
            color: #666;
            font-style: italic;
            padding: 10px 0;
        }

        .mood-status {
            position: absolute;
            top: 10px;
            right: 20px;
            background: rgba(255,255,255,0.2);
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8em;
        }

        .suggestions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 10px;
        }

        .suggestion-chip {
            background: #e9ecef;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.8em;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .suggestion-chip:hover {
            background: #007bff;
            color: white;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="header">
            <div class="doof-avatar">🧪</div>
            <h1>Dr. Doof's Mood Mate</h1>
            <p>Your AI Mental Health Companion</p>
            <div class="mood-status" id="moodStatus">Mood: Analyzing...</div>
        </div>

        <div class="chat-messages" id="chatMessages">
            <div class="message doof-message">
                <div class="avatar">🧪</div>
                <div class="message-bubble">
                    Ah, hello there! I am Dr. Heinz Doofenshmirtz, but you can call me Dr. Doof! 
                    I've traded my evil schemes for something much better - helping you with your mood! 
                    How are you feeling today? 😊
                    <div class="mood-indicator" style="background: #feca57;">😊</div>
                </div>
            </div>
        </div>

        <div class="typing-indicator" id="typingIndicator">
            Dr. Doof is typing...
        </div>

        <div class="input-area">
            <div class="suggestions" id="suggestions">
                <div class="suggestion-chip" onclick="sendSuggestion('I feel sad today')">I feel sad today</div>
                <div class="suggestion-chip" onclick="sendSuggestion('I am stressed')">I'm stressed</div>
                <div class="suggestion-chip" onclick="sendSuggestion('I am happy!')">I'm happy!</div>
                <div class="suggestion-chip" onclick="sendSuggestion('Tell me a joke')">Tell me a joke</div>
            </div>
            <div class="input-container">
                <input type="text" class="message-input" id="messageInput" 
                       placeholder="Type your message here..." onkeypress="handleKeyPress(event)">
                <button class="send-button" onclick="sendMessage()">Send</button>
            </div>
        </div>
    </div>

    <script>
        src="script.js">
    </script>
</body>
</html>
