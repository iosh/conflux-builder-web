process.env.GITHUB_TOKEN = "dummy_github_token_for_testing";
process.env.GITHUB_WEBHOOK_SECRET = "dummy_webhook_secret_for_testing";
process.env.DB_FILE_NAME = "test_db.sqlite";
process.env.LOG_LEVEL = "silent";
console.log('Test setup file loaded: Environment variables set.');
import '@testing-library/jest-dom';