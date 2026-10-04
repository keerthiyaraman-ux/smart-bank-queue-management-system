/**
 * SmartQueue Bank - Staff Dashboard & Queue Counter Logic
 */

let staffBranchId = 1;
let staffCounter = 'Counter 2';
let staffRefreshTimer = null;
let currentServingTokenId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('staff-dashboard-container')) {
        initStaffDashboard();
        staffRefreshTimer = setInterval(loadStaffQueueData, 4000);

        const counterSelect = document.getElementById('staff-counter-selector');
        if (counterSelect) {
            staffCounter = counterSelect.value;
            counterSelect.addEventListener('change', (e) => {
                staffCounter = e.target.value;
                loadStaffQueueData();
            });
        }

        const branchSelect = document.getElementById('staff-branch-selector');
        if (branchSelect) {
            branchSelect.addEventListener('change', (e) => {
                staffBranchId = parseInt(e.target.value, 10);
                loadStaffQueueData();
            });
        }
    }
});

window.addEventListener('beforeunload', () => {
    if (staffRefreshTimer) clearInterval(staffRefreshTimer);
});

async function initStaffDashboard() {
    await loadStaffQueueData();
}

/**
 * Load staff metrics, serving customer, and waiting list
 */
async function loadStaffQueueData() {
    const res = await fetchApi(`/staff/queue?branch_id=${staffBranchId}&counter=${encodeURIComponent(staffCounter)}`);
    if (!res.success) return;

    // 1. Dashboard Metrics Cards
    const stats = res.stats || {};
    setText('staff-metric-waiting', stats.waiting || 0);
    setText('staff-metric-serving', stats.serving || 0);
    setText('staff-metric-completed', stats.completed || 0);
    setText('staff-metric-cancelled', stats.cancelled || 0);

    // 2. Current Customer Panel
    const curr = res.current_customer;
    const tokenDisplay = document.getElementById('staff-serving-token');
    const custName = document.getElementById('staff-customer-name');
    const custService = document.getElementById('staff-service-name');
    const custCounter = document.getElementById('staff-counter-label');
    const completeBtn = document.getElementById('btn-staff-complete');
    const skipBtn = document.getElementById('btn-staff-skip');
    const recallBtn = document.getElementById('btn-staff-recall');

    if (curr) {
        currentServingTokenId = curr.id;
        if (tokenDisplay) tokenDisplay.textContent = curr.token_number;
        if (custName) custName.textContent = curr.customer_name || 'Customer';
        if (custService) custService.textContent = curr.service_name || 'General';
        if (custCounter) custCounter.textContent = curr.counter || staffCounter;

        if (completeBtn) completeBtn.disabled = false;
        if (skipBtn) skipBtn.disabled = false;
        if (recallBtn) recallBtn.disabled = false;
    } else {
        currentServingTokenId = null;
        if (tokenDisplay) tokenDisplay.textContent = '--';
        if (custName) custName.textContent = 'No customer at counter';
        if (custService) custService.textContent = 'Please click "Call Next"';
        if (custCounter) custCounter.textContent = staffCounter;

        if (completeBtn) completeBtn.disabled = true;
        if (skipBtn) skipBtn.disabled = true;
        if (recallBtn) recallBtn.disabled = true;
    }

    // 3. Queue Table
    const tableBody = document.getElementById('staff-queue-table-body');
    if (tableBody) {
        if (!res.queue || res.queue.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">
                        No waiting customers in the queue for this branch.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = res.queue.map(q => `
            <tr>
                <td><strong style="font-family:'JetBrains Mono'; font-size:1.1rem; color:var(--accent);">${q.token_number}</strong></td>
                <td>
                    <div style="font-weight:600; color:var(--primary);">${q.customer_name}</div>
                    <div style="font-size:0.78rem; color:var(--text-muted);">${q.phone || ''}</div>
                </td>
                <td>${q.service_name}</td>
                <td><span class="badge badge-${q.status}">${q.status.replace(/_/g, ' ')}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="callSpecificToken(${q.id}, '${q.token_number}')">
                        <i class="fas fa-bullhorn"></i> Call Now
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

/**
 * Call Next Waiting Customer (FIFO)
 */
async function staffCallNext() {
    const btn = document.getElementById('btn-staff-call-next');
    if (btn) btn.disabled = true;

    const res = await fetchApi('/staff/call-next', {
        method: 'POST',
        body: JSON.stringify({ branch_id: staffBranchId, counter: staffCounter })
    });

    if (btn) btn.disabled = false;

    if (res.success) {
        showToast(res.message || 'Called next customer!', 'success');
        playTurnChime();
        loadStaffQueueData();
    } else {
        showToast(res.message || 'No waiting customers.', 'info');
    }
}

/**
 * Mark Serving Customer as Completed
 */
async function staffComplete() {
    if (!currentServingTokenId) {
        showToast('No active customer to complete.', 'warning');
        return;
    }

    const res = await fetchApi('/staff/complete-token', {
        method: 'PUT',
        body: JSON.stringify({ token_id: currentServingTokenId, branch_id: staffBranchId })
    });

    if (res.success) {
        showToast('Token service completed.', 'success');
        loadStaffQueueData();
    } else {
        showToast(res.message || 'Error completing token.', 'danger');
    }
}

/**
 * Skip Serving Customer
 */
async function staffSkip() {
    if (!currentServingTokenId) {
        showToast('No active customer to skip.', 'warning');
        return;
    }

    if (!confirm('Are you sure you want to skip this customer?')) return;

    const res = await fetchApi('/staff/skip-token', {
        method: 'PUT',
        body: JSON.stringify({ token_id: currentServingTokenId })
    });

    if (res.success) {
        showToast('Customer skipped.', 'warning');
        loadStaffQueueData();
    } else {
        showToast(res.message || 'Error skipping token.', 'danger');
    }
}

/**
 * Recall Customer (Re-trigger announcement sound/alert)
 */
async function staffRecall() {
    if (!currentServingTokenId) return;

    const res = await fetchApi('/staff/recall-token', {
        method: 'POST',
        body: JSON.stringify({ token_id: currentServingTokenId, counter: staffCounter })
    });

    if (res.success) {
        playTurnChime();
        showToast(`Customer recalled at ${staffCounter}!`, 'info');
    }
}

/**
 * Call a specific token directly from table
 */
async function callSpecificToken(tokenId, tokenNumber) {
    staffCallNext();
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
