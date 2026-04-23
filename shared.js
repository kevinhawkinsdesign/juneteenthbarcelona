// ── Mobile nav toggle ──────────────────────────────
const toggle = document.querySelector('.nav-mobile-toggle');
const navLinks = document.querySelector('.nav-links');

function closeMobileMenu() {
  if (!navLinks || !toggle) return;
  navLinks.classList.remove('open');
  toggle.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  const scrollY = parseInt(document.documentElement.style.getPropertyValue('--scroll-lock-top') || '0') * -1;
  document.body.classList.remove('scroll-locked');
  document.documentElement.style.removeProperty('--scroll-lock-top');
  window.scrollTo(0, scrollY);
}

if (toggle && navLinks) {
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !navLinks.classList.contains('open');
    if (opening) {
      navLinks.classList.add('open');
      toggle.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      document.documentElement.style.setProperty('--scroll-lock-top', `-${window.scrollY}px`);
      document.body.classList.add('scroll-locked');
    } else {
      closeMobileMenu();
    }
  });

  // Close when clicking a nav link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('open') && !e.target.closest('nav')) {
      closeMobileMenu();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
  });
}

// ── Active nav link ────────────────────────────────
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

// ── Scroll reveal ──────────────────────────────────
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ── Page content loader from _data/pages/<page>.json ──────
async function loadPageContent(dataFile) {
  try {
    const res = await fetch(dataFile);
    if (!res.ok) return;
    const data = await res.json();
    document.querySelectorAll('[data-cms]').forEach(el => {
      const key = el.getAttribute('data-cms');
      if (data[key] !== undefined) {
        el.innerHTML = data[key];
      }
    });
    document.querySelectorAll('[data-cms-href]').forEach(el => {
      const key = el.getAttribute('data-cms-href');
      if (data[key] !== undefined) el.href = data[key];
    });
    document.querySelectorAll('[data-cms-src]').forEach(el => {
      const key = el.getAttribute('data-cms-src');
      if (data[key] !== undefined) el.src = data[key];
    });
    document.querySelectorAll('[data-cms-alt]').forEach(el => {
      const key = el.getAttribute('data-cms-alt');
      if (data[key] !== undefined) el.alt = data[key];
    });
  } catch (e) {
    // Silently fall back to hardcoded HTML content
  }
}

// ── Gallery nav toggle (reads from _data/settings.json) ────
async function applyGalleryNavVisibility() {
  try {
    const res = await fetch('/_data/settings.json');
    if (!res.ok) throw new Error();
    const settings = await res.json();
    const show = settings.show_gallery_nav === true;
    document.querySelectorAll('.nav-gallery-link').forEach(el => {
      el.style.display = show ? '' : 'none';
    });
  } catch {
    document.querySelectorAll('.nav-gallery-link').forEach(el => {
      el.style.display = 'none';
    });
  }
}
applyGalleryNavVisibility();

// ── Language picker dropdown ───────────────────────
const LANG_LABELS = { en: 'EN', es: 'ES', ca: 'CA' };

function getCurrentLang() {
  const match = document.cookie.match(/googtrans=\/en\/([a-z]+)/);
  return match ? match[1] : 'en';
}

function switchLang(lang) {
  if (lang === 'en') {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
  } else {
    document.cookie = 'googtrans=/en/' + lang + '; path=/';
    document.cookie = 'googtrans=/en/' + lang + '; path=/; domain=.' + location.hostname;
  }
  location.reload();
}

function initLangPicker() {
  const picker = document.querySelector('.lang-picker');
  if (!picker) return;
  const trigger = picker.querySelector('.lang-trigger');
  const currentLangLabel = picker.querySelector('.lang-current');
  const dropdown = picker.querySelector('.lang-dropdown');
  const activeLang = getCurrentLang();
  if (currentLangLabel) currentLangLabel.textContent = LANG_LABELS[activeLang] || 'EN';
  picker.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('lang-active', opt.dataset.lang === activeLang);
  });
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    picker.classList.toggle('open');
  });
  document.addEventListener('click', () => picker.classList.remove('open'));
  dropdown.addEventListener('click', e => e.stopPropagation());
  picker.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => switchLang(opt.dataset.lang));
  });
}

document.addEventListener('DOMContentLoaded', initLangPicker);

// ── Google Translate init ──────────────────────────
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,es,ca',
    autoDisplay: false
  }, 'google_translate_element');
}

// ── Custom cursor ──────────────────────────────────────────
(function() {
  const el = document.createElement('div');
  el.className = 'cursor';
  el.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"></div>';
  document.body.appendChild(el);

  const dot  = el.querySelector('.cursor-dot');
  const ring = el.querySelector('.cursor-ring');
  let mx = -100, my = -100, rx = -100, ry = -100;
  let hidden = false;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (hidden) { el.classList.remove('hidden'); hidden = false; }
    dot.style.transform  = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
  });

  // Ring follows with slight lag
  function animateRing() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Hover state on interactive elements
  const hoverTargets = 'a, button, [role="button"], input, select, textarea, label, .page-nav-item, .wt-stop, .gallery-item, .share-btn, .lang-option';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(hoverTargets)) el.classList.add('hovering');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(hoverTargets)) el.classList.remove('hovering');
  });

  // Click state
  document.addEventListener('mousedown', () => el.classList.add('clicking'));
  document.addEventListener('mouseup',   () => el.classList.remove('clicking'));

  // Hide when leaving window
  document.addEventListener('mouseleave', () => { el.classList.add('hidden'); hidden = true; });
  document.addEventListener('mouseenter', () => { el.classList.remove('hidden'); hidden = false; });
})();
