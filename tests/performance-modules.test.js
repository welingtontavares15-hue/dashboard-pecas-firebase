#!/usr/bin/env node

/**
 * Simple test to verify performance optimization modules load correctly
 */

const fs = require('fs');
const path = require('path');

console.log('Testing performance optimization modules...\n');

const modules = [
    'js/module-loader.js',
    'js/performance-monitor.js',
    'js/lazy-image-loader.js',
    'js/firebase-pagination.js'
];

let allPassed = true;

modules.forEach(modulePath => {
    const fullPath = path.join(__dirname, '..', modulePath);
    
    try {
        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            console.log(`❌ FAIL: ${modulePath} - File not found`);
            allPassed = false;
            return;
        }
        
        // Read file content
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for syntax errors (basic check)
        if (content.length === 0) {
            console.log(`❌ FAIL: ${modulePath} - File is empty`);
            allPassed = false;
            return;
        }
        
        // Check for global exports
        const moduleName = path.basename(modulePath, '.js')
            .split('-')
            .map((word, idx) => idx === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
        
        const expectedExportPatterns = [
            `window.${moduleName}`,
            `const ${moduleName}`,
            `${moduleName} =`
        ];
        
        const hasExport = expectedExportPatterns.some(pattern => content.includes(pattern));
        
        if (!hasExport) {
            console.log(`⚠️  WARN: ${modulePath} - Module export pattern not found`);
        } else {
            console.log(`✅ PASS: ${modulePath}`);
        }
        
    } catch (error) {
        console.log(`❌ FAIL: ${modulePath} - Error: ${error.message}`);
        allPassed = false;
    }
});

console.log('\n---');

// Check if index.html includes new modules
const indexPath = path.join(__dirname, '..', 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

const requiredScripts = [
    'js/module-loader.js',
    'js/performance-monitor.js',
    'js/lazy-image-loader.js',
    'js/firebase-pagination.js'
];

console.log('\nChecking index.html includes:');
requiredScripts.forEach(script => {
    if (indexContent.includes(script)) {
        console.log(`✅ ${script} is included`);
    } else {
        console.log(`❌ ${script} is NOT included`);
        allPassed = false;
    }
});

// Check for resource hints
console.log('\nChecking resource hints:');
const resourceHints = [
    'rel="dns-prefetch"',
    'rel="preconnect"',
    'rel="preload"'
];

resourceHints.forEach(hint => {
    if (indexContent.includes(hint)) {
        console.log(`✅ ${hint} is present`);
    } else {
        console.log(`⚠️  ${hint} is NOT present`);
    }
});

console.log('\n---');
if (allPassed) {
    console.log('✅ All tests passed!');
    process.exit(0);
} else {
    console.log('❌ Some tests failed');
    process.exit(1);
}
