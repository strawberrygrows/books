function buildNav() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;

    const links = [
        { href: 'about.html', label: 'About' },
        { href: 'index.html', label: 'Recs' },
        { href: '2025.html', label: '2025' },
        { href: '2024.html', label: '2024' },
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

document.addEventListener('DOMContentLoaded', () => {
    buildNav();
});
