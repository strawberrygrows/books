const BASE_ID = 'app12LraPjbTp4fHG';

function buildNav() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return; // in case you have a page without a header

    const links = [
        { href: 'index.html', label: '2025' },
        { href: '2024.html', label: '2024' },
        { href: 'recommend.html', label: 'Books I recommend' }
        // add more pages here later!
    ];

    // Work out which page we're on (e.g. "index.html")
    let current = window.location.pathname.split('/').pop();
    if (current === '' || current === null) {
        current = 'index.html';
    }

    // Clear anything that might be inside nav
    nav.innerHTML = '';

    links.forEach((link, index) => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label;

        if (link.href === current) {
            a.classList.add('active');
        }

        nav.appendChild(a);

        // Add a separator dot between links (not after the last one)
        if (index < links.length - 1) {
            const sep = document.createElement('span');
            sep.textContent = ' · ';
            nav.appendChild(sep);
        }
    });
}


// Get Airtable config (table + view) from data attributes on the gallery element
function getAirtableConfig() {
    const gallery = document.getElementById('gallery');
    const tableName = gallery.dataset.tableName || 'Books read';
    const viewName = gallery.dataset.viewName || 'All books (pictures)';
    return { tableName, viewName };
}

function saveToken() {
    const tokenInput = document.getElementById('tokenInput');
    const token = tokenInput.value.trim();

    if (!token) {
        alert('Please enter a token');
        return;
    }

    localStorage.setItem('airtable_token', token);
    document.getElementById('setupPrompt').classList.add('hidden');
    fetchBooks();
}

async function fetchBooks() {
    const token = localStorage.getItem('airtable_token');
    const loading = document.getElementById('loading');
    const setupPrompt = document.getElementById('setupPrompt');

    if (!token) {
        setupPrompt.classList.remove('hidden');
        return;
    }

    const { tableName, viewName } = getAirtableConfig();

    loading.classList.remove('hidden');

    try {
        const url =
            `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}` +
            `?view=${encodeURIComponent(viewName)}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('airtable_token');
                throw new Error('Invalid token. Please try again.');
            }
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data = await response.json();
        displayBooks(data.records);
    } catch (error) {
        showError(error.message);
        console.error('Error:', error);
    }
}

function displayBooks(records) {
    const gallery = document.getElementById('gallery');
    const loading = document.getElementById('loading');

    loading.classList.add('hidden');
    gallery.classList.remove('hidden');

    gallery.innerHTML = ''; // clear any previous content

    if (!records || records.length === 0) {
        gallery.innerHTML = '<div class="error">No books found.</div>';
        return;
    }

    records.forEach(record => {
        const fields = record.fields;
        const card = document.createElement('div');
        card.className = 'book-card';

        const coverImage = fields['Cover image'] && fields['Cover image'][0]
            ? fields['Cover image'][0].url
            : '';

        const titleAuthor = fields['Title author'] || 'Untitled';
        const altText = `Cover of ${titleAuthor}`;
        const notes = fields['Notes'] || '';
        const linkURL = fields['Link URL'] || '';
        const linkText = fields['Link text'] || '';

        const img = document.createElement('img');
        img.src = coverImage;
        img.alt = altText;
        img.className = 'book-cover';
        img.loading = 'lazy';

        const titleEl = document.createElement('div');
        titleEl.className = 'book-title';
        titleEl.textContent = titleAuthor;

        card.appendChild(img);
        card.appendChild(titleEl);

        if (notes) {
            const notesEl = document.createElement('div');
            notesEl.className = 'book-notes';
            notesEl.textContent = notes;
            card.appendChild(notesEl);
        }

        if (linkURL && linkText) {
            const linkWrapper = document.createElement('div');
            linkWrapper.className = 'book-link';

            const a = document.createElement('a');
            a.href = linkURL;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = `${linkText} →`;

            linkWrapper.appendChild(a);
            card.appendChild(linkWrapper);
        }

        gallery.appendChild(card);
    });
}

function showError(message) {
    const loading = document.getElementById('loading');
    loading.classList.remove('hidden');
    loading.innerHTML = `
        <div class="error">
            <p>${message}</p>
            <button id="retryButton" style="margin-top: 15px; padding: 10px 20px; background: #8b4513; color: #f4f1de; border: none; border-radius: 4px; cursor: pointer;">Try Again</button>
        </div>
    `;

    const retryButton = document.getElementById('retryButton');
    retryButton.addEventListener('click', () => {
        location.reload();
    });
}
// Setup on page load
document.addEventListener('DOMContentLoaded', () => {
    // build the header nav on every page
    buildNav();

    const saveButton = document.getElementById('saveTokenButton');
    if (saveButton) {
        saveButton.addEventListener('click', saveToken);
    }

    const token = localStorage.getItem('airtable_token');
    if (token) {
        document.getElementById('setupPrompt').classList.add('hidden');
        fetchBooks();
    }
});
