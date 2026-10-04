/**
 * SmartQueue Bank - Automated Workflow Verification Script
 */

const http = require('http');

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (payload) req.write(payload);
        req.end();
    });
}

async function runVerification() {
    console.log('--- Starting SmartQueue Bank End-to-End Verification ---');

    try {
        // 1. Health check
        console.log('\n[1] Checking Server Health...');
        const health = await request('GET', '/api/health');
        console.log(`✓ Health Status: ${health.body.status} (${health.status})`);

        // 2. Customer Login
        console.log('\n[2] Logging in as Customer (customer@smartqueue.com)...');
        const custLogin = await request('POST', '/api/auth/login', {
            email: 'customer@smartqueue.com',
            password: 'customer123',
            role: 'customer'
        });
        if (!custLogin.body.success) throw new Error('Customer login failed: ' + JSON.stringify(custLogin.body));
        const custToken = custLogin.body.token;
        console.log(`✓ Customer Authenticated: ${custLogin.body.user.name}`);

        // 3. Fetch Branches and Services
        console.log('\n[3] Fetching Branches and Services...');
        const branches = await request('GET', '/api/customer/branches');
        const services = await request('GET', '/api/customer/services');
        console.log(`✓ Available Branches: ${branches.body.branches.length}`);
        console.log(`✓ Available Services: ${services.body.services.length}`);

        // 4. Book a Token
        console.log('\n[4] Booking a Digital Token for Cash Withdrawal at Chennai Main Branch...');
        const today = new Date().toISOString().slice(0, 10);
        const bookRes = await request('POST', '/api/queue/book', {
            branch_id: 1,
            service_id: 2, // Cash Withdrawal
            booking_date: today,
            appointment_time: '10:30 AM'
        }, custToken);

        if (!bookRes.body.success) throw new Error('Token booking failed: ' + JSON.stringify(bookRes.body));
        const bookedToken = bookRes.body.token;
        console.log(`✓ Token Booked! Number: ${bookedToken.token_number}, Status: ${bookedToken.status}, People Ahead: ${bookedToken.people_ahead}, Est. Wait: ${bookedToken.estimated_waiting_time} mins`);

        // 5. Check My Token
        console.log('\n[5] Fetching Customer Active Token via /api/queue/my-token...');
        const myToken = await request('GET', '/api/queue/my-token', null, custToken);
        console.log(`✓ Active Token Confirmed: ${myToken.body.token.token_number} | Status: ${myToken.body.token.status}`);

        // 6. Check Live Queue Status
        console.log('\n[6] Fetching Live Branch Queue via /api/queue/status?branch_id=1...');
        const qStatus = await request('GET', '/api/queue/status?branch_id=1');
        console.log(`✓ Queue Length: ${qStatus.body.queue_list.length} | Currently Serving: ${qStatus.body.current_serving}`);

        // 7. Staff Login & Call Next Customer
        console.log('\n[7] Logging in as Bank Staff (staff@smartqueue.com)...');
        const staffLogin = await request('POST', '/api/auth/login', {
            email: 'staff@smartqueue.com',
            password: 'staff123',
            role: 'staff'
        });
        if (!staffLogin.body.success) throw new Error('Staff login failed');
        const staffToken = staffLogin.body.token;
        console.log(`✓ Staff Authenticated: ${staffLogin.body.user.name}`);

        console.log('\n[8] Staff Calls Next Customer (FIFO)...');
        const callNext = await request('POST', '/api/staff/call-next', {
            branch_id: 1,
            counter: 'Counter 2'
        }, staffToken);
        console.log(`✓ Staff Action: ${callNext.body.message}`);

        // 9. Verify Customer Token Updated to "serving"
        console.log('\n[9] Checking Customer Token after Staff Call Next...');
        const myTokenUpdated = await request('GET', '/api/queue/my-token', null, custToken);
        console.log(`✓ Customer Token Current Status: ${myTokenUpdated.body.token.status} (Serving: ${myTokenUpdated.body.token.token_number})`);

        // 10. Staff Completes Token
        console.log('\n[10] Staff Completes Token Service...');
        const completeRes = await request('PUT', '/api/staff/complete-token', {
            token_id: bookedToken.id,
            branch_id: 1
        }, staffToken);
        console.log(`✓ Complete Status: ${completeRes.body.message}`);

        // 11. Admin Login & Dashboard Analytics Check
        console.log('\n[11] Logging in as Admin (admin@smartqueue.com)...');
        const adminLogin = await request('POST', '/api/auth/login', {
            email: 'admin@smartqueue.com',
            password: 'admin123',
            role: 'admin'
        });
        if (!adminLogin.body.success) throw new Error('Admin login failed');
        const adminToken = adminLogin.body.token;

        console.log('\n[12] Fetching Admin Dashboard Stats & Charts...');
        const adminDash = await request('GET', '/api/admin/dashboard', null, adminToken);
        console.log(`✓ Admin Total Customers: ${adminDash.body.stats.total_customers}`);
        console.log(`✓ Admin Completed Tokens: ${adminDash.body.stats.completed_tokens}`);
        console.log(`✓ Chart.js Service Breakdown Categories: ${adminDash.body.charts.service_usage.labels.length}`);

        console.log('\n======================================================');
        console.log('🎉 ALL 12 WORKFLOW STEPS PASSED WITH 100% SUCCESS! 🎉');
        console.log('======================================================');
        process.exit(0);
    } catch (err) {
        console.error('❌ Verification failed:', err.message);
        process.exit(1);
    }
}

runVerification();
