/**
 * Melo Push Notification Service
 * Handles browser-based push notifications and permissions
 */

const PushNotificationService = {
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    
    /**
     * Initialize the notification service
     */
    init: function() {
        if (!this.isSupported) {
            console.warn('Push notifications are not supported in this browser.');
            return false;
        }
        return true;
    },

    /**
     * Request permission from the user
     */
    requestPermission: async function() {
        if (!this.isSupported) return false;
        
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                return true;
            } else {
                console.warn('Notification permission denied.');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    },

    /**
     * Send a local notification
     * @param {string} title 
     * @param {Object} options 
     */
    sendLocalNotification: function(title, options = {}) {
        if (!this.isSupported || Notification.permission !== 'granted') return;

        const defaultOptions = {
            icon: '/icons/favicon.ico',
            badge: '/icons/favicon.ico',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            }
        };

        const mergedOptions = { ...defaultOptions, ...options };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, mergedOptions);
            });
        } else {
            new Notification(title, mergedOptions);
        }
    },

    /**
     * Schedule a reminder notification (Simulated)
     * @param {string} message 
     * @param {number} delayMinutes 
     */
    scheduleReminder: function(message, delayMinutes) {
        setTimeout(() => {
            this.sendLocalNotification('Melo Reminder', {
                body: message,
                tag: 'reminder'
            });
        }, delayMinutes * 60 * 1000);
    },

    /**
     * Automated Gmail Notification (Simulated for First Entry)
     * In a real app, this would call a backend API to send an actual email.
     */
    sendAutomatedWelcomeNotification: function(userEmail) {
        console.log(`Automated welcome notification triggered for: ${userEmail}`);
        
        // Simulate a push notification about the email
        this.sendLocalNotification('Welcome to Melo!', {
            body: `We've sent a welcome guide to your Gmail: ${userEmail}`,
            icon: '/icons/favicon.ico'
        });
        
        // If the user is on mobile/desktop, show a UI notification as well
        if (window.showNotification) {
            window.showNotification('Welcome email sent to ' + userEmail, 'success');
        }
    }
};

// Export to window object
window.PushNotificationService = PushNotificationService;
