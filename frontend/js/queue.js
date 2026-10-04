/**
 * SmartQueue Bank - Real-Time Queue & Digital Token Card Management
 */

let activeTokenId = null;
let queuePollingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize My Token Page
    if (document.getElementById('my-token-container')) {
        loadMyTokenDetails();
        // Live auto-polling every 4 seconds
        queuePollingInterval = setInterval(loadMyTokenDetails, 4000);
    }

    // 2. Initialize Real-Time Live Queue Board Page
    if (document.getElementById('live-queue-board-container')) {
        loadLiveQueueBoard();
        // Live auto-polling every 4 seconds
        queuePollingInterval = setInterval(loadLiveQueueBoard, 4000);

        // Branch filter change handler
        const branchSelect = document.getElementById('queue-branch-selector');
        if (branchSelect) {
            branchSelect.addEventListener('change', () => {
                loadLiveQueueBoard();
            });
        }
    }
});

// Clear interval on page unload
window.addEventListener('beforeunload', () => {
    if (queuePollingInterval) clearInterval(queuePollingInterval);
});

/**
 * Load Customer Digital Token Ticket Details
 */
async function loadMyTokenDetails() {
    const res = await fetchApi('/queue/my-token');

    const emptyBox = document.getElementById('token-empty-state');
    const ticketBox = document.getElementById('digital-ticket-card');

    if (!res.success || !res.hasToken) {
        if (emptyBox) emptyBox.style.display = 'block';
        if (ticketBox) ticketBox.style.display = 'none';
        return;
    }

    if (emptyBox) emptyBox.style.display = 'none';
    if (ticketBox) ticketBox.style.display = 'block';

    const t = res.token;
    activeTokenId = t.id;

    // Populate Fields
    setText('ticket-token-number', t.token_number);
    setText('ticket-branch-name', t.branch_name);
    setText('ticket-service-name', t.service_name);
    setText('ticket-appointment-time', t.appointment_time);
    setText('ticket-date', new Date(t.booking_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }));
    setText('ticket-current-serving', t.current_serving || 'None');
    setText('ticket-people-ahead', t.people_ahead);
    setText('ticket-estimated-wait', `${t.estimated_waiting_time} Mins`);
    setText('ticket-counter-num', t.counter_number || 'Counter 1');

    // Update Status Pill
    const pill = document.getElementById('ticket-status-pill');
    if (pill) {
        pill.className = `ticket-status-pill ${t.status}`;
        pill.innerHTML = `<span class="live-pulse"></span> ${t.status.replace(/_/g, ' ')}`;
    }

    // Update Visual Progress Bar
    updateProgressBar(t.status);

    // Disable cancel if serving or completed
    const cancelBtn = document.getElementById('ticket-cancel-btn');
    if (cancelBtn) {
        if (t.status === 'completed' || t.status === 'cancelled') {
            cancelBtn.disabled = true;
            cancelBtn.style.opacity = '0.5';
        } else {
            cancelBtn.disabled = false;
            cancelBtn.style.opacity = '1';
        }
    }

    // Audio chime notification when turn arrives
    if (t.status === 'serving' && !sessionStorage.getItem(`chime_played_${t.id}`)) {
        playTurnChime();
        sessionStorage.setItem(`chime_played_${t.id}`, 'true');
        showToast(`It's your turn! Please proceed to ${t.counter_number || 'Counter 1'}`, 'success', 7000);
    }
}

/**
 * Update Digital Token Progress Stepper
 */
function updateProgressBar(status) {
    const steps = ['waiting', 'almost_your_turn', 'serving', 'completed'];
    const fillBar = document.getElementById('progress-fill-bar');

    let activeIndex = steps.indexOf(status);
    if (activeIndex === -1) {
        if (status === 'cancelled') activeIndex = -1;
    }

    const stepElements = document.querySelectorAll('.progress-step');
    stepElements.forEach((stepEl, idx) => {
        stepEl.classList.remove('active', 'completed');
        if (idx < activeIndex) {
            stepEl.classList.add('completed');
        } else if (idx === activeIndex) {
            stepEl.classList.add('active');
        }
    });

    if (fillBar) {
        const percentage = activeIndex <= 0 ? 0 : (activeIndex / (steps.length - 1)) * 100;
        fillBar.style.width = `${percentage}%`;
    }
}

