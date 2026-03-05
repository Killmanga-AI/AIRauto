// Jest manual mock for bullmq used in queue tests.

export const Queue = jest.fn().mockImplementation((_name: string, _options: unknown) => {
  return {
    add: jest.fn(),
    close: jest.fn(),
  };
});

export class Worker<T = unknown> {
  constructor(
    _name: string,
    _processor: (job: { data: T }) => Promise<unknown> | unknown,
    _options?: unknown,
  ) {}

  on(_event: string, _handler: (...args: unknown[]) => void): void {
    // no-op for tests
  }
}

export class QueueEvents {
  constructor(_name: string, _options?: unknown) {}

  on(_event: string, _handler: (...args: unknown[]) => void): void {
    // no-op for tests
  }
}

