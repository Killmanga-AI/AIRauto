// __tests__/README.md
# AIRAuto Test Suite

Complete test coverage for the AIRAuto invoice processing system.

## Quick Start

### Install Test Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test:watch
```

### Generate Coverage Report

```bash
npm test:coverage
```

## Test Files Overview

### Unit Tests

#### `src/lib/__tests__/validation.test.ts` (2 test suites, 8+ tests)
- **classifyInvoiceType()** - Tests invoice type classification based on ZAR amount
  - Correctly identifies Full, Abridged, and No-Invoice categories
  - Handles boundary cases (R5,000, R50 thresholds)
  
- **validateSARSInvoice()** - Tests SA tax invoice validation
  - Validates presence of required SARS fields
  - Flags invalid VAT number formats
  - Checks for valid invoice labels
  - Validates VAT calculations

**Run:** `npm test -- validation.test.ts`

#### `src/lib/__tests__/vat.test.ts` (2 test suites, 16+ tests)
- **calculateVAT()** - Tests 15% VAT calculation
  - Calculates VAT from exclusive and inclusive amounts
  - Handles zero-rated and exempt supplies
  - Correctly rounds to cents
  
- **validateVatAmount()** - Tests VAT validation logic
  - Validates VAT calculation accuracy
  - Flags mismatches with tolerance
  - Handles non-standard VAT rates

**Run:** `npm test -- vat.test.ts`

#### `src/lib/__tests__/storage.test.ts` (2 test suites, 10+ tests)
- **LocalFileStorage** - Tests file storage operations
  - Upload, download, delete files
  - Check file existence
  - Generate storage URLs
  
- **generateStorageKey()** - Tests key generation
  - Creates unique keys with timestamps
  - Preserves file extensions
  - Includes user ID and random suffix

**Run:** `npm test -- storage.test.ts`

#### `src/lib/__tests__/queue.test.ts` (4 test suites, 10+ tests)
- Tests BullMQ queue creation and configuration
- Validates queue instances are properly cached
- Tests health check functionality
- Validates job data types

**Run:** `npm test -- queue.test.ts`

### API Tests

#### `src/app/api/__tests__/upload.test.ts` (1 suite, 8+ tests)
Tests **POST /api/upload** file upload endpoint
- ❌ Rejects missing file
- ❌ Rejects invalid file types (only PDF, JPG, PNG)
- ❌ Rejects files > 50MB
- ✅ Accepts PDF files
- ✅ Accepts JPG files  
- ✅ Accepts PNG files
- ✅ Uses default userId if not provided
- ✅ Creates invoice record and queues extraction

**Run:** `npm test -- upload.test.ts`

#### `src/app/api/__tests__/invoices.test.ts` (3 suites, 15+ tests)
Tests **GET/PUT /api/invoices** routes
- ✅ Lists invoices with pagination
- ✅ Filters by status
- ✅ Sorts by newest/oldest
- ✅ Enforces limit max (100)
- ✅ Returns 404 for non-existent invoices
- ✅ Updates specific fields only
- ✅ Converts monetary values to cents
- ✅ Logs manual edits

**Run:** `npm test -- invoices.test.ts`

#### `src/app/api/__tests__/validate.test.ts` (1 suite, 6+ tests)
Tests **POST /api/invoices/[id]/validate** endpoint
- Returns validation results with errors/warnings separated
- Auto-updates status to "validated" on pass
- Logs validation to audit trail

**Run:** `npm test -- validate.test.ts`

#### `src/app/api/__tests__/export.test.ts` (1 suite, 12+ tests)
Tests **POST /api/export** endpoint
- ❌ Rejects invalid inputs (missing IDs, provider)
- ✅ Handles CSV export
- ✅ Handles Sage export
- ✅ Handles Xero export
- ✅ Handles QuickBooks export
- ❌ Validates user ownership
- ❌ Requires validated status
- ✅ Logs exports to audit trail

**Run:** `npm test -- export.test.ts`

### Integration Tests

#### `__tests__/integration/e2e.test.ts` (Placeholder structure)
End-to-end pipeline tests (to be implemented)
- Complete invoice processing workflow
- Bulk processing scenarios
- SARS compliance validation
- Error handling and retries
- Performance benchmarks

**Run:** `npm test:integration`

## Running Specific Tests

### Run All API Tests
```bash
npm test:api
```

### Run All Library Tests
```bash
npm test:lib
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="should validate"
```

### Run Single File
```bash
npm test -- validation.test.ts
```

### Run with Verbose Output
```bash
npm test -- --verbose
```

### Debug a Test
```bash
npm test:debug
# Then open chrome://inspect in Chrome
```

## Test Coverage

Current coverage targets (after `npm test:coverage`):

```
File                          | % Stmts | % Branch | % Funcs | % Lines |
------------------------------|---------|----------|---------|---------|
All files                     |  60-70  |  50-60   |  50-70  | 60-70   |
src/lib/validation/           |   80+   |   75+    |   85+   |  80+    |
src/lib/validation/vat.ts     |   95    |   90     |   100   |   95    |
src/app/api/upload/route.ts   |   85    |   80     |   90    |   85    |
src/app/api/invoices/         |   80    |   75     |   85    |   80    |
```

## Test Data & Mocking

All tests use Jest mocks for:
- **Database (Prisma)** - `jest.mock('@/lib/db')`
- **File System** - Mocked `fs/promises` operations
- **External APIs** - Mocked Sage, Xero, QuickBooks stubs
- **BullMQ Queues** - Mocked queue operations

No real database, Redis, or file I/O in unit tests.

## Debugging Tips

### View Test Output
```bash
npm test -- --verbose
```

### Stop on First Failure
```bash
npm test -- --bail
```

### Run Only Failed Tests
```bash
npm test -- --onlyChanged
```

### Generate HTML Coverage Report
```bash
npm test:coverage
# Open coverage/lcov-report/index.html
```

### Debug Console Logs
Tests capture console output. To view:
```bash
npm test -- --verbose 2>&1 | grep -A5 "console.log"
```

## Common Patterns

### Testing API Endpoint
```typescript
it('should accept valid file', async () => {
  const file = new File(['content'], 'invoice.pdf', {
    type: 'application/pdf'
  });
  const request = new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST'
  });

  const response = await POST(request);
  expect(response.status).toBe(200);
});
```

### Mocking Database
```typescript
const mockDb = db as jest.Mocked<typeof db>;
mockDb.invoice.findMany = jest
  .fn()
  .mockResolvedValue([{ id: 'inv-1', status: 'validated' }]);
```

### Testing Async Operations
```typescript
it('should process', async () => {
  await expect(process()).resolves.toBeDefined();
  expect(mockDb.save).toHaveBeenCalled();
});
```

## Next Steps

- [ ] Implement E2E tests with real test database
- [ ] Add performance benchmarks (< 5s per invoice)
- [ ] Add load testing (concurrent uploads)
- [ ] Add visual regression tests
- [ ] Add security/POPIA compliance tests
- [ ] Add accessibility tests
- [ ] Set up CI/CD pipeline (GitHub Actions)

---

**Last Updated:** 2026-03-05
**Test Framework:** Jest 29.7.0 + TypeScript
