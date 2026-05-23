# GK AutoHerb - Comprehensive Project Documentation (0 to 100)

## 1. Executive Summary
**GK AutoHerb** is an advanced, full-stack Cloud/SaaS CRM application built specifically for automobile service centers and workshops. It handles the complete lifecycle of vehicle servicing—from customer booking, vehicle intake, job cart creation, inventory tracking, to final invoicing and delivery. The platform supports multiple user roles (Admin, Staff, Customer) and provides real-time features like GPS tracking and live socket communication.

---

## 2. Complete Technology Stack

### Frontend (Client Application)
*   **Core Framework**: React 18 with TypeScript for robust, type-safe development.
*   **Build System**: Vite (for rapid development, HMR, and optimized production builds).
*   **Styling Engine**: Tailwind CSS, PostCSS, Autoprefixer for utility-first responsive design.
*   **State Management**: 
    *   **Zustand**: For global, persistent client state across components.
    *   **@tanstack/react-query**: For server state management, caching, background updates, and data fetching.
*   **Routing**: React Router DOM (v6) for seamless Single Page Application (SPA) navigation.
*   **Form Management & Validation**: React Hook Form paired with Zod schema validation.
*   **Real-Time & Maps**: 
    *   `socket.io-client`: For live notifications and real-time staff location tracking.
    *   `@googlemaps/js-api-loader`: For embedding dynamic maps and plotting live GPS coordinates.
*   **Data Handling**: `xlsx` for Excel data export/import capabilities.
*   **UI Components**: `lucide-react` (Icons), `react-datepicker` (Date picking), `react-hot-toast` (Toast notifications).

### Backend (Server Application)
*   **Runtime Environment**: Node.js.
*   **Web Framework**: Express.js.
*   **Database**: MySQL (using `mysql2` with connection pooling for high concurrency and performance).
*   **Real-time Server**: Socket.io (for handling active WebSocket connections for live tracking and updates).
*   **Authentication & Security**: 
    *   JSON Web Tokens (JWT) for stateless, role-based authentication.
    *   `bcryptjs` for secure password hashing.
    *   `helmet` for HTTP header security.
    *   `cors` for Cross-Origin Resource Sharing control.
    *   `express-validator` for API payload sanitization.
*   **Media Storage**: Cloudinary, integrated via `multer` and `multer-storage-cloudinary` for fast image/document uploads.
*   **PDF Generation**: `puppeteer` (Headless Chrome) for generating pixel-perfect PDF invoices and job carts.
*   **Data Import/Export**: `xlsx` and `exceljs` for processing bulk vehicle and inventory data.
*   **Background Jobs**: `node-cron` for scheduling automated SMS, slot cleanup, and service reminders.

---

## 3. Database Architecture (MySQL)

The system relies on a robust relational database schema managed through sequenced SQL migrations (35+ tables).

### Core Entities
1.  **Users (`users`)**: Centralized identity table for Admins, Staff, and Customers with role-based flags.
2.  **Vehicles (`vehicles`, `vehicle_master`)**: Registry of all customer vehicles, backed by a master catalog of vehicle types.
3.  **Job Carts (`job_carts`)**: The heart of the system. Tracks repairs, linked to customers, vehicles, and bookings.
4.  **Job Relations (`job_services`, `job_products`, `job_photos`)**: Links a job cart to the specific services rendered, parts consumed, and inspection photos.

### Scheduling & Operations
5.  **Bookings & Slots (`bookings`, `slots`)**: Manages customer appointments mapped to specific time slots.
6.  **Staff & Deliveries (`staff`, `deliveries`, `staff_checkin`)**: Tracks mechanics/drivers. Logs check-ins and maps deliveries with GPS coordinates.

### Commerce & Inventory
7.  **Inventory (`inventory`)**: Tracks auto parts, oils, and consumables. Monitors stock levels and pricing.
8.  **Services & Categories (`services`, `service_categories`)**: Catalog of labor operations with durations and costs.
9.  **Packages (`packages`, `package_services`, `package_products`)**: Bundled offerings (e.g., "AMC") grouping services and products.
10. **Customer Packages (`user_packages`, `package_usage`)**: Tracks customer package ownership and redemptions.

