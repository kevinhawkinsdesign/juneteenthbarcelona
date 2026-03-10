// ── NAV scroll shadow ──────────────────────────────
window.addEventListener('scroll', () => {
  document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 20);
});

// ── Mobile nav toggle ──────────────────────────────
const toggle = document.querySelector('.nav-mobile-toggle');
const navLinks = document.querySelector('.nav-links');
if (toggle && navLinks) {
  toggle.addEventListener('click', () => navLinks.classList.toggle('open'));
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
