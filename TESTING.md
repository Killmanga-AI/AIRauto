// TESTING.md
# AIRAuto Testing Guide

## Overview

This document describes the comprehensive test suite for AIRAuto, covering unit tests, integration tests, and E2E scenarios.

## Test Structure

```
__tests__/
├── integration/
│   └── e2e.test.ts                 # End-to-end pipeline tests
src/
├── app/api/__tests__/
│   ├── upload.test.ts              # File upload API tests
│   ├── invoices.test.ts            # Invoices list/detail/update tests
│   ├── validate.test.ts            # Validation endpoint tests
│   └── export.test.ts              # Export endpoint tests
└── lib/__tests__/
    ├── validation.test.ts          # SARS validation rules
    ├── vat.test.ts                 # VAT calculation & validation
    ├── storage.test.ts             # File storage abstraction
    └── queue.test.ts               # BullMQ queue operations
```

## Running Tests

### Install Dependencies

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom ts-jest
npm install --save-dev supertest @types/jest
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
npm test -- validation.test.ts
npm test -- upload.test.ts
npm test -- --testPathPattern="api"
```

### Run with Coverage Report

```bash
npm test -- --coverage
```

### Run in Watch Mode

```bash
npm test -- --watch
```

### Run Single Test

```bash
npm test -- --testNamePattern="should validate correct VAT calculation"
```

## Test Categories

### 1. Unit Tests: Validation Logic (`src/lib/__tests__/validation.test.ts`)

Tests the SARS invoice validation engine.

**Coverage:**
- ✅ Invoice type classification (Full/Abridged/No Invoice)
- ✅ Required field validation
- ✅ VAT number format validation
- ✅ Invoice label detection
- ✅ Date format validation
- ✅ Boundary cases (R5,000, R50 thresholds)

**Example:**
```typescript
expect(classifyInvoiceType(5001)).toBe('full');
expect(classifyInvoiceType(2500)).toBe('abridged');
expect(classifyInvoiceType(50)).toBe('no_invoice_required');
```

### 2. Unit Tests: VAT Calculation (`src/lib/__tests__/vat.test.ts`)

Tests 15% VAT calculation and validation.

**Coverage:**
- ✅ Calculate VAT from exclusive amount
- ✅ Extract VAT from inclusive amount
- ✅ Handle zero-rated supplies
- ✅ Handle exempt supplies
- ✅ Round to cents correctly
- ✅ Validate VAT amount matches expected calculation
- ✅ Flag VAT mismatches with tolerance

**Example:**
```typescript
const result = calculateVAT(1000, 'exclusive');
expect(result.vat).toBe(150);       // 15% of 1000
expect(result.total).toBe(1150);
```

### 3. Unit Tests: Storage (`src/lib/__tests__/storage.test.ts`)

Tests file storage abstraction layer.

**Coverage:**
- ✅ Upload file to storage
- ✅ Download file from storage
- ✅ Check if file exists
- ✅ Delete file
- ✅ Generate unique storage keys
- ✅ Handle file not found gracefully

**Example:**
```typescript
const key = generateStorageKey('user-1', 'invoice.pdf');
// Returns: user-1/timestamp-random.pdf

