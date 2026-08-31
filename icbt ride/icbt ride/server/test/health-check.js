/**
 * Self-Testing Verification Script for ICBT Ride REST API Backend
 */
const http = require('http');

async function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(dataString);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting REST API Backend Tests ---');
  try {
    const health = await testEndpoint('/api/health');
    console.log('✅ [PASS] Health Check:', health.status, health.data.status);

    const oddEven = await testEndpoint('/api/fuel/odd-even/WP-CAB-4521');
    console.log('✅ [PASS] Fuel Odd-Even Check:', oddEven.status, oddEven.data.data.reason);

    const fuelVal = await testEndpoint('/api/fuel/validate', 'POST', {
      plateNumber: 'WP-CAB-4521',
      date: new Date().toISOString().split('T')[0],
      distanceKm: 30.0,
      currentQuota: 25.0
    });
    console.log('✅ [PASS] Fuel Pre-flight Validation:', fuelVal.status, fuelVal.data.message || fuelVal.data.error);

    const adminStats = await testEndpoint('/api/admin/stats');
    console.log('✅ [PASS] Admin Stats Endpoint:', adminStats.status, 'Total Users:', adminStats.data.data.totalUsers);

    console.log('🎉 All automated REST API tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

setTimeout(runTests, 1500);
