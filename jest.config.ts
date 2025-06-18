import { join } from 'path';
import { JestConfigWithTsJest } from 'ts-jest/dist/types';

const config: JestConfigWithTsJest = {
  globalSetup: join(__dirname, 'test.setup.ts'),
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          outDir: './dist-test',
          rootDir: './',
        },
      },
    ],
  },
};

export default config;
