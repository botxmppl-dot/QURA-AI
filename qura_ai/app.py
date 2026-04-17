 import os
import io
import sys
import traceback
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'fallback-secret')

GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

MODELS = {
    "fast": "llama-3.1-8b-instant",
    "powerful": "llama-3.3-70b-versatile"
}

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/advance')
def advance():
    return render_template('advance.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/api/chat', methods=['POST'])
def chat_api():
    data = request.json
    user_message = data.get('message', '').strip()
    model_type = data.get('model', 'fast')
    language = data.get('language', 'English')

    if not user_message:
        return jsonify({'error': 'Empty message'}), 400

    model = MODELS.get(model_type, MODELS['fast'])

    system_prompt = f"""You are QURA AI. You MUST respond ONLY in {language} language.
NEVER use English unless the target language is English.
If the user asks for code, provide complete working code with proper markdown.
Keep answers natural, conversational, and avoid special symbols like *, -, > in sentences.
Respond as a native {language} speaker with perfect grammar."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2000
    }

    try:
        response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=30)
        if response.status_code != 200:
            return jsonify({'error': f'AI error: {response.text}'}), 500
        result = response.json()
        answer = result['choices'][0]['message']['content']
        return jsonify({'response': answer})
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/run-code', methods=['POST'])
def run_code():
    data = request.json
    code = data.get('code', '')
    language = data.get('language', 'python')
    
    if language.lower() != 'python':
        return jsonify({'output': f'⚠️ Running {language} code is not yet supported locally. Only Python is available for now.'})
    
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    
    try:
        exec_globals = {}
        exec(code, exec_globals)
        output = sys.stdout.getvalue()
        if not output:
            output = "✅ Code executed successfully (no output)."
    except Exception as e:
        output = f"❌ Error:\n{traceback.format_exc()}"
    finally:
        sys.stdout = old_stdout
    
    return jsonify({'output': output})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
