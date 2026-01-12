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