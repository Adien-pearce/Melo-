// ===== Global State and Setup =====
const APP_CONTENT = document.getElementById('app-content');
let currentView = 'auri';
let viewHistory = [];
let isTyping = false;

// Real-time data storage
let auriHistory = [];
console.log('Initial auriHistory:', auriHistory);
let journalEntries = [];
let ventMessages = []; 
let userProfile = {
    name: '',
    email: '',
    safetyContactName: '',
    safetyContactPhone: ''
};

// Data for new journal entry
let currentMood = '😀'; 
let currentJournalText = '';

// Mood mapping for numerical analysis (1: Worst, 5: Best)
const MOOD_SCORE_MAP = {
    '🤯': 1, // Anxious/Overwhelmed (Lowest)
    '😔': 2, // Sad/Negative
    '😶': 3, // Neutral
    '😴': 4, // Tired/Low Energy (Neutral-ish)
    '😀': 5  // Happy/Positive (Highest)
};

// ===== Smooth Animation Manager =====
const AnimationManager = {
    // Smooth page transition
    pageTransition: async function(viewName) {
        return new Promise((resolve) => {
            // Add exit animation to current content
            APP_CONTENT.classList.add('page-exit');
            
            setTimeout(() => {
                // Change view
                this.changeView(viewName);
                
                // Add enter animation
                APP_CONTENT.classList.remove('page-exit');
                APP_CONTENT.classList.add('page-transition');
                
                // Remove animation class after completion
                setTimeout(() => {
                    APP_CONTENT.classList.remove('page-transition');
                    resolve();
                }, 500);
            }, 150);
        });
    },
    
    // Stagger animation for multiple elements
    stagger: function(elements, animationClass, delay = 100) {
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.classList.add(animationClass);
            }, index * delay);
        });
    },
    
    // Typing animation
    typeText: async function(element, text, speed = 30) {
        return new Promise((resolve) => {
            let i = 0;
            element.textContent = '';
            
            const typeChar = () => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(typeChar, speed);
                } else {
                    resolve();
                }
            };
            
            typeChar();
        });
    },
    
    // Pulse animation
    pulse: function(element, count = 2) {
        element.style.animation = 'pulseGlow 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, count * 500);
    }
};

// ===== Navigation System =====
function changeView(viewName, saveToHistory = true) {
    if (viewName === 'home') {
        window.location.href = 'index.html';
        return;
    }
    if (viewName === 'about') {
        window.location.href = 'about.html';
        return;
    }

    if (saveToHistory && currentView !== viewName) {
        viewHistory.push(currentView);
    }
    
    currentView = viewName;
    
    // Update navigation buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active', 'text-purple-400');
        btn.classList.add('text-gray-400');
    });
    
    const activeNavBtn = document.querySelector(`.nav-item[onclick*="${viewName}"]`);
    if (activeNavBtn) {
        activeNavBtn.classList.add('active', 'text-purple-400');
        activeNavBtn.classList.remove('text-gray-400');
    }
    
    // Show/Hide Back Button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        if (viewHistory.length > 0 && viewName !== 'login') {
            backBtn.classList.remove('hidden');
        } else {
            backBtn.classList.add('hidden');
        }
    }

    // Handle Navigation Bar visibility
    const nav = document.getElementById('main-nav');
    if (nav) {
        if (viewName === 'login') {
            nav.classList.add('hidden');
        } else {
            // Only show nav if user is logged in
            const isLoggedIn = localStorage.getItem('melo_logged_in') === 'true';
            if (isLoggedIn) {
                nav.classList.remove('hidden');
            }
        }
    }

    // Render the view with smooth transition
    renderView();
    
    // Re-render Lucide icons
    setTimeout(() => {
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 50);
}

function goBack() {
    if (viewHistory.length > 0) {
        const previousView = viewHistory.pop();
        changeView(previousView, false);
    }
}

async function changeViewWithAnimation(viewName) {
    await AnimationManager.pageTransition(viewName);
}

// ===== Firebase Data Listeners =====
function setupFirestoreListeners() {
    if (!window.firebaseImports) {
        console.error("Firebase imports missing!");
        return;
    }
    const { addDoc, collection, query, onSnapshot, serverTimestamp, APP_ID, doc } = window.firebaseImports;
    if (!window.db || !window.userId) {
        console.warn("Firestore not initialized. Using in-memory state.");
        auriHistory = [{ 
            sender: 'Auri', 
            text: "Hey! I'm Auri, your mental wellness companion. How are you feeling today? 😊",
            timestamp: new Date() 
        }];
        journalEntries = [];
        ventMessages = [];
        if (currentView === 'auri') renderAuriView();
        return;
    }

    // Auri History Listener
    const auriCollectionPath = `artifacts/${APP_ID}/users/${window.userId}/auri_history`;
    const auriQ = query(collection(window.db, auriCollectionPath));
    onSnapshot(auriQ, (snapshot) => {
        const newHistory = [];
        snapshot.forEach(doc => {
            newHistory.push({ id: doc.id, ...doc.data() });
        });
        newHistory.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
        
        // Ensure welcome message if empty
        if (newHistory.length === 0) {
            newHistory.push({ 
                sender: 'Auri', 
                text: "Hey! I'm Auri, your mental wellness companion. How are you feeling today? 😊",
                timestamp: new Date() 
            });
        }
        
        auriHistory = newHistory;
        if (currentView === 'auri') {
            renderAuriView();
            scrollToBottom('chat-container');
        }
    });

    // Journal Entries Listener
    const journalCollectionPath = `artifacts/${APP_ID}/users/${window.userId}/journal_entries`;
    const journalQ = query(collection(window.db, journalCollectionPath));
    onSnapshot(journalQ, (snapshot) => {
        const newEntries = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
            newEntries.push({ id: doc.id, ...data, timestamp: timestamp });
        });
        newEntries.sort((a, b) => (b.timestamp.getTime() - a.timestamp.getTime()));
        journalEntries = newEntries;
        if (currentView === 'journal') renderJournalView();
        if (currentView === 'insights') renderInsightsViewEnhanced();
    });

    // User Profile Listener
    const profileDocPath = `artifacts/${APP_ID}/users/${window.userId}/profile/user_data`;
    const profileRef = doc(window.db, profileDocPath);
    onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
            userProfile = { ...userProfile, ...docSnap.data() };
        }
        if (currentView === 'settings') renderSettingsView();
        if (currentView === 'aid') renderAidView();
    });

    // Vent Room Listener
    const ventCollectionPath = `artifacts/${APP_ID}/public/data/vent_messages`;
    const ventQ = query(collection(window.db, ventCollectionPath));
    onSnapshot(ventQ, (snapshot) => {
        const newMessages = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
            newMessages.push({ id: doc.id, ...data, timestamp: timestamp });
        });
        newMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        ventMessages = newMessages.slice(-50);
        
        if (currentView === 'vent') {
            renderVentView();
            scrollToBottom('vent-chat-container');
        }
    });
}

// ===== Data Saving Functions =====
async function saveMessage(sender, text) {
    console.log('saveMessage called with:', { sender, text });
    
    // Direct save to memory
    auriHistory.push({ sender, text, timestamp: new Date() });
    
    // Update UI immediately
    if (currentView === 'auri') {
        renderAuriView();
    }
}

async function saveVentMessage(text) {
    if (!window.firebaseImports || !window.db || !window.userId) {
        // Fallback to local storage
        ventMessages.push({ 
            userId: window.userId, 
            text: text, 
            timestamp: new Date() 
        });
        localStorage.setItem('vent_messages', JSON.stringify(ventMessages));
        showNotification('Vent saved locally!', 'info');
        return;
    }

    const { addDoc, collection, serverTimestamp, APP_ID } = window.firebaseImports;
    const ventCollectionPath = `artifacts/${APP_ID}/public/data/vent_messages`;
    
    try {
        await addDoc(collection(window.db, ventCollectionPath), {
            userId: window.userId,
            text: text,
            timestamp: serverTimestamp()
        });
        showNotification('Vent posted anonymously!', 'success');
    } catch (error) {
        console.error("Error saving vent message:", error);
        // Fallback to local storage
        ventMessages.push({ 
            userId: window.userId, 
            text: text, 
            timestamp: new Date() 
        });
        localStorage.setItem('vent_messages', JSON.stringify(ventMessages));
        showNotification('Vent saved locally!', 'info');
    }
}

async function saveProfileData(data) {
    const { setDoc, doc, APP_ID } = window.firebaseImports;
    if (!window.db || !window.userId) {
        // Fallback to local storage
        userProfile = { ...userProfile, ...data };
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
        showNotification('Profile saved locally!', 'info');
        return;
    }
    
    const profileDocPath = `artifacts/${APP_ID}/users/${window.userId}/profile/user_data`;
    try {
        await setDoc(doc(window.db, profileDocPath), data, { merge: true });
        userProfile = { ...userProfile, ...data };
        showNotification('Profile updated successfully!', 'success');
    } catch (error) {
        console.error("Error saving profile data:", error);
        // Fallback to local storage
        userProfile = { ...userProfile, ...data };
        localStorage.setItem('user_profile', JSON.stringify(userProfile));
        showNotification('Profile saved locally!', 'info');
    }
}

