/**
 * Unit tests for the shared logic (pure TS, node environment).
 * react-native is replaced by __mocks__/react-native.js; components are not
 * rendered here (the apps cover them with their own RN preset).
 *
 * testing/jest/ holds mocks for the apps' tests (MMKV, react-native-fs, common
 * native modules). It is not part of the published package yet; to share it,
 * add "testing" to "files" in package.json and import from
 * '@beitissieshapiro/issie-shared/testing/jest/...'.
 */
module.exports = {
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            diagnostics: false,
            tsconfig: { jsx: 'react-jsx', esModuleInterop: true, module: 'CommonJS', target: 'ES2020' },
        }],
    },
    globals: { __DEV__: false },
    collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
