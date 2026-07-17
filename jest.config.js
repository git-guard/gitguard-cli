module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/lib/config.ts',
    'src/lib/file-scanner.ts',
    'src/lib/repo-detector.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 30,
      lines: 20,
      statements: 20
    }
  }
};
