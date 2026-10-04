/**
 * SmartQueue Bank - Customer Dashboard & Booking Logic
 */

let selectedBranchId = null;
let selectedServiceId = null;
let selectedDate = null;
let selectedTime = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Customer Dashboard
    if (document.getElementById('customer-dashboard-container')) {
        loadCustomerDashboard();
    }

    // 2. Initialize Booking Flow
    if (document.getElementById('booking-wizard-container')) {
        initBookingWizard();
    }

    // 3. Initialize Customer Profile
    if (document.getElementById('profile-form')) {
        loadCustomerProfile();
    }

    // 4. Initialize Services Page
    if (document.getElementById('customer-services-container')) {
        loadCustomerServices();
    }
});

/**
 * Load Customer Dashboard Overview
 */
async function loadCustomerDashboard() {
    const user = getAuthUser();
    const welcomeEl = document.getElementById('welcome-heading');
    if (welcomeEl && user) {
        welcomeEl.textContent = `Welcome, ${user.name.split(' ')[0]}`;
    }

    // Fetch active or latest token
    const res = await fetchApi('/queue/my-token');

    const tokenEl = document.getElementById('dash-current-token');
    const aheadEl = document.getElementById('dash-people-ahead');
    const waitEl = document.getElementById('dash-estimated-wait');
    const servingEl = document.getElementById('dash-current-serving');
    const badgeEl = document.getElementById('dash-token-status');

    if (res.success && res.hasToken) {
        const t = res.token;
        if (tokenEl) tokenEl.textContent = t.token_number;
        if (aheadEl) aheadEl.textContent = t.people_ahead;
        if (waitEl) waitEl.textContent = `${t.estimated_waiting_time} mins`;
        if (servingEl) servingEl.textContent = t.current_serving || 'None';
        if (badgeEl) {
            badgeEl.className = `badge badge-${t.status}`;
            badgeEl.textContent = t.status.replace(/_/g, ' ');
        }

        // Show alert banner if serving or almost your turn
        const alertBox = document.getElementById('dash-turn-alert');
        if (alertBox) {
            if (t.status === 'serving') {
                alertBox.style.display = 'flex';
                alertBox.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <i class="fas fa-bullhorn" style="font-size:1.4rem;"></i>
                        <div><strong>It's Your Turn!</strong> Token ${t.token_number} is being served at Counter 1.</div>
                    </div>
                    <a href="my-token.html" class="btn btn-sm" style="background:#fff; color:#059669; font-weight:700;">View Ticket</a>
                `;
                playTurnChime();
            } else if (t.status === 'almost_your_turn' || t.people_ahead === 1) {
                alertBox.style.display = 'flex';
                alertBox.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';
                alertBox.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <i class="fas fa-bell" style="font-size:1.4rem;"></i>
                        <div><strong>Almost Your Turn!</strong> You are next in line. Please proceed near the counter.</div>
                    </div>
                    <a href="my-token.html" class="btn btn-sm" style="background:#fff; color:#6d28d9; font-weight:700;">View Ticket</a>
                `;
            } else {
                alertBox.style.display = 'none';
            }
        }
    } else {
        if (tokenEl) tokenEl.textContent = '--';
        if (aheadEl) aheadEl.textContent = '0';
        if (waitEl) waitEl.textContent = '0 mins';
        if (servingEl) servingEl.textContent = 'None';
        if (badgeEl) {
            badgeEl.className = 'badge badge-inactive';
            badgeEl.textContent = 'No Active Token';
        }
    }

    // Load recent token history
    loadTokenHistory();
}

/**
 * Load Customer Token History
 */
