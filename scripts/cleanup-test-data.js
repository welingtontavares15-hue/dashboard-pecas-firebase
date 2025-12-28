#!/usr/bin/env node
/**
 * Firebase Realtime Database Test Data Cleanup Script
 * 
 * This script removes test data from Firebase Realtime Database while preserving production data.
 * 
 * Features:
 * - Dry-run mode by default (lists what will be deleted)
 * - Requires --apply flag to actually delete data
 * - Supports environment variables for configuration
 * - Uses firebase-admin SDK (Node.js only)
 * 
 * Usage:
 *   node scripts/cleanup-test-data.js                    # Dry-run mode
 *   node scripts/cleanup-test-data.js --apply            # Actually delete data
 * 
 * Environment Variables:
 *   DATABASE_URL or URL_DO_BANCO_DE_DADOS_FIREBASE - Firebase RTDB URL
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account key JSON
 *   FIREBASE_SERVICE_ACCOUNT_BASE64 - Base64-encoded service account key
 * 
 * Test Data Identification Heuristics:
 * - source === "test"
 * - isTest === true
 * - createdBy === "healthcheck"
 * - id/numero contains "TEST"
 * - Recent test window (last 72 hours with test markers)
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const APPLY_MODE = args.includes('--apply');
const DRY_RUN = !APPLY_MODE;

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
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

function logData(message) {
    log(message, colors.cyan);
}

/**
 * Get Firebase configuration from environment
 */
function getFirebaseConfig() {
    // Database URL
    const databaseURL = process.env.DATABASE_URL || 
                       process.env.URL_DO_BANCO_DE_DADOS_FIREBASE ||
                       'https://solicitacoes-de-pecas-default-rtdb.firebaseio.com';
    
    // Service Account credentials
    let credential = null;
    
    // Option 1: GOOGLE_APPLICATION_CREDENTIALS (path to JSON file)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (fs.existsSync(credPath)) {
            logInfo(`Using service account from: ${credPath}`);
            credential = credPath;
        } else {
            logError(`Service account file not found: ${credPath}`);
            process.exit(1);
        }
    }
    // Option 2: FIREBASE_SERVICE_ACCOUNT_BASE64 (base64-encoded JSON)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        try {
            const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
            credential = JSON.parse(decoded);
            logInfo('Using service account from FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable');
        } catch (e) {
            logError(`Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64: ${e.message}`);
            process.exit(1);
        }
    }
    // Option 3: Look for serviceAccountKey.json in project root (local development)
    else {
        const localKeyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
        if (fs.existsSync(localKeyPath)) {
            logWarning('Using local serviceAccountKey.json (NOT recommended for production)');
            credential = localKeyPath;
        } else {
            logError('No Firebase credentials found!');
            logError('Please set one of:');
            logError('  - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)');
            logError('  - FIREBASE_SERVICE_ACCOUNT_BASE64 (base64-encoded service account JSON)');
            logError('  - Place serviceAccountKey.json in project root (dev only)');
            process.exit(1);
        }
    }
    
    return { databaseURL, credential };
}

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase(config) {
    let admin;
    try {
        admin = require('firebase-admin');
    } catch (e) {
        logError('firebase-admin package not found!');
        logError('Please install it: npm install firebase-admin');
        process.exit(1);
    }
    
    // Check if already initialized
    if (admin.apps.length > 0) {
        logInfo('Firebase Admin already initialized');
        return admin;
    }
    
    try {
        let credentialObj;
        if (typeof config.credential === 'string') {
            credentialObj = admin.credential.cert(config.credential);
        } else {
            credentialObj = admin.credential.cert(config.credential);
        }
        
        admin.initializeApp({
            credential: credentialObj,
            databaseURL: config.databaseURL
        });
        
        logSuccess('Firebase Admin initialized successfully');
        return admin;
    } catch (e) {
        logError(`Failed to initialize Firebase Admin: ${e.message}`);
        process.exit(1);
    }
}

/**
 * Check if a solicitation is a test entry
 */
