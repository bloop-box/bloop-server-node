/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest',
    clearMocks: true,
    setupFilesAfterEnv: ['<rootDir>/test/setup-jest.ts'],
};