const exists = await storage.fileExists(key);
expect(exists).toBe(true);
```

### 4. Unit Tests: Queue (`src/lib/__tests__/queue.test.ts`)

Tests BullMQ queue setup and configuration.

**Coverage:**
- ✅ Create extraction queue
- ✅ Create export queue
- ✅ Create validation queue
- ✅ Queue for same instance on multiple calls
- ✅ Queue health check
- ✅ Job data type validation

**Example:**
```typescript
const queue = getExtractionQueue();
const job = await queue.add('extract', {
  invoiceId: 'inv-1',
  userId: 'user-1',
  filePath: 'path/to/file.pdf',
  fileName: 'invoice.pdf',
  fileType: 'pdf',
});
```

### 5. API Tests: Upload (`src/app/api/__tests__/upload.test.ts`)

Tests POST `/api/upload` file upload endpoint.

**Coverage:**
- ✅ Reject request without file
- ✅ Reject invalid file types (only PDF, JPG, PNG allowed)
- ✅ Reject files > 50MB
- ✅ Accept valid PDF files
- ✅ Accept valid JPG files
- ✅ Accept valid PNG files
- ✅ Use default userId if not provided
- ✅ Create invoice record in database
- ✅ Queue extraction job
- ✅ Log to audit trail

**Example Test:**
```typescript
it('should accept valid PDF file', async () => {
  const file = new File(['PDF content'], 'invoice.pdf', {
    type: 'application/pdf'
  });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', 'user-1');

  const response = await POST(mockRequest);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.invoiceId).toBeDefined();
  expect(json.jobId).toBeDefined();
});
```

### 6. API Tests: Invoices (`src/app/api/__tests__/invoices.test.ts`)

Tests GET/PUT `/api/invoices` and `/api/invoices/[id]` endpoints.

**Coverage:**
- ✅ List invoices with pagination
- ✅ Filter by status
- ✅ Sort by oldest/newest
- ✅ Enforce limit max of 100
- ✅ Require userId parameter
- ✅ Get single invoice details
- ✅ Return 404 for non-existent invoice
- ✅ Update specific invoice fields
- ✅ Only allow whitelisted fields for update
- ✅ Convert monetary values to cents
- ✅ Log manual edits to audit trail

**Example:**
```typescript
it('should list invoices with pagination', async () => {
  const request = new NextRequest(
    'http://localhost:3000/api/invoices?userId=user-1&page=1&limit=20'
  );
  const response = await GET(request);
  const json = await response.json();

  expect(json.invoices).toBeDefined();
  expect(json.total).toBeDefined();
  expect(json.page).toBe(1);
  expect(json.pages).toBeLessThanOrEqual(Math.ceil(json.total / 20));
});
```

### 7. API Tests: Validation (`src/app/api/__tests__/validate.test.ts`)

Tests POST `/api/invoices/[id]/validate` validation endpoint.

**Coverage:**
- ✅ Return 404 for non-existent invoice
- ✅ Validate invoice and return results
- ✅ Separate errors and warnings
- ✅ Auto-update status to validated on pass
- ✅ Skip status update if already validated
- ✅ Log validation to audit trail

**Example:**
```typescript
it('should validate invoice and return results', async () => {
  const response = await POST(request, { params: { id: 'inv-1' } });
  const json = await response.json();

  expect(json.valid).toBeDefined();
  expect(json.validationResults).toBeArray();
  expect(json.errors).toBeArray();
  expect(json.warnings).toBeArray();
});
```

### 8. API Tests: Export (`src/app/api/__tests__/export.test.ts`)

Tests POST `/api/export` export endpoint.

**Coverage:**
- ✅ Reject request without invoiceIds
- ✅ Reject empty invoiceIds array
- ✅ Reject request without provider
- ✅ Reject invalid provider
- ✅ Handle CSV export
- ✅ Handle Sage export
- ✅ Handle Xero export
- ✅ Handle QuickBooks export
- ✅ Reject export if user doesn't own invoices
- ✅ Reject export if invoice not validated
- ✅ Log export action to audit trail
- ✅ Include invoice count in response

**Example:**
```typescript
it('should handle CSV export', async () => {
  const request = new NextRequest('http://localhost:3000/api/export', {
    method: 'POST',
    body: JSON.stringify({
      invoiceIds: ['inv-1', 'inv-2'],
      provider: 'csv'
    })
  });

  const response = await POST(request);

  expect(response.headers.get('Content-Type')).toContain('text/csv');
  expect(response.headers.get('Content-Disposition')).toContain('.csv');
});
```

### 9. Integration Tests: E2E (`__tests__/integration/e2e.test.ts`)

End-to-end pipeline tests covering complete workflows.

**Planned Coverage:**
- Complete invoice processing pipeline (upload → extract → validate → export)
- Bulk invoice processing
- SARS compliance scenarios
- Error handling and retries
- Performance benchmarks

*Note: These are currently placeholder tests with `.todo()` to be implemented.*

## Test Coverage Targets

### Current Coverage Baseline

After running all tests:

```
Statements   : 60-70% | Function args: 50%
Branches     : 50-60% | Function defs: 50%
Lines        : 60-70% | Line numbers: 50%
```

### Target Coverage

```
Statements   : 80%+
Branches     : 75%+
Lines        : 80%+
Statements   : 80%+
```

## Mocking Strategy

### Database (Prisma)

Tests mock `@/lib/db` using Jest's `jest.mock()`:

```typescript
jest.mock('@/lib/db');