// ===== Utility Functions =====
function scrollToBottom(id) {
    const element = document.getElementById(id);
    if (element) {
        setTimeout(() => {
            element.scrollTop = element.scrollHeight;
        }, 100);
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-purple-600'} text-white`;
    notification.textContent = message;
    notification.style.animation = 'slideDown 0.3s ease-out forwards';
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease-out reverse forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== 1. Auri Chat View =====
async function generateAuriResponse(prompt) {
    console.log('generateAuriResponse called with:', prompt);
    
    if (isTyping) {
        console.log('Already typing, returning');
        return;
    }
    
    const lowerPrompt = prompt.toLowerCase();
    console.log('Lower prompt:', lowerPrompt);
    
    // Basic Prompt Responses
    if (lowerPrompt === 'hi' || lowerPrompt === 'hello') {
        await saveMessage('Auri', "Hey! I'm Auri, your mental wellness companion. How are you feeling today? 😊");
        return;
    }
    
    if (lowerPrompt.includes('what is melo')) {
        await saveMessage('Auri', "Melo is a therapist-backed mental wellness platform specifically designed for Gen Z. I'm here to guide you through journaling, toolkit exercises, and anonymous venting. 🧠✨");
        return;
    }
    
    if (lowerPrompt.includes('who made melo')) {
        await saveMessage('Auri', "Melo was created with love by a dedicated team of mental health advocates and developers to make wellness accessible and stigma-free for everyone. ❤️");
        return;
    }
    
    if (lowerPrompt.includes('who are you') || lowerPrompt.includes('what are you')) {
        await saveMessage('Auri', "I'm Auri, your personal mental wellness assistant! I'm here to listen, support you, and help you find the right tools to feel better. 🤝");
        return;
    }

    isTyping = true;
    renderAuriView(); // Show typing indicator
    
    try {
        console.log('Calling API with prompt:', prompt);
        const responseText = await api.generateAuriResponse(prompt);
        console.log('API response received:', responseText);
        await saveMessage('Auri', responseText);
    } catch (error) {
        console.error("Auri response error:", error);
        await saveMessage('Auri', "I'm having trouble connecting right now. How about we try a breathing exercise together? 🧘‍♀️");
    } finally {
        isTyping = false;
        renderAuriView();
        scrollToBottom('chat-container');
    }
}

function handleAuriSubmit(event) {
    event.preventDefault();
    console.log('handleAuriSubmit called');
    
    const input = document.getElementById('auri-input');
    const prompt = input.value.trim();
    
    console.log('Prompt:', prompt);
    console.log('isTyping:', isTyping);
    
    if (prompt && !isTyping) {
        // Add animation to input
        AnimationManager.pulse(input);
        
        console.log('Saving user message...');
        saveMessage('User', prompt);
        input.value = '';
        
        // Clear input with animation
        input.style.transform = 'scale(0.95)';
        setTimeout(() => {
            input.style.transform = 'scale(1)';
        }, 150);
        
        console.log('Calling generateAuriResponse...');
        generateAuriResponse(prompt);
    } else {
        console.log('Either no prompt or isTyping is true');
    }
}

function renderAuriView() {
    let chatBubbles = '';
    
    if (auriHistory.length > 0) {
        chatBubbles = auriHistory.map((msg, index) => {
            const time = msg.timestamp?.seconds ? 
                new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
            
            return `
                <div class="flex ${msg.sender === 'User' ? 'justify-end' : 'justify-start'} mb-4 chat-message" style="animation-delay: ${index * 50}ms">
                    <div class="max-w-xs sm:max-w-md p-4 text-sm ${msg.sender === 'User' ? 'message-bubble-user' : 'message-bubble-auri'}">
                        ${msg.text}
                        ${time ? `<span class="block text-xs mt-2 opacity-50">${time}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        chatBubbles = `
            <div class="p-8 text-center text-gray-500 animate-fadeIn">
                <i data-lucide="sparkles" class="w-12 h-12 mx-auto mb-4 text-purple-600 animate-pulse"></i>
                <h3 class="text-white font-bold mb-2">Welcome to Auri!</h3>
                <p class="text-sm">I'm your personal mental wellness assistant. Say hi to get started, or ask me "What is Melo?" to learn more. 👋</p>
            </div>
        `;
    }

    const typingIndicator = isTyping ? `
        <div class="flex justify-start mb-4">
            <div class="max-w-xs sm:max-w-md p-4 text-sm message-bubble-auri flex space-x-1">
                <div class="loading-dot h-2 w-2 bg-purple-400 rounded-full"></div>
                <div class="loading-dot h-2 w-2 bg-purple-400 rounded-full"></div>
                <div class="loading-dot h-2 w-2 bg-purple-400 rounded-full"></div>
            </div>
        </div>
    ` : '';

    APP_CONTENT.innerHTML = `
        <div class="pt-4 flex flex-col h-full animate-pageFadeIn">
            <div id="chat-container" class="flex-grow overflow-y-auto mb-4 px-2 space-y-3">
                ${chatBubbles}
                ${typingIndicator}
            </div>
            <form onsubmit="handleAuriSubmit(event)" class="sticky bottom-0 bg-[#0d1117]/90 backdrop-blur-sm pt-2 pb-6 max-w-lg mx-auto w-full">
                <div class="flex items-center space-x-3">
                    <input id="auri-input" type="text" placeholder="Chat with Auri..." 
                           class="flex-grow p-4 text-gray-200 bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-gray-500 text-base shadow-xl animated-textarea transition-all duration-300"
                           ${isTyping ? 'disabled' : ''}>
                    <button type="submit" class="p-3 bg-purple-600 rounded-xl hover:bg-purple-700 transition-all duration-300 shadow-lg btn-hover glow" ${isTyping ? 'disabled' : ''}>
                        <i data-lucide="send" class="w-6 h-6 text-white"></i>
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Animate chat messages
    setTimeout(() => {
        const messages = document.querySelectorAll('.chat-message');
        AnimationManager.stagger(messages, 'animate-fadeIn', 80);
    }, 100);
    
    scrollToBottom('chat-container');
    lucide.createIcons();
}

// ===== 2. Journal View =====
function setMood(mood) {
    // Remove selected class from all mood buttons
    document.querySelectorAll('.mood-emoji').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class to clicked mood
    const selectedBtn = document.querySelector(`.mood-emoji[onclick*="${mood}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
        AnimationManager.pulse(selectedBtn);
    }
    
    currentMood = mood;
}

function updateJournalText(event) {
    currentJournalText = event.target.value;
}

async function handleSaveEntry() {
    const text = document.getElementById('journal-text-input').value.trim();
    if (!text) {
        showNotification('Please write something in your journal', 'error');
        return;
    }

    if (!currentMood) {
        showNotification('Please select a mood', 'error');
        return;
    }

    const { addDoc, collection, serverTimestamp, APP_ID } = window.firebaseImports;
    if (!window.db || !window.userId) {
        // Save locally
        const entry = {
            mood: currentMood,
            text: text,
            timestamp: new Date(),
            id: Date.now().toString()
        };
        
        journalEntries.unshift(entry);
        localStorage.setItem('journal_entries', JSON.stringify(journalEntries));
        
        showNotification('Journal entry saved locally!', 'success');
        
        // Reset form
        currentJournalText = '';
        currentMood = '😀';
        const textarea = document.getElementById('journal-text-input');
        if (textarea) textarea.value = '';
        renderJournalView();
        return;
    }
    
    const journalCollectionPath = `artifacts/${APP_ID}/users/${window.userId}/journal_entries`;
    try {
        await addDoc(collection(window.db, journalCollectionPath), {
            mood: currentMood,
            text: text,
            timestamp: serverTimestamp()
        });

        showNotification('Journal entry saved! ✨', 'success');
        
        // Reset form
        currentJournalText = '';
        currentMood = '😀';
        const textarea = document.getElementById('journal-text-input');
        if (textarea) textarea.value = '';
        renderJournalView();
    } catch (error) {
        console.error("Error saving journal entry:", error);
        showNotification('Failed to save entry. Trying locally...', 'error');
        
        // Fallback to local storage
        const entry = {
            mood: currentMood,
            text: text,
            timestamp: new Date(),
            id: Date.now().toString()
        };
        
        journalEntries.unshift(entry);
        localStorage.setItem('journal_entries', JSON.stringify(journalEntries));
        
        showNotification('Saved locally instead!', 'info');
        
        // Reset form
        currentJournalText = '';
        currentMood = '😀';
        const textarea = document.getElementById('journal-text-input');
        if (textarea) textarea.value = '';
        renderJournalView();
    }
}

async function exportJournalEntry(entryId) {
    const entry = journalEntries.find(e => e.id === entryId || e.id === entryId.toString());
    if (!entry) {
        showNotification('Entry not found', 'error');
        return;
    }

    try {
        // Create JSON file
        const data = {
            ...entry,
            exportDate: new Date().toISOString(),
            app: 'Melo Journal',
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `melo-journal-${new Date(entry.timestamp).toISOString().split('T')[0]}.json`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        showNotification('Journal entry exported! 📥', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export entry', 'error');
    }
}

function renderJournalView() {
    const moodEmojis = ['😀', '😔', '😶', '🤯', '😴'];
    const moodButtons = moodEmojis.map(mood => `
        <button 
            class="mood-emoji text-3xl p-3 rounded-lg transition-all duration-300 ${currentMood === mood ? 'selected' : 'bg-gray-800 hover:bg-gray-700'}"
            onclick="setMood('${mood}')"
        >
            ${mood}
        </button>
    `).join('');
    
    const journalList = journalEntries.length > 0 ? journalEntries.map(entry => {
        const date = entry.timestamp ? 
            (entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp.seconds * 1000)) : 
            new Date();
        
        const dateStr = date.toLocaleDateString('en-IN', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        const timeStr = date.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="journal-entry bg-gray-800 p-4 rounded-xl shadow-lg mb-3 border border-gray-700 hover:border-purple-500 transition-all duration-300 card-hover animate-fadeInUp">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-3xl">${entry.mood}</span>
                    <div class="text-right">
                        <span class="text-xs text-gray-400 block">${dateStr}</span>
                        <span class="text-xs text-gray-500">${timeStr}</span>
                    </div>
                </div>
                <p class="text-sm text-gray-300 mb-3 whitespace-pre-wrap">${entry.text}</p>
                <div class="flex justify-between items-center">
                    <span class="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded-full">Saved</span>
                    <button onclick="exportJournalEntry('${entry.id}')" class="text-xs flex items-center space-x-1 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full transition-all duration-300">
                        <i data-lucide="download" class="w-3 h-3"></i>
                        <span>Export</span>
                    </button>
                </div>
            </div>
        `;
    }).join('') : `
        <div class="p-8 text-center text-gray-500 animate-fadeIn">
            <i data-lucide="book-open-text" class="w-12 h-12 mx-auto mb-4 text-purple-600"></i>
            <p class="mb-2">No journal entries yet!</p>
            <p class="text-sm text-gray-400">Your first entry will appear here 📝</p>
        </div>
    `;

    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <h2 class="text-3xl font-bold text-white mb-6 flex items-center space-x-2">
                <i data-lucide="book-open-text" class="w-8 h-8 text-purple-400"></i>
                <span>Smart Daily Journal</span>
            </h2>
            
            <!-- New Entry Card -->
            <div class="journal-notepad rounded-2xl shadow-2xl mb-8 card-hover">
                <h3 class="text-xl font-semibold mb-4 text-purple-300">New Check-In</h3>
                
                <div class="flex flex-wrap gap-3 mb-6">
                    ${moodButtons}
                </div>
                
                <textarea 
                    id="journal-text-input"
                    rows="6" 
                    placeholder="How are you really feeling? Log your thoughts here..." 
                    class="w-full p-0 text-gray-200 bg-transparent rounded-lg focus:outline-none placeholder-gray-500 resize-none animated-textarea"
                    oninput="updateJournalText(event)"
                    onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSaveEntry(); }"
                >${currentJournalText}</textarea>
                
                <div class="flex flex-wrap gap-3 mt-6">
                    <button id="voice-log-btn" onclick="VoiceInputService.start((text) => {
                        const textarea = document.getElementById('journal-text-input');
                        if (textarea) {
                            textarea.value += ' ' + text;
                            currentJournalText = textarea.value;
                        }
                    })" class="flex items-center space-x-2 p-3 bg-red-600 rounded-full hover:bg-red-700 transition-all duration-300 btn-hover">
                        <i data-lucide="mic" class="w-5 h-5 text-white"></i>
                        <span class="text-sm text-white">Voice Log</span>
                    </button>
                    
                    <button id="record-mp3-btn" onclick="VoiceRecorderService.toggleRecording()" class="flex items-center space-x-2 p-3 bg-orange-600 rounded-full hover:bg-orange-700 transition-all duration-300 btn-hover">
                        <i data-lucide="radio" class="w-5 h-5 text-white"></i>
                        <span class="text-sm text-white">Record MP3</span>
                    </button>

                    <button 
                        onclick="handleSaveEntry()"
                        class="px-5 py-3 bg-purple-600 rounded-full font-semibold hover:bg-purple-700 transition-all duration-300 shadow-md btn-hover glow ml-auto">
                        Save Entry
                    </button>
                </div>
            </div>

            <!-- Recent Entries -->
            <h3 class="text-2xl font-semibold text-white mb-4 pb-2 border-b border-gray-700">Recent Entries</h3>
            <div id="journal-list" class="space-y-3">
                ${journalList}
            </div>
        </div>
    `;
    
    // Animate journal entries
    setTimeout(() => {
        const entries = document.querySelectorAll('.journal-entry');
        AnimationManager.stagger(entries, 'animate-fadeInUp', 150);
    }, 100);
    
    lucide.createIcons();
}

// ===== 3. Insights View =====
function getMoodAnalysis() {
    if (journalEntries.length < 2) {
        return null;
    }

    const moodData = journalEntries.slice(0, 7).map(entry => {
        const score = MOOD_SCORE_MAP[entry.mood] || 3;
        const date = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp?.seconds * 1000 || Date.now());
        return { score, date };
    }).reverse(); // Reverse to show chronological order

    return moodData;
}

function generateMoodGraph(moodData) {
    if (!moodData || moodData.length < 2) return '';

    const svgWidth = 600;
    const svgHeight = 160;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const graphWidth = svgWidth - padding.left - padding.right;
    const graphHeight = svgHeight - padding.top - padding.bottom;

    // Calculate points
    const xScale = graphWidth / (moodData.length - 1);
    const yScale = graphHeight / 4; // 5 mood levels, so 4 intervals

    const points = moodData.map((data, index) => {
        const x = padding.left + (index * xScale);
        const y = padding.top + graphHeight - ((data.score - 1) * yScale);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Generate date labels
    const dateLabels = moodData.map((data, index) => {
        const x = padding.left + (index * xScale);
        const date = data.date;
        const label = index === 0 || index === moodData.length - 1 ? 
            date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
        
        if (label) {
            return `
                <text x="${x}" y="${svgHeight - 5}" text-anchor="middle" class="text-xs fill-gray-400">
                    ${label}
                </text>
            `;
        }
        return '';
    }).join('');

    // Generate mood level labels
    const moodLabels = [1, 2, 3, 4, 5].map(level => {
        const y = padding.top + graphHeight - ((level - 1) * yScale);
        const emoji = Object.keys(MOOD_SCORE_MAP).find(key => MOOD_SCORE_MAP[key] === level) || '😶';
        return `
            <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="text-xs fill-gray-400">
                ${emoji}
            </text>
            <line x1="${padding.left}" y1="${y}" x2="${padding.left + graphWidth}" y2="${y}" class="stroke-gray-700" stroke-width="1" stroke-dasharray="2,2"/>
        `;
    }).join('');

    return `
        <svg width="100%" height="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" class="mood-graph">
            <defs>
                <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                    <stop offset="25%" style="stop-color:#f97316;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#facc15;stop-opacity:1" />
                    <stop offset="75%" style="stop-color:#84cc16;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#22c55e;stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Grid and labels -->
            ${moodLabels}
            
            <!-- Graph line -->
            <path d="${points}" class="graph-line" fill="none"/>
            
            <!-- Data points -->
            ${moodData.map((data, index) => {
                const x = padding.left + (index * xScale);
                const y = padding.top + graphHeight - ((data.score - 1) * yScale);
                const color = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e'][data.score - 1];
                return `
                    <circle cx="${x}" cy="${y}" r="4" class="graph-point" style="fill: ${color}">
                        <title>Mood: ${data.score}/5 - ${new Date(data.date).toLocaleDateString('en-IN')}</title>
                    </circle>
                `;
            }).join('')}
            
            <!-- Date labels -->
            ${dateLabels}
        </svg>
    `;
}

function renderInsightsView() {
    const moodData = getMoodAnalysis();
    const totalEntries = journalEntries.length;
    const today = new Date();
    const last7Days = journalEntries.filter(entry => {
        const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp?.seconds * 1000 || Date.now());
        const diffTime = Math.abs(today - entryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }).length;

    if (totalEntries === 0) {
        APP_CONTENT.innerHTML = `
            <div class="pt-6 text-center animate-pageFadeIn">
                <h2 class="text-3xl font-bold text-white mb-6 flex items-center space-x-2">
                    <i data-lucide="trending-up" class="w-8 h-8 text-purple-400"></i>
                    <span>Mental Wellness Insights</span>
                </h2>
                <div class="bg-gray-800 p-8 rounded-2xl shadow-xl mt-12 card-hover">
                    <i data-lucide="database" class="w-12 h-12 text-purple-500 mx-auto mb-4 animate-pulse"></i>
                    <h3 class="text-xl font-semibold text-white mb-2">Start journaling to see insights!</h3>
                    <p class="text-gray-400 mb-4">Log your moods and thoughts in the Journal to track your emotional patterns.</p>
                    <button onclick="changeViewWithAnimation('journal')" class="mt-4 px-5 py-3 bg-purple-600 rounded-full font-semibold hover:bg-purple-700 transition-all duration-300 btn-hover glow">
                        Go to Journal
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Calculate statistics
    const moodCounts = {};
    let totalScore = 0;
    
    journalEntries.forEach(entry => {
        const score = MOOD_SCORE_MAP[entry.mood] || 3;
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        totalScore += score;
    });
    
    const averageMood = (totalScore / totalEntries).toFixed(1);
    
    // Find most common mood
    let mostCommonMood = '😶';
    let maxCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
        if (count > maxCount) {
            maxCount = count;
            mostCommonMood = mood;
        }
    });

    const graphHTML = moodData ? generateMoodGraph(moodData) : `
        <div class="p-8 text-center text-gray-500">
            <p>Need 2+ entries for mood graph 📊</p>
        </div>
    `;

    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <h2 class="text-3xl font-bold text-white mb-6 flex items-center space-x-2">
                <i data-lucide="trending-up" class="w-8 h-8 text-purple-400"></i>
                <span>Mental Wellness Insights</span>
            </h2>
            
            <!-- Stats Overview -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Total Entries</p>
                    <p class="text-2xl font-bold text-white">${totalEntries}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Last 7 Days</p>
                    <p class="text-2xl font-bold text-white">${last7Days}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Avg Mood</p>
                    <p class="text-2xl font-bold text-white">${averageMood}/5</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Common Mood</p>
                    <p class="text-2xl font-bold">${mostCommonMood}</p>
                </div>
            </div>

            <!-- Mood Graph -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-500/30 card-hover">
                <h3 class="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="line-chart" class="w-6 h-6"></i>
                    <span>Mood Trends</span>
                </h3>
                ${graphHTML}
            </div>

            <!-- Mood Breakdown -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl card-hover">
                <h3 class="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                    <i data-lucide="pie-chart" class="w-6 h-6"></i>
                    <span>Mood Distribution</span>
                </h3>
                <div class="space-y-4">
                    ${Object.entries(moodCounts)
                        .sort(([,a], [,b]) => b - a)
                        .map(([mood, count]) => {
                            const percentage = ((count / totalEntries) * 100).toFixed(1);
                            const score = MOOD_SCORE_MAP[mood] || 3;
                            const barColor = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e'][score - 1];
                            
                            return `
                                <div class="flex items-center">
                                    <span class="text-2xl w-10">${mood}</span>
                                    <div class="flex-grow ml-4">
                                        <div class="flex justify-between text-sm mb-1">
                                            <span class="text-gray-300">${count} entries</span>
                                            <span class="text-gray-400">${percentage}%</span>
                                        </div>
                                        <div class="w-full bg-gray-700 rounded-full h-2">
                                            <div class="h-2 rounded-full progress-bar" style="width: ${percentage}%; background: ${barColor};"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

// ===== 4. Toolkit View =====
let breathingExerciseInterval = null;
let breathingCycle = 0;
let breathingState = 'in';

function startBreathingExercise() {
    const circle = document.getElementById('breathing-circle');
    const instructions = document.getElementById('breathing-instructions');
    const button = document.getElementById('breathing-button');
    
    if (breathingExerciseInterval) {
        // Stop exercise
        clearInterval(breathingExerciseInterval);
        breathingExerciseInterval = null;
        breathingCycle = 0;
        breathingState = 'in';
        
        circle.classList.remove('breathe-in', 'breathe-out');
        circle.style.transform = 'scale(1)';
        instructions.textContent = "Tap 'Start' to begin.";
        button.textContent = "Start Exercise";
        button.classList.remove('bg-red-600', 'hover:bg-red-700');
        button.classList.add('bg-purple-600', 'hover:bg-purple-700');
        return;
    }
    
    // Start exercise
    button.textContent = "Stop Exercise";
    button.classList.remove('bg-purple-600', 'hover:bg-purple-700');
    button.classList.add('bg-red-600', 'hover:bg-red-700');
    
    const totalCycles = 5;
    
    function updateBreathing() {
        if (breathingCycle >= totalCycles) {
            clearInterval(breathingExerciseInterval);
            breathingExerciseInterval = null;
            breathingCycle = 0;
            breathingState = 'in';
            
            circle.classList.remove('breathe-in', 'breathe-out');
            circle.style.transform = 'scale(1)';
            instructions.textContent = "Exercise complete! 🎉";
            button.textContent = "Start Exercise";
            button.classList.remove('bg-red-600', 'hover:bg-red-700');
            button.classList.add('bg-purple-600', 'hover:bg-purple-700');
            return;
        }
        
        if (breathingState === 'in') {
            // Inhale for 4 seconds
            circle.classList.remove('breathe-out');
            circle.classList.add('breathe-in');
            instructions.textContent = `🌬️ Inhale... (Cycle ${breathingCycle + 1}/${totalCycles})`;
            breathingState = 'hold';
        } else if (breathingState === 'hold') {
            // Hold for 4 seconds
            instructions.textContent = `⏸️ Hold...`;
            breathingState = 'out';
        } else if (breathingState === 'out') {
            // Exhale for 6 seconds
            circle.classList.remove('breathe-in');
            circle.classList.add('breathe-out');
            instructions.textContent = `😮‍💨 Exhale...`;
            breathingState = 'rest';
        } else {
            // Rest for 2 seconds
            circle.classList.remove('breathe-out');
            breathingCycle++;
            if (breathingCycle < totalCycles) {
                instructions.textContent = `😌 Rest...`;
                breathingState = 'in';
            }
        }
    }
    
    instructions.textContent = "Get ready...";
    breathingExerciseInterval = setInterval(updateBreathing, 2000);
    updateBreathing();
}

function startGroundingExercise() {
    showNotification('Starting grounding exercise...', 'info');
    
    const steps = [
        { emoji: '👀', text: 'Look around. Name 5 things you can see.' },
        { emoji: '✋', text: 'Notice 4 things you can feel or touch.' },
        { emoji: '👂', text: 'Listen for 3 things you can hear.' },
        { emoji: '👃', text: 'Find 2 things you can smell.' },
        { emoji: '👅', text: 'Notice 1 thing you can taste.' }
    ];
    
    let currentStep = 0;
    
    function nextStep() {
        if (currentStep < steps.length) {
            showNotification(`${steps[currentStep].emoji} ${steps[currentStep].text}`, 'info');
            currentStep++;
            setTimeout(nextStep, 10000); // 10 seconds per step
        } else {
            showNotification('Grounding exercise complete! 🌟', 'success');
        }
    }
    
    nextStep();
}

function startThoughtChallenge() {
    const template = `
Write down a negative thought you're having:
_________________________________________

Challenge it with these questions:
1. What evidence supports this thought?
2. What evidence contradicts it?
3. What's a more balanced perspective?
4. How would I advise a friend with this thought?

Alternative thought:
_________________________________________
    `;
    
    if (window.db && window.userId) {
        // Save to Firestore
        const { addDoc, collection, serverTimestamp, APP_ID } = window.firebaseImports;
        const thoughtsPath = `artifacts/${APP_ID}/users/${window.userId}/thought_challenges`;
        
        addDoc(collection(window.db, thoughtsPath), {
            template: template,
            timestamp: serverTimestamp()
        }).then(() => {
            showNotification('Thought challenge template saved! 📝', 'success');
        }).catch(() => {
            // Fallback to download
            downloadThoughtTemplate(template);
        });
    } else {
        // Download as file
        downloadThoughtTemplate(template);
    }
}

function downloadThoughtTemplate(template) {
    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thought-challenge-template.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Template downloaded! 📥', 'success');
}

function renderToolkitView() {
    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <h2 class="text-3xl font-bold text-white mb-6 flex items-center space-x-2">
                <i data-lucide="toolbox" class="w-8 h-8 text-purple-400"></i>
                <span>Micro-Therapy Toolkit</span>
            </h2>
            <p class="text-gray-400 mb-8">Therapist-approved tools for in-the-moment relief and growth.</p>
            
            <!-- Breathing Exercise Card -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-600/50 card-hover">
                <h3 class="text-xl font-semibold text-purple-300 mb-2 flex items-center space-x-2">
                    <i data-lucide="wind" class="w-6 h-6"></i>
                    <span>4-4-6 Breathing</span>
                </h3>
                <p class="text-sm text-gray-400 mb-4">A powerful technique to calm your nervous system instantly. Follow the rhythm.</p>
                
                <div class="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-xl mb-4">
                    <div id="breathing-circle" class="breathing-circle mb-4"></div>
                    <p id="breathing-instructions" class="text-lg font-medium text-white h-8 text-center">Tap 'Start' to begin.</p>
                </div>
                
                <button id="breathing-button" onclick="startBreathingExercise()" class="w-full px-4 py-3 bg-purple-600 rounded-xl font-bold hover:bg-purple-700 transition-all duration-300 shadow-md btn-hover glow">
                    Start Exercise
                </button>
            </div>

            <!-- Grounding Exercise Card -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 card-hover">
                <h3 class="text-xl font-semibold text-sky-300 mb-2 flex items-center space-x-2">
                    <i data-lucide="anchor" class="w-6 h-6"></i>
                    <span>Grounding (5-4-3-2-1)</span>
                </h3>
                <p class="text-sm text-gray-400 mb-4">Use your senses to reconnect with the present when anxiety hits hard.</p>
                <ul class="text-sm text-gray-300 space-y-2 mb-4">
                    <li class="flex items-center space-x-2"><span class="text-lg">👀</span><span><strong>5</strong> things you can see</span></li>
                    <li class="flex items-center space-x-2"><span class="text-lg">✋</span><span><strong>4</strong> things you can feel</span></li>
                    <li class="flex items-center space-x-2"><span class="text-lg">👂</span><span><strong>3</strong> things you can hear</span></li>
                    <li class="flex items-center space-x-2"><span class="text-lg">👃</span><span><strong>2</strong> things you can smell</span></li>
                    <li class="flex items-center space-x-2"><span class="text-lg">👅</span><span><strong>1</strong> thing you can taste</span></li>
                </ul>
                <button onclick="startGroundingExercise()" class="w-full px-4 py-3 bg-sky-600 rounded-xl font-bold hover:bg-sky-700 transition-all duration-300 btn-hover">
                    Start Guided Session
                </button>
            </div>

            <!-- Thought-Challenging Card -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl card-hover">
                <h3 class="text-xl font-semibold text-orange-300 mb-2 flex items-center space-x-2">
                    <i data-lucide="lightbulb" class="w-6 h-6"></i>
                    <span>Thought Challenge</span>
                </h3>
                <p class="text-sm text-gray-400 mb-4">Question your negative or spiraling thoughts using CBT principles.</p>
                <button onclick="startThoughtChallenge()" class="w-full px-4 py-3 bg-orange-600 rounded-xl font-bold hover:bg-orange-700 transition-all duration-300 btn-hover">
                    Start Thought Template
                </button>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

// ===== 5. Emergency Aid View =====
function renderAidView() {
    const safetyName = userProfile.safetyContactName || 'Not set';
    const safetyPhone = userProfile.safetyContactPhone || 'Not set';
    
    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <h2 class="text-3xl font-bold text-red-400 mb-6 flex items-center space-x-2">
                <i data-lucide="alert-triangle" class="w-8 h-8 text-red-400 glow-red"></i>
                <span>Emergency Aid & Support</span>
            </h2>
            <p class="text-gray-400 mb-8">If you or someone you know is in immediate danger, please call emergency services immediately.</p>
            
            <!-- Your Safety Contact -->
            <div class="bg-red-900/30 p-6 rounded-2xl shadow-2xl mb-8 border-2 border-red-500/50 card-hover">
                <h3 class="text-xl font-bold text-red-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="heart" class="w-6 h-6"></i>
                    <span>Your Safety Contact</span>
                </h3>
                <p class="text-sm text-red-200 mb-6">This information is stored privately and only visible to you.</p>
                
                <div class="space-y-4">
                    <div class="bg-red-800/40 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <p class="text-red-100 font-semibold">Contact Name</p>
                            <p class="text-red-200">${safetyName}</p>
                        </div>
                        <i data-lucide="user" class="w-5 h-5 text-red-300"></i>
                    </div>
                    
                    <div class="bg-red-800/40 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <p class="text-red-100 font-semibold">Phone Number</p>
                            ${safetyPhone !== 'Not set' ? 
                                `<a href="tel:${safetyPhone}" class="text-red-200 hover:text-red-100 transition-colors duration-300">${safetyPhone}</a>` : 
                                `<p class="text-red-200">${safetyPhone}</p>`
                            }
                        </div>
                        <i data-lucide="phone" class="w-5 h-5 text-red-300"></i>
                    </div>
                </div>
                
                <button onclick="changeViewWithAnimation('settings')" class="mt-6 w-full px-4 py-3 bg-red-600 rounded-xl font-bold hover:bg-red-700 transition-all duration-300 shadow-md btn-hover">
                    Update Safety Contact
                </button>
            </div>

            <!-- Indian Crisis Helplines -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-6 card-hover">
                <h3 class="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                    <i data-lucide="phone-call" class="w-6 h-6 text-green-400"></i>
                    <span>24×7 Crisis Helplines (India)</span>
                </h3>
                <p class="text-sm text-gray-400 mb-4">Free, confidential, and available 24/7. You are not alone.</p>
                
                <div class="space-y-4">
                    <!-- Kiran Helpline -->
                    <div class="bg-gray-900 p-4 rounded-xl hover:bg-gray-850 transition-all duration-300">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <p class="font-bold text-white">Kiran Mental Health Helpline</p>
                                <p class="text-sm text-gray-400">Ministry of Social Justice & Empowerment</p>
                            </div>
                            <span class="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">24/7</span>
                        </div>
                        <a href="tel:18005990019" class="text-xl font-bold text-green-400 hover:text-green-300 transition-colors duration-300 block text-center py-2">
                            1800-599-0019
                        </a>
                        <p class="text-xs text-gray-500 mt-2 text-center">Toll-free | Multilingual | All ages</p>
                    </div>
                    
                    <!-- Vandrevala Foundation -->
                    <div class="bg-gray-900 p-4 rounded-xl hover:bg-gray-850 transition-all duration-300">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <p class="font-bold text-white">Vandrevala Foundation</p>
                                <p class="text-sm text-gray-400">Mental health & suicide prevention</p>
                            </div>
                            <span class="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded-full">24/7</span>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <a href="tel:9999666555" class="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors duration-300 block text-center py-2 bg-blue-900/30 rounded-lg">
                                9999 666 555
                            </a>
                            <a href="tel:9152987821" class="text-lg font-bold text-blue-400 hover:text-blue-300 transition-colors duration-300 block text-center py-2 bg-blue-900/30 rounded-lg">
                                915 298 7821
                            </a>
                        </div>
                        <p class="text-xs text-gray-500 mt-2 text-center">WhatsApp available | Professional counselors</p>
                    </div>
                    
                    <!-- iCall -->
                    <div class="bg-gray-900 p-4 rounded-xl hover:bg-gray-850 transition-all duration-300">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <p class="font-bold text-white">iCall Psychosocial Helpline</p>
                                <p class="text-sm text-gray-400">Tata Institute of Social Sciences</p>
                            </div>
                            <span class="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded-full">Mon-Sat</span>
                        </div>
                        <a href="tel:9152987821" class="text-lg font-bold text-purple-400 hover:text-purple-300 transition-colors duration-300 block text-center py-2">
                            915 298 7821
                        </a>
                        <p class="text-xs text-gray-500 mt-2 text-center">10 AM - 8 PM | Email: icall@tiss.edu</p>
                    </div>
                    
                    <!-- Immediate Police/Emergency -->
                    <div class="bg-red-900/30 p-4 rounded-xl border border-red-500/30">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <p class="font-bold text-red-300">Police & Emergency</p>
                                <p class="text-sm text-red-200/80">Immediate life-threatening situations</p>
                            </div>
                            <i data-lucide="alert-circle" class="w-5 h-5 text-red-400"></i>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <a href="tel:100" class="text-xl font-bold text-white hover:text-red-100 transition-colors duration-300 block text-center py-3 bg-red-700 rounded-lg">
                                100
                            </a>
                            <a href="tel:112" class="text-xl font-bold text-white hover:text-red-100 transition-colors duration-300 block text-center py-3 bg-red-700 rounded-lg">
                                112
                            </a>
                        </div>
                        <p class="text-xs text-red-300/70 mt-2 text-center">Pan-India emergency response</p>
                    </div>
                </div>
                
                <div class="mt-6 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <p class="text-sm text-gray-400 text-center">
                        <i data-lucide="shield" class="w-4 h-4 inline mr-1"></i>
                        These services are confidential, free, and here to support you
                    </p>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

// ===== 6. Vent Room View =====
let isSavingVent = false;

async function handleVentSubmit(event) {
    event.preventDefault();
    
    if (isSavingVent) return;
    
    const input = document.getElementById('vent-input');
    const text = input.value.trim();
    
    if (!text) {
        showNotification('Please write something to vent', 'error');
        return;
    }
    
    if (text.length > 500) {
        showNotification('Vent message is too long (max 500 characters)', 'error');
        return;
    }
    
    isSavingVent = true;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i>';
    submitBtn.disabled = true;
    
    try {
        await saveVentMessage(text);
        input.value = '';
        
        // Reset button after delay
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            isSavingVent = false;
        }, 1000);
        
    } catch (error) {
        console.error('Error saving vent:', error);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        isSavingVent = false;
        showNotification('Failed to save vent. Please try again.', 'error');
    }
}

function renderVentView() {
    const chatBubbles = ventMessages.map((msg, index) => {
        const isSelf = msg.userId === window.userId;
        const displayName = isSelf ? 'You' : `User ${(msg.userId || 'anon').substring(0, 6)}`;
        const timeStr = msg.timestamp ? 
            (msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp.seconds * 1000))
                .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
        
        return `
            <div class="vent-message" style="animation-delay: ${index * 50}ms">
                <div class="flex ${isSelf ? 'justify-end' : 'justify-start'} mb-4">
                    <div class="max-w-xs sm:max-w-md p-4 text-sm ${isSelf ? 'message-bubble-user' : 'message-bubble-auri'}">
                        <div class="font-bold text-xs mb-1 ${isSelf ? 'text-blue-300' : 'text-purple-400'}">
                            ${displayName}
                        </div>
                        <p class="text-gray-100 whitespace-pre-wrap">${msg.text}</p>
                        <div class="flex justify-between items-center mt-2">
                            <span class="text-xs opacity-50">${timeStr}</span>
                            ${isSelf ? '<span class="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">You</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    APP_CONTENT.innerHTML = `
        <div class="pt-4 flex flex-col h-full animate-pageFadeIn">
            <h2 class="text-3xl font-bold text-white mb-4 flex items-center space-x-2">
                <i data-lucide="message-square-text" class="w-8 h-8 text-purple-400"></i>
                <span>The Vent Room</span>
            </h2>
            <p class="text-sm text-gray-400 mb-6">
                Let it all out! This space is shared publicly with other users. 
                <strong class="text-red-400">Please be kind, supportive, and completely anonymous.</strong> 
                Messages are limited to the last 50.
            </p>
            
            <div id="vent-chat-container" class="flex-grow overflow-y-auto mb-4 px-2 bg-gray-900/50 rounded-xl p-4 h-full border border-gray-700">
                ${ventMessages.length > 0 ? chatBubbles : 
                    `<div class="p-8 text-center text-gray-500 animate-fadeIn">
                        <i data-lucide="wind" class="w-12 h-12 mx-auto mb-4 text-purple-600"></i>
                        <p class="mb-2">It's quiet in here...</p>
                        <p class="text-sm text-gray-400">Be the first to vent! 🗣️</p>
                    </div>`
                }
            </div>
            
            <form onsubmit="handleVentSubmit(event)" class="sticky bottom-0 bg-[#0d1117]/90 backdrop-blur-sm pt-2 pb-6 max-w-lg mx-auto w-full">
                <div class="flex items-center space-x-3">
                    <textarea 
                        id="vent-input" 
                        placeholder="I need to get something off my chest..."
                        class="flex-grow p-4 text-gray-200 bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder-gray-500 text-base shadow-xl animated-textarea resize-none transition-all duration-300"
                        rows="2"
                        maxlength="500"
                    ></textarea>
                    <button type="submit" class="p-3 bg-purple-600 rounded-xl hover:bg-purple-700 transition-all duration-300 shadow-lg btn-hover glow self-end">
                        <i data-lucide="send" class="w-6 h-6 text-white"></i>
                    </button>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs text-gray-500">
                        <i data-lucide="user-secret" class="w-3 h-3 inline mr-1"></i>
                        You're anonymous
                    </span>
                    <span id="vent-char-count" class="text-xs text-gray-500">0/500</span>
                </div>
            </form>
        </div>
    `;
    
    // Add character count functionality
    const ventInput = document.getElementById('vent-input');
    const charCount = document.getElementById('vent-char-count');
    
    if (ventInput && charCount) {
        ventInput.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = `${length}/500`;
            charCount.className = `text-xs ${length >= 450 ? 'text-red-400' : length >= 400 ? 'text-yellow-400' : 'text-gray-500'}`;
        });
    }
    
    // Animate vent messages
    setTimeout(() => {
        const messages = document.querySelectorAll('.vent-message');
        AnimationManager.stagger(messages, 'animate-fadeIn', 80);
    }, 100);
    
    scrollToBottom('vent-chat-container');
    lucide.createIcons();
}

// ===== 7. Settings View =====
const EmailService = {
    senderEmail: 'adienpearce4@gmail.com',
    sendWelcomeEmail: async function(email, userName) {
        console.log(`Simulating sending welcome email from ${this.senderEmail} to ${email}...`);
        
        const welcomeText = `Melo represents a paradigm shift in digital mental health by integrating cutting-edge artificial intelligence with human-centered design principles. The platform's core innovation lies in its hybrid care model that combines: (1) an emotionally intelligent AI guide named Auri, powered by advanced natural language processing and machine learning algorithms; (2) a secure, gamified journaling system with mood tracking capabilities; (3) moderated peer support communities called Vent Rooms; and (4) professional therapist oversight through a dedicated dashboard interface.`;
        
        const instructions = `
How to use Melo:
- Chat with Auri: Use the Sparkles icon to talk to your AI guide.
- Daily Journal: Use the Book icon to log your thoughts and mood.
- Insights: Track your mental health progress over time.
- Vent Rooms: Share your thoughts anonymously with the community.
        `;

        // In a real app, this would be an API call to a backend
        setTimeout(() => {
            showNotification(`Welcome email sent to ${email} (via ${this.senderEmail})! 📧`, 'success');
            
            // Add a welcome message from Auri as well
            saveMessage('Auri', `Hey ${userName || 'there'}! I've sent a welcome email from ${this.senderEmail} to ${email}. ${welcomeText} \n\n${instructions}`);
        }, 1500);
    }
};

function handleProfileSave(event) {
    event.preventDefault();
    
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const safetyName = document.getElementById('safety-contact-name').value;
    const safetyPhone = document.getElementById('safety-contact-phone').value;
    
    const oldEmail = userProfile.email;
    
    // Validate phone number if provided
    if (safetyPhone && safetyPhone !== 'Not set') {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
        if (!phoneRegex.test(safetyPhone.replace(/\s/g, ''))) {
            showNotification('Please enter a valid phone number', 'error');
            return;
        }
    }
    
    saveProfileData({ 
        name: name, 
        email: email, 
        safetyContactName: safetyName, 
        safetyContactPhone: safetyPhone 
    });

    // If email is newly added, send welcome email
    if (email && email !== oldEmail) {
        EmailService.sendWelcomeEmail(email, name);
    }
}

function handleExportData() {
    const data = {
        userProfile,
        journalEntries,
        auriHistory,
        ventMessages,
        exportDate: new Date().toISOString(),
        appVersion: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `melo-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully! 📥', 'success');
}

function handleDeleteData() {
    if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
        // Clear local storage
        localStorage.clear();
        
        // Clear in-memory data
        auriHistory = [];
        journalEntries = [];
        ventMessages = [];
        userProfile = {
            name: '',
            email: '',
            safetyContactName: '',
            safetyContactPhone: ''
        };
        
        // Generate new user ID
        window.userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        showNotification('All data deleted successfully', 'success');
        renderSettingsView();
    }
}

function renderSettingsView() {
    const userId = window.userId || 'Not available';
    const shortId = userId.length > 20 ? userId.substring(0, 20) + '...' : userId;
    
    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <h2 class="text-3xl font-bold text-white mb-8 flex items-center space-x-2">
                <i data-lucide="settings" class="w-8 h-8 text-purple-400"></i>
                <span>Account Settings</span>
            </h2>
            
            <!-- User Profile -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-500/30 card-hover">
                <h3 class="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="user" class="w-6 h-6"></i>
                    <span>Edit Profile & Data</span>
                </h3>
                
                <form onsubmit="handleProfileSave(event)" class="space-y-4">
                    <div>
                        <label for="profile-name" class="block text-sm font-medium text-gray-300 mb-2">
                            Your Name (Optional)
                        </label>
                        <input type="text" id="profile-name" value="${userProfile.name || ''}" 
                               placeholder="Your preferred name" 
                               class="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-purple-500 focus:border-purple-500 animated-textarea">
                    </div>
                    
                    <div>
                        <label for="profile-email" class="block text-sm font-medium text-gray-300 mb-2">
                            Email / Contact (Optional)
                        </label>
                        <input type="email" id="profile-email" value="${userProfile.email || ''}" 
                               placeholder="Your email or contact info" 
                               class="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-purple-500 focus:border-purple-500 animated-textarea">
                    </div>
                    
                    <div class="pt-4 border-t border-gray-700">
                        <h4 class="text-lg font-semibold text-red-400 mb-3 flex items-center space-x-2">
                            <i data-lucide="shield" class="w-5 h-5"></i>
                            <span>Emergency Contact (Private)</span>
                        </h4>
                        <p class="text-sm text-gray-400 mb-4">
                            This info is stored securely and only used to display on your <strong>Aid</strong> page for quick access.
                        </p>
                        
                        <div class="space-y-4">
                            <div>
                                <label for="safety-contact-name" class="block text-sm font-medium text-gray-300 mb-2">
                                    Contact Name
                                </label>
                                <input type="text" id="safety-contact-name" value="${userProfile.safetyContactName || ''}" 
                                       placeholder="E.g., Mom, Best Friend" 
                                       class="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-red-500 focus:border-red-500 animated-textarea">
                            </div>
                            
                            <div>
                                <label for="safety-contact-phone" class="block text-sm font-medium text-gray-300 mb-2">
                                    Contact Phone Number
                                </label>
                                <input type="tel" id="safety-contact-phone" value="${userProfile.safetyContactPhone || ''}" 
                                       placeholder="E.g., 9876543210" 
                                       class="w-full p-3 bg-gray-700 text-white rounded-lg focus:ring-red-500 focus:border-red-500 animated-textarea">
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" class="w-full px-5 py-3 bg-purple-600 rounded-xl font-bold hover:bg-purple-700 transition-all duration-300 shadow-md btn-hover glow mt-6">
                        Save Profile Changes
                    </button>
                </form>
            </div>

            <!-- App Info -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-gray-700 card-hover">
                <h3 class="text-xl font-semibold text-sky-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="info" class="w-6 h-6"></i>
                    <span>App Information</span>
                </h3>
                
                <div class="space-y-4">
                    <div class="bg-gray-700 p-3 rounded-lg">
                        <p class="text-sm text-gray-300 mb-1">Your Unique User ID:</p>
                        <p class="text-purple-400 font-mono text-sm break-all">${shortId}</p>
                    </div>
                    
                    <div class="flex justify-between items-center py-2 border-b border-gray-700">
                        <span class="text-gray-300">Auri Type:</span>
                        <span class="text-purple-300 font-semibold">Supportive</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2 border-b border-gray-700">
                        <span class="text-gray-300">App Version:</span>
                        <span class="text-gray-400">1.0.0</span>
                    </div>
                    
                    <div class="flex justify-between items-center py-2">
                        <span class="text-gray-300">Data Status:</span>
                        <span class="text-green-400 font-semibold">${window.db ? 'Online' : 'Local Only'}</span>
                    </div>
                </div>

                <button onclick="changeView('about')" class="w-full mt-6 px-4 py-3 bg-gray-700 text-purple-300 rounded-xl font-medium hover:bg-gray-600 transition-all flex items-center justify-center space-x-2">
                    <i data-lucide="info" class="w-5 h-5"></i>
                    <span>About Melo & Creators</span>
                </button>
            </div>
            </div>

            <!-- Privacy & Data -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl card-hover">
                <h3 class="text-xl font-semibold text-red-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="lock" class="w-6 h-6"></i>
                    <span>Privacy & Data</span>
                </h3>
                
                <div class="space-y-3">
                    <button onclick="handleExportData()" class="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300 flex items-center justify-between group">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="download" class="w-5 h-5 text-purple-400"></i>
                            <span class="text-gray-300">Export My Data</span>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors duration-300"></i>
                    </button>
                    
                    <button onclick="alert('Privacy policy will be displayed here.')" class="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-300 flex items-center justify-between group">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="file-text" class="w-5 h-5 text-blue-400"></i>
                            <span class="text-gray-300">View Privacy Policy</span>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors duration-300"></i>
                    </button>
                    
                    <button onclick="handleDeleteData()" class="w-full text-left p-3 bg-red-900/30 hover:bg-red-800/40 rounded-lg transition-all duration-300 flex items-center justify-between group border border-red-500/30">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="trash-2" class="w-5 h-5 text-red-400"></i>
                            <span class="text-red-300">Delete All My Data</span>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5 text-red-400/50 group-hover:text-red-400 transition-colors duration-300"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

// ===== ADMIN PANEL =====
function showAdminPanel() {
    if (AdminAuth.isAuthenticated()) {
        renderAdminPanel();
    } else {
        const password = prompt('Enter Admin Password:', '');
        if (password !== null) {
            const result = AdminAuth.login(password);
            if (result.success) {
                showNotification('Admin authenticated! 🔐', 'success');
                renderAdminPanel();
            } else {
                showNotification('Invalid password!', 'error');
            }
        }
    }
}

function renderAdminPanel() {
    const stats = {
        totalUsers: Object.keys(auriHistory).length,
        totalJournalEntries: journalEntries.length,
        totalVentMessages: ventMessages.length,
        activeUsers: MessagingService.activeUsers.size
    };

    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <div class="flex justify-between items-center mb-8">
                <h2 class="text-3xl font-bold text-white flex items-center space-x-2">
                    <i data-lucide="shield" class="w-8 h-8 text-purple-400"></i>
                    <span>Admin Control Panel</span>
                </h2>
                <button onclick="AdminAuth.logout(); changeView('auri'); showNotification('Admin session ended', 'info')" class="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-300">
                    Exit Admin
                </button>
            </div>

            <!-- System Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-gray-800 p-4 rounded-xl border-l-4 border-purple-600">
                    <p class="text-sm text-gray-400 mb-1">Total Users</p>
                    <p class="text-3xl font-bold text-purple-400">${stats.totalUsers}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl border-l-4 border-blue-600">
                    <p class="text-sm text-gray-400 mb-1">Journal Entries</p>
                    <p class="text-3xl font-bold text-blue-400">${stats.totalJournalEntries}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl border-l-4 border-green-600">
                    <p class="text-sm text-gray-400 mb-1">Vent Messages</p>
                    <p class="text-3xl font-bold text-green-400">${stats.totalVentMessages}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl border-l-4 border-orange-600">
                    <p class="text-sm text-gray-400 mb-1">Active Sessions</p>
                    <p class="text-3xl font-bold text-orange-400">${stats.activeUsers}</p>
                </div>
            </div>

            <!-- Vent Room Management -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-500/30">
                <h3 class="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="users" class="w-6 h-6"></i>
                    <span>Vent Room Management</span>
                </h3>
                
                <div class="space-y-4">
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <p class="text-gray-300 mb-3">Active Users in Vent Room: <span class="font-bold text-purple-400">${MessagingService.getActiveUsers('main-vent').length}</span></p>
                        <div class="space-y-2">
                            ${MessagingService.getActiveUsers('main-vent').map(user => `
                                <div class="flex items-center justify-between bg-gray-600 p-2 rounded">
                                    <span class="text-sm">${user.userName}</span>
                                    <span class="text-xs text-gray-400">${user.messageCount} msgs</span>
                                </div>
                            `).join('') || '<p class="text-gray-400 text-sm">No active users</p>'}
                        </div>
                    </div>
                    
                    <button onclick="handleClearVentRoom()" class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-300">
                        Clear All Vent Messages
                    </button>
                </div>
            </div>

            <!-- Data Export -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-500/30">
                <h3 class="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="download" class="w-6 h-6"></i>
                    <span>Data Export & Reports</span>
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onclick="ExportService.exportJournalAsJSON(journalEntries)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                        <i data-lucide="file-json" class="w-5 h-5"></i>
                        <span>Export Journal (JSON)</span>
                    </button>
                    
                    <button onclick="ExportService.exportJournalAsCSV(journalEntries)" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                        <i data-lucide="table" class="w-5 h-5"></i>
                        <span>Export Journal (CSV)</span>
                    </button>
                    
                    <button onclick="GraphExport.exportGraphAsSVG(getMoodAnalysis())" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                        <i data-lucide="download" class="w-5 h-5"></i>
                        <span>Export Graph (SVG)</span>
                    </button>
                    
                    <button onclick="GraphExport.exportGraphAsPNG(getMoodAnalysis())" class="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2">
                        <i data-lucide="image" class="w-5 h-5"></i>
                        <span>Export Graph (PNG)</span>
                    </button>
                </div>
            </div>

            <!-- Security -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl border border-red-500/30">
                <h3 class="text-xl font-semibold text-red-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="lock" class="w-6 h-6"></i>
                    <span>Security Settings</span>
                </h3>
                
                <div class="space-y-4">
                    <button onclick="showChangePasswordDialog()" class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-all duration-300">
                        Change Admin Password
                    </button>
                    
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <p class="text-sm text-gray-300">Session Active Since:</p>
                        <p class="text-purple-400 font-mono">${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

function showChangePasswordDialog() {
    const currentPassword = prompt('Enter current admin password:');
    if (currentPassword === null) return;

    if (currentPassword !== AdminAuth.defaultPassword) {
        showNotification('Incorrect current password!', 'error');
        return;
    }

    const newPassword = prompt('Enter new admin password (minimum 6 characters):');
    if (newPassword === null) return;

    const result = AdminAuth.changePassword(newPassword);
    if (result.success) {
        showNotification(result.message, 'success');
    } else {
        showNotification(result.message, 'error');
    }
}

function handleClearVentRoom() {
    if (confirm('Are you sure you want to clear all vent messages? This action cannot be undone.')) {
        MessagingService.clearRoomMessages('main-vent');
        ventMessages = [];
        localStorage.removeItem('vent_messages');
        showNotification('Vent room cleared!', 'success');
        renderAdminPanel();
    }
}

// ===== ENHANCED INSIGHTS WITH DOWNLOADS =====
function renderInsightsViewEnhanced() {
    const moodData = getMoodAnalysis();
    const totalEntries = journalEntries.length;
    const today = new Date();
    const last7Days = journalEntries.filter(entry => {
        const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp?.seconds * 1000 || Date.now());
        const diffTime = Math.abs(today - entryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }).length;

    if (totalEntries === 0) {
        APP_CONTENT.innerHTML = `
            <div class="pt-6 text-center animate-pageFadeIn">
                <h2 class="text-3xl font-bold text-white mb-6 flex items-center space-x-2">
                    <i data-lucide="trending-up" class="w-8 h-8 text-purple-400"></i>
                    <span>Mental Wellness Insights</span>
                </h2>
                <div class="bg-gray-800 p-8 rounded-2xl shadow-xl mt-12 card-hover">
                    <i data-lucide="database" class="w-12 h-12 text-purple-500 mx-auto mb-4 animate-pulse"></i>
                    <h3 class="text-xl font-semibold text-white mb-2">Start journaling to see insights!</h3>
                    <p class="text-gray-400 mb-4">Log your moods and thoughts in the Journal to track your emotional patterns.</p>
                    <button onclick="changeViewWithAnimation('journal')" class="mt-4 px-5 py-3 bg-purple-600 rounded-full font-semibold hover:bg-purple-700 transition-all duration-300 btn-hover glow">
                        Go to Journal
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const moodCounts = {};
    let totalScore = 0;
    
    journalEntries.forEach(entry => {
        const score = MOOD_SCORE_MAP[entry.mood] || 3;
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        totalScore += score;
    });
    
    const averageMood = (totalScore / totalEntries).toFixed(1);
    let mostCommonMood = '😶';
    let maxCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
        if (count > maxCount) {
            maxCount = count;
            mostCommonMood = mood;
        }
    });

    const graphHTML = moodData ? generateMoodGraph(moodData) : `
        <div class="p-8 text-center text-gray-500">
            <p>Need 2+ entries for mood graph 📊</p>
        </div>
    `;

    APP_CONTENT.innerHTML = `
        <div class="pt-6 animate-pageFadeIn">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-white flex items-center space-x-2">
                    <i data-lucide="trending-up" class="w-8 h-8 text-purple-400"></i>
                    <span>Mental Wellness Insights</span>
                </h2>
                <div class="flex gap-2">
                    <button onclick="GraphExport.exportGraphAsSVG(getMoodAnalysis())" class="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center space-x-1 transition-all duration-300" title="Download as SVG">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>SVG</span>
                    </button>
                    <button onclick="GraphExport.exportGraphAsPNG(getMoodAnalysis())" class="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center space-x-1 transition-all duration-300" title="Download as PNG">
                        <i data-lucide="image" class="w-4 h-4"></i>
                        <span>PNG</span>
                    </button>
                    <button onclick="exportInsightsReport()" class="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center space-x-1 transition-all duration-300" title="Download Report">
                        <i data-lucide="file-text" class="w-4 h-4"></i>
                        <span>Report</span>
                    </button>
                </div>
            </div>
            
            <!-- Stats Overview -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Total Entries</p>
                    <p class="text-2xl font-bold text-white">${totalEntries}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Last 7 Days</p>
                    <p class="text-2xl font-bold text-white">${last7Days}</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Avg Mood</p>
                    <p class="text-2xl font-bold text-white">${averageMood}/5</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-xl card-hover">
                    <p class="text-sm text-gray-400 mb-1">Common Mood</p>
                    <p class="text-2xl font-bold">${mostCommonMood}</p>
                </div>
            </div>

            <!-- Mood Graph -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 border border-purple-500/30 card-hover">
                <h3 class="text-xl font-semibold text-purple-300 mb-4 flex items-center space-x-2">
                    <i data-lucide="line-chart" class="w-6 h-6"></i>
                    <span>Mood Trends</span>
                </h3>
                ${graphHTML}
            </div>

            <!-- Mood Breakdown -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl mb-8 card-hover">
                <h3 class="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                    <i data-lucide="pie-chart" class="w-6 h-6"></i>
                    <span>Mood Distribution</span>
                </h3>
                <div class="space-y-4">
                    ${Object.entries(moodCounts)
                        .sort(([,a], [,b]) => b - a)
                        .map(([mood, count]) => {
                            const percentage = ((count / totalEntries) * 100).toFixed(1);
                            const score = MOOD_SCORE_MAP[mood] || 3;
                            const barColor = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e'][score - 1];
                            
                            return `
                                <div class="flex items-center">
                                    <span class="text-2xl w-10">${mood}</span>
                                    <div class="flex-grow ml-4">
                                        <div class="flex justify-between text-sm mb-1">
                                            <span class="text-gray-300">${count} entries</span>
                                            <span class="text-gray-400">${percentage}%</span>
                                        </div>
                                        <div class="w-full bg-gray-700 rounded-full h-2">
                                            <div class="h-2 rounded-full progress-bar" style="width: ${percentage}%; background: ${barColor};"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>

            <!-- Mood History -->
            <div class="bg-gray-800 p-6 rounded-2xl shadow-xl card-hover">
                <h3 class="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                    <i data-lucide="history" class="w-6 h-6 text-purple-400"></i>
                    <span>Recent Mood History</span>
                </h3>
                <div class="space-y-3">
                    ${journalEntries.slice(0, 10).map(entry => {
                        const date = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp?.seconds * 1000 || Date.now());
                        const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                        const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                        
                        return `
                            <div class="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
                                <div class="flex items-center space-x-3">
                                    <span class="text-2xl">${entry.mood}</span>
                                    <div>
                                        <p class="text-sm font-medium text-gray-200 truncate max-w-[150px] sm:max-w-xs">
                                            ${entry.text || 'No text entry'}
                                        </p>
                                        <p class="text-[10px] text-gray-500">${dateStr} • ${timeStr}</p>
                                    </div>
                                </div>
                                <div class="text-xs font-bold ${['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-lime-400', 'text-green-400'][(MOOD_SCORE_MAP[entry.mood] || 3) - 1]}">
                                    ${(MOOD_SCORE_MAP[entry.mood] || 3)}/5
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    
    lucide.createIcons();
}

function exportInsightsReport() {
    const moodData = getMoodAnalysis();
    const totalEntries = journalEntries.length;
    const averageMood = (journalEntries.reduce((sum, e) => sum + (MOOD_SCORE_MAP[e.mood] || 3), 0) / totalEntries).toFixed(1);
    
    const moodCounts = {};
    journalEntries.forEach(entry => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    
    let mostCommonMood = '😶';
    let maxCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
        if (count > maxCount) {
            maxCount = count;
            mostCommonMood = mood;
        }
    });

    const today = new Date();
    const last7Days = journalEntries.filter(entry => {
        const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp?.seconds * 1000 || Date.now());
        const diffTime = Math.abs(today - entryDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }).length;

    const stats = {
        totalEntries: totalEntries,
        averageMood: averageMood,
        last7Days: last7Days,
        mostCommonMood: mostCommonMood,
        moodLabel: averageMood >= 4 ? 'Great' : averageMood >= 3 ? 'Good' : 'Needs Support'
    };

    GraphExport.exportGraphWithAnalysis(moodData, stats);
}

// ===== Main Render Function =====
function renderView() {
    if (!APP_CONTENT) return;

    switch (currentView) {
        case 'login':
            LoginPage.render();
            break;
        case 'auri':
            renderAuriView();
            break;
        case 'journal':
            renderJournalView();
            break;
        case 'insights': 
            renderInsightsViewEnhanced();
            break;
        case 'toolkit':
            renderToolkitView();
            break;
        case 'aid':
            renderAidView();
            break;
        case 'vent': 
            renderVentView();
            break;
        case 'settings':
            renderSettingsView();
            break;
        default:
            renderAuriView();
    }
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// ===== Initialize App =====
document.addEventListener('auth-ready', () => {
    console.log("Melo initializing...");
    
    // Check if we are on the app page
    if (!APP_CONTENT) {
        console.warn("APP_CONTENT element not found. Skipping app initialization.");
        return;
    }

    // Initialize Services
    try {
        if (window.PushNotificationService) window.PushNotificationService.init();
        if (window.VoiceInputService) window.VoiceInputService.init();
        if (typeof MessagingService !== 'undefined') {
            MessagingService.initializeRoom('main-vent', 'Main Vent Room');
            MessagingService.addUserToRoom(window.userId, 'User #' + window.userId.substring(0, 6), 'main-vent', true);
        }
    } catch (e) {
        console.error("Error initializing services:", e);
    }
    
    // Load local data if available
    try {
        const savedAuriHistory = localStorage.getItem('auri_history');
        const savedJournalEntries = localStorage.getItem('journal_entries');
        const savedVentMessages = localStorage.getItem('vent_messages');
        const savedUserProfile = localStorage.getItem('user_profile');
        
        if (savedAuriHistory) auriHistory = JSON.parse(savedAuriHistory);
        if (savedJournalEntries) journalEntries = JSON.parse(savedJournalEntries);
        if (savedVentMessages) ventMessages = JSON.parse(savedVentMessages);
        if (savedUserProfile) userProfile = JSON.parse(savedUserProfile);
        
        // Add welcome message if chat is empty
        if (auriHistory.length === 0) {
            auriHistory.push({ 
                sender: 'Auri', 
                text: "Hey! I'm Auri, your mental wellness companion. How are you feeling today? 😊",
                timestamp: new Date() 
            });
        }
    } catch (error) {
        console.error('Error loading local data:', error);
    }
    
    // Update user ID display
    if (window.userId) {
        const userIdDisplay = document.getElementById('user-id-display');
        if (userIdDisplay) {
            userIdDisplay.textContent = `ID: ${window.userId.substring(0, 8)}...`;
            userIdDisplay.classList.remove('hidden');
        }
    }
    
    const isLoggedIn = localStorage.getItem('melo_logged_in') === 'true';
    if (isLoggedIn) {
        changeView('auri', false);
    } else {
        // For testing: allow access without login
        localStorage.setItem('melo_logged_in', 'true');
        changeView('auri', false);
        // window.location.href = 'login.html';
    }
    
    // Connect to Firestore
    setupFirestoreListeners();
    
    // Initialize offline detection
    window.addEventListener('online', () => {
        showNotification('Back online! Syncing data...', 'success');
        setTimeout(() => {
            if (window.db) setupFirestoreListeners();
        }, 1000);
    });
    
    window.addEventListener('offline', () => {
        showNotification('You are offline. Working locally...', 'info');
    });
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        .animate-pageFadeIn {
            animation: pageFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-fadeIn {
            animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-fadeInUp {
            animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .page-exit {
            animation: pageFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards;
        }
    `;
    document.head.appendChild(style);
});

// Auto-hide navigation (add to your app.js)
let navHideTimeout;
const nav = document.querySelector('nav.fixed');

function showNav() {
    if (nav) {
        nav.classList.remove('hidden');
        clearTimeout(navHideTimeout);
        navHideTimeout = setTimeout(() => {
            if (!nav.matches(':hover')) {
                nav.classList.add('hidden');
            }
        }, 3000);
    }
}

function hideNav() {
    if (nav && !nav.matches(':hover')) {
        nav.classList.add('hidden');
    }
}

// Initialize when page loads
if (nav) {
    // Show on mouse move near bottom
    document.addEventListener('mousemove', (e) => {
        if (window.innerHeight - e.clientY < 100) {
            showNav();
        }
    });
    
    // Show on touch
    document.addEventListener('touchstart', showNav);
    
    // Show on scroll
    let lastScroll = 0;
    document.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (Math.abs(currentScroll - lastScroll) > 10) {
            showNav();
            lastScroll = currentScroll;
        }
    });
    
    // Keep visible when hovering
    nav.addEventListener('mouseenter', () => {
        clearTimeout(navHideTimeout);
        nav.classList.remove('hidden');
    });
    
    nav.addEventListener('mouseleave', () => {
        navHideTimeout = setTimeout(hideNav, 2000);
    });
    
    // Initial hide after 5 seconds
    setTimeout(() => {
        if (nav && !nav.matches(':hover')) {
            nav.classList.add('hidden');
        }
    }, 5000);
}