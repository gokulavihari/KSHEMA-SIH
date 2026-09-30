# KSHEMA — Dual-Interface Public + Authorized Executive RBAC Architecture

This document defines the Role-Based Access Control (RBAC) architecture, authentication mechanisms, authorization flow, endpoint security, and account management for **Kshema** (Disaster Risk & Safe Relocation Intelligence).

---

## 1. Dual-Interface System Architecture

Kshema is partitioned into two clearly separated user interfaces:

```
+-------------------------------------------------------------------------------+
|                                 KSHEMA SYSTEM                                 |
+---------------------------------------+---------------------------------------+
|   INTERFACE 1: PUBLIC GENERAL VIEWER   |  INTERFACE 2: AUTHORIZED EXECUTIVE    |
|   (Unauthenticated Public Access)     |  (Argon2id + JWT Authenticated)       |
+---------------------------------------+---------------------------------------+
| - Public Command Dashboard            | - Advanced Command Dashboard          |
| - Public GIS Command Map              | - Executive GIS Command Map           |
| - Regional Risk Overview              | - Multi-Hazard Risk Analysis Engine   |
| - Active Public Safety Alerts         | - Safe Relocation Site Optimizer      |
| - Public Safety Protocols             | - Carrying Capacity Matrix            |
| - Emergency Helpline Contacts         | - AI Model Status & Retraining        |
| - Discreet "Executive Sign-In" Link   | - Data Sources & Quality Diagnostics  |
|                                       | - Decision Audit Trail Logs           |
|                                       | - System Configuration & Admin        |
+---------------------------------------+---------------------------------------+
```

---

## 2. Role Model Definitions

| Role | Authentication Required | Scope & Description |
| :--- | :--- | :--- |
| **`PUBLIC`** | No | General public, community residents, anonymous viewers. Access restricted to aggregated risk summaries, public safety guidance, emergency alerts, and simplified GIS maps without raw technical parameters or administrative controls. |
| **`EXECUTIVE`** | Yes (Argon2id + JWT) | Authorized NDRF officers, emergency management executives, regional authorities. Full access to operational decision-support modules, relocation engines, capacity matrix, risk scoring, AI models, and audit logs. |
| **`ADMIN`** | Yes (Argon2id + JWT) | System administrators. Access to executive console plus system configuration updates, user management, ML candidate model promotion, and production rollback controls. |

---

## 3. Password Storage & Cryptographic Security

1. **Password Hashing Standard**:
   - Uses **Argon2id** (memory-hard password hashing algorithm resistant to GPU/ASIC cracking attacks).
   - Configuration parameters:
     - `time_cost` = 3 iterations
     - `memory_cost` = 65,536 KiB (64 MB)
     - `parallelism` = 4 threads
     - `hash_len` = 32 bytes
     - `salt_len` = 16 bytes
   - **Zero Plaintext Credentials**: Plaintext passwords are NEVER stored in the database, source code, environment files, frontend JavaScript bundles, or log outputs.

2. **Brute-Force & Lockout Protection**:
   - Accounts track `failed_login_attempts`.
   - Upon **5 consecutive failed attempts**, the account is locked for **15 minutes** (`locked_until`).
   - Generic error message returned to client on failure: `"Invalid credentials."` to prevent user enumeration attacks.

---

## 4. Session & Token Management

- **Protocol**: JSON Web Token (JWT) with HMAC-SHA256 (`HS256`) signatures.
- **Token Delivery**:
  - Returned in HTTP response payload as `access_token`.
  - Also set as an **`HttpOnly`** cookie (`access_token=Bearer <token>; SameSite=Lax; Path=/`).
- **Token Expiration**: Configurable (default 8 hours / 480 minutes).
- **Frontend Storage**: Stored in memory / secure context state and standard bearer headers.

---

## 5. API Endpoint Classification Matrix

### A. Public Unauthenticated Endpoints (`/api/public/*` and `/api/health`)
- `GET /api/health` — System status & active region configuration
- `GET /api/public/dashboard` — Aggregated public risk metrics and regional overview
- `GET /api/public/map` — Public GIS features, location risk categories, and public safety advice
- `GET /api/public/alerts` — Active public emergency notifications
- `GET /api/public/safety-info` — Emergency guidelines and helpline phone directory
- `POST /api/auth/login` — Authenticate executive credentials
- `POST /api/auth/logout` — Invalidate user session

### B. Protected Executive Endpoints (`/api/executive/*` and protected routes)
*Requires Bearer Token with `EXECUTIVE` or `ADMIN` role. Anonymous requests return HTTP 401 Unauthorized.*
- `GET /api/auth/me` — Authenticated officer profile
- `GET /api/auth/audit-logs` — Decision audit trail
- `GET /api/ml/models` — AI model cards and performance telemetry
- `POST /api/relocation-plan` — Run site capacity relocation optimizer
- `POST /api/simulate/extreme-rainfall` — Execute scenario rainfall simulation
- `POST /api/location/assess` — Compute location-specific multi-hazard risk assessment

### C. Restricted Administrative Endpoints (`/api/admin/*` and `/api/config`)
*Requires Bearer Token with `ADMIN` role. Executive role receives HTTP 403 Forbidden.*
- `POST /api/config` — Update system configuration weights and rules
- `POST /api/ml/training-runs` — Trigger candidate model retraining
- `POST /api/ml/models/{id}/approve` — Promote candidate model to production
- `POST /api/ml/models/{id}/rollback` — Roll back production model

---

## 6. Executive Account Creation & Management

Initial executive accounts are generated using the secure backend CLI tool:

```bash
# Interactive CLI Account Creation
python -m app.auth.create_admin

# Example Command Line Execution
python -m app.auth.create_admin --official-id EXEC-101 --full-name "Commander R. Sharma" --role EXECUTIVE --email "exec101@aashray.gov.in"
```

The script prompts securely for passwords without echoing input, validates password strength, hashes credentials using Argon2id, and writes the record to SQLite `aashray_auth.db`.

---

## 7. Operational Audit Logging

Every authentication attempt and sensitive operational decision is recorded in the `audit_logs` database table:

Recorded Fields:
- `timestamp` (UTC)
- `official_id`
- `role`
- `action` (e.g., `EXECUTIVE_LOGIN_SUCCESS`, `EXECUTIVE_LOGIN_FAILURE`, `RELOCATION_ANALYSIS_REQUEST`, `ACCOUNT_LOCKOUT_TRIGGERED`)
- `status` (`SUCCESS`, `FAILURE`, `DENIED`)
- `endpoint`
- `ip_address`
- `details` (Non-sensitive diagnostic context)

---

## 8. Production Deployment Security Requirements

1. **HTTPS Enforcement**: Ensure TLS/SSL is active (`secure=True` on cookies).
2. **Environment Secret Injection**: Set `AASHRAY_JWT_SECRET` via secure environment variables.
3. **Password Policy**: Require executive accounts to change default passwords prior to operational deployment.
4. **Audit Log Retention**: Enable automated database backups for `aashray_auth.db`.