/**
 * Cancel Customer Token
 */
async function cancelMyToken() {
    if (!activeTokenId) {
        showToast('No active token to cancel.', 'warning');
        return;
    }

    if (!confirm('Are you sure you want to cancel your digital token?')) {
        return;
    }

    const cancelBtn = document.getElementById('ticket-cancel-btn');
    if (cancelBtn) cancelBtn.disabled = true;

    const res = await fetchApi('/queue/cancel', {
        method: 'PUT',
        body: JSON.stringify({ token_id: activeTokenId })
    });

    if (cancelBtn) cancelBtn.disabled = false;

    if (res.success) {
        showToast('Token cancelled successfully.', 'info');
        loadMyTokenDetails();
    } else {
        showToast(res.message || 'Could not cancel token.', 'danger');
    }
}

/**
 * Download / Print Token Ticket
 */
function downloadTokenTicket() {
    window.print();
}

/**
 * Load Real-Time Live Queue Board Page
 */
async function loadLiveQueueBoard() {
    const branchSelector = document.getElementById('queue-branch-selector');
    const branchId = branchSelector ? branchSelector.value : 1;

    // Fetch user's active token to highlight "YOU"
    const myTokenRes = await fetchApi('/queue/my-token');
    const myTokenNumber = (myTokenRes.success && myTokenRes.hasToken) ? myTokenRes.token.token_number : null;

    const res = await fetchApi(`/queue/status?branch_id=${branchId}`);
    if (!res.success) return;

    // Board Metrics
    setText('live-serving-token', res.current_serving || 'None');
    setText('live-next-token', res.next_token || 'None');
    setText('live-your-token', myTokenNumber || '--');

    // Calculate user's people ahead & wait time if they are in this queue
    let userPeopleAhead = 0;
    let userWaitTime = 0;

    if (myTokenNumber && res.queue_list) {
        const userIndex = res.queue_list.findIndex(q => q.token_number === myTokenNumber);
        if (userIndex !== -1) {
            userPeopleAhead = userIndex; // 0 if serving, or number of items ahead
            userWaitTime = userPeopleAhead * 5;
        }
    }

    setText('live-people-ahead', userPeopleAhead);
    setText('live-estimated-wait', `${userWaitTime} Mins`);

    // Render Queue Table
    const tableBody = document.getElementById('live-queue-table-body');
    if (tableBody) {
        if (!res.queue_list || res.queue_list.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:36px; color:var(--text-muted);">
                        Queue is currently clear. No active customers waiting at this branch.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = res.queue_list.map((item, idx) => {
            const isUser = myTokenNumber && item.token_number === myTokenNumber;
            const isServing = item.status.toLowerCase() === 'serving';

            return `
                <tr style="${isUser ? 'background-color: rgba(26,115,232,0.06); font-weight:600;' : ''}">
                    <td><strong>#${idx + 1}</strong></td>
                    <td>
                        <span style="font-family:'JetBrains Mono'; font-weight:800; font-size:1.1rem; color:var(--accent);">
                            ${item.token_number}
                        </span>
                        ${isUser ? '<span class="badge" style="background:#1a73e8; color:#fff; margin-left:8px;">YOU</span>' : ''}
                    </td>
                    <td>${item.service_name || 'General Banking'}</td>
                    <td>
                        <span class="badge ${isServing ? 'badge-serving' : 'badge-waiting'}">
                            ${isServing ? '<span class="live-pulse"></span> Serving' : 'Waiting'}
                        </span>
                    </td>
                    <td>${isServing ? '<span style="color:var(--success); font-weight:700;"><i class="fas fa-bullhorn"></i> At Counter</span>' : `Approx. ${idx * 5} mins`}</td>
                </tr>
            `;
        }).join('');
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
