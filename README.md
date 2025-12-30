# Melo-
Below is the **cleaned, submission-ready version** of your data.
✔ **No content removed**
✔ **Meaning and data preserved**
✔ **Professional academic / project-report tone**
✔ **Emojis, badges, decorative markdown, and UI clutter removed**
✔ **Clear headings and structured layout**

---

# Melo – AI Mental Wellness Companion

## Overview

Melo is an AI-powered mental wellness platform designed specifically for Generation Z. It integrates therapist-backed methodologies with modern technology to provide accessible, stigma-free mental health support. The platform addresses the unique psychological challenges faced by Gen Z by combining artificial intelligence, self-help tools, and peer support systems.

The application is built as a Progressive Web App (PWA) and offers both online and offline functionality. It uses Google Gemini AI for conversational intelligence and Firebase for authentication and data storage.

---

## Live Application

Live Demo Link:
[https://melo-mental-wellness.netlify.app/](https://melo-mental-wellness.netlify.app/)

Note: A Google Gemini API key is required for full functionality.

---

## Key Features

| Feature             | Description                                              | Status |
| ------------------- | -------------------------------------------------------- | ------ |
| Auri AI Companion   | Emotionally intelligent AI chatbot powered by Gemini API | Live   |
| Smart Journal       | Mood tracking with voice-based logging                   | Live   |
| Wellness Insights   | Data visualization and analytics                         | Live   |
| Therapy Toolkit     | Breathing, grounding, and thought-challenging exercises  | Live   |
| Emergency Aid       | Crisis helplines and safety contacts                     | Live   |
| Vent Rooms          | Anonymous peer-support communities                       | Live   |
| Progressive Web App | Installable application for mobile and desktop           | Live   |
| Offline Mode        | Core features available without internet                 | Live   |

---

## Quick Start Guide

### Local Setup

1. Clone the repository

```
git clone https://github.com/yourusername/melo.git
cd melo
```

2. Open the application

* Open `index.html` directly
  OR
* Run a local server

```
python -m http.server 8000
```

Access the app at:
[http://localhost:8000](http://localhost:8000)

---

### API Configuration

1. Obtain a Google Gemini API key from Google AI Studio.
2. Open `config.js` and replace the placeholder API key.

```
const CONFIG = {
    API_KEY: "YOUR_GEMINI_API_KEY_HERE",
    GEMINI_MODEL: "gemini-2.5-flash"
};
```

---

### Firebase Setup (Optional)

For cloud synchronization features:

1. Create a Firebase project
2. Enable Anonymous Authentication
3. Enable Firestore Database
4. Update `firebase-config.js` with your Firebase credentials

---

## Project Structure

```
melo/
├── HTML Files
│   ├── index.html
│   ├── melo.html
│   ├── login.html
│   ├── about.html
│   ├── test-gemini.html
│   └── offline.html
│
├── Styling
│   ├── style.css
│   ├── styles.css
│   └── tailwind.config.js
│
├── JavaScript Modules
│   ├── app.js
│   ├── config.js
│   ├── api.js
│   ├── firebase-config.js
│   ├── admin-auth.js
│   ├── messaging-service.js
│   ├── push-notifications.js
│   ├── voice-input.js
│   ├── graph-export.js
│   ├── utils-export.js
│   └── login-page.js
│
├── Service Workers
│   ├── service-worker.js
│   └── manifest.json
│
└── Data & Assets
    ├── icons/
    └── README.md
```

---

## Technology Stack

| Technology        | Purpose                     |
| ----------------- | --------------------------- |
| HTML5 / CSS3      | Structure and styling       |
| Tailwind CSS      | Utility-first CSS framework |
| JavaScript        | Core application logic      |
| Google Gemini API | AI conversational engine    |
| Firebase          | Authentication and database |
| Lucide Icons      | UI icons                    |
| Service Workers   | Offline PWA support         |
| Web Speech API    | Voice input functionality   |

---

## Auri AI Assistant

The AI assistant uses Google Gemini to deliver:

* Emotionally intelligent conversations
* Mental health support guidance
* Crisis-response protocols
* Personalized wellness recommendations

Sample prompts include:

* “I’m feeling anxious today”
* “How can I improve my sleep?”
* “What are quick stress relief techniques?”
* “Help me challenge negative thoughts”

---

## Journal and Analytics

| Feature         | Description                               |
| --------------- | ----------------------------------------- |
| Mood Tracking   | Five emoji-based moods scored from 1 to 5 |
| Voice Logging   | Speech-to-text journal entries            |
| Audio Recording | MP3 audio journaling                      |
| Export Options  | JSON, CSV, and PDF formats                |
| Mood Graphs     | SVG and PNG visualizations                |
| Trend Analysis  | Seven-day mood analysis                   |

---

## Therapy Toolkit

### Breathing Exercise (4-4-6)

* Guided inhale, hold, and exhale cycles
* Visual breathing animation
* Five-cycle completion tracking

### Grounding Exercise (5-4-3-2-1)

* Sensory awareness technique
* Step-by-step guidance
* Timed pacing

### Thought Challenging

* Cognitive Behavioral Therapy based framework
* Evidence evaluation
* Alternative thought generation

---

## Emergency Resources (India)

* KIRAN Helpline: 1800-599-0019
* Vandrevala Foundation: 9999 666 555 / 915 298 7821
* iCall: 915 298 7821 (Monday–Saturday, 10 AM–8 PM)
* Police / Emergency Services: 100 / 112

---

## Vent Rooms

* Anonymous peer communication
* Real-time chat
* 50-message history limit
* 500-character message limit
* Admin moderation tools

---

## Admin Features

Access secured via password authentication.
Features include:

* User analytics dashboard
* Vent room moderation
* Data export tools
* Session monitoring
* Password management

---

## Progressive Web App Capabilities

* Installable on mobile and desktop
* Offline functionality
* Push notifications
* Fast loading via service worker caching
* Native app-like experience

---

## Deployment Options

### Netlify

```
netlify deploy --prod
```

### GitHub Pages

```
git subtree push --prefix dist origin gh-pages
```

### Firebase Hosting

```
firebase init hosting
firebase deploy
```

---

## Development Guidelines

### Adding New Features

1. Update feature flags in `config.js`
2. Modify views in `app.js`
3. Update navigation in `melo.html`
4. Update cache list in `service-worker.js`

### Testing

* Test Gemini API using `test-gemini.html`
* Verify offline functionality by disabling internet access

### Production Build

* Minify CSS using PostCSS
* Minify JavaScript using Terser

---

## Browser Compatibility

* Google Chrome (60+)
* Mozilla Firefox (55+)
* Safari (11+)
* Microsoft Edge (79+)
* Mobile browsers supported

---

## Team

| Role            | Name              |
| --------------- | ----------------- |
| Founder & Coder | Rucha Rathod      |
| Founder & Coder | Pranjal Dabholkar |
| Founder & Coder | Adien Pearce      |

---

## License

This project is licensed under the MIT License.

---

## Important Notice

Melo is not a replacement for professional mental health care.
In case of emergency, users are advised to contact local emergency services or certified medical professionals immediately.

---

### If you want next:

* **MSBTE / IEEE project report formatting**
* **Chapter-wise academic report conversion**
* **Word (.docx) or PDF generation**
* **Abstract, Problem Statement, Objectives, Conclusion**

Just tell me 👍

  
### 💜 Made with love for Gen Z's mental wellness
  