async function loadTokenHistory() {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;

    const res = await fetchApi('/customer/tokens');
    if (res.success && res.tokens.length > 0) {
        tableBody.innerHTML = res.tokens.map(t => `
            <tr>
                <td><strong style="font-family:'JetBrains Mono'; color:var(--accent); font-size:1.05rem;">${t.token_number}</strong></td>
                <td>${t.branch_name}</td>
                <td>${t.service_name}</td>
                <td>${new Date(t.booking_date).toLocaleDateString()}</td>
                <td>${t.appointment_time}</td>
                <td><span class="badge badge-${t.status}">${t.status.replace(/_/g, ' ')}</span></td>
                <td>
                    <a href="my-token.html?id=${t.id}" class="btn btn-sm btn-outline" style="padding:4px 10px;">
                        <i class="fas fa-eye"></i> View
                    </a>
                </td>
            </tr>
        `).join('');
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; color:var(--text-muted); padding:32px;">
                    No past tokens found. Click "Book New Token" to get started.
                </td>
            </tr>
        `;
    }
}

/**
 * Initialize Multi-Step Token Booking Flow
 */
async function initBookingWizard() {
    const branchesContainer = document.getElementById('branch-cards-container');
    const servicesContainer = document.getElementById('service-cards-container');
    const dateInput = document.getElementById('token-date-input');
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const bookSubmitBtn = document.getElementById('generate-token-btn');

    // Set today as min date
    if (dateInput) {
        const todayStr = new Date().toISOString().slice(0, 10);
        dateInput.min = todayStr;
        dateInput.value = todayStr;
        selectedDate = todayStr;

        dateInput.addEventListener('change', (e) => {
            selectedDate = e.target.value;
            checkBookingReadiness();
        });
    }

    // Fetch branches
    const branchRes = await fetchApi('/customer/branches');
    if (branchRes.success && branchesContainer) {
        branchesContainer.innerHTML = branchRes.branches.map(b => `
            <div class="select-card branch-card" data-id="${b.id}" onclick="selectBranchCard(${b.id}, this)">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <i class="fas fa-building" style="font-size:1.5rem; color:var(--accent);"></i>
                    <span style="font-size:0.75rem; font-weight:700; color:var(--cyan); background:rgba(0,194,255,0.1); padding:2px 8px; border-radius:4px;">${b.branch_code}</span>
                </div>
                <h4 style="font-size:1.05rem; font-weight:700; color:var(--primary); margin-bottom:4px;">${b.branch_name}</h4>
                <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:10px;">${b.address}</p>
                <div style="font-size:0.78rem; font-weight:600; color:var(--text-muted);"><i class="far fa-clock"></i> ${b.opening_time} - ${b.closing_time}</div>
            </div>
        `).join('');

        // Auto select first branch
        if (branchRes.branches.length > 0) {
            selectBranchCard(branchRes.branches[0].id, branchesContainer.children[0]);
        }
    }

    // Fetch services
    const serviceRes = await fetchApi('/customer/services');
    if (serviceRes.success && servicesContainer) {
        servicesContainer.innerHTML = serviceRes.services.map(s => `
            <div class="select-card service-card" data-id="${s.id}" onclick="selectServiceCard(${s.id}, this)">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <i class="${s.icon || 'fas fa-concierge-bell'}" style="font-size:1.5rem; color:var(--accent);"></i>
                    <span style="font-size:0.75rem; font-weight:700; color:var(--success); background:rgba(16,185,129,0.1); padding:2px 8px; border-radius:4px;">~${s.estimated_time}m</span>
                </div>
                <h4 style="font-size:1.05rem; font-weight:700; color:var(--primary); margin-bottom:4px;">${s.service_name}</h4>
                <p style="font-size:0.82rem; color:var(--text-secondary);">${s.description}</p>
            </div>
        `).join('');

        // Auto select first service
        if (serviceRes.services.length > 0) {
            selectServiceCard(serviceRes.services[0].id, servicesContainer.children[0]);
        }
    }

    // Render Time Slots
    if (timeSlotsContainer) {
        const slots = [
            '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
            '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
            '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
            '04:00 PM', '04:30 PM'
        ];

        timeSlotsContainer.innerHTML = slots.map(slot => `
            <button type="button" class="time-slot-btn" onclick="selectTimeSlot('${slot}', this)">${slot}</button>
        `).join('');

        // Default select 10:30 AM
        const defaultBtn = timeSlotsContainer.querySelector('button');
        if (defaultBtn) {
            selectTimeSlot(slots[3] || slots[0], timeSlotsContainer.children[3] || defaultBtn);
        }
    }

    // Submit Booking Button
    if (bookSubmitBtn) {
        bookSubmitBtn.addEventListener('click', handleGenerateToken);
    }
}

function selectBranchCard(id, element) {
    selectedBranchId = id;
    document.querySelectorAll('.branch-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');
    checkBookingReadiness();
}

function selectServiceCard(id, element) {
    selectedServiceId = id;
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');
    checkBookingReadiness();
}

function selectTimeSlot(timeStr, element) {
    selectedTime = timeStr;
    document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
    if (element) element.classList.add('selected');
    checkBookingReadiness();
}

function checkBookingReadiness() {
    const btn = document.getElementById('generate-token-btn');
    if (btn) {
        const isReady = selectedBranchId && selectedServiceId && selectedDate && selectedTime;
        btn.disabled = !isReady;
    }
}

/**
 * Handle Token Generation Request
 */
async function handleGenerateToken() {
    if (!selectedBranchId || !selectedServiceId || !selectedDate || !selectedTime) {
        showToast('Please complete all 4 booking steps first.', 'warning');
        return;
    }

    const btn = document.getElementById('generate-token-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Digital Token...';

    const res = await fetchApi('/queue/book', {
        method: 'POST',
        body: JSON.stringify({
            branch_id: selectedBranchId,
            service_id: selectedServiceId,
            booking_date: selectedDate,
            appointment_time: selectedTime
        })
    });

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-ticket-alt"></i> Generate Token';

    if (res.success) {
        showToast('Token generated successfully!', 'success');
        // Render success modal
        showBookingSuccessModal(res.token);
    } else {
        showToast(res.message || 'Booking failed.', 'danger');
    }
}

/**
 * Show Booking Success Modal Popup
 */
function showBookingSuccessModal(token) {
    const modal = document.getElementById('booking-success-modal');
    if (!modal) {
        window.location.href = 'my-token.html';
        return;
    }

    document.getElementById('modal-token-num').textContent = token.token_number;
    document.getElementById('modal-branch-name').textContent = token.branch_name;
    document.getElementById('modal-service-name').textContent = token.service_name;
    document.getElementById('modal-date').textContent = new Date(token.booking_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('modal-time').textContent = token.appointment_time;
    document.getElementById('modal-ahead').textContent = token.people_ahead;
    document.getElementById('modal-wait').textContent = `${token.estimated_waiting_time} Minutes`;

    modal.classList.add('active');
}

/**
 * Customer Profile Management
 */
async function loadCustomerProfile() {
    const res = await fetchApi('/customer/profile');
    if (res.success && res.profile) {
        const p = res.profile;
        document.getElementById('prof-name').value = p.name;
        document.getElementById('prof-email').value = p.email;
        document.getElementById('prof-phone').value = p.phone;
        document.getElementById('prof-address').value = p.address || '';
    }

    const form = document.getElementById('profile-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('prof-name').value.trim();
        const phone = document.getElementById('prof-phone').value.trim();
        const address = document.getElementById('prof-address').value.trim();

        const updateRes = await fetchApi('/customer/profile', {
            method: 'PUT',
            body: JSON.stringify({ name, phone, address })
        });

        if (updateRes.success) {
            showToast('Profile updated successfully!', 'success');
            const user = getAuthUser();
            if (user) {
                user.name = name;
                user.phone = phone;
                user.address = address;
                localStorage.setItem('sqb_user', JSON.stringify(user));
            }
        } else {
            showToast(updateRes.message || 'Failed to update profile.', 'danger');
        }
    });
}

/**
 * Load Services for Services Page
 */
async function loadCustomerServices() {
    const container = document.getElementById('customer-services-container');
    if (!container) return;

    const res = await fetchApi('/customer/services');
    if (res.success) {
        container.innerHTML = res.services.map(s => `
            <div class="service-card">
                <div class="service-icon-box">
                    <i class="${s.icon || 'fas fa-concierge-bell'}"></i>
                </div>
                <h4>${s.service_name}</h4>
                <p>${s.description}</p>
                <div class="service-meta">
                    <div class="service-time">
                        <i class="far fa-clock"></i> ~${s.estimated_time} mins
                    </div>
                    <a href="book-token.html?service=${s.id}" class="btn btn-sm btn-primary">
                        Book Token <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `).join('');
    }
}
