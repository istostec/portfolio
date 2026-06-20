document.addEventListener('DOMContentLoaded', () => {
    const apiCandidates = [
        window.location.origin &&
        window.location.origin !== 'null' &&
        !window.location.origin.startsWith('file:')
            ? window.location.origin
            : '',
        'http://127.0.0.1:5000',
        'http://localhost:5000'
    ].filter(Boolean);

    const normalizeApiPath = (path) => {
        if (!path) return '/';
        return /^https?:\/\//i.test(path) ? path : path.startsWith('/') ? path : `/${path}`;
    };

    const resolveApiUrls = (path) => {
        const normalizedPath = normalizeApiPath(path);
        if (/^https?:\/\//i.test(normalizedPath)) {
            return [normalizedPath];
        }
        return apiCandidates.map((base) => `${base}${normalizedPath}`);
    };

    const fetchJsonWithFallback = async (path) => {
        let lastError;
        for (const url of resolveApiUrls(path)) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return await response.json();
                }
                lastError = new Error(`Request failed for ${url} with status ${response.status}`);
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error(`Unable to fetch ${path}`);
    };

    const encodeAssetPath = (value) => value.split(' ').join('%20').split('&').join('%26');
    const resolveAssetUrl = (value) => {
        const normalized = value || '';
        if (/^https?:\/\//i.test(normalized)) {
            return normalized;
        }
        const encoded = encodeAssetPath(normalized);
        const base = apiCandidates[0] || 'http://127.0.0.1:5000';
        return `${base}${encoded.startsWith('/') ? '' : '/'}${encoded}`;
    };

    // 1. SCROLL REVEAL OBSERVER
    const initScrollReveal = () => {
        const revealElements = document.querySelectorAll('.reveal');
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const delay = entry.target.dataset.delay || 0;
                        setTimeout(() => {
                            entry.target.classList.add('in');
                        }, parseInt(delay));
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

            revealElements.forEach(el => observer.observe(el));
        } else {
            revealElements.forEach(el => el.classList.add('in'));
        }
    };

    // 2. DYNAMIC CONTENT RENDERING: SERVICES
    const renderServices = async () => {
        const serviceGrids = document.querySelectorAll('[data-service-grid]');
        if (serviceGrids.length === 0) return;
        
        serviceGrids.forEach(async (serviceGrid) => {
            const apiUrl = serviceGrid.dataset.api || '/api/services';
            const fallbackMarkup = serviceGrid.innerHTML;
            try {
                const data = await fetchJsonWithFallback(apiUrl);
                
                if (Array.isArray(data.services) && data.services.length > 0) {
                    const isTechPage = serviceGrid.classList.contains('service-card-grid');
                    serviceGrid.innerHTML = ''; // Clear fallback services
                    data.services.forEach((service, index) => {
                        const delay = (index * 80) % 400;
                        const card = document.createElement('article');
                        
                        if (isTechPage) {
                            card.className = 'service-tech-card';
                            card.setAttribute('data-delay', delay);
                            card.style.opacity = '1';
                            card.style.transform = 'none';
                            const num = String(index + 1).padStart(2, '0');
                            
                            // Derive group tag based on service title
                            let group = 'Service';
                            const titleLower = service.title.toLowerCase();
                            if (titleLower.includes('development') || titleLower.includes('deploy')) group = 'Engineering';
                            else if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux')) group = 'Design';
                            else if (titleLower.includes('seo') || titleLower.includes('management') || titleLower.includes('social')) group = 'Growth';
                            else if (titleLower.includes('hosting') || titleLower.includes('cloud')) group = 'Infrastructure';
                            
                            // Try to map an icon from icon field or defaults
                            let iconEmoji = '💻';
                            if (service.icon === 'WD') iconEmoji = '💻';
                            else if (service.icon === 'UX') iconEmoji = '✨';
                            else if (service.icon === 'MA') iconEmoji = '📱';
                            else if (service.icon === 'AI') iconEmoji = '🤖';
                            else if (service.icon === 'DB') iconEmoji = '🗄️';
                            else if (service.icon === 'DH') iconEmoji = '🌐';
                            else if (service.icon === 'CD') iconEmoji = '☁️';
                            else if (service.icon === 'MS') iconEmoji = '🛡️';
                            else if (service.icon === 'SE') iconEmoji = '📈';
                            else if (service.icon === 'EC') iconEmoji = '🛒';
                            else if (service.icon === 'SM') iconEmoji = '📲';
                            
                            // Map service icon/title to proper image file
                            const imageMap = {
                                'WD': '../images/web_dev.png',
                                'UX': '../images/uiux.png',
                                'MA': '../images/app_dev.png',
                                'AI': '../images/AI_auto.png',
                                'DB': '../images/database.png',
                                'DH': '../images/domain & hosting.png',
                                'CD': '../images/cloude.png',
                                'MS': '../images/web_main.png',
                                'SE': '../images/sco.png',
                                'EC': '../images/E-com.png',
                                'SM': '../images/cm.png'
                            };
                            
                            // Also try to guess by title
                            function getImageByTitle(title) {
                                const t = title.toLowerCase();
                                if (t.includes('web dev')) return '../images/web_dev.png';
                                if (t.includes('ui') || t.includes('ux') || t.includes('design')) return '../images/uiux.png';
                                if (t.includes('mobile') || t.includes('app dev')) return '../images/app_dev.png';
                                if (t.includes('ai') || t.includes('automation')) return '../images/AI_auto.png';
                                if (t.includes('database')) return '../images/database.png';
                                if (t.includes('domain') || t.includes('hosting')) return '../images/domain & hosting.png';
                                if (t.includes('cloud') || t.includes('deploy')) return '../images/cloude.png';
                                if (t.includes('maintenance') || t.includes('support')) return '../images/web_main.png';
                                if (t.includes('seo')) return '../images/sco.png';
                                if (t.includes('commerce') || t.includes('e-com')) return '../images/E-com.png';
                                if (t.includes('social') || t.includes('media')) return '../images/cm.png';
                                return '';
                            }
                            
                            const imgSrc = imageMap[service.icon] || getImageByTitle(service.title) || '';
                            const safeImgSrc = imgSrc ? resolveAssetUrl(imgSrc) : '';
                            const imgHtml = safeImgSrc 
                                ? `<div class="service-art"><img src="${safeImgSrc}" alt="${service.title}" loading="lazy" decoding="async"></div>` 
                                : `<div class="service-art" style="font-size: 2.2rem; margin-bottom: 20px; display:flex; align-items:center; justify-content:center; height:60px;">${iconEmoji}</div>`;
                            
                            const servicePills = [service.icon || 'Service', group, service.title.split(' ')[0] || 'Digital'];
                            card.innerHTML = `
                                ${imgHtml}
                                <div class="service-top"><span>${num}</span><strong>${group}</strong></div>
                                <h3>${service.title}</h3>
                                <p>${service.description}</p>
                                <div class="tech-pills">${servicePills.map((pill) => `<span>${pill}</span>`).join('')}</div>
                            `;
                        } else {
                            card.className = 'service-card';
                            card.setAttribute('data-delay', delay);
                            card.style.opacity = '1';
                            card.style.transform = 'none';
                            const icon = service.icon || 'WD';
                            // Map icon to image for home page cards too
                            const homeImageMap = {
                                'WD': '../images/web_dev.png',
                                'UX': '../images/uiux.png',
                                'MA': '../images/app_dev.png',
                                'AI': '../images/AI_auto.png',
                                'DB': '../images/database.png',
                                'DH': '../images/domain & hosting.png',
                                'CD': '../images/cloude.png',
                                'MS': '../images/web_main.png',
                                'SE': '../images/sco.png',
                                'EC': '../images/E-com.png',
                                'SM': '../images/cm.png'
                            };
                            
                            function getHomeImageByTitle(title) {
                                const t = title.toLowerCase();
                                if (t.includes('web dev')) return '../images/web_dev.png';
                                if (t.includes('ui') || t.includes('ux') || t.includes('design')) return '../images/uiux.png';
                                if (t.includes('mobile') || t.includes('app dev')) return '../images/app_dev.png';
                                if (t.includes('ai') || t.includes('automation')) return '../images/AI_auto.png';
                                if (t.includes('database')) return '../images/database.png';
                                if (t.includes('domain') || t.includes('hosting')) return '../images/domain & hosting.png';
                                if (t.includes('cloud') || t.includes('deploy')) return '../images/cloude.png';
                                if (t.includes('maintenance') || t.includes('support')) return '../images/web_main.png';
                                if (t.includes('seo')) return '../images/sco.png';
                                if (t.includes('commerce') || t.includes('e-com')) return '../images/E-com.png';
                                if (t.includes('social') || t.includes('media')) return '../images/cm.png';
                                return '';
                            }
                            
                            const homeImgSrc = homeImageMap[icon] || getHomeImageByTitle(service.title) || '';
                            const safeHomeImgSrc = homeImgSrc ? resolveAssetUrl(homeImgSrc) : '';
                            const mediaHtml = safeHomeImgSrc
                                ? `<div class="service-media"><img src="${safeHomeImgSrc}" alt="${service.title}" loading="lazy" decoding="async"></div>`
                                : `<div class="service-media" style="display:none;"></div>`;
                            
                            card.innerHTML = `
                                ${mediaHtml}
                                <div class="service-icon">${icon}</div>
                                <h3>${service.title}</h3>
                                <p>${service.description}</p>
                                <a href="services.html">Explore Service</a>
                            `;
                        }
                        serviceGrid.appendChild(card);
                    });

                    requestAnimationFrame(() => {
                        serviceGrid.querySelectorAll('.service-tech-card, .service-card').forEach((el) => {
                            el.classList.remove('reveal');
                            el.style.opacity = '1';
                            el.style.transform = 'none';
                        });
                    });
                    initScrollReveal();
                } else {
                    serviceGrid.innerHTML = fallbackMarkup;
                    requestAnimationFrame(() => {
                        serviceGrid.querySelectorAll('.service-tech-card, .service-card').forEach((el) => {
                            el.classList.remove('reveal');
                            el.style.opacity = '1';
                            el.style.transform = 'none';
                        });
                    });
                    initScrollReveal();
                }
            } catch (error) {
                console.error('Error fetching services:', error);
                serviceGrid.innerHTML = fallbackMarkup;
                requestAnimationFrame(() => {
                    serviceGrid.querySelectorAll('.service-tech-card, .service-card').forEach((el) => {
                        el.classList.remove('reveal');
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                    });
                });
                initScrollReveal();
            }
        });
    };

    // 3. DYNAMIC CONTENT RENDERING: REVIEWS/TESTIMONIALS
    const renderReviews = async () => {
        const reviewGrid = document.querySelector('[data-review-grid]');
        if (!reviewGrid) return;

        reviewGrid.innerHTML = `<div class="reveal" style="grid-column: 1/-1; text-align:center; padding: 24px; color: var(--text-muted); font-weight: 600;">Loading reviews...</div>`;
        const apiUrl = reviewGrid.dataset.api || '/api/reviews';
        try {
            const data = await fetchJsonWithFallback(apiUrl);
            
            if (data.reviews && data.reviews.length > 0) {
                reviewGrid.innerHTML = '';
                data.reviews.forEach((review, index) => {
                    const delay = (index * 100) % 300;
                    const card = document.createElement('article');
                    card.className = 'testimonial-card reveal';
                    card.setAttribute('data-delay', delay);
                    
                    const rating = Number(review.rating) || 0;
                    const stars = '&#9733;'.repeat(Math.max(0, Math.min(5, rating))) + '&#9734;'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, rating))));
                    const reviewName = review.client_name || review.client || 'Client';
                    const reviewRole = review.company_name || review.role || '';
                    const reviewMessage = review.review || review.message || '';
                    const company = reviewRole ? `, ${reviewRole}` : '';
                    card.innerHTML = `
                        <div class="rating" aria-label="${rating} out of 5 stars" style="
                            color: #FBBF24;
                            font-size: 1.3rem;
                            margin-bottom: 18px;
                        ">${stars}</div>
                        <p style="
                            font-style: italic;
                            font-size: 1.05rem;
                            margin-bottom: 20px;
                        ">"${reviewMessage}"</p>
                        <h4 style="
                            font-weight: 800;
                            font-size: 1.15rem;
                        ">${reviewName}</h4>
                        <span class="client-role" style="
                            font-size: 12px;
                            color: var(--text-muted);
                            font-weight: 600;
                        ">${company}</span>
                    `;
                    reviewGrid.appendChild(card);
                });
            } else {
                reviewGrid.innerHTML = `<div class="reveal" style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted); font-weight: 600;">No reviews added yet.</div>`;
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
    };

    // 4. DYNAMIC PORTFOLIO PROJECTS WITH FILTERING
    const renderProjects = async () => {
        const homeProjectGrid = document.querySelector('[data-home-project-grid]');
        const mainProjectGrid = document.querySelector('[data-project-grid]');
        const filterContainer = document.querySelector('[data-portfolio-filter]');

        if (!homeProjectGrid && !mainProjectGrid) return;

        const grid = homeProjectGrid || mainProjectGrid;
        const apiUrl = grid.dataset.api || '/api/projects';
        grid.innerHTML = `<div class="reveal" style="grid-column: 1/-1; text-align:center; padding: 24px; color: var(--text-muted); font-weight: 600;">Loading projects...</div>`;

        try {
            const data = await fetchJsonWithFallback(apiUrl);

            let allProjects = data.projects || [];

            if (allProjects.length > 0) {
                grid.innerHTML = '';

                // Filter logic for main portfolio page
                if (mainProjectGrid && filterContainer) {
                    const filterButtons = filterContainer.querySelectorAll('button');
                    
                    const filterProjects = (category) => {
                        mainProjectGrid.innerHTML = '';
                        let filtered = allProjects;
                        if (category !== 'all') {
                            filtered = allProjects.filter(p => p.category.toLowerCase() === category.toLowerCase());
                        }
                        
                        if (filtered.length === 0) {
                            mainProjectGrid.innerHTML = `<div class="reveal" style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted); font-weight: 600;">No projects in this category yet.</div>`;
                            initScrollReveal();
                            return;
                        }

                        filtered.forEach((project, index) => {
                            createProjectCard(mainProjectGrid, project, index);
                        });
                        initScrollReveal();
                    };

                    filterButtons.forEach(btn => {
                        btn.addEventListener('click', () => {
                            filterButtons.forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                            filterProjects(btn.dataset.category);
                        });
                    });

                    // Initial render of all
                    filterProjects('all');
                } else if (homeProjectGrid) {
                    const featuredProjects = allProjects.filter(p => p.status === 'Featured');
                    const displayList = featuredProjects.length > 0 ? featuredProjects : allProjects.slice(0, 3);
                    
                    displayList.forEach((project, index) => {
                        createProjectCard(homeProjectGrid, project, index);
                    });
                }
            } else {
                grid.innerHTML = `<div class="reveal" style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted); font-weight: 600;">No projects added yet.</div>`;
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            if (grid) {
                grid.innerHTML = `<div class="reveal" style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted); font-weight: 600;">Unable to load projects right now.</div>`;
            }
        }
    };

    const createProjectCard = (container, project, index) => {
        const delay = (index * 100) % 300;
        const card = document.createElement('article');
        card.className = 'portfolio-card reveal';
        card.setAttribute('data-delay', delay);
        
        // Handle image source
const title = project.title || 'Untitled Project';
        const category = project.category || 'Project';
        const description = project.description || '';
        const imageSrc = project.image_url || project.image || '';
        const hasImage = imageSrc && imageSrc.trim() !== '';
        const imgHtml = hasImage 
            ? `<img src="${imageSrc}" alt="${title}">`
            : `<span>${title.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()}</span>`;
            
        // Tech pills
        const techString = project.tech || project.technologies || '';
        const techArray = techString ? techString.split(',').map(t => t.trim()).filter(Boolean) : [];
        const techHtml = techArray.map(t => `<span class="chip">${t}</span>`).join('');

        card.innerHTML = `
            <div class="project-visual">
                ${imgHtml}
            </div>
            <div class="project-copy">
                <span class="project-category">${category}</span>
                <h3>${title}</h3>
                <p>${description.slice(0, 150)}${description.length > 150 ? '...' : ''}</p>
                <div class="chip-row">${techHtml}</div>
                <span style="
                    display: inline-flex;
                    align-items: center;
                    margin-top: 24px;
                    color: var(--primary);
                    font-weight: 800;
                    font-size: 0.95rem;
                ">View Case Study &rarr;</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            window.location.href = `project-detail.html?id=${project.id}`;
        });
        
        container.appendChild(card);
    };

    // 5. DYNAMIC CASE STUDY GENERATION FOR DETAILS PAGE
    const loadProjectDetails = async () => {
        const detailsContainer = document.getElementById('projectDetailContainer');
        if (!detailsContainer) return;

        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');

        if (!projectId) {
            detailsContainer.innerHTML = `<div class="section-band text-center"><h2>No Project Specified</h2><p>Please return to the <a href="portfolio.html">portfolio</a> page.</p></div>`;
            return;
        }

        let project = null;

        try {
            const resData = await fetchJsonWithFallback(`/api/projects/${projectId}`);
            project = resData.project;
        } catch (error) {
            console.error('Error fetching project details from API:', error);
        }

        if (!project) {
            detailsContainer.innerHTML = `
                <div style="padding: 100px 8%; text-align: center;">
                    <h2 style="font-size: 2.2rem; font-weight: 800; margin-bottom: 16px;">Case Study Not Found</h2>
                    <p style="color: var(--text-muted); margin-bottom: 30px;">The project you are looking for does not exist or has been removed from the archive.</p>
                    <a href="portfolio.html" class="btn-dark-page">Back to Portfolio</a>
                </div>
            `;
            return;
        }

        // Fill page metadata
        document.title = `${project.title} | ISTOS TECH Showcase`;
        document.getElementById('projectTitle').textContent = project.title;
        document.getElementById('projectCategory').textContent = project.category;
        document.getElementById('projectMetaCategory').textContent = project.category;
        document.getElementById('projectDescription').textContent = project.description;
        
        // Render Tech list
        const techString = project.tech || project.technologies || '';
        const techArray = techString ? techString.split(',').map(t => t.trim()) : [];
        const techContainer = document.getElementById('projectTech');
        techContainer.innerHTML = '';
        techArray.forEach(tech => {
            const badge = document.createElement('span');
            badge.textContent = tech;
            techContainer.appendChild(badge);
        });

        // Set dynamic Hero Banner Image
        const heroImg = document.getElementById('projectHeroImg');
        const heroImageSrc = project.image_url || project.image || '';
        const baseOrigin = window.location.origin || '';
        if (heroImageSrc) {
            heroImg.src = heroImageSrc.startsWith('http')
                ? heroImageSrc
                : `${baseOrigin}${heroImageSrc.startsWith('/') ? '' : '/'}${heroImageSrc}`;
            heroImg.style.display = 'block';
        } else {
            heroImg.style.display = 'none';
            heroImg.parentElement.style.background = 'var(--grad-blue)';
            heroImg.parentElement.innerHTML = `<div style="font-size: 5rem; font-weight: 900; color: rgba(255,255,255,0.25); text-transform: uppercase; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">${project.title.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()}</div>`;
        }

        const screenshotsContainer = document.getElementById('projectScreenshots');
        if (screenshotsContainer) {
            screenshotsContainer.innerHTML = '';
            if (heroImageSrc) {
                const block = document.createElement('div');
                block.className = 'gallery-image';
                const resolvedHeroImageSrc = heroImageSrc.startsWith('http')
                    ? heroImageSrc
                    : `${baseOrigin}${heroImageSrc.startsWith('/') ? '' : '/'}${heroImageSrc}`;
                block.innerHTML = `
                    <img src="${resolvedHeroImageSrc}" alt="${project.title}" style="width: 100%; height: 200px; object-fit: cover;">
                `;
                screenshotsContainer.appendChild(block);
            }
        }

        initScrollReveal();
    };

    // 6. FAQ HANDLER FOR SERVICES PAGE
    const initFAQ = () => {
        const faqCards = document.querySelectorAll('[data-faq]');
        faqCards.forEach(card => {
            const btn = card.querySelector('button');
            btn.addEventListener('click', () => {
                const isOpen = card.classList.contains('open');
                faqCards.forEach(c => c.classList.remove('open'));
                if (!isOpen) {
                    card.classList.add('open');
                }
            });
        });
    };

    // EXECUTION ROUTER
    renderServices();
    renderReviews();
    renderProjects();
    loadProjectDetails();
    initFAQ();
    initScrollReveal();
});
