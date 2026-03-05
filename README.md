# AIRAuto – AI Invoice & Receipt Automation for South Africa

> A full-stack AI-powered invoice/receipt automation system tailored to the South African SME market. Process invoices, extract key fields using OCR + AI, validate against SARS VAT requirements, and export to local accounting platforms.

---

## Table of Contents

- [Overview](#overview)
- [Market Context](#market-context)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Development](#development)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Known Issues](#known-issues)
- [Deployment](#deployment)

---

## Overview

AIRAuto is an MVP invoice processing system designed specifically for South African SMEs. It combines:

- **OCR** (server-side Tesseract) for text extraction from PDFs and images
- **AI** (OpenAI GPT with cheap-first strategy) for structured field extraction
- **SARS Validation** (South African tax compliance rules)
- **SA Accounting Integrations** (Sage, Xero, QuickBooks stubs + functional CSV export)
- **Async Processing** (BullMQ/Redis queue for scalability)
- **POPIA Compliance** (encryption, audit logging, data retention)

### Why Built for South Africa?

SA invoice processing has unique requirements not addressed by global solutions:

| Area | Requirement | Implementation |
|------|-------------|-----------------|
| **Currency** | South African Rand (ZAR, R) | All amounts default to ZAR; R symbol recognized |
| **VAT** | 15% standard rate | Auto-calculated & validated; detects inclusive/exclusive |
| **SARS Tax Invoice** | Specific mandatory fields | Label, VAT#, sequential #, date, description, qty, value + VAT |
| **Invoice Thresholds** | Full > R5,000 / Abridged R50–R5,000 / None ≤ R50 | Auto-classified; enforces field requirements per type |
| **Accounting Software** | Sage (dominant), Xero, QuickBooks | Integration stubs ready; CSV fully functional |
| **POPIA** | Data protection (ZA privacy law) | Encrypted storage, audit logs, 5-year retention, consent tracking |
| **Date Format** | DD/MM/YYYY common | Parser handles multiple formats |
| **B-BBEE** | Black Economic Empowerment | Optional certificate field extraction |

---

## Market Context

### Confirmed Decisions

✅ **Next.js 16 full-stack** with async workers (BullMQ/Redis)  
✅ **Server-side native Tesseract** (node-tesseract-ocr) — more reliable than Tesseract.js  
✅ **Cheap-first AI strategy** → GPT-4o-mini first, escalate to GPT-4o only on low confidence  
✅ **OpenAI API key via .env** with mock/demo mode when absent  
✅ **Integration stubs** (Sage/Xero/QB); CSV fully functional  
✅ **PostgreSQL + Prisma** for schema management  
✅ **BullMQ + Redis** for async extraction pipeline  

---

## Key Features

### 🔍 Invoice Processing Pipeline

AIRAuto’s extraction pipeline is **rules-first with AI fallback** and runs inside a BullMQ worker:

1. **Upload** — Drag-and-drop or file browser (PDF, JPG, PNG)
2. **File Storage** — Encrypted storage (local dev, S3-ready abstraction)
3. **OCR** — Server-side `tesseract` via `node-tesseract-ocr` (eng+afr, `tessedit_pageseg_mode = 1`, `preserve_interword_spaces = 1`)
4. **Text Normalization** — Lowercasing, whitespace collapsing, ZAR currency normalization, date normalization to ISO
5. **Rule-Based Extraction** — Deterministic regex + keyword rules extract core fields and line items
6. **Confidence Scoring** — 0.0–1.0 per field (regex: 0.9, keyword: 0.8, heuristic: 0.6)
7. **AI Fallback (if needed)** — Only when critical fields fall below 0.7 confidence:
   - First `gpt-4o-mini`, escalate to `gpt-4o` if still low
   - Strict JSON schema; non-JSON responses are rejected
8. **Field Merging** — High-confidence rule results are never overridden; AI only fills gaps / low-confidence fields
9. **SARS Validation** — Dedicated engine checks SARS tax invoice rules and VAT maths with tolerance
10. **Persistence** — Prisma stores OCR text, extracted fields JSON, validation report, confidence and AI metadata
11. **Export Readiness** — Invoice marked ready for CSV/Sage/Xero/QuickBooks export

For a deeper, always up-to-date description of the pipeline, see [`ARCHITECTURE_CONTEXT.md`](./ARCHITECTURE_CONTEXT.md).

### 📊 SARS-Specific Validation

- ✅ Invoice type auto-classification (Full/Abridged/No-Invoice)
- ✅ VAT number format validation (4-digit prefix required)
- ✅ Sequential invoice number detection
- ✅ 15% VAT calculation with tolerance
- ✅ Date format handling (DD/MM/YYYY, YYYY-MM-DD, ambiguous)
- ✅ Invoice label detection ("Tax Invoice" / "VAT Invoice")
- ✅ Vendor/customer address fields
- ✅ B-BBEE classification (optional)

### 🔐 Security & Compliance

- **NextAuth.js** — JWT-based auth with refresh tokens
- **RBAC** — Admin and Standard user roles
- **Encryption** — AES-256 for file storage
- **Audit Logging** — All actions tracked (upload, edit, export, delete)
- **Data Retention** — 5-year policy with automated flagging
- **Consent Tracking** — Per POPIA requirements
- **HTTPS** — Enforced in deployment

### 📈 Async Processing with Visibility

- **BullMQ Queues** — Extraction, validation, export jobs
- **Status Polling** — Frontend polls for job completion
- **Retry Logic** — Exponential backoff on failures
- **Cost Analytics** — Track model usage and costs per extraction

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + design system
- **UI:** Shadcn/ui (or Tremor for dashboards)
- **State:** React Context + polling

### Backend
- **Server:** Next.js API Routes
- **ORM:** Prisma (PostgreSQL)
- **Database:** PostgreSQL 15+
- **Queue:** BullMQ (Redis)
- **OCR:** node-tesseract-ocr (Tesseract 5+)
- **AI:** OpenAI API (GPT-4o-mini, GPT-4o)
- **Storage:** Local filesystem (S3-ready abstraction)

### DevOps
- **Package Manager:** npm
- **Testing:** Jest + Testing Library
- **Linting:** ESLint + Prettier
- **Monitoring:** Console logs (future: Sentry)

---

## Project Structure

```
SimpllfyF/airauto-sa/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Landing/dashboard
│   │   ├── globals.css                   # Design system
│   │   ├── upload/page.tsx               # Upload page
│   │   ├── invoices/
│   │   │   ├── page.tsx                  # Invoice list/dashboard
│   │   │   └── [id]/page.tsx             # Invoice detail/validation
│   │   ├── export/page.tsx               # Export page
│   │   └── api/
│   │       ├── upload/route.ts           # File upload endpoint
│   │       ├── invoices/
│   │       │   ├── route.ts              # List invoices
│   │       │   └── [id]/
│   │       │       ├── route.ts          # Get/update invoice
│   │       │       └── validate/route.ts # Validate invoice
│   │       ├── extract/route.ts          # AI extraction endpoint
│   │       └── export/route.ts           # Export endpoint
│   ├── components/
│   │   ├── ui/                           # Reusable UI components
│   │   ├── upload/                       # Upload-specific components
│   │   ├── invoice/                      # Invoice display/edit components
│   │   └── layout/                       # Nav, sidebar, header
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── ocr.ts                    # Native Tesseract OCR
│   │   │   ├── extractor.ts              # OpenAI GPT extraction (cheap-first)
│   │   │   └── prompts.ts                # SA-specific extraction prompts
│   │   ├── workers/
│   │   │   └── extraction.ts             # Async extraction worker (BullMQ)
│   │   ├── validation/
│   │   │   ├── sars.ts                   # SARS invoice validation rules
│   │   │   └── vat.ts                    # VAT calculation (15%)
│   │   ├── export/
│   │   │   ├── csv.ts                    # CSV export
│   │   │   ├── sage.ts                   # Sage API stub
│   │   │   ├── xero.ts                   # Xero API stub
│   │   │   └── quickbooks.ts             # QuickBooks API stub
│   │   ├── queue.ts                      # BullMQ queue setup
│   │   ├── db.ts                         # Prisma client singleton
│   │   └── storage.ts                    # File storage abstraction
│   └── types/
│       └── invoice.ts                    # TypeScript types (SA invoice model)
├── prisma/
│   └── schema.prisma                     # Database schema
├── __tests__/
│   ├── integration/e2e.test.ts           # E2E tests
│   └── README.md                         # Testing guide
├── public/                               # Static assets
├── jest.config.js                        # Jest configuration
├── jest.setup.js                         # Jest setup
├── TESTING.md                            # Comprehensive testing guide
├── .env.example                          # Environment variables template
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md ← You are here
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/airauto_sa"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# OpenAI
OPENAI_API_KEY="sk-..."

# Storage
STORAGE_PROVIDER="local"
STORAGE_PATH="./data/uploads"
```

### 3. Set Up Database (Optional for Demo)

```bash
npx prisma migrate dev
# or
npx prisma db push
```

### 4. Start Development Server

**Terminal 1 — Frontend + API:**
```bash
npm run dev
```

Opens on `http://localhost:3000` (or `3001` if port in use)

**Terminal 2 — Extraction Worker (Optional):**
```bash
npm run worker
```

**Terminal 3 — Redis (If Running Locally):**
```bash
redis-server
# or on WSL
wsl -e redis-server
```

### 5. Test the App

- Go to **http://localhost:3000/upload** → Upload a test invoice (PDF/JPG/PNG)
- Go to **http://localhost:3000/invoices** → See uploaded invoices
- Click an invoice → View extracted fields, validation results, and editable form
- Export to CSV/Sage/Xero/QuickBooks

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_HOST` | No | `localhost` | Redis host for queue |
| `REDIS_PORT` | No | `6379` | Redis port |
| `OPENAI_API_KEY` | No | — | OpenAI API key (leave blank for demo) |
| `STORAGE_PROVIDER` | No | `local` | `local` or `s3` |
| `STORAGE_PATH` | No | `./data/uploads` | Local storage directory |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `NEXTAUTH_SECRET` | No | — | Session encryption secret |

See [.env.example](.env.example) for complete list.

### Database

AIRAuto uses PostgreSQL with Prisma ORM.

**Models:**
- `User` — Tenant/user with roles
- `Invoice` — Raw file, extracted fields, SARS validation status
- `LineItem` — Line items on an invoice
- `Integration` — Connected accounting platform
- `AuditLog` — POPIA-compliant activity logs

See [prisma/schema.prisma](prisma/schema.prisma) for full schema.

### Storage

**Local Filesystem (Development):**
Files stored in `./data/uploads/` directory with path structure: `{userId}/{timestamp}-{random}.{ext}`

**S3 (Production):**
Abstraction ready — implement `S3Storage` class in [src/lib/storage.ts](src/lib/storage.ts)

---

## Development

### Running Code

**Frontend + API Server:**
```bash
npm run dev
```

**Extraction Worker:**
```bash
npm run worker
```

**In Watch Mode:**
```bash
npm run worker:watch
```

### Testing

**Run All Tests:**
```bash
npm test
```

**Run Tests in Watch:**
```bash
npm test:watch
```

**API Tests Only:**
```bash
npm test:api
```

**Library Tests Only:**
```bash
npm test:lib
```

**Coverage Report:**
```bash
npm test:coverage
```

See [TESTING.md](TESTING.md) for detailed testing guide.

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
npm run start
```

---

## API Endpoints

### Upload

**POST** `/api/upload`

Upload an invoice file (PDF, JPG, PNG) and queue for extraction.

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@invoice.pdf" \
  -F "userId=user-123"
```

**Response:**
```json
{
  "invoiceId": "inv-abc123",
  "status": "uploaded",
  "jobId": "job-xyz789"
}
```

### Invoices

**GET** `/api/invoices?userId=user-123&page=1&limit=20&status=validated&sort=newest`

List invoices with pagination and filtering.

**GET** `/api/invoices/[id]`

Fetch single invoice with all extracted fields and line items.

**PUT** `/api/invoices/[id]`

Update invoice fields (manual corrections).

```json
{
  "vendorName": "Updated Name",
  "invoiceNumber": "INV-002",
  "totalAmount": 5000.00
}
```

### Validation

**POST** `/api/invoices/[id]/validate`

Validate invoice against SARS rules.

**Response:**
```json
{
  "invoiceId": "inv-abc123",
  "valid": false,
  "validationResults": [
    {
      "field": "invoiceLabel",
      "valid": false,
      "message": "Missing invoice label",
      "severity": "error"
    }
  ],
  "errors": [...],
  "warnings": [...]
}
```

### Extract

**POST** `/api/extract`

Manually trigger extraction on an uploaded invoice.

```json
{
  "invoiceId": "inv-abc123",
  "userId": "user-123"
}
```

### Export

**POST** `/api/export`

Export invoices to external accounting system.

```json
{
  "invoiceIds": ["inv-1", "inv-2"],
  "provider": "csv",
  "userId": "user-123"
}
```

**Providers:** `csv`, `sage`, `xero`, `quickbooks`

**CSV Response:** File download with SA-standard columns (Date DD/MM/YYYY, Vendor, VAT#, Amount, VAT, Total ZAR)

---

## Database Schema

### Primary Models

#### Invoice
```typescript
model Invoice {
  id                String       @id @default(cuid())
  userId            String       // User who uploaded
  status            String       // uploaded → queued → ocr_processing → ai_extracting → needs_review → validated → exported
  
  // File
  originalFileName  String
  originalFilePath  String
  fileType          String       // pdf | jpg | png
  
  // Extracted Fields (SA-specific)
  invoiceLabel      String?
  vendorName        String?
  vendorVatNumber   String?      // 4-digit prefix (e.g., 4123456789)
  customerName      String?
  invoiceNumber     String?
  invoiceDate       DateTime?
  
  // Financial (ZAR)
  subtotal          Int?         // In cents
  vatAmount         Int?         // 15% of subtotal
  totalAmount       Int?
  vatRate           Float        // 0.15
  
  // Classification
  invoiceType       String       // full | abridged | no_invoice_required
  
  lineItems         LineItem[]
  createdAt         DateTime
  updatedAt         DateTime
}
```

#### LineItem
```typescript
model LineItem {
  id         String
  invoiceId  String
  description String
  quantity   Float
  unitPrice  Int      // In cents
  vatAmount  Int
  lineTotal  Int
}
```

#### AuditLog
```typescript
model AuditLog {
  id         String
  userId     String
  action     String       // upload | validate | export | manual_edit | delete
  resource   String       // invoice | integration | export
  resourceId String
  status     String       // success | failure | warning
  details    String       // JSON details
  createdAt  DateTime
}
```

---

## Testing

### Test Coverage

Comprehensive Jest test suite covering:

- ✅ **SARS validation logic** (8+ tests)
- ✅ **VAT calculation** (16+ tests)
- ✅ **File storage operations** (10+ tests)
- ✅ **API endpoints** (45+ tests)
- ✅ **Invoice CRUD operations**
- ✅ **Export functionality**
- ✅ **Audit logging**
- ✅ **Queue operations**

**Run Tests:**
```bash
npm test                    # All tests
npm test:watch              # Watch mode
npm test:coverage           # Coverage report
npm test:api                # API tests only
npm test:lib                # Library tests only
npm test:integration        # Integration tests
```

See [TESTING.md](TESTING.md) for complete testing guide.

---

## Known Issues

### 🔴 Prisma Schema Validation Error

**Issue:** `Native type Numeric is not supported for postgresql connector`

**Affected Fields:** `@db.Numeric(10, 2)` on Invoice/LineItem monetary fields

**Impact:** Cannot run `npx prisma migrate dev` until resolved

**Status:** Documented — awaiting fix

**Workaround:** Use `Decimal @db.Numeric` or switch to `BigInt` for cents-based storage

### 🔴 Invoices Dashboard Not Syncing

**Issue:** New uploads don't appear in `/invoices` page

**Status:** Documented — under investigation

**Workaround:** Manual page refresh or polling implementation pending

### 🔴 Export Excel/CSV Formatting

**Issue:** Only exports single column instead of full row data

**Status:** Documented — needs CSV formatter fix

**Workaround:** Export to individual CSV files

See [__tests__/README.md](__tests__/README.md) for full error tracker.

---

## Deployment

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run start
```

### Docker (Future)

Dockerfile and docker-compose.yml coming soon.

### Vercel

Push to GitHub and connect to Vercel. Environment variables configured in Vercel dashboard.

### Environment for Production

```bash
NODE_ENV=production
NEXTAUTH_SECRET=<generated-random-secret>
DATABASE_URL=<production-postgres-url>
REDIS_HOST=<production-redis-host>
OPENAI_API_KEY=<your-api-key>
```

---

## Verification Plan

### Development Testing

1. **Startup:** `npm run dev` → No build errors
2. **Upload:** Drag-and-drop invoice → File accepted, queued
3. **Dashboard:** Navigate to `/invoices` → Uploaded invoice listed
4. **Validation:** Open invoice → SARS validation panel shows results
5. **Export:** Select invoice → Export to CSV → File downloads correctly

### API Testing

```bash
# Upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@sample-invoice.pdf" \
  -F "userId=test-user"

# List invoices
curl http://localhost:3000/api/invoices?userId=test-user

# Get single invoice
curl http://localhost:3000/api/invoices/inv-xxx

# Validate
curl -X POST http://localhost:3000/api/invoices/inv-xxx/validate

# Export
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{"invoiceIds":["inv-xxx"],"provider":"csv"}'
```

### Performance Targets

- ✅ Single invoice processing: < 5 seconds
- ✅ API response time: < 100ms
- ✅ File upload: < 2 seconds
- ✅ Dashboard load: < 1.5 seconds

---

## Future Roadmap

- [ ] Real Sage/Xero/QuickBooks API integration
- [ ] SARS e-invoicing API support (2026-2029 rollout)
- [ ] Multi-language support (Afrikaans, Zulu)
- [ ] Mobile app (React Native)
- [ ] Webhook support for integrations
- [ ] Batch processing (100+ invoices)
- [ ] Machine learning for field confidence improvement
- [ ] OCR for handwritten invoices
- [ ] Integration with banks for automatic matching
- [ ] Advanced reporting and analytics
- [ ] Two-factor authentication (2FA)
- [ ] Single Sign-On (SSO) with Azure AD

---

## Support

For issues, questions, or contributions:
- 📧 Email: support@airauto.dev
- 🐛 GitHub Issues: [GitHub Repo](https://github.com/simpllyf/airauto-sa)
- 📖 Documentation: [Full Docs](https://docs.airauto.dev)

---

## License

© 2026 SimpllfyF. All rights reserved.

---

**Last Updated:** March 5, 2026  
**Built for:** South African SMEs  
**Tech:** Next.js 16 + Prisma + BullMQ + OpenAI  
**Status:** MVP Active Development