### Financials & CRM
11. **Transactions & Billing (`transactions`, `billing_and_vendors`, `vendors`)**: Records payments, invoice generation logs, and vendor expenses.
12. **Loyalty (`loyalty`)**: Reward points system for customer retention.
13. **Buy/Sell & Inquiries (`buy_sell`, `inquiries`)**: Marketplace for listing used cars and capturing leads.
14. **Messages Log (`messages_log`)**: Audit trail of SMS/WhatsApp notifications sent.

---

## 4. Comprehensive Feature Matrix: Admin Dashboard

The Admin Dashboard provides full control over workshop operations, featuring 30+ distinct modules:

*   **Dashboard (`DashboardPage.tsx`)**: High-level KPI metrics, revenue charts, active jobs, and daily booking overviews.
*   **Job Cart Management**:
    *   **Create & List (`JobCartCreatePage.tsx`, `JobCartListPage.tsx`)**: Digitally intake vehicles, assign mechanics, and track repair status.
    *   **Details & Invoicing (`JobCartDetailPage.tsx`)**: Attach services, deduct inventory, upload photos, and generate Puppeteer PDF invoices.
    *   **Quick Wash (`QuickWashPage.tsx`)**: Streamlined flow for fast turnaround services like washing.
*   **Customer & Vehicle CRM**:
    *   **Customers (`CustomersListPage.tsx`, `CustomerDetailPage.tsx`)**: Complete customer history, lifetime value, and vehicle registry.
    *   **Manual Registration (`ManualRegistrationPage.tsx`)**: Walk-in customer onboarding.
*   **Appointments & Scheduling**:
    *   **Bookings (`CustomerBookingsPage.tsx`)**: Review, approve, or reject customer online bookings based on capacity.
    *   **Slots (`SlotsPage.tsx`)**: Configure workshop bay availability and time slot intervals.
*   **Billing & Accounts**:
    *   **Invoices & Accounts (`AllInvoicesPage.tsx`, `AccountsPage.tsx`)**: Track financial flow, view all historical invoices, and manage shop accounts.
    *   **Quick Billing (`QuickBillingPage.tsx`)**: Generate over-the-counter bills for spare parts without creating a full job cart.
*   **Inventory & Catalog**:
    *   **Inventory (`InventoryPage.tsx`)**: Manage spare parts, track low-stock items, and handle supplier data.
    *   **Services (`ServicesPage.tsx`, `PremiumServicesPage.tsx`)**: Define standard and premium labor operations and pricing.
    *   **Bulk Import (`ImportPage.tsx`)**: Import vehicles, customers, and inventory via Excel/CSV.
*   **Staff & Logistics**:
    *   **Staff Management (`StaffPage.tsx`, `StaffDetailPage.tsx`)**: Register employees and monitor performance.
    *   **Payroll (`StaffSalaryPage.tsx`)**: Calculate mechanic salaries based on tasks completed and attendance.
    *   **Deliveries (`DeliveriesPage.tsx`)**: Monitor active pick-up and drop-off missions live on a map.
*   **Loyalty & Packages (Subscriptions)**:
    *   **Packages (`PackagesPage.tsx`, `PackageApprovalsPage.tsx`)**: Design AMC packages (e.g., "3 Free Washes") and approve customer purchase requests.
    *   **Loyalty (`LoyaltySettingsPage.tsx`, `LoyaltyAwardPage.tsx`)**: Configure point multipliers and manually award points for retention.
*   **Marketplace**:
    *   **Vehicle Trading (`BuySellPage.tsx`, `InquiriesPage.tsx`)**: Manage used car listings and respond to prospective buyers.
