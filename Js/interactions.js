/**
 * ISTOS TECH — Premium Interactions
 * Tilt cards, magnetic buttons, smooth counters, parallax
 */
document.addEventListener('DOMContentLoaded', () => {
    const motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!motionAllowed) return;

    // ═══════════════════════════════════════
    // 1. TILT CARD EFFECT (3D perspective)
    // ═══════════════════════════════════════
    const tiltCards = document.querySelectorAll(
        '.service-card, .stat-card, .portfolio-card, .testimonial-card, .process-card, .result-card, .why-card'
    );

    tiltCards.forEach(card => {
        card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const tiltX = ((y - centerY) / centerY) * -4;
            const tiltY = ((x - centerX) / centerX) * 4;

            card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-6px)`;

            // Glow follow
            const percentX = (x / rect.width) * 100;
            const percentY = (y / rect.height) * 100;
            card.style.setProperty('--glow-x', `${percentX}%`);
            card.style.setProperty('--glow-y', `${percentY}%`);
        });

        card.addEventListener('pointerleave', () => {
            card.style.transform = '';
            card.style.setProperty('--glow-x', '50%');
            card.style.setProperty('--glow-y', '50%');
        });
    });

    // ═══════════════════════════════════════
    // 2. MAGNETIC BUTTONS
    // ═══════════════════════════════════════
    const magneticBtns = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-light, .footer-cta');

    magneticBtns.forEach(btn => {
        btn.addEventListener('pointermove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });

        btn.addEventListener('pointerleave', () => {
            btn.style.transform = '';
        });
    });

    // ═══════════════════════════════════════
    // 3. ANIMATED STAT COUNTERS
    // ═══════════════════════════════════════
    const statNumbers = document.querySelectorAll('.stat-card h3');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => counterObserver.observe(el));

    function animateCounter(el) {
        const text = el.textContent.trim();
        const numMatch = text.match(/(\d+)/);
        if (!numMatch) return;

        const target = parseInt(numMatch[1]);
        const suffix = text.replace(numMatch[1], '');
        const duration = 1500;
        const start = performance.now();

        function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * eased);

            el.textContent = current + suffix;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = text; // Restore original
            }
        }

        requestAnimationFrame(step);
    }

    // ═══════════════════════════════════════
    // 4. STAGGER REVEAL ANIMATIONS
    // ═══════════════════════════════════════
    const staggerContainers = document.querySelectorAll(
        '.service-grid, .portfolio-grid, .testimonial-grid, .process-grid, .why-grid, .results-grid'
    );

    const staggerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const cards = entry.target.children;
                Array.from(cards).forEach((card, i) => {
                    setTimeout(() => {
                        card.classList.add('in');
                    }, i * 80);
                });
                staggerObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    staggerContainers.forEach(container => {
        staggerObserver.observe(container);
    });

    // ═══════════════════════════════════════
    // 5. SMOOTH PARALLAX ON HERO
    // ═══════════════════════════════════════
    const heroVisual = document.querySelector('.hero-visual');
    const heroCopy = document.querySelector('.hero-copy');

    if (heroVisual && heroCopy) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    if (scrollY < window.innerHeight) {
                        heroVisual.style.transform = `translateY(${scrollY * 0.08}px)`;
                        heroCopy.style.transform = `translateY(${scrollY * 0.03}px)`;
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ═══════════════════════════════════════
    // 6. SCROLL-PROGRESS INDICATOR
    // ═══════════════════════════════════════
    const scrollProgress = document.createElement('div');
    scrollProgress.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 2px;
        background: linear-gradient(90deg, #a855f7, #ec4899, #06b6d4);
        z-index: 10001;
        transform-origin: left;
        transform: scaleX(0);
        transition: none;
        pointer-events: none;
    `;
    document.body.appendChild(scrollProgress);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrollTop / docHeight : 0;
        scrollProgress.style.transform = `scaleX(${progress})`;
    }, { passive: true });

    // ═══════════════════════════════════════
    // 7. SECTION GRADIENT BORDER GLOW ON HOVER
    // ═══════════════════════════════════════
    const allCards = document.querySelectorAll(
        '.service-card, .stat-card, .portfolio-card, .testimonial-card, .process-card, .result-card, .why-card, .floating-card'
    );

    allCards.forEach(card => {
        card.addEventListener('pointerenter', () => {
            card.style.borderColor = 'rgba(168, 85, 247, 0.25)';
        });

        card.addEventListener('pointerleave', () => {
            card.style.borderColor = '';
        });
    });

    // ═══════════════════════════════════════
    // 8. SMOOTH TEXT REVEAL WITH SPLIT
    // ═══════════════════════════════════════
    const sectionTitles = document.querySelectorAll('.section-title h2');
    const titleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                titleObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    sectionTitles.forEach(title => {
        title.style.opacity = '0';
        title.style.transform = 'translateY(20px)';
        title.style.transition = 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
        titleObserver.observe(title);
    });

    // ═══════════════════════════════════════
    // 9. HIDE SCROLL INDICATOR ON SCROLL
    // ═══════════════════════════════════════
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                scrollIndicator.style.opacity = '0';
                scrollIndicator.style.pointerEvents = 'none';
            } else {
                scrollIndicator.style.opacity = '1';
                scrollIndicator.style.pointerEvents = 'auto';
            }
        }, { passive: true });
    }
});
