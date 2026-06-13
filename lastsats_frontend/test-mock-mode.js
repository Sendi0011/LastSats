// Quick test script to verify mock mode functionality
const { fetchSbtcBalance, fetchStxBalance, IS_MOCK_MODE } = require('./src/lib/stacks.ts');

console.log('Testing LastSats mock mode...');
console.log('IS_MOCK_MODE:', IS_MOCK_MODE);

if (IS_MOCK_MODE) {
  console.log('✅ Mock mode is enabled - app will use mock data instead of real contract');
} else {
  console.log('❌ Mock mode is disabled - app will try to connect to real contract');
}

// Test mock balance functions
if (IS_MOCK_MODE) {
  const testAddress = 'SP1234567890ABCDEFGHIJKLMNOPQRSTUV';
  
  fetchSbtcBalance(testAddress).then(balance => {
    console.log('Mock sBTC balance:', balance);
  });
  
  fetchStxBalance(testAddress).then(balance => {
    console.log('Mock STX balance:', balance);
  });
}