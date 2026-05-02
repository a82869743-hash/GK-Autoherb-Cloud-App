# GK AutoHerb - Project Documentation

## 1. Project Overview
**GK AutoHerb** is a comprehensive, full-stack SaaS cloud application designed for automobile service centers. It provides specialized dashboards and features for administrators, staff, and customers, facilitating complete workshop management, vehicle tracking, job cart management, inventory, and online bookings.

## 2. Technology Stack

### Frontend (Client)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **State Management**: Zustand (Global State) & @tanstack/react-query (Server State)
- **Routing**: React Router DOM (v6)
- **Form Handling**: React Hook Form with Zod validation
- **Real-time Communication**: Socket.io-client
- **Maps/Tracking**: Google Maps JS API
- **Data Export/Handling**: xlsx
- **Icons & UI Utilities**: Lucide React, React Hot Toast, React Datepicker

### Backend (Server)
- **Environment**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (using `mysql2` with connection pooling)
- **Real-time Communication**: Socket.io (Used for live delivery/tracking updates)
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **File Uploads**: Multer with Cloudinary Storage (`multer-storage-cloudinary`)
- **PDF Generation**: Puppeteer
- **Scheduling/Background Tasks**: node-cron
- **Security**: Helmet, CORS, Express-Validator

---

## 3. Architecture & Directory Structure

The project follows a standard client-server monorepo-style structure:
```
Software/
├── client/           # React Frontend Application
│   ├── public/       # Static assets
│   ├── src/
│   │   ├── api/      # Axios instances and API endpoint configurations
│   │   ├── components/# Reusable UI components
│   │   ├── pages/    # Route components (Admin, Customer, Staff, Auth)
│   │   ├── router/   # React Router configurations
│   │   ├── store/    # Zustand stores
│   │   ├── types/    # TypeScript interfaces and types
│   │   └── utils/    # Helper functions
│   └── package.json
├── server/           # Node.js/Express Backend Application
│   ├── migrations/   # Database migration scripts
│   ├── scripts/      # Utility scripts (seed, migrate)
│   ├── src/
│   │   ├── config/   # Configuration files (Database, Cloudinary, etc.)
│   │   ├── controllers/# Request handlers with business logic
│   │   ├── middleware/ # Express middlewares (Auth, Validation, Error Handling)
│   │   ├── routes/   # API route definitions
│   │   ├── services/ # Business logic layer and cron jobs
│   │   └── app.js    # Express application setup and Socket.io initialization
│   └── package.json
└── .env              # Global Environment Variables
```

---

## 4. Frontend Application (Client)

The frontend is divided into role-based modules, ensuring secure and dedicated interfaces for different user types.

### 4.1. Admin Dashboard
The command center for workshop owners/managers.
- **DashboardPage**: Aggregated statistical data, KPIs, revenue metrics, and live service overviews.
- **JobCart (Create/List/Detail)**: Comprehensive management of ongoing vehicle repairs, parts usage, and labor.
- **InventoryPage**: Stock management for auto parts and consumables.
- **Bookings & Slots**: Management of customer appointments and workshop bay availability.
- **Staff Management**: Tracking staff details, performance, and assignments.
- **Accounts & Buy/Sell**: Financial tracking and managing vehicle trading (buy/sell).
- **Settings & Loyalty**: System configuration and customer loyalty program management.
- **Services & Packages**: Defining service offerings and bundled packages.

### 4.2. Customer Dashboard
A personalized portal for vehicle owners.
- **DashboardPage**: Overview of customer's vehicles, upcoming bookings, and recent job carts.
- **VehiclesPage**: Managing customer's registered vehicles.
- **BookingPage**: Interface to schedule new service appointments.
- **TrackingPage**: Live tracking of vehicle pick-up/drop-off using Google Maps & Socket.io.
- **Loyalty & Profile**: Managing reward points and user profile details.

### 4.3. Staff Dashboard
A focused interface for mechanics and delivery personnel.
- View assigned tasks and job carts.
- Real-time location broadcasting for vehicle delivery/pickup routing.

---

## 5. Backend Application (Server)

The backend exposes a secure RESTful API under `/api/v1/` and manages real-time socket connections.

### 5.1. Core API Routes (`server/src/routes/`)
- **Authentication (`/api/auth`)**: Login, registration, password resets.
- **Job Carts (`/api/job-carts`)**: CRUD operations for workshop jobs, PDF invoice generation.
- **Inventory (`/api/inventory`)**: Stock control APIs.
- **Bookings & Slots (`/api/bookings`, `/api/slots`)**: Appointment scheduling logic.
- **Services & Packages (`/api/services`, `/api/packages`, `/api/user-packages`)**: Catalog management.
- **Vehicles (`/api/vehicles`)**: Customer vehicle registry.
- **Deliveries (`/api/deliveries`)**: Managing pickup/drop-off logistics.
- **Dashboard (`/api/dashboard`)**: Optimized endpoints aggregating stats for frontend KPIs.

### 5.2. Real-time Capabilities (Socket.io)
Integrated directly into `app.js` to handle live updates:
- **`join_delivery`**: Authenticates and connects users to specific delivery tracking rooms.
- **`location_update`**: Broadcasts live GPS coordinates from staff to customers waiting for vehicle pickup/delivery.

### 5.3. Background Tasks & Services
- **Cron Jobs**: Managed by `node-cron` (initialized in `services/cronService.js`) for tasks like sending automated reminders, updating statuses, or cleaning up expired slots.
- **File Uploads**: Profiles, vehicle images, and documents are securely uploaded to Cloudinary.

---

## 6. Security & Best Practices

- **Authentication**: JWT-based authentication with role-based access control (RBAC). Middleware verifies tokens before granting access to protected routes.
- **Environment Management**: Secrets (DB credentials, JWT secrets, Cloudinary keys) are strictly managed via `.env`.
- **Validation**: Strict schema validation on the client (Zod) and server (Express-Validator) to prevent bad data injection.
- **Performance**: High-performance Express backend with optimized MySQL queries. The React frontend uses `@tanstack/react-query` for aggressive caching and stale-while-revalidate data fetching.

---
*Documentation generated for GK AutoHerb platform.*
