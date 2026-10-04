/**
 * SmartQueue Bank - Admin Control Panel Logic & Chart Visualizations
 */

let chartsInstances = {};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Dashboard Charts & Metrics
    if (document.getElementById('admin-dashboard-container')) {
        loadAdminDashboard();
    }

    // 2. Customers Management
    if (document.getElementById('admin-customers-table-body')) {
        loadAdminCustomers();
        setupCustomerSearch();
    }

    // 3. Staff Management
    if (document.getElementById('admin-staff-table-body')) {
        loadAdminStaff();
    }

    // 4. Branch Management
    if (document.getElementById('admin-branches-table-body')) {
        loadAdminBranches();
    }

    // 5. Service Management
    if (document.getElementById('admin-services-table-body')) {
        loadAdminServices();
    }
});

/**
 * Load Admin Dashboard Overview & Chart.js Charts
 */
async function loadAdminDashboard() {
    const res = await fetchApi('/admin/dashboard');
    if (!res.success) return;

    const stats = res.stats || {};
    setText('admin-stat-customers', stats.total_customers || 0);
    setText('admin-stat-tokens-today', stats.tokens_today || 0);
    setText('admin-stat-active-queues', stats.active_queues || 0);
    setText('admin-stat-completed', stats.completed_tokens || 0);
    setText('admin-stat-cancelled', stats.cancelled_tokens || 0);
    setText('admin-stat-avg-wait', stats.avg_waiting_time || '12 mins');

    if (window.Chart && res.charts) {
        initAdminCharts(res.charts);
    }
}

/**
 * Initialize 4 Chart.js Charts
 */
