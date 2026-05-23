# GK AutoHerb - Project Documentation

## 1. Project Overview
**GK AutoHerb** is a comprehensive vehicle service and package management platform. It facilitates customers in browsing, purchasing, and booking vehicle maintenance services/packages, while providing administrators with a robust backend dashboard to manage approvals, track bookings, and oversee operations.

---

## 2. Technology Stack

### Frontend
*   **Core Library**: React (v18.3)
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **Routing**: React Router DOM
*   **State Management & Data Fetching**: @tanstack/react-query
*   **Forms**: React Hook Form
*   **Icons**: Lucide React
*   **Notifications**: React Hot Toast
*   **Date Picker**: React Datepicker

### Backend
*   **Environment**: Node.js
*   **Framework**: Express.js
*   **Database**: MySQL (using `mysql2` driver)
*   **Validation**: express-validator
*   **Authentication/Security**: JWT (JSON Web Tokens), bcrypt for password hashing
*   **External Integrations**: MSG91 for SMS notifications (Approvals/Rejections/Booking Updates)

---

## 3. Core Features - Admin Dashboard

The Admin Dashboard is the central control hub for the system's operations.

*   **Analytics Dashboard**: Displays key metrics including Pending Package Requests, Total Bookings, and active users. Includes a notification banner for immediate attention to pending approvals.
*   **Package Approvals Management**: 
    *   **Workflow**: Transitioned from immediate deductions to a pending request model.
    *   **States**: Tracks packages via `Pending`, `Approved`, and `Rejected` tabs.
    *   **Rejection Flow**: Admins can reject requests with a mandatory `rejection_reason`, automatically triggering an SMS notification to the customer.
    *   **Activation**: Approving a package activates it for the customer's vehicle.
*   **Booking Management**: 
    *   **Deferred Deduction**: Credits are only deducted when a booking is explicitly approved by the admin.
    *   **Restoration**: Rejecting or cancelling a booking restores the deducted credits to the customer's package.
*   **Invoice & Billing**: Generation, formatting (INR), and tracking of invoices.
*   **Customer & Vehicle Management**: Oversee all registered users, their vehicles, and associated packages.

---

## 4. Core Features - Customer Dashboard

The Customer Dashboard provides an intuitive interface for users to manage their vehicle maintenance.

*   **Browse & Purchase Packages**:
    *   View available service packages.
    *   Initiate a purchase which goes into a "Pending" state until admin review.
*   **My Package Requests Tracking**:
    *   A dedicated section to track the status of package purchase intents.
    *   Displays real-time statuses: `Pending`, `Approved`, or `Rejected`.
    *   Shows the specific `rejection_reason` provided by the admin if a package is rejected.
*   **Service Booking**:
    *   Book vehicle services dynamically filtered by what is included in their approved packages.
    *   Bookings register as intent; credits are deducted only upon admin approval.
*   **Booking History**: View past, upcoming, and rejected/cancelled bookings.
*   **Vehicle Management**: Add and manage vehicles associated with the account.
*   **Profile Management**: Update contact details and view active packages.

---

## 5. Architectural Highlights

*   **Deferred Deduction Workflow**: Ensures package credits are strictly managed and only depleted when services are confirmed or packages are explicitly approved, mitigating credit disputes.
*   **Atomic Transactions**: Booking creation and credit deduction logic is separated to guarantee consistency in the database.
*   **Real-time Notifications**: Web-based toast notifications for UI feedback combined with an SMS gateway (MSG91) for crucial external customer updates.
