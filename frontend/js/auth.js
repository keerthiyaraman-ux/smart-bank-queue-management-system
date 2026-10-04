/**
 * SmartQueue Bank - Authentication Scripts (Login, Register, Demo helpers)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Customer Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const address = document.getElementById('reg-address') ? document.getElementById('reg-address').value.trim() : '';
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;

            if (!name || !email || !phone || !password) {
                showToast('Please fill in all required fields.', 'warning');
                return;
            }

            if (password.length < 6) {
                showToast('Password must be at least 6 characters.', 'warning');
                return;
            }

            if (password !== confirmPassword) {
                showToast('Passwords do not match.', 'danger');
                return;
            }

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            const res = await fetchApi('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, phone, address, password, confirmPassword })
            });

            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account';

            if (res.success) {
                showToast(res.message || 'Account created successfully!', 'success');
                saveAuth(res.token, res.user);
                setTimeout(() => {
                    window.location.href = 'customer-dashboard.html';
                }, 1000);
            } else {
                showToast(res.message || 'Registration failed.', 'danger');
            }
        });
    }

    // 2. Customer / Staff / Admin Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const expectedRole = loginForm.dataset.role || 'customer';

            if (!email || !password) {
                showToast('Please provide your email and password.', 'warning');
                return;
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

            const res = await fetchApi('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, role: expectedRole })
            });

            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Sign In';

            if (res.success) {
                showToast(res.message || 'Login successful!', 'success');
                saveAuth(res.token, res.user);
                setTimeout(() => {
                    if (res.user.role === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else if (res.user.role === 'staff') {
                        window.location.href = 'staff-dashboard.html';
                    } else {
                        window.location.href = 'customer-dashboard.html';
                    }
                }, 800);
            } else {
                showToast(res.message || 'Invalid credentials.', 'danger');
            }
        });
    }
});

/**
 * Helper to auto-fill demo accounts for easy testing
 */
function fillDemo(email, password) {
    const emailField = document.getElementById('login-email');
    const passField = document.getElementById('login-password');
    if (emailField && passField) {
        emailField.value = email;
        passField.value = password;
        showToast(`Filled credentials for ${email}`, 'info', 2000);
    }
}