const mockDb = db as jest.Mocked<typeof db>;
mockDb.invoice.findMany = jest.fn().mockResolvedValue([...]);
```

### Storage

File storage is mocked with jest to avoid actual file I/O:

```typescript
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
  }
}));
```

### External APIs

External services (Sage, Xero, OpenAI) are mocked:

```typescript
jest.mock('@/lib/export/sage');
const mockSage = exportToSage as jest.MockedFunction<typeof exportToSage>;
mockSage.mockResolvedValue({ success: true, ... });
```

### Redis/BullMQ

Queue operations are mocked:

```typescript
jest.mock('bullmq');
const mockQueue = Queue as jest.MockedClass<typeof Queue>;
```

## Common Test Patterns

### Testing API Route with Request

```typescript
const request = new NextRequest('http://localhost:3000/api/endpoint', {
  method: 'POST',
  body: JSON.stringify({ data: 'value' }),
});

const response = await POST(request);
const json = await response.json();

expect(response.status).toBe(200);
expect(json.field).toBe('value');
```

### Mocking Database Calls

```typescript
const mockDb = db as jest.Mocked<typeof db>;
mockDb.invoice.findMany = jest.fn().mockResolvedValue([
  { id: 'inv-1', status: 'validated' },
  { id: 'inv-2', status: 'needs_review' },
]);

const invoices = await db.invoice.findMany({ where: { userId: 'user-1' } });
expect(invoices.length).toBe(2);
```

### Testing Async Operations

```typescript
it('should process invoice', async () => {
  await expect(processInvoice('inv-1')).resolves.toBeDefined();
  // or
  expect(response.status).toBe(200);
});
```

## Debugging Tests

### Enable Verbose Logging

```bash
npm test -- --verbose
```

### Run Specific Test File

```bash
npm test -- src/lib/__tests__/validation.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="should validate"
```

### Debug in Chrome DevTools

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
# Then open chrome://inspect in Chrome
```

## Known Issues & Limitations

1. **Redis Mock**: Currently using basic Jest mocks. For integration tests, consider:
   - `redis-mock` package
   - `testcontainers` for real Redis container
   - Jest setup with actual Redis in CI

2. **Database Mock**: Using Jest mocks only. For full integration:
   - Use `@prisma/client` with test database
   - Run migrations before E2E tests
   - Clean data between tests

3. **File System Mock**: Currently mocking `fs/promises`. For real testing:
   - Use actual temp directories
   - Clean up after each test
   - Test with real file types

## Next Steps for Test Expansion

- [ ] Add E2E tests with real database (test DB container)
- [ ] Add performance benchmarks
- [ ] Add load testing (k6 or Artillery)
- [ ] Add snapshot testing for extracted invoice formats
- [ ] Add visual regression tests for UI components
- [ ] Add security tests (POPIA compliance, data leakage)
- [ ] Add accessibility tests (a11y)
- [ ] Add integration tests with real Sage/Xero sandbox APIs

---

**Last Updated:** 2026-03-05
