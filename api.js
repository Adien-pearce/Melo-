// ===== API Service Layer for Melo App =====

class ApiService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.cache = new Map();
    }
    
    // ===== Gemini API Methods =====
    async generateAuriResponse(prompt) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent`;
        
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        };

        try {
            console.log('Making API call to:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': CONFIG.API_KEY
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP error:', errorText);
                throw new Error(`API error: ${response.status}`);
            }
            
            const jsonResponse = await response.json();
            console.log('Success! JSON response:', jsonResponse);

            const candidate = jsonResponse.candidates?.[0];
            let responseText = "Sorry, I'm having trouble connecting. Maybe try a quick breathing exercise? 🧘‍♀️";
            
            if (candidate && candidate.content?.parts?.[0]?.text) {
                responseText = candidate.content.parts[0].text;
            }
            
            return responseText;
            
        } catch (error) {
            console.error("Gemini API Error:", error);
            return "Ugh, a connection error! 😭 Let's try again in a bit. In the meantime, maybe journal that thought? 📝";
        }
    }
    
    // ===== Fetch with Retry =====
    async fetchWithRetry(url, options, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Attempt ${i + 1}: Fetching ${url}`);
                const response = await fetch(url, options);
                console.log(`Response status: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
                    throw new Error(`HTTP error! status: ${response.status}, Body: ${errorText}`);
                }
                
                const jsonResponse = await response.json();
                console.log('Success! JSON response:', jsonResponse);
                return jsonResponse;
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed. Retrying...`, error);
                if (i === retries - 1) throw error;
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    
    // ===== Network Status =====
    handleOnline() {
        this.isOnline = true;
        console.log('App is back online');
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('network-online'));
    }
    
    handleOffline() {
        this.isOnline = false;
        console.log('App is offline');
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('network-offline'));
    }
}

// Create singleton instance
const api = new ApiService();