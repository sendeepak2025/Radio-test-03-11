/**
 * Complete System Health Check (No dependencies)
 */

const http = require('http');

function checkService(name, host, port, path = '/') {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      resolve({
        name,
        status: 'running',
        statusCode: res.statusCode,
        url: `http://${host}:${port}${path}`
      });
    });

    req.on('error', (error) => {
      resolve({
        name,
        status: 'down',
        error: error.code || error.message,
        url: `http://${host}:${port}${path}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        status: 'down',
        error: 'TIMEOUT',
        url: `http://${host}:${port}${path}`
      });
    });

    req.end();
  });
}

async function checkAllServices() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          COMPLETE SYSTEM HEALTH CHECK                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const services = [
    { name: 'Backend Server', host: 'localhost', port: 8001, path: '/' },
    { name: 'Backend Health', host: 'localhost', port: 8001, path: '/health' },
    { name: 'Frontend Viewer', host: 'localhost', port: 3011, path: '/' },
    { name: 'AI Services', host: 'localhost', port: 8001, path: '/api/ai/status' }
  ];

  console.log('Checking services...\n');

  const results = [];

  for (const service of services) {
    const result = await checkService(service.name, service.host, service.port, service.path);
    results.push(result);
    
    const icon = result.status === 'running' ? '✅' : '❌';
    const status = result.status === 'running' ? `RUNNING (${result.statusCode})` : `DOWN (${result.error})`;
    console.log(`${icon} ${service.name.padEnd(20)} ${status}`);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const running = results.filter(r => r.status === 'running').length;
  const total = results.length;

  console.log(`Services Running: ${running}/${total}\n`);

  if (running < total) {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              HOW TO START SERVICES                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const backendDown = results.find(r => r.name === 'Backend Server' && r.status === 'down');
    const frontendDown = results.find(r => r.name === 'Frontend Viewer' && r.status === 'down');

    if (backendDown) {
      console.log('❌ Backend Server is DOWN');
      console.log('   To start:');
      console.log('   1. Open terminal');
      console.log('   2. cd server');
      console.log('   3. npm start\n');
    }

    if (frontendDown) {
      console.log('❌ Frontend Viewer is DOWN');
      console.log('   To start:');
      console.log('   1. Open NEW terminal');
      console.log('   2. cd viewer');
      console.log('   3. npm start\n');
    }

    console.log('After starting, run this check again:\n');
    console.log('   node check-all-services.js\n');

  } else {
    console.log('🎉 ALL SERVICES ARE RUNNING!\n');
    console.log('Access your application:');
    console.log('  ➜ Frontend:    http://localhost:3011');
    console.log('  ➜ Backend:     http://localhost:8001');
    console.log('  ➜ AI Analysis: http://localhost:3011/ai-analysis\n');
    console.log('✅ System is ready to use!\n');
  }

  return running === total;
}

// Run check
checkAllServices()
  .then(allRunning => {
    process.exit(allRunning ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });
