module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts',
    ],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    testTimeout: 30000, // 30 seconds for LLM calls
    setupFiles: ['<rootDir>/jest.setup.js'], // Load environment variables
};
