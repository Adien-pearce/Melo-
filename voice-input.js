/**
 * Melo Voice Input Service
 * Handles speech-to-text functionality for journal entries
 */

const VoiceInputService = {
    recognition: null,
    isListening: false,
    
    /**
     * Initialize Web Speech API
     */
    init: function() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech Recognition is not supported in this browser.');
            return false;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('Voice recognition started...');
            if (window.showNotification) {
                window.showNotification('Listening... Speak now', 'info');
            }
            this.updateMicrophoneUI(true);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stop();
            if (window.showNotification) {
                window.showNotification('Voice input error: ' + event.error, 'error');
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            console.log('Voice recognition ended.');
            this.updateMicrophoneUI(false);
        };

        return true;
    },

    /**
     * Start listening and pipe results to a callback
     * @param {Function} onResult Callback for text results
     */
    start: function(onResult) {
        if (!this.recognition && !this.init()) return;
        
        if (this.isListening) {
            this.stop();
            return;
        }

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (onResult) {
                onResult(finalTranscript || interimTranscript);
            }
        };

        this.recognition.start();
    },

    /**
     * Stop listening
     */
    stop: function() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    },

    /**
     * Update UI state for microphone button
     */
    updateMicrophoneUI: function(active) {
        const micBtn = document.getElementById('voice-log-btn');
        if (micBtn) {
            if (active) {
                micBtn.classList.add('bg-red-500', 'animate-pulse');
                micBtn.classList.remove('bg-gray-700');
                micBtn.querySelector('span').textContent = 'Listening...';
            } else {
                micBtn.classList.remove('bg-red-500', 'animate-pulse');
                micBtn.classList.add('bg-red-600');
                micBtn.querySelector('span').textContent = 'Voice Log';
            }
        }
    }
};

// Export to window object
window.VoiceInputService = VoiceInputService;

/**
 * Melo Voice Recorder Service
 * Handles audio recording and saving as file
 */
const VoiceRecorderService = {
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    stream: null,

    startRecording: async function() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/mp3' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Create a download link
                const link = document.createElement('a');
                link.href = audioUrl;
                link.download = `melo-journal-voice-${Date.now()}.mp3`;
                link.click();
                
                if (window.showNotification) {
                    window.showNotification('Voice recording saved as MP3!', 'success');
                }
                
                // Cleanup
                this.stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateUI(true);
            
            if (window.showNotification) {
                window.showNotification('Recording voice... Click again to stop', 'info');
            }
        } catch (err) {
            console.error('Error accessing microphone:', err);
            if (window.showNotification) {
                window.showNotification('Could not access microphone', 'error');
            }
        }
    },

    stopRecording: function() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateUI(false);
        }
    },

    toggleRecording: function() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    },

    updateUI: function(active) {
        const recordBtn = document.getElementById('record-mp3-btn');
        if (recordBtn) {
            if (active) {
                recordBtn.classList.add('bg-orange-500', 'animate-pulse');
                recordBtn.classList.remove('bg-gray-700');
                recordBtn.querySelector('span').textContent = 'Stop Recording';
            } else {
                recordBtn.classList.remove('bg-orange-500', 'animate-pulse');
                recordBtn.classList.add('bg-orange-600');
                recordBtn.querySelector('span').textContent = 'Record MP3';
            }
        }
    }
};

window.VoiceRecorderService = VoiceRecorderService;