function isTestSolicitation(sol, testWindowStartTime) {
    if (!sol || typeof sol !== 'object') {
        return false;
    }
    
    // Explicit test markers
    if (sol.source === 'test' || sol.isTest === true) {
        return true;
    }
    
    if (sol.createdBy === 'healthcheck') {
        return true;
    }
    
    // Check id/numero for TEST pattern
    if (sol.id && typeof sol.id === 'string' && sol.id.toUpperCase().includes('TEST')) {
        return true;
    }
    
    if (sol.numero && typeof sol.numero === 'string' && sol.numero.toUpperCase().includes('TEST')) {
        return true;
    }
    
    // Recent test window check (last 72 hours)
    // Only flag as test if created in test window AND has suspicious markers
    if (sol.createdAt && typeof sol.createdAt === 'number') {
        if (sol.createdAt > testWindowStartTime) {
            // If in test window, check for suspicious patterns
            // e.g., very generic data, rapid creation, etc.
            const suspiciousMarkers = [
                sol.tecnico === 'Test Technician',
                sol.descricao && sol.descricao.toLowerCase().includes('teste'),
                sol.observacoes && sol.observacoes.toLowerCase().includes('test'),
            ];
            
            if (suspiciousMarkers.filter(Boolean).length >= 1) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Check if an export file is a test artifact
 */
function isTestExportFile(exportFile, testWindowStartTime) {
    if (!exportFile || typeof exportFile !== 'object') {
        return false;
    }
    
    // Check filename for test patterns
    if (exportFile.filename && typeof exportFile.filename === 'string') {
        const filename = exportFile.filename.toLowerCase();
        if (filename.includes('test') || filename.includes('healthcheck')) {
            return true;
        }
    }
    
    // Check if created during test window
    if (exportFile.createdAt && typeof exportFile.createdAt === 'number') {
        if (exportFile.createdAt > testWindowStartTime) {
            return true;
        }
    }
    
    return false;
}

/**
 * Scan for test data
 */
async function scanForTestData(admin) {
    const db = admin.database();
    const results = {
        testSolicitations: [],
        healthcheckData: null,
        testExportFiles: []
    };
    
    // Test window: last 72 hours
    const testWindowStartTime = Date.now() - (72 * 60 * 60 * 1000);
    
    logInfo('Scanning for test data...');
    log('');
    
    // 1. Check for test solicitations
    log('Checking /data/diversey_solicitacoes...', colors.bright);
    try {
        const solSnapshot = await db.ref('data/diversey_solicitacoes').once('value');
        const solicitations = solSnapshot.val();
        
        if (solicitations && solicitations.data && Array.isArray(solicitations.data)) {
            for (let i = 0; i < solicitations.data.length; i++) {
                const sol = solicitations.data[i];
                if (isTestSolicitation(sol, testWindowStartTime)) {
                    results.testSolicitations.push({
                        index: i,
                        id: sol.id || sol.numero || 'unknown',
                        data: sol
                    });
                }
            }
        }
        
        if (results.testSolicitations.length > 0) {
            logWarning(`Found ${results.testSolicitations.length} test solicitation(s)`);
            results.testSolicitations.forEach(item => {
                logData(`  - Index ${item.index}: ${item.id}`);
            });
        } else {
            logSuccess('No test solicitations found');
        }
    } catch (e) {
        logWarning(`Could not check solicitations: ${e.message}`);
    }
    
    log('');
    
    // 2. Check for healthcheck data
    log('Checking /data/healthcheck...', colors.bright);
    try {
        const healthSnapshot = await db.ref('data/healthcheck').once('value');
        if (healthSnapshot.exists()) {
            results.healthcheckData = healthSnapshot.val();
            logWarning('Found healthcheck data node');
            logData(`  - Keys: ${Object.keys(results.healthcheckData).join(', ')}`);
        } else {
            logSuccess('No healthcheck data found');
        }
    } catch (e) {
        logWarning(`Could not check healthcheck data: ${e.message}`);
    }
    
    log('');
    
    // 3. Check for test export files
    log('Checking /data/diversey_export_files...', colors.bright);
    try {
        const exportSnapshot = await db.ref('data/diversey_export_files').once('value');
        const exportFiles = exportSnapshot.val();
        
        if (exportFiles && exportFiles.data && Array.isArray(exportFiles.data)) {
            for (let i = 0; i < exportFiles.data.length; i++) {
                const exportFile = exportFiles.data[i];
                if (isTestExportFile(exportFile, testWindowStartTime)) {
                    results.testExportFiles.push({
                        index: i,
                        filename: exportFile.filename || 'unknown',
                        data: exportFile
                    });
                }
            }
        }
        
        if (results.testExportFiles.length > 0) {
            logWarning(`Found ${results.testExportFiles.length} test export file(s)`);
            results.testExportFiles.forEach(item => {
                logData(`  - Index ${item.index}: ${item.filename}`);
            });
        } else {
            logSuccess('No test export files found');
        }
    } catch (e) {
        logWarning(`Could not check export files: ${e.message}`);
    }
    
    log('');
    
    return results;
}

/**
 * Clean test data (only in apply mode)
 */
async function cleanTestData(admin, scanResults) {
    const db = admin.database();
    let deletedCount = 0;
    
    log('');
    log('='.repeat(60), colors.bright);
    log('CLEANING TEST DATA', colors.bright);
    log('='.repeat(60), colors.bright);
    log('');
    
    // 1. Remove test solicitations
    if (scanResults.testSolicitations.length > 0) {
        log('Removing test solicitations...', colors.bright);
        try {
            const solSnapshot = await db.ref('data/diversey_solicitacoes').once('value');
            const solicitations = solSnapshot.val();
            
            if (solicitations && solicitations.data && Array.isArray(solicitations.data)) {
                // Filter out test solicitations
                const testIds = new Set(scanResults.testSolicitations.map(t => t.id));
                const cleanedSolicitations = solicitations.data.filter(sol => {
                    const solId = sol.id || sol.numero || 'unknown';
                    return !testIds.has(solId);
                });
                
                // Update with cleaned data
                await db.ref('data/diversey_solicitacoes/data').set(cleanedSolicitations);
                
                const removed = solicitations.data.length - cleanedSolicitations.length;
                logSuccess(`Removed ${removed} test solicitation(s)`);
                deletedCount += removed;
            }
        } catch (e) {
            logError(`Failed to remove test solicitations: ${e.message}`);
        }
        log('');
    }
    
    // 2. Remove healthcheck data
    if (scanResults.healthcheckData) {
        log('Removing healthcheck data...', colors.bright);
        try {
            await db.ref('data/healthcheck').remove();
            logSuccess('Removed healthcheck data node');
            deletedCount++;
        } catch (e) {
            logError(`Failed to remove healthcheck data: ${e.message}`);
        }
        log('');
    }
    
    // 3. Remove test export files
    if (scanResults.testExportFiles.length > 0) {
        log('Removing test export files...', colors.bright);
        try {
            const exportSnapshot = await db.ref('data/diversey_export_files').once('value');
            const exportFiles = exportSnapshot.val();
            
            if (exportFiles && exportFiles.data && Array.isArray(exportFiles.data)) {
                // Filter out test export files
                const testFilenames = new Set(scanResults.testExportFiles.map(t => t.filename));
                const cleanedExports = exportFiles.data.filter(exportFile => {
                    const filename = exportFile.filename || 'unknown';
                    return !testFilenames.has(filename);
                });
                
                // Update with cleaned data
                await db.ref('data/diversey_export_files/data').set(cleanedExports);
                
                const removed = exportFiles.data.length - cleanedExports.length;
                logSuccess(`Removed ${removed} test export file(s)`);
                deletedCount += removed;
            }
        } catch (e) {
            logError(`Failed to remove test export files: ${e.message}`);
        }
        log('');
    }
    
    return deletedCount;
}

/**
 * Main execution
 */
async function main() {
    log('');
    log('='.repeat(60), colors.bright);
    log('Firebase RTDB Test Data Cleanup', colors.bright);
    log('='.repeat(60), colors.bright);
    log('');
    
    // Display mode
    if (DRY_RUN) {
        logWarning('RUNNING IN DRY-RUN MODE');
        logInfo('No data will be deleted. Use --apply to actually delete data.');
    } else {
        logError('RUNNING IN APPLY MODE');
        logWarning('This will DELETE test data from Firebase!');
    }
    log('');
    
    // Get configuration
    const config = getFirebaseConfig();
    logInfo(`Database URL: ${config.databaseURL}`);
    log('');
    
    // Initialize Firebase
    const admin = initializeFirebase(config);
    
    // Scan for test data
    const scanResults = await scanForTestData(admin);
    
    // Summary
    const totalFound = scanResults.testSolicitations.length + 
                      (scanResults.healthcheckData ? 1 : 0) + 
                      scanResults.testExportFiles.length;
    
    log('');
    log('='.repeat(60), colors.bright);
    log('SCAN SUMMARY', colors.bright);
    log('='.repeat(60), colors.bright);
    log('');
    logInfo(`Test solicitations: ${scanResults.testSolicitations.length}`);
    logInfo(`Healthcheck data: ${scanResults.healthcheckData ? 1 : 0}`);
    logInfo(`Test export files: ${scanResults.testExportFiles.length}`);
    logInfo(`Total items to clean: ${totalFound}`);
    log('');
    
    // Clean data if in apply mode
    if (APPLY_MODE && totalFound > 0) {
        const deletedCount = await cleanTestData(admin, scanResults);
        log('');
        log('='.repeat(60), colors.bright);
        log('CLEANUP COMPLETE', colors.bright);
        log('='.repeat(60), colors.bright);
        log('');
        logSuccess(`Total items deleted: ${deletedCount}`);
        log('');
    } else if (DRY_RUN && totalFound > 0) {
        log('');
        logWarning('To actually delete this data, run:');
        log('  node scripts/cleanup-test-data.js --apply', colors.cyan);
        log('');
    } else if (totalFound === 0) {
        logSuccess('No test data found. Database is clean!');
        log('');
    }
    
    // Cleanup
    await admin.app().delete();
    logInfo('Firebase connection closed');
    log('');
}

// Run the script
main().catch(error => {
    logError(`Script failed: ${error.message}`);
    console.error(error);
    process.exit(1);
});
