/**
 * PromptCrop OCR - Landing Page Build & Obfuscation Script
 * Copyright (c) 2026 Faruk. All rights reserved.
 * 
 * This script obfuscates the checkout.src.js (editable source)
 * into checkout.js (production obfuscated file) to prevent
 * public source viewing on GitHub and reverse engineering of checkout/API flow.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcFile = path.join(__dirname, 'checkout.src.js');
const destFile = path.join(__dirname, 'checkout.js');

console.log('⚡ Starting PromptCrop Landing Page Build Process...');

if (!fs.existsSync(srcFile)) {
  console.error('❌ Error: checkout.src.js not found! Cannot build.');
  process.exit(1);
}

console.log('🔒 Obfuscating checkout.src.js -> checkout.js...');
try {
  // Run npx javascript-obfuscator with optimized parameters for performance & safety
  // keeping rename-globals false to preserve window.openPurchaseModal and other window bindings.
  execSync(
    `npx -y javascript-obfuscator "${srcFile}" --output "${destFile}" --compact true --self-defending false --control-flow-flattening false --dead-code-injection false --string-array true --string-array-encoding base64 --string-array-threshold 0.75 --identifier-names-generator hexadecimal --rename-globals false`,
    { stdio: 'inherit' }
  );
  console.log('✅ Success: checkout.js created and obfuscated.');
} catch (err) {
  console.error('❌ Error obfuscating checkout.src.js:', err.message);
  process.exit(1);
}
