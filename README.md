# GK AutoHerb — Frontend Application (All 3 Panels)

This folder contains **only the frontend application** for GK AutoHerb Cloud Suite, featuring complete UI/UX implementations for all 3 user roles:
1. **🛡️ Admin Suite (`/admin`)** — Operations, Bays, Job Carts, Invoicing, Approvals, CRM & Inventory
2. **👤 Customer Portal (`/customer`)** — Live Tracking, Service Bookings, Garage, Packages & Loyalty Wallet
3. **🔧 Staff Workspace (`/staff`)** — Floor Operations, Bay Checklist, Parts Requisition & Attendance

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ or v20+ installed
- **npm**: v9+ or v10+

### 2. Installation
Open a terminal inside this directory and run:
```bash
npm install
```

### 3. Run in Development Mode
```bash
npm run dev
```
Open your browser at:
👉 **`http://localhost:5173`**

### 4. Build for Production
```bash
npm run build
```
The compiled output will be generated in `dist/`.

---

## 📁 Architecture & Panels Overview

```
GK-Autoherb-Frontend-Only/
├── index.html              # Main HTML entry point
├── package.json            # React 18, Vite, Tailwind, Zustand, Lucide icons
├── tailwind.config.ts      # Custom themes & automotive palette
├── vite.config.ts          # Vite configuration & dev proxy
├── public/                 # Static assets, vehicle images, service icons
└── src/
    ├── App.tsx             # Master route definitions for all 3 panels
    ├── main.tsx            # React DOM bootstrap
    ├── index.css           # Global Tailwind styles & animations
    ├── api/                # Axios instance & React Query hooks
    ├── components/
    │   ├── layout/         # Admin, Customer, and Staff Layouts & Sidebars
    │   ├── shared/         # Modals, toasts, common UI elements
    │   └── ui/             # Reusable UI primitives
    ├── pages/
    │   ├── admin/          # 45 Admin management pages
    │   │   ├── DashboardPage.tsx
    │   │   ├── JobCartListPage.tsx
    │   │   ├── QuickBillingPage.tsx
    │   │   ├── AllInvoicesPage.tsx
    │   │   ├── PackageApprovalsPage.tsx
    │   │   ├── CustomersListPage.tsx
    │   │   ├── InventoryPage.tsx
    │   │   ├── SlotsPage.tsx
    │   │   ├── StaffPage.tsx
    │   │   └── ...
    │   ├── customer/       # 13 Customer portal pages
    │   │   ├── DashboardPage.tsx
    │   │   ├── BookingPage.tsx
    │   │   ├── JobTrackingPage.tsx
    │   │   ├── VehiclesPage.tsx
    │   │   ├── LoyaltyPage.tsx
    │   │   └── ...
    │   ├── staff/          # 6 Staff floor pages
    │   │   ├── StaffJobCartsPage.tsx
    │   │   ├── CheckInOutPage.tsx
    │   │   ├── DeliveryPage.tsx
    │   │   └── ...
    │   └── auth/           # Login, Registration & Password reset
    ├── router/             # RoleRoute & ProtectedRoute wrappers
    ├── store/              # Zustand auth & app state stores
    └── types/              # TypeScript interface definitions
```

---

## ⚙️ Connecting to a Backend (Optional)
By default, the Vite dev server proxies API calls to `http://localhost:5000/api` via `vite.config.ts`.
You can customize the API endpoint in `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```
