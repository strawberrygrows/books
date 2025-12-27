const BASE_ID = 'app12LraPjbTp4fHG';

function buildNav() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;

    const links = [
        { href: 'index.html', label: '2025' },
        { href: '2024.html', label: '2024' },
        { href: 'recommend.html', label: 'Books I recommend' },
        { href: 'other.html', label: 'Other books' }
    ];

    let current = window.location.pathname.split('/').pop();
    if (current === '' || current === null) {
        current = 'index.html';
    }

    nav.innerHTML = '';

    links.forEach((link, index) => {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label;

        if (link.href === current) {
            a.classList.add('active');
        }

        nav.appendChild(a);

        if (index < links.length - 1) {
            const sep = document.createElement('span');
            sep.textContent = ' · ';
            nav.appendChild(sep);
        }
    });
}

function getAirtableConfig() {
    const gallery = document.getElementById('gallery');
    if (!gallery) {
        console.error('Gallery element not found');
        return { tableName: 'Books read', viewName: 'All books (pictures)' };
    }
    const tableName = gallery.dataset.tableName || 'Books read';
    const viewName = gallery.dataset.viewName || 'All books (pictures)';
    return { tableName, viewName };
}

function createTokenPrompt() {
    const container = document.querySelector('.container');
    if (!container) return;

    const promptDiv = document.createElement('div');
    promptDiv.id = 'setupPrompt';
    promptDiv.className = 'setup-prompt';
    promptDiv.innerHTML = `
        <h2>First Time Setup</h2>
        <p>To display your books, please enter your Airtable Personal Access Token. This will be saved securely in your browser and never shared.</p>
        <input type="password" id="tokenInput" placeholder="Enter your Airtable token here">
        <button id="saveTokenButton">Save Token</button>
        <p style="font-size: 0.9em; margin-top: 15px; color: #8b4513;">
            Your token is stored locally in your browser only. No one else can access it.
        </p>
    `;
    
    container.appendChild(promptDiv);

    document.getElementById('saveTokenButton').addEventListener('click', saveToken);
}

function createLoadingElement() {
    const container = document.querySelector('.container');
    if (!container) return;

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.className = 'loading hidden';
    loadingDiv.textContent = 'Loading books...';
    
    container.appendChild(loadingDiv);
}

function saveToken() {
    const tokenInput = document.getElementById('tokenInput');
    const token = tokenInput.value.trim();

    if (!token) {
        alert('Please enter a token');
        return;
    }

    localStorage.setItem('airtable_token', token);
    const setupPrompt = document.getElementById('setupPrompt');
    if (setupPrompt) {
        setupPrompt.classList.add('hidden');
    }
    fetchBooks();
}

async function fetchBooks() {
    const token = localStorage.getItem('airtable_token');
    const loading = document.getElementById('loading');
    const setupPrompt = document.getElementById('setupPrompt');

    if (!token) {
        if (setupPrompt) {
            setupPrompt.classList.remove('hidden');
        }
        return;
    }

    const { tableName, viewName } = getAirtableConfig();

    if (loading) {
        loading.classList.remove('hidden');
    }

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

    if (loading) {
        loading.classList.add('hidden');
    }
    if (gallery) {
        gallery.classList.remove('hidden');
    }

    if (!gallery) {
        console.error('Gallery element not found');
        return;
    }

    gallery.innerHTML = '';

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

        // Only add image if there's a cover image
        if (coverImage) {
            const img = document.createElement('img');
            img.src = coverImage;
            img.alt = altText;
            img.className = 'book-cover';
            img.loading = 'lazy';
            card.appendChild(img);
        }

        const titleEl = document.createElement('div');
        titleEl.className = 'book-title';
        titleEl.textContent = titleAuthor;
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
    if (!loading) return;

    loading.classList.remove('hidden');
    loading.innerHTML = `
        <div class="error">
            <p>${message}</p>
            <button id="retryButton" style="margin-top: 15px; padding: 10px 20px; background: #8b4513; color: #f4f1de; border: none; border-radius: 4px; cursor: pointer;">Try Again</button>
        </div>
    `;

    const retryButton = document.getElementById('retryButton');
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            location.reload();
        });
    }
}

// Setup on page load
document.addEventListener('DOMContentLoaded', () => {
    buildNav();
    
    // Create token prompt and loading elements if they don't exist
    if (!document.getElementById('setupPrompt')) {
        createTokenPrompt();
    } else {
        // If it exists, attach the click handler
        const saveButton = document.getElementById('saveTokenButton');
        if (saveButton) {
            saveButton.addEventListener('click', saveToken);
        }
    }

    if (!document.getElementById('loading')) {
        createLoadingElement();
    }

    const token = localStorage.getItem('airtable_token');
    if (token) {
        const setupPrompt = document.getElementById('setupPrompt');
        if (setupPrompt) {
            setupPrompt.classList.add('hidden');
        }
        fetchBooks();
    }
});
