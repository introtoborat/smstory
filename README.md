# StoryDB

A children's story management system with Role-Based Access Control (RBAC),
built with Next.js 16, Prisma, and PostgreSQL.

## Features

- **Stories** — create, edit, duplicate, and export children's stories with rich
  per-page editor (scene description, story text, image prompt, notes).
- **Tags, genres, age groups, character genders** — admin-managed lookup tables.
- **PDF / DOCX export** per story.
- **Dashboard** with story statistics and recent activity.

## User Management & RBAC

Three role tiers (see [src/lib/auth.ts](src/lib/auth.ts) for the full matrix):

| Role | Create users | Stories | Settings | Audit log |
| --- | --- | --- | --- | --- |
| Admin | ✅ | view / create / update / **delete** | manage | ✅ |
| Editor | – | view / create / update | – | – |
| Viewer | – | view only | – | – |

- Passwords are stored as **bcrypt** hashes (cost factor 12). They are never
  returned by any API — only the user can set or change their own password.
- Admins send **invitations** (`/admin/users` → Invite) by email with a
  single-use activation link (72 h). The invited user sets their own password
  on first sign-in at `/activate?token=...`.
- Admins can trigger **password reset** emails for any user. Self-service
  password reset is available to all users via `/reset-password`.
- **Activate / deactivate** toggles user access without deleting the account.
  Deactivation also invalidates all active sessions.
- **Last-admin protection** — the system refuses to delete, deactivate, or
  demote the last active admin.
- Every login, logout, user change, story change, and password event is
  recorded in the **audit log** (`/admin/audit`). Passwords are explicitly
  stripped from audit metadata.

## Routes

| Path | Purpose | Auth |
| --- | --- | --- |
| `/login` | Login / first-time admin registration | Public |
| `/activate?token=…` | Set password from invitation | Public |
| `/reset-password` | Self-service password reset | Public |
| `/` | Dashboard | Any role |
| `/stories`, `/stories/[id]`, `/stories/new` | Story browser / editor | Any role (read); admin/editor (write); admin (delete) |
| `/account` | Profile + change own password | Any role |
| `/admin/users`, `/admin/users/[id]` | User CRUD, role/status, activity | Admin |
| `/admin/audit` | Audit log | Admin |
| `/admin/settings` | Lookup table editor | Admin |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure your environment (Postgres connection string, JWT secret, admin credentials)
cp .env .env.local  # then edit

# 3. Apply migrations
npm run db:migrate

# 4. Seed (creates admin user from ADMIN_EMAIL and ADMIN_PASSWORD env vars)
npm run db:seed

# 5. Run dev server
npm run dev
```

> **First-time setup:** the registration tab on `/login` is the bootstrap
> path when no users exist. After that, all new accounts must be created by an
> admin via `/admin/users`.

### Email Configuration

Invitations and password resets are delivered through SMTP:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="StoryDB <no-reply@example.com>"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For local development only, set `ALLOW_DEV_INVITE_URL=true` or
`ALLOW_DEV_RESET_URL=true` to include the generated link in API responses.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Prisma 7** (PostgreSQL)
- **jose** for JWT session tokens
- **bcryptjs** for password hashing
- **Radix UI** + custom Tailwind components
- **TipTap** for the rich-text story editor