function initAdminCharts(data) {
    // 1. Daily Token Statistics
    const dailyCanvas = document.getElementById('chart-daily-tokens');
    if (dailyCanvas && data.daily_tokens) {
        if (chartsInstances.daily) chartsInstances.daily.destroy();
        chartsInstances.daily = new Chart(dailyCanvas, {
            type: 'line',
            data: {
                labels: data.daily_tokens.labels,
                datasets: [{
                    label: 'Tokens Generated',
                    data: data.daily_tokens.data,
                    borderColor: '#1a73e8',
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#1a73e8',
                    pointRadius: 4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    // 2. Service Usage
    const serviceCanvas = document.getElementById('chart-service-usage');
    if (serviceCanvas && data.service_usage) {
        if (chartsInstances.service) chartsInstances.service.destroy();
        chartsInstances.service = new Chart(serviceCanvas, {
            type: 'doughnut',
            data: {
                labels: data.service_usage.labels,
                datasets: [{
                    data: data.service_usage.data,
                    backgroundColor: ['#1a73e8', '#00c2ff', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // 3. Waiting Time Distribution
    const waitCanvas = document.getElementById('chart-waiting-time');
    if (waitCanvas && data.waiting_time) {
        if (chartsInstances.wait) chartsInstances.wait.destroy();
        chartsInstances.wait = new Chart(waitCanvas, {
            type: 'bar',
            data: {
                labels: data.waiting_time.labels,
                datasets: [{
                    label: 'Customers %',
                    data: data.waiting_time.data,
                    backgroundColor: '#00c2ff',
                    borderRadius: 6
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    // 4. Branch Performance
    const branchCanvas = document.getElementById('chart-branch-performance');
    if (branchCanvas && data.branch_performance) {
        if (chartsInstances.branch) chartsInstances.branch.destroy();
        chartsInstances.branch = new Chart(branchCanvas, {
            type: 'bar',
            data: {
                labels: data.branch_performance.labels,
                datasets: [{
                    label: 'Tokens Handled',
                    data: data.branch_performance.data,
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }]
            },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
        });
    }
}

/**
 * Customers CRUD
 */
let allCustomers = [];

async function loadAdminCustomers() {
    const res = await fetchApi('/admin/customers');
    const tableBody = document.getElementById('admin-customers-table-body');
    if (!tableBody) return;

    if (res.success && res.customers) {
        allCustomers = res.customers;
        renderCustomersTable(allCustomers);
    }
}

function renderCustomersTable(customers) {
    const tableBody = document.getElementById('admin-customers-table-body');
    if (!tableBody) return;

    if (customers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px;">No customers found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = customers.map(c => `
        <tr>
            <td>#${c.id}</td>
            <td><strong>${c.name}</strong></td>
            <td>${c.email}</td>
            <td>${c.phone}</td>
            <td>
                <span class="badge ${c.status === 'blocked' ? 'badge-cancelled' : 'badge-active'}">
                    ${c.status}
                </span>
            </td>
            <td>${new Date(c.created_at || Date.now()).toLocaleDateString()}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-sm ${c.status === 'blocked' ? 'btn-success' : 'btn-outline'}" onclick="toggleCustomerBlock(${c.id}, '${c.status}')">
                        ${c.status === 'blocked' ? 'Unblock' : 'Block'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function setupCustomerSearch() {
    const searchInput = document.getElementById('customer-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allCustomers.filter(c => 
                c.name.toLowerCase().includes(query) || 
                c.email.toLowerCase().includes(query) || 
                c.phone.includes(query)
            );
            renderCustomersTable(filtered);
        });
    }
}

async function toggleCustomerBlock(id, currentStatus) {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    const res = await fetchApi(`/admin/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
    });
    if (res.success) {
        showToast(`Customer status changed to ${newStatus}.`, 'info');
        loadAdminCustomers();
    }
}

async function deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    const res = await fetchApi(`/admin/customers/${id}`, { method: 'DELETE' });
    if (res.success) {
        showToast('Customer deleted successfully.', 'info');
        loadAdminCustomers();
    }
}

async function handleAddCustomerSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('add-cust-name').value.trim();
    const email = document.getElementById('add-cust-email').value.trim();
    const phone = document.getElementById('add-cust-phone').value.trim();
    const address = document.getElementById('add-cust-address').value.trim();

    const res = await fetchApi('/admin/customers', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, address })
    });

    if (res.success) {
        showToast('Customer added successfully!', 'success');
        closeModal('add-customer-modal');
        loadAdminCustomers();
    } else {
        showToast(res.message || 'Failed to add customer.', 'danger');
    }
}

/**
 * Staff CRUD
 */
async function loadAdminStaff() {
    const res = await fetchApi('/admin/staff');
    const tableBody = document.getElementById('admin-staff-table-body');
    if (!tableBody) return;

    if (res.success && res.staff) {
        tableBody.innerHTML = res.staff.map(s => `
            <tr>
                <td>#${s.id}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.email}</td>
                <td>${s.phone}</td>
                <td>Chennai Main Branch</td>
                <td><span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}">${s.status || 'active'}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteStaff(${s.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

async function handleAddStaffSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('add-staff-name').value.trim();
    const email = document.getElementById('add-staff-email').value.trim();
    const phone = document.getElementById('add-staff-phone').value.trim();
    const address = document.getElementById('add-staff-address') ? document.getElementById('add-staff-address').value.trim() : '';

    const res = await fetchApi('/admin/staff', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, address })
    });

    if (res.success) {
        showToast('Staff member added successfully!', 'success');
        closeModal('add-staff-modal');
        loadAdminStaff();
    } else {
        showToast(res.message || 'Failed to add staff.', 'danger');
    }
}

async function deleteStaff(id) {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    const res = await fetchApi(`/admin/staff/${id}`, { method: 'DELETE' });
    if (res.success) {
        showToast('Staff removed.', 'info');
        loadAdminStaff();
    }
}

/**
 * Branches CRUD
 */
async function loadAdminBranches() {
    const res = await fetchApi('/admin/branches');
    const tableBody = document.getElementById('admin-branches-table-body');
    if (!tableBody) return;

    if (res.success && res.branches) {
        tableBody.innerHTML = res.branches.map(b => `
            <tr>
                <td><strong style="color:var(--accent); font-family:'JetBrains Mono';">${b.branch_code}</strong></td>
                <td><strong>${b.branch_name}</strong></td>
                <td>${b.address}</td>
                <td>${b.phone || '--'}</td>
                <td>${b.opening_time} - ${b.closing_time}</td>
                <td><span class="badge badge-serving">${b.counters || 4} Counters</span></td>
                <td><span class="badge badge-${b.status === 'active' ? 'active' : 'inactive'}">${b.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteBranch(${b.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

async function handleAddBranchSubmit(e) {
    e.preventDefault();
    const branch_name = document.getElementById('add-branch-name').value.trim();
    const branch_code = document.getElementById('add-branch-code').value.trim();
    const address = document.getElementById('add-branch-address').value.trim();
    const phone = document.getElementById('add-branch-phone').value.trim();
    const counters = document.getElementById('add-branch-counters').value;

    const res = await fetchApi('/admin/branches', {
        method: 'POST',
        body: JSON.stringify({ branch_name, branch_code, address, phone, counters })
    });

    if (res.success) {
        showToast('Branch created successfully!', 'success');
        closeModal('add-branch-modal');
        loadAdminBranches();
    } else {
        showToast(res.message || 'Failed to create branch.', 'danger');
    }
}

async function deleteBranch(id) {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    const res = await fetchApi(`/admin/branches/${id}`, { method: 'DELETE' });
    if (res.success) {
        showToast('Branch removed.', 'info');
        loadAdminBranches();
    }
}

/**
 * Services CRUD
 */
async function loadAdminServices() {
    const res = await fetchApi('/admin/services');
    const tableBody = document.getElementById('admin-services-table-body');
    if (!tableBody) return;

    if (res.success && res.services) {
        tableBody.innerHTML = res.services.map(s => `
            <tr>
                <td>#${s.id}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="${s.icon || 'fas fa-concierge-bell'}" style="color:var(--accent);"></i>
                        <strong>${s.service_name}</strong>
                    </div>
                </td>
                <td>${s.description}</td>
                <td><span class="badge badge-waiting">~${s.estimated_time} mins</span></td>
                <td><span class="badge badge-${s.status === 'active' ? 'active' : 'inactive'}">${s.status}</span></td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-sm ${s.status === 'active' ? 'btn-outline' : 'btn-success'}" onclick="toggleServiceStatus(${s.id}, '${s.status}')">
                            ${s.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteService(${s.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

async function handleAddServiceSubmit(e) {
    e.preventDefault();
    const service_name = document.getElementById('add-svc-name').value.trim();
    const description = document.getElementById('add-svc-desc').value.trim();
    const estimated_time = document.getElementById('add-svc-time').value;
    const icon = document.getElementById('add-svc-icon').value.trim();

    const res = await fetchApi('/admin/services', {
        method: 'POST',
        body: JSON.stringify({ service_name, description, estimated_time, icon })
    });

    if (res.success) {
        showToast('Service created successfully!', 'success');
        closeModal('add-service-modal');
        loadAdminServices();
    } else {
        showToast(res.message || 'Failed to create service.', 'danger');
    }
}

async function toggleServiceStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await fetchApi(`/admin/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
    });
    if (res.success) {
        showToast(`Service status updated to ${newStatus}.`, 'info');
        loadAdminServices();
    }
}

async function deleteService(id) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    const res = await fetchApi(`/admin/services/${id}`, { method: 'DELETE' });
    if (res.success) {
        showToast('Service deleted.', 'info');
        loadAdminServices();
    }
}

/**
 * Modal Open/Close helpers
 */
function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
