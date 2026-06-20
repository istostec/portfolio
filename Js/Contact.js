const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let mx = 0;
let my = 0;
let rx = 0;
let ry = 0;

const motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const canUseCustomCursor = cursor && ring && finePointer && motionAllowed;

if (canUseCustomCursor) {
  document.addEventListener('mousemove', (event) => {
    mx = event.clientX;
    my = event.clientY;
    cursor.style.left = `${mx}px`;
    cursor.style.top = `${my}px`;
  }, { passive: true });

  const animateRing = () => {
    rx += (mx - rx) * 0.11;
    ry += (my - ry) * 0.11;
    ring.style.left = `${rx}px`;
    ring.style.top = `${ry}px`;
    requestAnimationFrame(animateRing);
  };

  animateRing();
} else {
  if (cursor) cursor.hidden = true;
  if (ring) ring.hidden = true;
}

const nav = document.getElementById('nav');
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

const updateNav = () => {
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 12);
};

updateNav();
window.addEventListener('scroll', updateNav, { passive: true });

const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mobClose = document.getElementById('mobClose');

const closeMobileMenu = () => {
  if (!hamburger || !mobileMenu) return;
  hamburger.classList.remove('open');
  mobileMenu.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
};

hamburger?.addEventListener('click', () => {
  if (!mobileMenu) return;
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('nav-open', isOpen);
});

mobClose?.addEventListener('click', closeMobileMenu);
mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMobileMenu);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMobileMenu();
});

document.querySelectorAll('.nav-links a.active, .mobile-overlay a.active').forEach((link) => {
  link.setAttribute('aria-current', 'page');
});

const revealItems = document.querySelectorAll(
  '.reveal-fade, .reveal-slide, .reveal-card, .reveal-right'
);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const element = entry.target;
      const delay = parseInt(element.dataset.d || '0', 10);
      setTimeout(() => element.classList.add('in'), delay);
      observer.unobserve(element);
    });
  }, { threshold: 0.12 });

  revealItems.forEach((element) => observer.observe(element));
} else {
  revealItems.forEach((element) => element.classList.add('in'));
}

setTimeout(() => {
  document.querySelectorAll('.hero .reveal-fade, .hero .reveal-slide').forEach((element) => {
    const delay = parseInt(element.dataset.d || '0', 10);
    setTimeout(() => element.classList.add('in'), delay + 300);
  });
}, 100);

loadContactHighlights();

document.querySelectorAll('.faq-item').forEach((item) => {
  const button = item.querySelector('.faq-q');
  if (!button) return;

  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach((openItem) => {
      openItem.classList.remove('open');
      openItem.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      item.classList.add('open');
      button.setAttribute('aria-expanded', 'true');
    }
  });
});

const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const successWrap = document.getElementById('successWrap');
const resetBtn = document.getElementById('resetBtn');
const msgArea = document.getElementById('message');
const charCount = document.getElementById('charCount');
const serviceSelect = document.getElementById('service');

const loadContactHighlights = async () => {
  const emailNode = document.querySelector('[data-contact-email]');
  const subEmailNode = document.querySelector('[data-contact-email-sub]');
  const phoneNode = document.querySelector('[data-contact-phone]');
  const serviceNode = document.querySelector('[data-contact-service]');

  if (!emailNode && !phoneNode && !serviceNode) return;

  try {
    const data = await fetchJsonWithFallback('/api/contacts');
    const latestContact = Array.isArray(data.contacts) && data.contacts.length > 0 ? data.contacts[0] : null;

    if (latestContact?.email && emailNode) {
      emailNode.textContent = latestContact.email;
    }
    if (latestContact?.email && subEmailNode) {
      subEmailNode.textContent = latestContact.email;
    }
    if (latestContact?.phone && phoneNode) {
      phoneNode.textContent = latestContact.phone;
    }
    if (latestContact?.service && serviceNode) {
      serviceNode.textContent = latestContact.service;
    }
  } catch (error) {
    console.error('Unable to load contact highlights:', error);
  }
};

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const setErr = (groupId) => document.getElementById(groupId)?.classList.add('err');
const clrErr = (groupId) => document.getElementById(groupId)?.classList.remove('err');

msgArea?.addEventListener('input', () => {
  const trimmedValue = msgArea.value.slice(0, 1000);
  if (msgArea.value !== trimmedValue) msgArea.value = trimmedValue;

  const length = msgArea.value.length;
  if (charCount) {
    charCount.textContent = String(length);
    charCount.style.color = length > 900 ? '#dc2626' : '';
  }
});

document.getElementById('fullName')?.addEventListener('input', () => clrErr('fg-name'));
document.getElementById('workEmail')?.addEventListener('input', () => clrErr('fg-email'));
msgArea?.addEventListener('input', () => clrErr('fg-msg'));

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!submitBtn || !successWrap || !msgArea) return;

  const name = document.getElementById('fullName')?.value.trim() || '';
  const email = document.getElementById('workEmail')?.value.trim() || '';
  const message = msgArea.value.trim();
  let isValid = true;

  if (!name) {
    setErr('fg-name');
    isValid = false;
  }
  if (!isEmail(email)) {
    setErr('fg-email');
    isValid = false;
  }
  if (!message) {
    setErr('fg-msg');
    isValid = false;
  }

  if (!isValid) {
    submitBtn.classList.add('shake');
    submitBtn.addEventListener('animationend', () => submitBtn.classList.remove('shake'), { once: true });
    return;
  }

  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  const apiUrl = resolveApiUrls('/api/contacts')[0];
  const payload = new FormData(form);
  payload.set('name', name);
  payload.set('email', email);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: payload
    });

    if (!response.ok) throw new Error('Unable to send message');
  } catch (error) {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    submitBtn.classList.add('shake');
    submitBtn.addEventListener('animationend', () => submitBtn.classList.remove('shake'), { once: true });
    return;
  }

  form.style.display = 'none';
  successWrap.classList.add('visible');
  submitBtn.classList.remove('loading');
  submitBtn.disabled = false;
});

resetBtn?.addEventListener('click', () => {
  form?.reset();
  if (charCount) charCount.textContent = '0';
  if (form) form.style.display = 'block';
  successWrap?.classList.remove('visible');
  ['fg-name', 'fg-email', 'fg-msg'].forEach(clrErr);
});

if (submitBtn && finePointer && motionAllowed) {
  submitBtn.addEventListener('mousemove', (event) => {
    const rect = submitBtn.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    submitBtn.style.transform = `translate(${dx * 0.06}px, ${dy * 0.06}px) scale(1.015)`;
  });

  submitBtn.addEventListener('mouseleave', () => {
    submitBtn.style.transform = '';
  });
}

document.querySelectorAll('a[href="#contact-form"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    document.getElementById('contact-form')?.scrollIntoView({
      behavior: motionAllowed ? 'smooth' : 'auto',
      block: 'start'
    });
  });
});

serviceSelect?.addEventListener('change', function handleServiceChange() {
  this.classList.toggle('filled', this.value !== '');
});

const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%,100%{ transform:translateX(0) }
    20%{ transform:translateX(-7px) }
    40%{ transform:translateX(7px) }
    60%{ transform:translateX(-4px) }
    80%{ transform:translateX(4px) }
  }
  .shake { animation: shake .4s ease both !important; }
`;
document.head.appendChild(style);
