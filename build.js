// build.js
// Fetch book data from Airtable and write books.json, which index.html's
// books tab reads directly. No HTML pages are generated any more.

const fs = require('fs');
const path = require('path');

const BASE_ID = 'app12LraPjbTp4fHG';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

if (!AIRTABLE_TOKEN) {
  console.error('❌ Missing AIRTABLE_TOKEN. Set it locally or in GitHub Actions secrets.');
  process.exit(1);
}

// ---- VIEWS TO FETCH ----
// Each key becomes a year tab in index.html's books view.
const VIEWS = [
  { key: '2026', table: 'Books read', view: '2026' },
  { key: '2025', table: 'Books read', view: '2025' },
  { key: '2024', table: 'Books read', view: '2024' },
  // Recs parked until the content is ready — uncomment to resurrect
  // (also uncomment the Recs tab button in index.html):
  // { key: 'recs', table: 'Books read', view: 'Recommended' },
];

// ---- Fetch Airtable records ----
async function fetchBooks(tableName, viewName) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(
    tableName
  )}?view=${encodeURIComponent(viewName)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '<no body>';
    }
    console.error('Airtable error response:', body);
    throw new Error(`Failed to fetch view "${viewName}" (status ${response.status})`);
  }

  const data = await response.json();
  return data.records || [];
}

// ---- Convert one record to a plain book object ----
function toBook(record) {
  const f = record.fields || {};
  const titleAuthor = f['Title author'] || 'Untitled';

  let img = '';
  if (f['Cover image']?.[0]) {
    const extension = path.extname(f['Cover image'][0].filename || '.jpg');
    const filename = titleAuthor
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100) + extension;
    img = `images/${filename}`;
  }

  return {
    img,
    title: titleAuthor,
    notes: f['Notes'] || '',
    linkURL: f['Link URL'] || '',
    linkText: f['Link text'] || '',
  };
}

// ---- Main build ----
async function buildSite() {
  console.log('Starting build...');
  const years = {};

  for (const v of VIEWS) {
    console.log(`Fetching "${v.view}"...`);
    try {
      const records = await fetchBooks(v.table, v.view);
      years[v.key] = records.map(toBook);
      console.log(`✓ ${v.key}: ${records.length} books`);
    } catch (err) {
      console.error(`✗ Failed to fetch ${v.key}:`, err.message);
      process.exit(1);
    }
  }

  fs.writeFileSync('books.json', JSON.stringify({ years }, null, 1));
  console.log('Build complete: books.json written.');
}

buildSite();
