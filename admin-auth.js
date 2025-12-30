const AdminAuth = {
    defaultPassword: 'melo2024', 
    isAdminAuthenticated: false,
    adminSessionToken: null,
    sessionTimeout: 30 * 60 * 1000,
    sessionTimer: null,

    initialize: function() {
        const savedToken = localStorage.getItem('admin_session_token');
        const savedTokenTime = localStorage.getItem('admin_token_time');
        
        if (savedToken && savedTokenTime) {
            const tokenAge = Date.now() - parseInt(savedTokenTime);
            if (tokenAge < this.sessionTimeout) {
                this.isAdminAuthenticated = true;
                this.adminSessionToken = savedToken;
                this.startSessionTimer();
            } else {
                this.logout();
            }
        }
    },

    login: function(password) {
        if (password === this.defaultPassword) {
            this.adminSessionToken = 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.isAdminAuthenticated = true;
            localStorage.setItem('admin_session_token', this.adminSessionToken);
            localStorage.setItem('admin_token_time', Date.now().toString());
            this.startSessionTimer();
            return { success: true, message: 'Admin authenticated' };
        }
        return { success: false, message: 'Invalid password' };
    },

    logout: function() {
        this.isAdminAuthenticated = false;
        this.adminSessionToken = null;
        localStorage.removeItem('admin_session_token');
        localStorage.removeItem('admin_token_time');
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
    },

    startSessionTimer: function() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        this.sessionTimer = setTimeout(() => {
            this.logout();
            showNotification('Admin session expired', 'info');
        }, this.sessionTimeout);
    },

    isAuthenticated: function() {
        return this.isAdminAuthenticated && this.adminSessionToken !== null;
    },

    changePassword: function(newPassword) {
        if (newPassword.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }
        this.defaultPassword = newPassword;
        localStorage.setItem('admin_password_hash', this.hashPassword(newPassword));
        return { success: true, message: 'Password updated successfully' };
    },

    hashPassword: function(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
};

AdminAuth.initialize();
