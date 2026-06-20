document.addEventListener('DOMContentLoaded', () => {

    const navbar = document.querySelector('.navbar');
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (!toggle || !links) return;

    const currentPage = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';

    document.querySelectorAll('.nav-links a').forEach((link) => {
        const href = (link.getAttribute('href') || '').split('#')[0].toLowerCase();
        const isCurrent = href === currentPage;

        link.classList.toggle('active', isCurrent);
        if (isCurrent) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });

    if (navbar) {
        const updateNavbar = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 12);
        };

        updateNavbar();
        window.addEventListener('scroll', updateNavbar, { passive: true });
    }

    const closeMenu = () => {
        links.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
    };

    toggle.addEventListener('click', () => {

        const isOpen = links.classList.toggle('open');

        toggle.classList.toggle('active');

        toggle.setAttribute('aria-expanded', String(isOpen));
        document.body.classList.toggle('nav-open', isOpen);

    });

    document.querySelectorAll('.nav-links a').forEach(link => {

        link.addEventListener('click', closeMenu);

    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenu();
    });

});
