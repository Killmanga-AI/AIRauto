// jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: {},
    pathname: '',
  }),
}))

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/airauto_test'
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'
process.env.OPENAI_API_KEY = 'test-key'
process.env.STORAGE_PROVIDER = 'local'
process.env.STORAGE_PATH = './test-uploads'
