# Juneteenth Barcelona

Website for **Juneteenth Barcelona 2026** — a day of unity and celebration for the African diaspora in Barcelona.

**Date:** Saturday, June 20, 2026  
**Venue:** Roots Gastro Club, Carrer de Badajoz 115, 08018 Barcelona, España
**Live site:** https://juneteenth.es

---

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Homepage — hero, countdown ticker, next event promo, walking tour preview |
| `about.html` | About Juneteenth & the organizing committee |
| `event.html` | Event details and schedule |
| `gallery.html` | Photo gallery |
| `contact.html` | Contact, volunteer & sponsor form |
| `walking-tour/index.html` | Walking tour intro (Estació de França & Langston Hughes) |
| `walking-tour/spanish-slave-trade.html` | Stop 01 — Spanish Slave Trade |
| `walking-tour/countdown-to-civil-war.html` | Stop 02 — Countdown to Civil War |
| `walking-tour/spanish-civil-war.html` | Stop 03 — Barcelona & the Spanish Civil War |
| `walking-tour/el-raval.html` | Stop 04 — El Raval & Little Harlem |
| `walking-tour/post-war-intellectuals.html` | Stop 05 — Post-War Intellectuals |

---

## File Structure

```
juneteenthbarcelona/
├── index.html                             ← Homepage
├── about.html                             ← About & committee
├── event.html                             ← Event details & schedule
├── gallery.html                           ← Photo gallery
├── contact.html                           ← Contact / volunteer / sponsor
├── shared.css                             ← Global styles
├── shared.js                              ← Global JS (scroll, language, content loader)
├── netlify.toml                           ← Netlify deployment config
├── admin/
│   ├── index.html                         ← Netlify CMS login (/admin)
│   └── config.yml                         ← CMS field definitions for all pages
├── _data/
│   ├── event.json                         ← Event details (date, venue, schedule)
│   ├── gallery.json                       ← Gallery photo list
│   ├── settings.json                      ← Site-wide settings (tagline, email, socials)
│   └── pages/
│       ├── home.json                      ← Homepage text content (CMS-editable)
│       ├── about.json                     ← About page text content (CMS-editable)
│       └── contact.json                   ← Contact page text content (CMS-editable)
├── images/
└── walking-tour/
    ├── index.html
    ├── spanish-slave-trade.html
    ├── countdown-to-civil-war.html
    ├── spanish-civil-war.html
    ├── el-raval.html
    └── post-war-intellectuals.html
```

---

## How CMS Editing Works

All page text is stored in JSON files under `_data/pages/`. The Netlify CMS exposes these fields as editable forms. When a volunteer saves a change in the CMS:

1. The JSON file is updated in GitHub
2. Netlify redeploys the site
3. `shared.js` fetches the page's JSON on load and injects the updated content into the page

Elements with a `data-cms="field_name"` attribute are automatically updated from the page's JSON file.

---

## Known Issues / To-Do

- [ ] `_data/event.json` — schedule still has placeholder data (`testactivity`); needs real programme
- [ ] `_data/settings.json` — `instagram` and `facebook` fields are empty
- [ ] `admin/config.yml` — update `repo:` field if not already set to `kevinhawkinsdesign/juneteenthbarcelona`
- [ ] `index.html` — "Next Meetup" promo block shows a past date; update `_data/pages/home.json` via CMS
- [ ] OG / Twitter meta tags still reference the Netlify preview domain; update when a custom domain is live
- [ ] No favicon configured

---

## 🚀 Deploy to Netlify (one-time setup)

### Step 1 — GitHub
Ensure the repo is at `github.com/kevinhawkinsdesign/juneteenthbarcelona` (already done).

### Step 2 — Deploy on Netlify
1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site" → "Import an existing project"**
3. Connect GitHub and select the `juneteenthbarcelona` repo
4. Leave all build settings as default and click **"Deploy site"**

### Step 3 — Connect a custom domain
1. In Netlify: **Site settings → Domain management → Add custom domain**
2. Update your domain's DNS records to point to Netlify

### Step 4 — Enable the CMS
1. In Netlify: **Site settings → Identity → Enable Identity**
2. Set registration to **"Invite only"**
3. Enable **Git Gateway** under Identity → Services
4. In `admin/config.yml`, confirm the `repo:` field reads `kevinhawkinsdesign/juneteenthbarcelona`

### Step 5 — Invite volunteers
1. In Netlify: **Identity → Invite users**
2. Volunteers log in at `yoursite.com/admin`

---

## ✏️ Using the CMS

Go to `/admin` on the live site and log in. Sections available:

| Section | What you can edit |
|---------|-------------------|
| **Home Page** | Hero text, next event promo, intro section, walking tour teaser |
| **About Page** | Hero, mission text, story, goals, committee intro, CTA |
| **Contact Page** | Hero, contact info, form title |
| **Event Details** | Date, venue, registration link, full schedule |
| **Announcements** | Create/edit news posts |
| **Photo Gallery** | Upload photos and captions |
| **Site Settings** | Tagline, contact email, social media links |

Changes publish automatically within ~1 minute.

---

## Tech Stack

- Plain HTML / CSS / JS — no build step required
- [Netlify](https://netlify.com) for hosting
- [Netlify CMS](https://www.netlifycms.org/) for content management
- Google Translate widget for EN / ES / CA language switching
- JSON-driven content injection via `shared.js`

---

## Help

Email: barcelona@juneteenth.es
