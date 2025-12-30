/**
 * Melo Login & Onboarding View
 * Handles user entry and first-time Gmail notifications
 */

const LoginPage = {
    /**
     * Render the Login/Gmail Entry view
     */
    render: function() {
        const appContent = document.getElementById('app-content');
        if (!appContent) return;

        appContent.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-pageFadeIn">
                <div class="w-full max-w-md bg-[#161b22] p-8 rounded-3xl border border-gray-800 shadow-2xl">
                    <div class="text-center mb-8">
                        <div class="inline-block p-4 bg-purple-900/30 rounded-full mb-4">
                            <i data-lucide="brain-circuit" class="w-12 h-12 text-purple-400"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-white mb-2">Welcome to Melo</h2>
                        <p class="text-gray-400">Your companion for mental wellness</p>
                    </div>

                    <div class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-400 mb-2">Gmail Address</label>
                            <input type="email" id="login-email" placeholder="name@gmail.com" 
                                class="w-full p-4 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all">
                        </div>

                        <div class="flex items-center space-x-3 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                            <input type="checkbox" id="notify-permission" class="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-900">
                            <label for="notify-permission" class="text-sm text-gray-300">
                                Send me automated wellness notifications to my Gmail
                            </label>
                        </div>

                        <button onclick="LoginPage.handleLogin()" 
                            class="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2">
                            <span>Enter Melo</span>
                            <i data-lucide="arrow-right" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <div class="mt-8 text-center">
                        <p class="text-xs text-gray-500">
                            By entering, you agree to our privacy focused approach to mental health.
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Hide navigation on login page
        const nav = document.getElementById('main-nav');
        if (nav) nav.classList.add('hidden');
        
        lucide.createIcons();
    },

    /**
     * Handle the login/entry logic
     */
    handleLogin: async function() {
        const emailInput = document.getElementById('login-email');
        const email = emailInput.value.trim();
        const permission = document.getElementById('notify-permission').checked;

        if (!email || !email.includes('@')) {
            if (window.showNotification) {
                window.showNotification('Please enter a valid Gmail address', 'error');
            }
            return;
        }

        // Save to profile
        if (window.userProfile) {
            window.userProfile.email = email;
            localStorage.setItem('user_profile', JSON.stringify(window.userProfile));
        }

        // Set login state
        localStorage.setItem('melo_logged_in', 'true');

        // Request Push Permission if they want notifications
        if (permission && window.PushNotificationService) {
            await window.PushNotificationService.requestPermission();
            window.PushNotificationService.sendAutomatedWelcomeNotification(email);
        }

        if (window.showNotification) {
            window.showNotification('Welcome to Melo!', 'success');
        }

        // Show navigation and go to main view
        const nav = document.getElementById('main-nav');
        if (nav) nav.classList.remove('hidden');
        
        if (window.changeView) {
            window.changeView('auri');
        }
    },

    /**
     * Handle logout/exit
     */
    logout: function() {
        localStorage.removeItem('melo_logged_in');
        window.location.href = 'login.html';
    }
};

// Export to window object
window.LoginPage = LoginPage;
