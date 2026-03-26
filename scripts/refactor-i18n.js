#!/usr/bin/env node

/**
 * Script to refactor i18n translations into namespace-based structure
 * Converts single common.json into multiple namespace files
 * Usage: node scripts/refactor-i18n.js
 */

const fs = require('fs');
const path = require('path');
const { createNodeLogger } = require('./helpers/node-logger.cjs');

const log = createNodeLogger('refactor-i18n');

const LOCALES_DIR = path.join(__dirname, '../public/locales');
const LANGUAGES = [
  'pl', 'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'sk',
  'hu', 'ro', 'bg', 'hr', 'sl', 'et', 'lv', 'lt', 'el', 'da',
  'fi', 'sv', 'no', 'is', 'ga', 'mt', 'uk'
];

// Define namespace structure - which top-level keys belong to which namespace
const NAMESPACE_MAPPINGS = {
  'common.json': ['footer'],
  'navigation.json': ['nav'],
  'hero.json': ['hero'],
  'offer.json': ['offer'],
  'menu.json': ['menu'],
  'management.json': ['management', 'attributes'],
};

/**
 * Load translation JSON file
 */
function loadTranslation(lang, filename = 'common.json') {
  const filePath = path.join(LOCALES_DIR, lang, filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return {};
  }
}

/**
 * Extract specific top-level keys from translation object
 */
function extractNamespace(source, keys) {
  const result = {};
  keys.forEach(key => {
    if (key in source) {
      result[key] = source[key];
    }
  });
  return result;
}

/**
 * Create namespace file with backup
 */
function createNamespaceFile(lang, namespace, data) {
  const dirPath = path.join(LOCALES_DIR, lang);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, namespace);
  const backupPath = filePath + '.bak';

  // Backup existing file if it exists
  if (fs.existsSync(filePath) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content + '\n', 'utf-8');
  console.log(`  ✅ ${lang}/${namespace}`);
}

/**
 * Main refactoring function
 */
function refactorTranslations() {
  log.banner('Starting i18n refactoring into namespaces');

  try {
    // Load source translations
    const enSource = loadTranslation('en', 'common.json');
    const plSource = loadTranslation('pl', 'common.json');

    if (Object.keys(enSource).length === 0 && Object.keys(plSource).length === 0) {
      console.error('❌ No source translations found!');
      process.exit(1);
    }

    // Use whichever has more content as source
    const source = Object.keys(plSource).length > Object.keys(enSource).length ? plSource : enSource;

    // Create namespaces for each language
    Object.entries(NAMESPACE_MAPPINGS).forEach(([namespace, keys]) => {
      console.log(`\n📄 Creating ${namespace}...`);

      LANGUAGES.forEach(lang => {
        const sourceLang = lang === 'pl' ? plSource : (lang === 'en' ? enSource : plSource);
        const data = extractNamespace(sourceLang, keys);

        // If empty and not the source language, use source
        if (Object.keys(data).length === 0 && lang !== 'en' && lang !== 'pl') {
          const fallback = extractNamespace(source, keys);
          if (Object.keys(fallback).length > 0) {
            createNamespaceFile(lang, namespace, fallback);
          }
        } else if (Object.keys(data).length > 0) {
          createNamespaceFile(lang, namespace, data);
        }
      });
    });

    log.ok('Refactoring completed');
    console.log('📋 Summary:');
    console.log(`  • Created ${Object.keys(NAMESPACE_MAPPINGS).length} namespace files`);
    console.log(`  • For ${LANGUAGES.length} languages`);
    console.log(`  • Total files: ${Object.keys(NAMESPACE_MAPPINGS).length * LANGUAGES.length}`);
    console.log('\n📝 Next steps:');
    console.log('  1. Update i18n settings to support multiple namespaces');
    console.log('  2. Refactor components to import specific namespaces');
    console.log('  3. Verify translations for all languages\n');

  } catch (error) {
    log.error(`Error: ${error}`);
    process.exit(1);
  }
}

// Run refactoring
refactorTranslations();
