// build.js
// Generate static HTML pages from Airtable so the live site makes NO Airtable calls.

const fs = require('fs');

const BASE_ID = 'app12LraPjbTp4fHG';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

// ---- Safety check: make sure we actually have a token ----
if (!AIRTABLE_TOKEN) {
  console.error('❌ AIRTABLE_TOKEN is not set. Set it in your env / GitHub Actions secrets.');
  process.exit(1);
}

// ---- Define the pages we want to build ----
// Make sure these view names match EXACTLY the views in your "Books read" table.
const PAGES = [
  {
    file: 'index.html',
    table: 'Books read',
    view: 'Recommended',
    title: "Rachel's Library — Recommendations",
    heading: 'Books I recommend',
    isList: false,
  },
  {
    file: '2025.html',
    table: 'Books read',
    view: '2025', // <--- IMPORTANT: this should match your Airtable view name
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
    file: 'other.html',
    table: 'Books read',
    view: 'Other books',
    title: "Rachel's Library — Other Books",
    heading: 'Other books',
    isList: true, // will add body class="list-view"
  },
];

// ---- Airtable fetch helper ----
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
    // Try to show Airtable's own error message for easier debugging
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      errorBody = '<no body>';
    }
    console.error('Airtable error details:', errorBody);
    throw new Error(`Failed to fetch view "${viewName}" (status ${response.status})`);
  }

  const data = await response.json();
  return data.records || [];
}

// ---- Turn one Airtable record into one book card ----
function generateBookCard(record) {
  const fields = record.fields || {};
  const images = fields['Cover image'] || [];
  const coverImage = images[0] ? images[0].url : '';
  const titleAuthor = fields['Title author'] || 'Untitled';
  const notes = fields['Notes'] || '';
  const linkURL = fields['Link URL'] || '';
  const linkText = fields['Link text'] || '';

  let html = '<div class="book-card">';

  if (coverImage) {
    html += `<img src="${coverImage}" alt="Cover of ${escapeHtml(
      titleAuthor
    )}" class="book-cover" loading="lazy">`;
  }

  html += `<div class="book-title">${escapeHtml(titleAuthor)}</div>`;

  if (notes) {
    // Notes are treated as plain text; if you want to allow basic HTML, remove escapeHtml
    html += `<div class="book-notes">${escapeHtml(notes)}</div>`;
  }

  if (linkURL && linkText) {
    html += `<div class="book-link"><a href="${escapeAttribute(
      linkURL
    )}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkText)} →</a></div>`;
  }

  html += '</div>';
  return html;
}

// ---- Build the nav once, based on PAGES ----
function generateNav(currentFile) {
  return PAGES.map((page) => {
    const isActive = page.file === currentFile;
    const classAttr = isActive ? ' class="nav-link active"' : ' class="nav-link"';
    return `<a href="${page.file}"${classAttr}>${escapeHtml(page.heading)}</a>`;
  }).join('\n                ');
}

// ---- Wrap cards + nav + header in a full HTML document ----
function generateHTML(pageConfig, booksHTML) {
  const { title, heading, file, isList } = pageConfig;
  const bodyClass = isList ? ' class="list-view"' : '';

  const navHTML = generateNav(file);

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
        <div class="header">
            <div class="ornament">✦ ✦ ✦</div>
            <h1>Rachel's Library</h1>
            <div class="nav-links">
                ${navHTML}
            </div>
        </div>
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

// ---- Very small HTML escaping helpers ----
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(str) {
  // for href, etc.
  return escapeHtml(str);
}

// ---- Main build function ----
async function buildSite() {
  console.log('Starting build...');

  for (const page of PAGES) {
    console.log(`Building ${page.file} (view "${page.view}")...`);

    try {
      const records = await fetchBooks(page.table, page.view);
      const booksHTML = records.map(generateBookCard).join('\n            ');

      const html = generateHTML(page, booksHTML);

      fs.writeFileSync(page.file, html);
      console.log(`✓ Generated ${page.file} with ${records.length} books`);
    } catch (error) {
      console.error(`✗ Failed to build ${page.file}:`, error.message);
      process.exit(1);
    }
  }

  console.log('Build complete!');
}

buildSite();
