let isWaiting = false; ...)
let isWaiting = false;
let recognition = null;
let synth = window.speechSynthesis;
let currentUtterance = null;
const avatarMouth = document.getElementById('mouth');
const avatarStatus = document.getElementById('avatarStatus');

// Speech recognition setup
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
}

document.getElementById('voiceBtn').onclick = () => {
    if (!recognition) {
        alert('Speech recognition not supported in this browser. Use Chrome/Edge.');
        return;
    }
    recognition.start();
    avatarStatus.innerText = '🎤 Listening...';
    recognition.onresult = (event) => {
        const spoken = event.results[0][0].transcript;
        document.getElementById('userInput').value = spoken;
        avatarStatus.innerText = 'Heard you! Processing...';
        sendMessage();
    };
    recognition.onerror = () => {
        avatarStatus.innerText = 'Try again';
        setTimeout(() => avatarStatus.innerText = 'Ready', 1000);
    };
};

// Send message
async function sendMessage() {
    const input = document.getElementById('userInput');
    const msg = input.value.trim();
    if (!msg || isWaiting) return;

    input.value = '';
    input.style.height = 'auto';
    isWaiting = true;

    // remove welcome card if exists
    const welcomeCard = document.querySelector('.welcome-card');
    if (welcomeCard) welcomeCard.remove();

    // Add user message to UI
    addMessage(msg, 'user');

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.innerHTML = `<div class="bubble"><i>QURA is thinking...</i></div>`;
    document.getElementById('chatMessages').appendChild(typingDiv);
    typingDiv.scrollIntoView({ behavior: 'smooth' });

    const model = document.getElementById('modelSelect').value;
    const enableSearch = document.getElementById('webSearchToggle').checked;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, model, enable_search: enableSearch })
        });
        const data = await res.json();
        typingDiv.remove();

        if (data.error) {
            addMessage(`⚠️ ${data.error}`, 'assistant');
        } else {
            addMessage(data.response, 'assistant', data.citations);
            // Speak the answer with avatar lip-sync
            speakWithAvatar(data.response);
        }
    } catch (err) {
        typingDiv.remove();
        addMessage(`🔌 Network error: ${err.message}`, 'assistant');
    } finally {
        isWaiting = false;
    }
}

function addMessage(text, role, citations = null) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `message ${role}`;
    let content = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = content;
    div.appendChild(bubble);
    if (citations && citations.length) {
        const citeDiv = document.createElement('div');
        citeDiv.className = 'citations';
        citeDiv.innerHTML = '<small>📚 Sources: </small>' + citations.map(c => `<a href="${c.url}" target="_blank">${c.title.substring(0, 40)}</a>`).join(' · ');
        div.appendChild(citeDiv);
    }
    container.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
}

function speakWithAvatar(text) {
    if (!synth) return;
    if (currentUtterance) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Lip-sync: animate mouth while speaking
    utterance.onstart = () => {
        avatarStatus.innerText = '🔊 Speaking...';
        const interval = setInterval(() => {
            if (!synth.speaking) {
                clearInterval(interval);
                avatarMouth.classList.remove('talking');
                avatarStatus.innerText = 'Ready';
                return;
            }
            avatarMouth.classList.add('talking');
            setTimeout(() => avatarMouth.classList.remove('talking'), 150);
        }, 200);
    };
    utterance.onend = () => {
        avatarMouth.classList.remove('talking');
        avatarStatus.innerText = 'Ready';
    };
    currentUtterance = utterance;
    synth.speak(utterance);
}

// New chat reset
document.getElementById('newChatBtn').onclick = () => {
    document.getElementById('chatMessages').innerHTML = '';
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-card';
    welcomeDiv.innerHTML = `<h1>Hello, I'm QURA</h1><p>Ask me anything...</p>`;
    document.getElementById('messagesContainer').prepend(welcomeDiv);
};

// Auto-resize textarea
const ta = document.getElementById('userInput');
ta.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});
ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
document.getElementById('sendBtn').onclick = sendMessage;

// Example buttons
document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('userInput').value = btn.innerText;
        sendMessage();
    });
});