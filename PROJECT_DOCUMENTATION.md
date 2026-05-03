# GK AutoHerb - Comprehensive Project Documentation (0-100)

## 1. Executive Summary
**GK AutoHerb** is an advanced, full-stack Cloud/SaaS CRM application built specifically for automobile service centers and workshops. It handles the complete lifecycle of vehicle servicing—from customer booking, vehicle intake, job cart creation, inventory tracking, to final invoicing and delivery. The platform supports multiple user roles (Admin, Staff, Customer) and provides real-time features like GPS tracking and live socket communication.

---

## 2. Complete Technology Stack

### Frontend (Client Application)
*   **Core Framework**: React 18 with TypeScript for type safety.
*   **Build System**: Vite (for rapid development and optimized builds).
*   **Styling Engine**: Tailwind CSS, PostCSS, Autoprefixer for utility-first responsive design.
*   **State Management**: 
    *   **Zustand**: For global, persistent client state.
    *   **@tanstack/react-query**: For server state management, caching, and data fetching.
*   **Routing**: React Router DOM (v6).
*   **Form Management & Validation**: React Hook Form paired with Zod schema validation.
*   **Real-Time & Maps**: 
    *   `socket.io-client`: For live notifications and real-time staff location tracking.
    *   `@googlemaps/js-api-loader`: For embedding dynamic maps and plotting coordinates.
*   **Data Handling**: `xlsx` for Excel data export/import.
*   **UI Components**: `lucide-react` (Icons), `react-datepicker`, `react-hot-toast` (Toast notifications).

### Backend (Server Application)
*   **Runtime Environment**: Node.js.
*   **Web Framework**: Express.js.
*   **Database**: MySQL (using `mysql2` with connection pooling for high concurrency).
*   **Real-time Server**: Socket.io (for handling active WebSocket connections).
*   **Authentication & Security**: 
    *   JSON Web Tokens (JWT) for stateless authentication.
    *   `bcryptjs` for secure password hashing.
    *   `helmet` for HTTP header security.
    *   `cors` for Cross-Origin Resource Sharing control.
    *   `express-validator` for API payload sanitization.
*   **Media Storage**: Cloudinary, integrated via `multer` and `multer-storage-cloudinary` for image/document uploads.
*   **PDF Generation**: `puppeteer` (Headless Chrome) for generating pixel-perfect PDF invoices and job carts.
*   **Data Import/Export**: `xlsx` and `exceljs` for processing bulk vehicle and inventory data.
*   **Background Jobs**: `node-cron` for scheduling automated SMS, slot cleanup, and reminders.

---

## 3. Database Architecture (MySQL)

The system relies on a robust relational database schema managed through sequenced SQL migrations (35+ tables).

### Core Entities
1.  **Users (`users`)**: Centralized identity table for Admins, Staff, and Customers with role-based flags.
2.  **Vehicles (`vehicles`, `vehicle_master`)**: Registry of all customer vehicles (make, model, reg number, is_primary flags), backed by a master catalog of vehicle types.
3.  **Job Carts (`job_carts`)**: The heart of the system. Tracks repairs, linked to customers, vehicles, and bookings. Statuses range from `pending` to `completed`.
4.  **Job Relations (`job_services`, `job_products`, `job_photos`)**: Many-to-many tables linking a job cart to the specific services rendered, parts consumed, and inspection photos uploaded.

### Scheduling & Operations
5.  **Bookings & Slots (`bookings`, `slots`)**: Manages customer appointments. Bookings are mapped to specific time slots, preventing double-booking. Includes an Admin Approval System.
6.  **Staff & Deliveries (`staff`, `deliveries`, `staff_checkin`)**: Tracks mechanics and drivers. Logs check-ins and maps deliveries (pickup/drop-off) with GPS coordinates.

### Commerce & Inventory
7.  **Inventory (`inventory`)**: Tracks auto parts, oils, and consumables. Monitors stock levels and pricing.
8.  **Services & Categories (`services`, `service_categories`)**: Catalog of labor operations (e.g., "Oil Change", "Wheel Alignment") with predefined durations and costs.
9.  **Packages (`packages`, `package_services`, `package_products`)**: Bundled offerings (e.g., "Annual Maintenance Contract") that group services and products together.
10. **Customer Packages (`user_packages`, `package_usage`)**: Tracks which customers bought which packages, and how many redemptions/usages they have left.

