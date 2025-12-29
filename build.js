const fs = require('fs');

const BASE_ID = 'app12LraPjbTp4fHG';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

const views = [
    { file: 'index.html', table: 'Books read', view: 'Recommended', title: "Rachel's Library - Recommendations" },
    { file: '2025.html', table: 'Books read', view: 'All books (pictures)', title: "Rachel's Library - 2025" },
    { file: '2024.html', table: 'Books read', view: '2024', title: "Rachel's Library - 2024" },
    { file: 'other.html', table: 'Books read', view: 'Other books', title: "Rachel's Library - Other Books", isList: true }
];

async function fetchBooks(tableName, viewName) {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}?view=${encodeURIComponent(viewName)}`;
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${viewName}: ${response.status}`);
    }

    const data = await response.json();
    return data.records;
}

function generateBookCard(record) {
    const fields = record.fields;
    const coverImage = fields['Cover image'] && fields['Cover image'][0] ? fields['Cover image'][0].url : '';
    const titleAuthor = fields['Title author'] || 'Untitled';
    const notes = fields['Notes'] || '';
    const linkURL = fields['Link URL'] || '';
    const linkText = fields['Link text'] || '';

    let html = '<div class="book-card">';
    
    if (coverImage) {
        html += `<img src="${coverImage}" alt="Cover of ${titleAuthor}" class="book-cover" loading="lazy">`;
    }
    
    html += `<div class="book-title">${titleAuthor}</div>`;
    
    if (notes) {
        html += `<div class="book-notes">${notes}</div>`;
    }
    
    if (linkURL && linkText) {
        html += `<div class="book-link"><a href="${linkURL}" target="_blank" rel="noopener noreferrer">${linkText} →</a></div>`;
    }
    
    html += '</div>';
    return html;
}

function generateHTML(title, booksHTML, isList = false) {
    const bodyClass = isList ? ' class="list-view"' : '';
    const galleryClass = isList ? 'gallery' : 'gallery';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body${bodyClass}>
    <div class="container">
        <div class="header">
            <div class="ornament">✦ ✦ ✦</div>
            <h1>Rachel's Library</h1>
            <div class="nav-links"></div>
        </div>
        <div id="gallery" class="${galleryClass}">
            ${booksHTML}
        </div>
    </div>
    <script src="library-static.js"></script>
</body>
</html>`;
}

async function buildSite() {
    console.log('Starting build...');
    
    for (const view of views) {
        console.log(`Building ${view.file}...`);
        
        try {
            const records = await fetchBooks(view.table, view.view);
            const booksHTML = records.map(record => generateBookCard(record)).join('\n');
            const html = generateHTML(view.title, booksHTML, view.isList);
            
            fs.writeFileSync(view.file, html);
            console.log(`✓ Generated ${view.file} with ${records.length} books`);
        } catch (error) {
            console.error(`✗ Failed to build ${view.file}:`, error.message);
            process.exit(1);
        }
    }
    
    console.log('Build complete!');
}

buildSite();
