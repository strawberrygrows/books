// build.js
// Generate fully static HTML pages using Airtable data.

const fs = require('fs');

const BASE_ID = 'app12LraPjbTp4fHG';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

// Read the shared header partial once
const header = fs.readFileSync('partials/header.html', 'utf8');

// Require a token
if (!AIRTABLE_TOKEN) {
  console.error('❌ Missing AIRTABLE_TOKEN. Set it locally or in GitHub Actions secrets.');
  process.exit(1);
}

// ---- PAGES TO GENERATE ----
// Adjust view names / filenames if needed.
const PAGES = [

  {
    file: '2025.html',
    table: 'Books read',
    view: '2025',
    title: "Rachel's Library — 2025",
    heading: 'Books I read in 2025',
    isList: false,
  },
  {
    file: '2024.html',
    table: 'Books read',
    view: '2024',
    title: "Rachel's Library — 2024",
    heading: 'Books I read in 2024',
    isList: false,
  },
  {
    file: 'library.html',               // was other.html previously
    table: 'Books read',
    view: 'Library',
    title: "Rachel's Library — Library",
    heading: 'Library',
    isList: true,
  },
  // Anti-Library placeholder: create a view in Airtable when ready
  // or point it at some view that already exists.
  {
    file: 'anti-library.html',
    table: 'Books read',
    view: 'Anti-Library',               // make sure this view exists in Airtable
    title: "Rachel's Library — Anti-Library",
    heading: 'Anti-Library',
    isList: true,
  },
];

// ---- Fetch Airtable records ----
async function fetchBooks(tableName, viewName) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(
    tableName
  )}?view=${encodeURIComponent(viewName)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
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

// ---- Build one book card ----
function generateBookCard(record) {
  const f = record.fields || {};
  const img = f['Cover image']?.[0]?.url || '';
  const titleAuthor = f['Title author'] || 'Untitled';
  const notes = f['Notes'] || '';
  const linkURL = f['Link URL'] || '';
  const linkText = f['Link text'] || '';

  let card = `<div class="book-card">`;

  if (img) {
    card += `<img src="${escapeAttr(img)}" alt="Cover of ${escapeHtml(
      titleAuthor
    )}" class="book-cover" loading="lazy">`;
  }

  card += `<div class="book-title">${escapeHtml(titleAuthor)}</div>`;

  if (notes) {
    card += `<div class="book-notes">${escapeHtml(notes)}</div>`;
  }

  if (linkURL && linkText) {
    card += `<div class="book-link"><a href="${escapeAttr(
      linkURL
    )}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkText)} →</a></div>`;
  }

  card += `</div>`;
  return card;
}

// ---- Construct the full HTML page ----
function generateHTML(page, booksHTML) {
  const { title, heading, isList } = page;
  const bodyClass = isList ? ' class="list-view"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body${bodyClass}>
  <div class="container">
    ${header}
    <div class="page-heading">
      <h2>${escapeHtml(heading)}</h2>
    </div>
    <div id="gallery" class="gallery">
      ${booksHTML}
    </div>
  </div>
</body>
</html>`;
}

// ---- Escaping helpers ----
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

// ---- Main build ----
async function buildSite() {
  console.log('Starting build...');

  for (const page of PAGES) {
    console.log(`Building ${page.file} (Airtable view: "${page.view}")...`);

    try {
      const records = await fetchBooks(page.table, page.view);
      const bookCards = records.map(generateBookCard).join('\n      ');

      const html = generateHTML(page, bookCards);
      fs.writeFileSync(page.file, html);

      console.log(`✓ ${page.file} generated with ${records.length} books`);
    } catch (err) {
      console.error(`✗ Failed to build ${page.file}:`, err.message);
      process.exit(1);
    }
  }

  console.log('Build complete!');
}

buildSite();
