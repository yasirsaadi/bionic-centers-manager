# Replit.md - Medical Center Patient Management System

## Overview

This is a full-stack medical center management application for "Bionic Center" (مركز بايونك), specializing in prosthetics and physiotherapy services across multiple branches in Iraq. The system manages patient records, visits, payments, and documents with Arabic RTL interface support.

**Core Purpose:** Track patients (amputees and physiotherapy cases), their treatment costs, payment history, visits, and medical documents across different geographical branches (Baghdad, Karbala, Dhi Qar, Mosul, Kirkuk).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** TanStack Query (React Query) for server state
- **UI Components:** shadcn/ui with Radix UI primitives
- **Styling:** Tailwind CSS with CSS variables for theming
- **Forms:** React Hook Form with Zod validation
- **RTL Support:** Mandatory Arabic RTL layout (`dir="rtl"`)
- **Fonts:** Almarai (display) and Tajawal (body) for Arabic typography

### Backend Architecture
- **Runtime:** Node.js with Express
- **Language:** TypeScript with ESM modules
- **API Pattern:** RESTful endpoints under `/api/*`
- **Build Tool:** Custom build script using esbuild (server) and Vite (client)
- **File Uploads:** Multer for document handling, stored in `/uploads` directory

### Data Storage
- **Database:** PostgreSQL via Drizzle ORM
- **Schema Location:** `shared/schema.ts`
- **Migrations:** Drizzle Kit with `db:push` command
- **Session Storage:** PostgreSQL-backed sessions via `connect-pg-simple`

### Authentication
- **Provider:** Replit Auth (OpenID Connect)
- **Session Management:** Express sessions with PostgreSQL store
- **User Model:** Linked to branches with role-based access (admin/staff)

### Key Data Models
- **Branches:** Geographic locations (Baghdad, Karbala, etc.)
- **Patients:** Medical records with amputee/physiotherapy classification
- **Visits:** Treatment session logs
- **Payments:** Financial transactions in Iraqi Dinar (IQD)
- **Documents:** Uploaded medical files and reports

### Shared Code Pattern
- `shared/` directory contains schemas and route definitions used by both client and server
- `drizzle-zod` generates Zod schemas from Drizzle tables for validation
- Route definitions in `shared/routes.ts` define API contracts with request/response schemas

## External Dependencies

### Database
- PostgreSQL (required, connection via `DATABASE_URL` environment variable)

### Authentication
- Replit Auth OIDC provider (`ISSUER_URL` defaults to `https://replit.com/oidc`)
- Requires `REPL_ID` and `SESSION_SECRET` environment variables

### Frontend Libraries
- Recharts for financial visualization
- date-fns for date formatting (Arabic locale support needed)
- Framer Motion for animations (listed in requirements)

### Development Tools
- Vite for frontend dev server with HMR
- Replit-specific plugins: runtime error overlay, cartographer, dev banner

### File Storage
- Local filesystem (`/uploads` directory) for document storage
- No external cloud storage configured

## Recent Changes

### Statistics System (January 2026)
- Added comprehensive `/statistics` page with multiple chart types (bar, pie, area)
- Statistics include: age distribution, medical condition types, payment status, branch distribution, monthly trends
- Time-range filtering: all time, last week, last month, last 3 months
- Branch filtering for admin users
- Financial metrics: all-time revenue, paid amounts, remaining balances, collection rate
- Time-filtered stats properly use visit dates and payment dates (not just patient registration dates)
- Monthly trends track patients by registration date, visits by visit date, payments by payment date

### Date-based Patient Filtering
- BranchDetails page includes date picker to view patients by any selected date
- Uses Gregorian calendar (en-GB format) with local date boundaries (not UTC)

### Sequential Patient Numbering
- Patient lists show sequential numbers (#1, #2, #3...) for easy visual counting

### Comprehensive Accounting System (January 2026)
- New `/accounting` page (admin-only access)
- Database tables: `expenses`, `installment_plans`, `invoices`, `invoice_items`
- Financial Dashboard with 6 KPIs: total revenue, payments, remaining, expenses, net profit, collection rate
- Multiple tabs: Dashboard, Expenses Management, Invoices, Reports, Analytics, Debtors

**Expenses Management:**
- Full CRUD operations with delete confirmation dialogs
- 6 categories: salaries, rent, medical_supplies, maintenance, utilities, other
- Color-coded category cards and charts

**Invoicing System:**
- Create invoices for patients with multiple line items
- Auto-generated invoice numbers (INV-YYYYMM-XXXX format)
- Service types: prosthetic, physiotherapy, medical support, consultation, other
- Invoice status tracking: pending, partial, paid, cancelled
- Payment amount tracking and remaining balance display

**Reports & Analytics:**
- Branch comparison and profitability analysis
- Monthly financial trends visualization with Area charts
- Service profitability breakdown (amputee, physiotherapy, medical support)
- Debtors tracking with outstanding balance monitoring
- PDF and Excel export with proper Arabic RTL support using arabic-reshaper

- All accounting endpoints are admin-only protected for write operations
- Branch staff can view their own branch's financial reports (read-only)
- Admin users see all branches with branch selector dropdown
- Branch staff see only their branch data with branch name badge