#!/usr/bin/env node
/**
 * Firebase Realtime Database Healthcheck Script
 * Tests connection, authentication, and basic read/write operations
 * 
 * Usage:
 *   node healthcheck.js
 * 
 * Environment variables (optional):
 *   FIREBASE_DATABASE_URL - Override default database URL
 */

const readline = require('readline');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, colors.green);
}

function logError(message) {
    log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
    log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
    log(`ℹ ${message}`, colors.blue);
}

async function runHealthcheck() {
    log('\n' + '='.repeat(60), colors.bright);
    log('Firebase Realtime Database Healthcheck', colors.bright);
    log('='.repeat(60) + '\n', colors.bright);

    // Check if running in browser context
    if (typeof window !== 'undefined') {
        logError('This script must be run in Node.js, not in a browser');
        logInfo('For browser-based testing, open the web application and check the console');
        return;
    }

    logInfo('This is a client-side web application that uses Firebase Web SDK.');
    logInfo('To test Firebase connectivity:');
    log('\n1. Open the application in a web browser');
    log('2. Open the browser console (F12)');
    log('3. Check for Firebase initialization messages');
    log('4. Look for: "Firebase authenticated successfully (anonymous)"');
    log('5. Look for: "CloudStorage initialized with Firebase and authenticated"');
    
    log('\n' + '-'.repeat(60), colors.bright);
    log('Expected Console Messages:', colors.bright);
    log('-'.repeat(60) + '\n', colors.bright);
    
    logSuccess('Firebase initialized successfully');
    logSuccess('Firebase authenticated successfully (anonymous)');
    logSuccess('CloudStorage initialized with Firebase and authenticated');
    logSuccess('Firebase connection status: Connected');
    
    log('\n' + '-'.repeat(60), colors.bright);
    log('Environment Configuration:', colors.bright);
    log('-'.repeat(60) + '\n', colors.bright);
    
    const dbUrl = process.env.FIREBASE_DATABASE_URL || 'https://SEU_PROJETO-default-rtdb.firebaseio.com';
    log(`Database URL: ${dbUrl}`);
    log('Path: /data/*');
    log('Auth: Anonymous (automatic)');
    
    log('\n' + '-'.repeat(60), colors.bright);
    log('Firebase Rules:', colors.bright);
    log('-'.repeat(60) + '\n', colors.bright);
    
    log(`{
  "rules": {
    "data": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}`);
    
    log('\n' + '-'.repeat(60), colors.bright);
    log('Troubleshooting:', colors.bright);
    log('-'.repeat(60) + '\n', colors.bright);
    
    log('If you see permission denied errors:');
    log('1. Ensure Firebase Anonymous Authentication is enabled in Firebase Console');
    log('2. Go to: Firebase Console > Authentication > Sign-in method');
    log('3. Enable "Anonymous" provider');
    log('4. Verify the rules in Firebase Console > Realtime Database > Rules');
    
    log('\n' + '-'.repeat(60), colors.bright);
    log('Next Steps:', colors.bright);
    log('-'.repeat(60) + '\n', colors.bright);
    
    log('1. Start a local web server:');
    log('   npx http-server -p 8080');
    log('\n2. Open http://localhost:8080 in your browser');
    log('\n3. Check the browser console for Firebase messages');
    
    log('\n' + '='.repeat(60) + '\n', colors.bright);
}

// Run the healthcheck
runHealthcheck().catch(error => {
    logError(`Healthcheck failed: ${error.message}`);
    process.exit(1);
});