*   **System Administration**:
    *   **Settings (`SettingsPage.tsx`)**: Configure workshop branding, tax percentages (GST), and general preferences.
    *   **Communications (`MessagesPage.tsx`)**: Audit trail for outgoing SMS and WhatsApp alerts.
    *   **Archive (`ArchivePage.tsx`)**: Safely store and review deleted records.

---

## 5. Comprehensive Feature Matrix: Customer Dashboard

The Customer Portal is designed for self-service and transparency:

*   **Customer Dashboard (`DashboardPage.tsx`)**: Personal overview of upcoming appointments, active vehicles in the shop, and recent activity.
*   **My Garage (`VehiclesPage.tsx`, `ProfilePage.tsx`)**: Add new vehicles, set primary vehicles for quick booking, and manage user profile details.
*   **Interactive Booking (`BookingPage.tsx`, `BookingsPage.tsx`)**: 
    *   Select specific services or use active package balances.
    *   Choose available time slots on a dynamic calendar.
    *   View status of past and upcoming bookings.
*   **Service & Package Store**:
    *   **Services Catalog (`ServicesPage.tsx`)**: Browse available workshop services and transparent pricing.
    *   **Subscriptions (`BuyPackagesPage.tsx`)**: Purchase maintenance packages and track remaining usage balances.
*   **Repair History (`JobCartsPage.tsx`)**: Track the live status of active repairs and download historical PDF invoices.
*   **Live Tracking (`TrackingPage.tsx`)**: View real-time Google Maps location of the assigned driver during vehicle pickup or drop-off.
*   **Rewards (`LoyaltyPage.tsx`)**: View accumulated loyalty points and track point transaction history.

---

## 6. Staff / Mechanic Interface

*   **Task List**: View assigned job carts and daily duties.
*   **Delivery Mode**: Initiate a delivery/pickup sequence. Connects to Socket.io and streams device GPS coordinates directly to the customer's live tracking page.
*   **Check-in System**: Log daily attendance for salary calculations.

---

## 7. Core System Workflows

### The Repair Lifecycle (Job Cart Workflow)
1.  **Intake**: Vehicle arrives (walk-in or via booking). Admin creates a Job Cart.
2.  **Inspection**: Mechanic assesses the car. Admin adds required *Services* and *Products* to the cart.
3.  **Execution**: Work is performed. Inventory is automatically deducted as parts are marked "used".
4.  **Completion**: System calculates totals, applies taxes, and checks for valid package redemptions to offset costs.
5.  **Invoicing**: Puppeteer generates a high-fidelity PDF invoice. The customer is notified via SMS.

### Real-Time Logistics Workflow (GPS Tracking)
1.  Admin assigns a staff member to pick up a customer's car.
2.  Staff opens the mobile interface and clicks "Start Trip".
3.  The frontend captures `navigator.geolocation` data.
4.  Data is emitted via WebSocket (`socket.emit('location_update', data)`).
5.  The Customer, on the Tracking Page, listens to the same WebSocket room.
6.  The customer sees a Google Map with a moving marker representing the staff member in real-time.

### Subscription & Package Workflow
1.  Admin creates a "Gold Wash Package" containing 5 Car Washes.
2.  Customer purchases the package via the Customer Dashboard.
3.  Customer books an appointment and applies the package.
4.  Upon job completion, the system records a `package_usage` entry and decrements the customer's available wash count automatically.

---

## 8. Security and Compliance Mechanisms

*   **Role-Based Access Control (RBAC)**: Backend endpoints strictly check decoded JWT payloads to ensure Staff/Customers cannot access Admin financial routes.
*   **Telecom Compliance**: SMS notifications are integrated with approved templates (e.g., DLT in India) to ensure high deliverability and spam prevention.
*   **Data Integrity**: `Zod` handles frontend validation before payload submission, while `express-validator` acts as a secondary shield on the backend, preventing SQL injection and malformed data.
*   **Stateless Scaling**: The Node.js + Express architecture utilizing JWTs allows the backend to scale horizontally without session bottlenecking.

---
*This document serves as the holistic 0-100 master reference for the GK AutoHerb Cloud Application.*
