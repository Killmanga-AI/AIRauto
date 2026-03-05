// Jest manual mock for @prisma/client used in tests.
// Provides a lightweight PrismaClient stub that avoids loading native engines.

export class PrismaClient {
  // Minimal shapes used in code under test; tests usually mock these via jest.
  invoice: Record<string, unknown>;
  user: Record<string, unknown>;
  auditLog: Record<string, unknown>;
  lineItem: Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(..._args: unknown[]) {
    this.invoice = {};
    this.user = {};
    this.auditLog = {};
    this.lineItem = {};
  }

  // Stub disconnect method for completeness
  async $disconnect(): Promise<void> {
    return;
  }
}

