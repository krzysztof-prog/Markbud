#!/usr/bin/env node

/**
 * Configuration Validation Script for AKROBUD
 *
 * Validates:
 * - Port synchronization between API and Frontend
 * - CORS configuration (ALLOWED_ORIGINS)
 * - Required environment variables
 *
 * Usage:
 *   node scripts/validate-config.js
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Required environment variables per app
const REQUIRED_VARS = {
  api: [
    'API_PORT',
    'ALLOWED_ORIGINS',
    'DATABASE_URL',
  ],
  web: [
    'NEXT_PUBLIC_API_URL',
  ],
};

// Validation results
const results = {
  errors: [],
  warnings: [],
  success: [],
};

/**
 * Parse .env file into key-value object
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  });

  return env;
}

/**
 * Extract port from URL
 */
function extractPort(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
  } catch (e) {
    return null;
  }
}

/**
 * Check if port exists in ALLOWED_ORIGINS
 */
function checkCorsContainsPort(allowedOrigins, port) {
  const origins = allowedOrigins.split(',').map(o => o.trim());
  return origins.some(origin => {
    const originPort = extractPort(origin);
    return originPort === port;
  });
}

/**
 * Print colored message
 */
function print(type, message) {
  const icons = {
    error: '✗',
    warning: '⚠',
    success: '✓',
    info: 'ℹ',
  };

  const colorMap = {
    error: colors.red,
    warning: colors.yellow,
    success: colors.green,
    info: colors.cyan,
  };

  const icon = icons[type] || '';
  const color = colorMap[type] || '';

  console.log(`${color}${icon} ${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printHeader(title) {
  console.log(`\n${colors.bold}${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

/**
 * Main validation logic
 */
function validateConfig() {
  const rootDir = path.resolve(__dirname, '..');

  // File paths
  const apiEnvPath = path.join(rootDir, 'apps', 'api', '.env');
  const webEnvPath = path.join(rootDir, 'apps', 'web', '.env.local');

  printHeader('Configuration Validation');

  // 1. Check if files exist
  console.log('\n1. Checking environment files...');

  const apiEnv = parseEnvFile(apiEnvPath);
  if (!apiEnv) {
    results.errors.push('API .env file not found');
    print('error', `File not found: ${apiEnvPath}`);
  } else {
    results.success.push('API .env file exists');
    print('success', 'Found apps/api/.env');
  }

  const webEnv = parseEnvFile(webEnvPath);
  if (!webEnv) {
    results.errors.push('Frontend .env.local file not found');
    print('error', `File not found: ${webEnvPath}`);
  } else {
    results.success.push('Frontend .env.local file exists');
    print('success', 'Found apps/web/.env.local');
  }

  if (!apiEnv || !webEnv) {
    printSummary();
    process.exit(1);
  }

  // 2. Check required variables
  console.log('\n2. Checking required variables...');

  // API required vars
  REQUIRED_VARS.api.forEach(varName => {
    if (!apiEnv[varName] || apiEnv[varName].trim() === '') {
      results.errors.push(`Missing required API variable: ${varName}`);
      print('error', `Missing in apps/api/.env: ${varName}`);
    } else {
      results.success.push(`API variable set: ${varName}`);
      print('success', `${varName} = ${apiEnv[varName]}`);
    }
  });

  // Web required vars
  REQUIRED_VARS.web.forEach(varName => {
    if (!webEnv[varName] || webEnv[varName].trim() === '') {
      results.errors.push(`Missing required Frontend variable: ${varName}`);
      print('error', `Missing in apps/web/.env.local: ${varName}`);
    } else {
      results.success.push(`Frontend variable set: ${varName}`);
      print('success', `${varName} = ${webEnv[varName]}`);
    }
  });

  // 3. Port synchronization
  console.log('\n3. Checking port synchronization...');

  const apiPort = apiEnv.API_PORT;
  const frontendApiUrl = webEnv.NEXT_PUBLIC_API_URL;

  if (!apiPort) {
    results.errors.push('API_PORT not set');
    print('error', 'API_PORT is not configured');
  } else if (!frontendApiUrl) {
    results.errors.push('NEXT_PUBLIC_API_URL not set');
    print('error', 'NEXT_PUBLIC_API_URL is not configured');
  } else {
    const frontendPort = extractPort(frontendApiUrl);

    if (frontendPort === apiPort) {
      results.success.push('Ports are synchronized');
      print('success', `Ports match: API=${apiPort}, Frontend API URL port=${frontendPort}`);
    } else {
      results.errors.push('Port mismatch');
      print('error', `Port mismatch! API_PORT=${apiPort}, but NEXT_PUBLIC_API_URL uses port ${frontendPort}`);
      print('info', `  API .env: API_PORT=${apiPort}`);
      print('info', `  Web .env.local: NEXT_PUBLIC_API_URL=${frontendApiUrl}`);
    }
  }

  // 4. CORS configuration
  console.log('\n4. Checking CORS configuration...');

  const allowedOrigins = apiEnv.ALLOWED_ORIGINS;

  if (!allowedOrigins) {
    results.warnings.push('ALLOWED_ORIGINS not set');
    print('warning', 'ALLOWED_ORIGINS is not configured');
  } else {
    print('info', `ALLOWED_ORIGINS = ${allowedOrigins}`);

    // Extract frontend port from NEXT_PUBLIC_API_URL or assume common dev ports
    const commonDevPorts = ['3000', '3001', '3002', '3003', '3004', '3005', '3006'];
    const origins = allowedOrigins.split(',').map(o => o.trim());

    // Check if localhost origins exist
    const hasLocalhost = origins.some(o => o.includes('localhost') || o.includes('127.0.0.1'));

    if (!hasLocalhost) {
      results.warnings.push('No localhost origins in ALLOWED_ORIGINS');
      print('warning', 'ALLOWED_ORIGINS does not contain localhost origins');
    }

    // Check if common dev ports are covered
    const coveredPorts = commonDevPorts.filter(port => checkCorsContainsPort(allowedOrigins, port));

    if (coveredPorts.length > 0) {
      results.success.push(`CORS covers dev ports: ${coveredPorts.join(', ')}`);
      print('success', `CORS covers development ports: ${coveredPorts.join(', ')}`);
    } else {
      results.warnings.push('ALLOWED_ORIGINS may not cover common dev ports (3000-3006)');
      print('warning', 'ALLOWED_ORIGINS may not cover common development ports');
    }

    // Verify CORS contains the API URL hostname and port
    if (frontendApiUrl) {
      try {
        const apiUrlObj = new URL(frontendApiUrl);
        const frontendOrigin = `${apiUrlObj.protocol}//${apiUrlObj.hostname}`;
        const frontendPort = apiUrlObj.port || '80';

        // Check if any origin matches the frontend base
        const hasFrontendOrigin = origins.some(origin => {
          const matches = origin.includes(apiUrlObj.hostname);
          const hasPort = checkCorsContainsPort(allowedOrigins, frontendPort);
          return matches || hasPort;
        });

        if (!hasFrontendOrigin) {
          results.warnings.push('Frontend origin may not be in ALLOWED_ORIGINS');
          print('warning', `ALLOWED_ORIGINS may not include frontend origin (${frontendOrigin})`);
        }
      } catch (e) {
        // Invalid URL, already handled above
      }
    }
  }

  // 5. Additional checks
  console.log('\n5. Additional checks...');

  // Check DATABASE_URL format
  if (apiEnv.DATABASE_URL) {
    if (apiEnv.DATABASE_URL.startsWith('file:')) {
      results.success.push('DATABASE_URL uses file protocol (SQLite)');
      print('success', 'DATABASE_URL is valid (SQLite)');
    } else if (apiEnv.DATABASE_URL.startsWith('postgresql://') ||
               apiEnv.DATABASE_URL.startsWith('mysql://')) {
      results.success.push('DATABASE_URL uses valid protocol');
      print('success', 'DATABASE_URL is valid');
    } else {
      results.warnings.push('DATABASE_URL has unusual format');
      print('warning', 'DATABASE_URL format may be invalid');
    }
  }

  // Check if NODE_ENV is set (optional but recommended)
  if (apiEnv.NODE_ENV) {
    print('info', `API NODE_ENV = ${apiEnv.NODE_ENV}`);
  } else {
    print('info', 'NODE_ENV not set (will default to development)');
  }

  // Print summary
  printSummary();

  // Exit with appropriate code
  if (results.errors.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

/**
 * Print validation summary
 */
function printSummary() {
  printHeader('Summary');

  console.log(`\n${colors.green}✓ Success: ${results.success.length}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Warnings: ${results.warnings.length}${colors.reset}`);
  console.log(`${colors.red}✗ Errors: ${results.errors.length}${colors.reset}`);

  if (results.errors.length > 0) {
    console.log(`\n${colors.bold}${colors.red}Errors found:${colors.reset}`);
    results.errors.forEach(error => {
      console.log(`  ${colors.red}• ${error}${colors.reset}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log(`\n${colors.bold}${colors.yellow}Warnings:${colors.reset}`);
    results.warnings.forEach(warning => {
      console.log(`  ${colors.yellow}• ${warning}${colors.reset}`);
    });
  }

  if (results.errors.length === 0 && results.warnings.length === 0) {
    console.log(`\n${colors.bold}${colors.green}All checks passed! ✓${colors.reset}`);
  } else if (results.errors.length === 0) {
    console.log(`\n${colors.bold}${colors.yellow}Validation passed with warnings.${colors.reset}`);
  } else {
    console.log(`\n${colors.bold}${colors.red}Validation failed. Please fix errors above.${colors.reset}`);
  }

  console.log('');
}

// Run validation
validateConfig();
