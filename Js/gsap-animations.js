/**
 * ISTOS TECH — GSAP Premium Animations v2.0
 * ScrollTrigger, TextReveal, Counter, Parallax, Rotating Keywords
 */

(function () {
    'use strict';

    // ── Respect user motion preference ──
    const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!motionOK) return;

    // Wait for GSAP to be available
    function onGSAPReady(cb) {
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            cb();
        } else {
            setTimeout(() => onGSAPReady(cb), 50);
        }
    }

    // ═══════════════════════════════════════════════
    // 1. ROTATING KEYWORDS IN HERO
    // ═══════════════════════════════════════════════
    const KEYWORDS = [
        'AI Solutions',
        'SaaS Platforms',
        'Web Applications',
        'E-Commerce Stores',
        'Custom Software',
        'Business Automation',
        'Mobile Apps',
        'Digital Products'
    ];

    const kwEl = document.getElementById('rotating-kw');

    if (kwEl) {
        let current = 0;
        let rotating = false;

        function rotateKeyword() {
            if (rotating) return;
            rotating = true;

            // Fade out current
            kwEl.style.animation = 'kwFadeOut 0.4s cubic-bezier(0.4,0,0.2,1) forwards';

            setTimeout(() => {
                current = (current + 1) % KEYWORDS.length;
                kwEl.textContent = KEYWORDS[current];
                kwEl.style.animation = 'kwFadeIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards';

                setTimeout(() => {
                    rotating = false;
                }, 500);
            }, 380);
        }

        // Start rotation after hero animation settles
        setTimeout(() => {
            setInterval(rotateKeyword, 2600);
        }, 2000);
    }

    // ═══════════════════════════════════════════════
    // 2. HERO FLOATING CARD COUNTERS
    // ═══════════════════════════════════════════════
    function animateCounters(targets) {
        targets.forEach(el => {
            const target = parseInt(el.dataset.target || '0');
            const suffix = el.dataset.suffix || '';
            if (isNaN(target)) return;

            const duration = 1800;
            const start = performance.now();

            function step(now) {
                const t = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
                el.textContent = Math.floor(target * eased) + suffix;
                if (t < 1) requestAnimationFrame(step);
                else el.textContent = target + suffix;
            }
            requestAnimationFrame(step);
        });
    }

    // Trigger hero card counters when hero is visible
    const heroCounters = document.querySelectorAll('.counter-val');
    if (heroCounters.length > 0) {
        const heroObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    animateCounters(heroCounters);
                    heroObs.disconnect();
                }
            });
        }, { threshold: 0.3 });
        document.getElementById('hero-visual') && heroObs.observe(document.getElementById('hero-visual'));
    }

    // ═══════════════════════════════════════════════
    // 3. STAT SECTION COUNTERS
    // ═══════════════════════════════════════════════
    const statCounters = document.querySelectorAll('.counter-num');
    if (statCounters.length > 0) {
        const statObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    animateCounters(Array.from(e.target.querySelectorAll('.counter-num')));
                    statObs.unobserve(e.target);
                }
            });
        }, { threshold: 0.4 });

        const statsSection = document.getElementById('stats-section');
        if (statsSection) statObs.observe(statsSection);
    }

    // ═══════════════════════════════════════════════
    // 4. GSAP SCROLL ANIMATIONS
    // ═══════════════════════════════════════════════
    onGSAPReady(() => {
        gsap.registerPlugin(ScrollTrigger);

        // ── Section titles dramatic reveal ──
        document.querySelectorAll('.section-title').forEach(el => {
            const h2 = el.querySelector('h2');
            const p = el.querySelector('p');
            const kicker = el.querySelector('.section-kicker');

            if (kicker) {
                gsap.fromTo(kicker,
                    { opacity: 0, y: 16 },
                    {
                        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
                        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
                    }
                );
            }
            if (h2) {
                gsap.fromTo(h2,
                    { opacity: 0, y: 28 },
                    {
                        opacity: 1, y: 0, duration: 0.8, delay: 0.1, ease: 'power3.out',
                        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
                    }
                );
            }
            if (p) {
                gsap.fromTo(p,
                    { opacity: 0, y: 20 },
                    {
                        opacity: 1, y: 0, duration: 0.7, delay: 0.2, ease: 'power3.out',
                        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
                    }
                );
            }
        });

        // ── CTA Strip animation ──
        const ctaStrip = document.querySelector('.cta-strip');
        if (ctaStrip) {
            gsap.fromTo(ctaStrip,
                { scale: 0.96, opacity: 0 },
                {
                    scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out',
                    scrollTrigger: { trigger: ctaStrip, start: 'top 88%', once: true }
                }
            );
        }

        // ── Why-cards stagger ──
        const whyCards = document.querySelectorAll('.why-card');
        if (whyCards.length > 0) {
            gsap.fromTo(whyCards,
                { opacity: 0, y: 40 },
                {
                    opacity: 1, y: 0,
                    duration: 0.7, stagger: 0.1, ease: 'power3.out',
                    scrollTrigger: { trigger: '#why-grid', start: 'top 85%', once: true }
                }
            );
        }

        // ── Result cards ──
        const resultCards = document.querySelectorAll('.result-card');
        if (resultCards.length > 0) {
            gsap.fromTo(resultCards,
                { opacity: 0, scale: 0.9 },
                {
                    opacity: 1, scale: 1,
                    duration: 0.6, stagger: 0.12, ease: 'back.out(1.4)',
                    scrollTrigger: { trigger: '#results-grid', start: 'top 85%', once: true }
                }
            );
        }

        // ── Process cards ──
        const processCards = document.querySelectorAll('.process-card');
        if (processCards.length > 0) {
            gsap.fromTo(processCards,
                { opacity: 0, y: 36 },
                {
                    opacity: 1, y: 0,
                    duration: 0.6, stagger: 0.09, ease: 'power2.out',
                    scrollTrigger: { trigger: '#process-grid', start: 'top 85%', once: true }
                }
            );
        }

        // ── Floating cards parallax on scroll ──
        const cardOne = document.getElementById('fc-one');
        const cardTwo = document.getElementById('fc-two');
        const heroVisual = document.getElementById('hero-visual');

        if (heroVisual && cardOne) {
            gsap.to(cardOne, {
                y: -24,
                scrollTrigger: {
                    trigger: '#hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1.5
                }
            });
        }
        if (heroVisual && cardTwo) {
            gsap.to(cardTwo, {
                y: 20,
                scrollTrigger: {
                    trigger: '#hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1.5
                }
            });
        }

        // ── Hero copy subtle parallax ──
        const heroCopy = document.querySelector('.hero-copy');
        if (heroCopy) {
            gsap.to(heroCopy, {
                y: 40,
                ease: 'none',
                scrollTrigger: {
                    trigger: '#hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 2
                }
            });
        }

        // ── Stats section number reveal ──
        ScrollTrigger.create({
            trigger: '#stats-section',
            start: 'top 80%',
            once: true,
            onEnter: () => {
                const nums = document.querySelectorAll('.counter-num');
                animateCounters(Array.from(nums));
            }
        });

        // ── Service cards stagger ──
        const serviceCards = document.querySelectorAll('.service-card');
        if (serviceCards.length > 0) {
            gsap.fromTo(serviceCards,
                { opacity: 0, y: 50 },
                {
                    opacity: 1, y: 0,
                    duration: 0.7, stagger: 0.07, ease: 'power3.out',
                    scrollTrigger: {
                        trigger: '#service-grid-home',
                        start: 'top 85%',
                        once: true
                    }
                }
            );
        }

        // ── Footer reveal ──
        const footer = document.getElementById('footer');
        if (footer) {
            gsap.fromTo(footer.querySelector('.footer-content'),
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
                    scrollTrigger: { trigger: footer, start: 'top 90%', once: true }
                }
            );
        }

        // ── Scroll progress bar ──
        const progressBar = document.createElement('div');
        progressBar.id = 'gsap-scroll-progress';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            height: 2px;
            background: linear-gradient(90deg, #a855f7, #ec4899, #06b6d4);
            transform-origin: left center;
            transform: scaleX(0);
            z-index: 10002;
            pointer-events: none;
        `;
        document.body.appendChild(progressBar);

        gsap.to(progressBar, {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
                trigger: document.documentElement,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0
            }
        });

        // ── Refresh on dynamic content load ──
        setTimeout(() => ScrollTrigger.refresh(), 1500);
    });

    // ═══════════════════════════════════════════════
    // 5. IMAGE LAZY-LOAD WITH FADE IN
    // ═══════════════════════════════════════════════
    if ('IntersectionObserver' in window) {
        const imgObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const img = e.target;
                    img.style.transition = 'opacity 0.5s ease';
                    img.style.opacity = '1';
                    imgObs.unobserve(img);
                }
            });
        }, { rootMargin: '200px' });

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            img.style.opacity = '0';
            imgObs.observe(img);
        });
    }

})();
