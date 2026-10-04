# Smart Queue Bank Management System

A modern, full-stack digital bank queue and token management web application designed to reduce customer branch waiting times through FIFO queue automation, digital appointments, and real-time live counter tracking.

---

## 🌟 Key Features

### For Customers:
1. **Registration & Secure Authentication**: Register with name, email, phone, and password; JWT-based sessions.
2. **Branch & Service Selection**: Choose from multiple branch locations (Chennai Main, Anna Nagar, Tambaram, Coimbatore) and specialized banking services (Cash Deposit, Cash Withdrawal, Account Opening, Loan Enquiries, etc.).
3. **Appointment Scheduling**: Pick date and 30-minute time slots (09:00 AM to 04:30 PM).
4. **Digital Token Generation**: Instant digital token with prefix based on service (e.g. `A105`, `W102`).
5. **Live Queue Position Tracking**: See exact queue position, currently serving token, and people ahead.
6. **Dynamic Estimated Waiting Time**: Automatically calculated using FIFO rules and average service duration.
7. **Visual Progress Bar**: Waiting &rarr; Almost Your Turn &rarr; Serving &rarr; Completed.
8. **Real-Time Turn Chime**: Audio chime and highlight banner when customer's turn is called at the counter.
9. **Print / Download Token**: Easy download and print option for physical presentation.
10. **Token Cancellation**: Self-service cancellation with real-time queue position recalculation.

### For Bank Staff:
1. **Dedicated Counter Terminal**: Select active branch and counter (Counter 1 to 4).
2. **FIFO Calling Engine**: "Call Next" automatically advances the queue and alerts the customer.
3. **Counter Controls**: Complete Token, Skip / No-show, and Recall Audio Chime.
4. **Live Metrics**: Counters for Waiting Customers, Currently Serving, Completed Today, and Cancelled Today.

### For Administrators:
1. **Executive Queue Analytics**: 4 Chart.js interactive visualizations:
   - Daily Token Statistics (Line chart)
   - Service Counter Breakdown (Doughnut chart)
   - Waiting Time Distribution (Bar chart)
   - Branch Queue Performance (Horizontal bar chart)
2. **Customer Management**: Search, filter, add, edit, block, unblock, or delete customer records.
3. **Staff Management**: Add and manage staff officers and branch counter assignments.
4. **Branch Management**: Configure branches, addresses, operating hours, and active counters.
5. **Service Management**: Add or toggle banking service categories and configure average duration SLAs.

---

## 🏗️ Folder Structure

```
smart-queue-bank/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── customer-dashboard.html
│   ├── book-token.html
│   ├── my-token.html
│   ├── queue-status.html
│   ├── services.html
│   ├── profile.html
│   │
│   ├── staff-login.html
│   ├── staff-dashboard.html
│   │
│   ├── admin-login.html
│   ├── admin-dashboard.html
│   ├── admin-customers.html
│   ├── admin-staff.html
│   ├── admin-branches.html
│   └── admin-services.html
│
├── frontend/css/
│   ├── style.css
│   ├── auth.css
│   ├── dashboard.css
│   ├── queue.css
│   └── responsive.css
│
├── frontend/js/
│   ├── main.js
│   ├── auth.js
│   ├── customer.js
│   ├── queue.js
│   ├── staff.js
│   └── admin.js
│
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   │
│   ├── config/
│   │   └── database.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── customerController.js
│   │   ├── queueController.js
│   │   ├── staffController.js
│   │   └── adminController.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── queueRoutes.js
│   │   ├── staffRoutes.js
│   │   └── adminRoutes.js
│   │
│   └── middleware/
│       ├── authMiddleware.js
│       └── roleMiddleware.js
│
├── database/
│   └── smart_queue.sql
│
├── assets/
│   ├── images/
│   │   └── queue-illustration.svg
│   └── icons/
│       └── bank-logo.svg
│
└── README.md
```

---

## 🔑 Demo Login Accounts

Pre-configured sample accounts are ready to use immediately:

| Portal | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Customer Portal** | `customer@smartqueue.com` | `customer123` | `customer` |
| **Staff Portal** | `staff@smartqueue.com` | `staff123` | `staff` |
| **Admin Portal** | `admin@smartqueue.com` | `admin123` | `admin` |

*(Each login page also has an **Auto-Fill** button for instant one-click testing.)*

---

## 🚀 How to Run the Application

### 1. Prerequisites
- **Node.js** (v18 or higher installed)
- **MySQL** (Optional: the backend includes an intelligent dual-mode connector that automatically executes on MySQL if configured, or gracefully switches to memory-persistent mode if MySQL password is not yet configured, ensuring zero downtime).

### 2. Configure MySQL (Optional)
If running MySQL Server locally:
1. Import `database/smart_queue.sql` into MySQL:
   ```bash
   mysql -u root -p < database/smart_queue.sql
   ```
2. Adjust `backend/.env` with your MySQL password:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=smart_queue_bank
   DB_PORT=3306
   ```

### 3. Start the Backend Server
Open your terminal in `smart-queue-bank/backend`:
```powershell
cd "e:\JAVA PBL\smart-queue-bank\backend"
node server.js
```

### 4. Open in Browser
Open your browser to:
👉 **`http://localhost:5000`** (or `http://localhost:5000/index.html`)

Direct portal links:
- **Landing Page**: [http://localhost:5000/index.html](http://localhost:5000/index.html)
- **Customer Sign In**: [http://localhost:5000/login.html](http://localhost:5000/login.html)
- **Customer Register**: [http://localhost:5000/register.html](http://localhost:5000/register.html)
- **Public Queue Board**: [http://localhost:5000/queue-status.html](http://localhost:5000/queue-status.html)
- **Staff Counter**: [http://localhost:5000/staff-login.html](http://localhost:5000/staff-login.html)
- **Admin HQ**: [http://localhost:5000/admin-login.html](http://localhost:5000/admin-login.html)

---

## 🔄 End-to-End Workflow Testing

Test the full live queue lifecycle:
1. **Register or Login** as Customer at `http://localhost:5000/login.html`.
2. Go to **Book Token**, select branch, service, date, and 10:30 AM slot &rarr; Click **Generate Token** (e.g. `A101`).
3. View the **My Token** page (`my-token.html`) showing status **WAITING**, progress bar, and people ahead.
4. In another tab or incognito window, open **Staff Desk** (`staff-login.html`), login as `staff@smartqueue.com` / `staff123`.
5. In Staff Desk, click **Call Next (FIFO)**. Token `A101` is now called and marked **Serving** at Counter 2.
6. Switch back to the Customer tab &rarr; The customer dashboard automatically syncs, displays **"It's Your Turn!"**, plays the audio chime, and moves the progress bar to **Your Turn**.
7. In Staff Desk, click **Complete** &rarr; Token status updates to **Completed**.
8. Go to **Admin Console** (`admin-login.html`) with `admin@smartqueue.com` / `admin123` to view the updated Chart.js queue throughput and completed statistics.
