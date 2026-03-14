// Lambda Configuration and Testing

// To test locally before deploying:
// 1. Install dependencies: npm install
// 2. Set environment variables in .env file
// 3. Run: node test-local.js

const { handler } = require("./index.js");

// Mock event
const event = {};

// Test the handler
console.log("🧪 Testing Lambda function locally...\n");

handler(event)
  .then((response) => {
    console.log("\n✅ Success!");
    console.log("Response:", JSON.stringify(response, null, 2));
  })
  .catch((error) => {
    console.error("\n❌ Error!");
    console.error(error);
    process.exit(1);
  });