### Financials & CRM
11. **Transactions & Billing (`transactions`, `billing_and_vendors`, `vendors`)**: Records all payments, invoice generation logs, and vendor supply chain expenses.
12. **Loyalty (`loyalty`)**: Reward points system for customer retention.
13. **Buy/Sell & Inquiries (`buy_sell`, `inquiries`)**: Marketplace features for listing used cars and capturing leads.
14. **Messages Log (`messages_log`)**: Audit trail of all SMS/WhatsApp notifications sent (e.g., via 2Factor DLT templates).

---

## 4. Comprehensive Feature Matrix

### 4.1. Admin Panel (Workshop Owners/Managers)
*   **Business Dashboard**: Real-time KPI metrics, revenue charts, and operational overviews.
*   **Job Cart Management**: 
    *   Create digital job cards for incoming vehicles.
    *   Attach services, deduct parts from inventory.
    *   Upload inspection photos.
    *   Generate and download PDF Invoices.
*   **Booking Approval Workflow**: Review online booking requests from customers and approve/reject based on bay availability.
*   **Inventory Control**: Add/edit stock, track low-stock items, and manage supplier details.
*   **Staff Oversight**: Register mechanics, assign tasks, and monitor active deliveries.
*   **Package Management**: Design subscription models (e.g., 3 Free Washes) and assign them to customer profiles.
*   **Vehicle Trading**: Manage the Buy/Sell car listings.
*   **System Settings**: Configure workshop details, tax rates, and SMS notification templates.

### 4.2. Customer Portal
*   **My Garage**: Add and manage personal vehicles, designating a "Primary" vehicle for quicker bookings.
*   **Online Booking**: Select services or use active package balances to request an appointment on a calendar interface.
*   **Live Tracking**: View the real-time Google Maps location of the staff member assigned to pick up or deliver their vehicle.
*   **Service History**: Download past invoices and view job cart details.
*   **Loyalty Points**: View accumulated points from past services.
*   **Package Balances**: See remaining limits on purchased maintenance packages.

### 4.3. Staff / Mechanic Interface
*   **Task List**: View assigned job carts and daily duties.
*   **Delivery Mode**: Initiate a delivery/pickup sequence. This connects to Socket.io and streams the device's GPS coordinates directly to the customer's tracking page.
*   **Check-in System**: Log daily attendance.

---

## 5. Core System Workflows

### The Repair Lifecycle (Job Cart Workflow)
1.  **Intake**: Vehicle arrives (walk-in or via booking). Admin creates a Job Cart.
2.  **Inspection**: Mechanic assesses the car. Admin adds required *Services* and *Products* to the cart.
3.  **Execution**: Work is performed. Inventory is automatically deducted as parts are marked "used" in the cart.
4.  **Completion**: Job is marked complete. The system calculates totals, applies taxes, and checks for any valid package redemptions to offset costs.
5.  **Invoicing**: Puppeteer generates a high-fidelity PDF invoice. The customer is notified via SMS/Email.

### Real-Time Logistics Workflow
1.  Staff is assigned to pick up a customer's car.
2.  Staff opens the app and clicks "Start Trip".
3.  The frontend captures `navigator.geolocation` data.
4.  Data is emitted via WebSocket (`socket.emit('location_update', data)`).
5.  The Customer, logged into their dashboard, is listening to the same WebSocket room.
6.  The customer sees a Google Map with a moving marker representing the staff member.

### Subscription & Package Workflow
1.  Admin creates a "Gold Wash Package" containing 5 Car Washes.
2.  Customer purchases the package. A record is created in `user_packages`.
3.  Customer books an appointment and selects the "Gold Wash Package".
4.  Upon job completion, the system records a `package_usage` entry and decrements the customer's available wash count.

---

## 6. Security and Compliance Mechanisms

*   **Role-Based Access Control (RBAC)**: Backend endpoints strictly check the decoded JWT payload to ensure Staff cannot access Admin financial routes.
*   **Telecom Compliance (India)**: SMS notifications use the 2Factor API and are strictly mapped to pre-approved DLT (Distributed Ledger Technology) templates to ensure deliverability and prevent spam blocking.
*   **Data Integrity**: Zod handles frontend validation before payload submission, while `express-validator` acts as a secondary shield on the backend, preventing SQL injection and malformed data.

---
*This document serves as the holistic 0-100 master reference for the GK AutoHerb Cloud Application.*
