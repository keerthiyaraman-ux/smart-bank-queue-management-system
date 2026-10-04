/**
 * SmartQueue Bank - Global Application Scripts & API Client
 */

const API_BASE_URL = window.location.origin + '/api';

/**
 * Universal API Fetch Client
 */
async function fetchApi(endpoint, options = {}) {
    const token = localStorage.getItem('sqb_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
            // Token expired or invalid
            showToast('Session expired. Please log in again.', 'warning');
            localStorage.removeItem('sqb_token');
            localStorage.removeItem('sqb_user');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1200);
            return { success: false, message: 'Unauthorized' };
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        showToast('Network or server connection error.', 'danger');
        return { success: false, message: 'Network error. Please ensure the backend is running.' };
    }
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        danger: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
        <i class="${icons[type] || icons.info}" style="color: var(--${type === 'danger' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'accent'}); font-size: 1.2rem;"></i>
        <div style="flex-grow: 1;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Audio Chime Alert when Customer's turn is called
 */
function playTurnChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
        console.log('Audio chime not supported or allowed without interaction:', e);
    }
}

/**
 * Session Management
 */
function saveAuth(token, user) {
    localStorage.setItem('sqb_token', token);
    localStorage.setItem('sqb_user', JSON.stringify(user));
}

function getAuthUser() {
    try {
        return JSON.parse(localStorage.getItem('sqb_user'));
    } catch (e) {
        return null;
    }
}

function logout() {
    localStorage.removeItem('sqb_token');
    localStorage.removeItem('sqb_user');
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 600);
}

/**
 * Authentication Gate for Dashboard Pages
 */
function requireAuth(allowedRoles = ['customer', 'staff', 'admin']) {
    const token = localStorage.getItem('sqb_token');
    const user = getAuthUser();

    if (!token || !user) {
        window.location.href = 'login.html';
        return false;
    }

    if (!allowedRoles.includes(user.role)) {
        if (user.role === 'admin') window.location.href = 'admin-dashboard.html';
        else if (user.role === 'staff') window.location.href = 'staff-dashboard.html';
        else window.location.href = 'customer-dashboard.html';
        return false;
    }

    // Populate user profile info in sidebar
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl) nameEl.textContent = user.name || 'User';
    if (roleEl) roleEl.textContent = user.role || 'Member';
    if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();

    return true;
}

/**
 * Mobile Sidebar Drawer Toggler
 */
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Mobile navbar burger on landing page
    const burgerBtn = document.getElementById('mobile-burger-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    if (burgerBtn && drawer) {
        burgerBtn.addEventListener('click', () => {
            drawer.classList.toggle('open');
        });
    }
});
