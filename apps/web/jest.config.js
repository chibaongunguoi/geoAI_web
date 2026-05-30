const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./"
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/e2e/"],
  transformIgnorePatterns: [
    "/node_modules/(?!(react-leaflet|@react-leaflet|leaflet)/)"
  ]
};

module.exports = createJestConfig(customJestConfig);
