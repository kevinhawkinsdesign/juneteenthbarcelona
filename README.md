# Juneteenth Barcelona

Website for **Juneteenth Barcelona 2026** — a day of unity and celebration for the African diaspora in Barcelona.

**Date:** Saturday, June 20, 2026  
**Venue:** Roots Gastro Club, Carrer de Badajoz 115, 08018 Barcelona, España
**Live site:** https://juneteenth.es

---

## Pages

| Page | File | CMS JSON | Description |
|------|------|----------|-------------|
| Homepage | `index.html` | `_data/pages/home.json` | Hero, countdown, next event promo, walking tour preview |
| About | `about.html` | `_data/pages/about.json` | About Juneteenth & the organizing committee |
| Event | `event.html` | `_data/pages/event.json` | Event details, program, venue gallery carousel |
| Gallery | `gallery.html` | `_data/gallery.json` | Photo gallery |
| Contact | `contact.html` | `_data/pages/contact.json` | Contact, volunteer & sponsor form |
| Monthly Events | `monthly-events.html` | — | Recurring monthly meetup listing |
| Walking Tour Start | `walking-tour/index.html` | — | Tour intro — Estació de França & Langston Hughes |
| Slave Trade | `walking-tour/spanish-slave-trade.html` | `_data/pages/spanish-slave-trade.json` | Stops 1–10 — Spanish Slave Trade history |
| Pre-War Timeline | `walking-tour/countdown-to-civil-war.html` | `_data/pages/countdown-to-civil-war.json` | Timeline 1898–1936 leading to the Civil War |
| Civil War | `walking-tour/spanish-civil-war.html` | — | Barcelona & the Spanish Civil War |
| El Raval | `walking-tour/el-raval.html` | `_data/pages/el-raval.json` | El Raval, Barri Xines & Little Harlem (stop 10) |
| Post-War Intellectuals | `walking-tour/post-war-intellectuals.html` | `_data/pages/post-war-intellectuals.json` | Stops 11–14 — MACBA, CCCB, Richard Wright, James Baldwin |

---

## File Structure

```
juneteenthbarcelona/
├── index.html                             ← Homepage
├── about.html                             ← About & committee
├── event.html                             ← Event details & venue gallery
├── gallery.html                           ← Photo gallery
├── contact.html                           ← Contact / volunteer / sponsor
├── monthly-events.html                    ← Monthly meetup series
├── shared.css                             ← Global styles
├── shared.js                              ← Global JS (scroll, language, content loader)
├── netlify.toml                           ← Netlify deployment config
├── admin/
│   ├── index.html                         ← Netlify CMS login (/admin)
│   └── config.yml                         ← CMS field definitions for all pages
├── _data/
│   ├── event.json                         ← Event details (date, venue, schedule)
│   ├── gallery.json                       ← Gallery photo list
│   ├── monthly-events.json                ← Monthly events list
│   ├── settings.json                      ← Site-wide settings (tagline, email, socials)
│   └── pages/
│       ├── home.json                      ← Homepage text content
│       ├── about.json                     ← About page text content
│       ├── contact.json                   ← Contact page text content
│       ├── event.json                     ← Event page text (program, venue, tickets)
│       ├── countdown-to-civil-war.json    ← Pre-war timeline text & images (7 entries)
│       ├── el-raval.json                  ← El Raval page titles & section headings
│       ├── spanish-slave-trade.json       ← Slave trade page headings
│       ├── spanish-civil-war.json         ← Civil war page headings
│       ├── gallery.json                   ← Gallery page headings
│       └── post-war-intellectuals.json    ← Post-war page — stops 11–14 text & images
├── images/
│   ├── roots/                             ← Venue photos (IMG_7237–IMG_7266.jpeg)
│   └── ...
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

All page text is stored in JSON files under `_data/pages/`. The Netlify CMS (accessed at `/admin`) exposes these as editable forms. When a change is saved:

1. The JSON file is updated in GitHub via Git Gateway
2. Netlify detects the push and redeploys the site (~30 seconds)
3. On page load, `shared.js` fetches the page's JSON and injects the content into any HTML element that has a matching `data-cms="field_name"` attribute

### Adding a new editable field

1. Add `data-cms="my_field"` to the HTML element you want to make editable
2. Add `"my_field": "default text"` to the corresponding JSON file in `_data/pages/`
3. Add a field definition to `admin/config.yml` under the relevant collection
4. Commit and push — the field will appear in the CMS immediately

---

## CMS Sections — What You Can Edit

Go to `juneteenth.es/admin` and log in. The following sections are available:

| CMS Section | JSON file | What you can edit |
|------------|-----------|-------------------|
| **Home Page** | `_data/pages/home.json` | Hero text, next event promo (date, title, time, location), intro, stats, walking tour teaser |
| **About Page** | `_data/pages/about.json` | Hero, mission text, story, goals, committee intro, CTA button |
| **Contact Page** | `_data/pages/contact.json` | Hero, contact info, form title |
| **Event Details** | `_data/event.json` | Global event date, venue, registration link, programme schedule |
| **Event Page** | `_data/pages/event.json` | Hero tagline, ticket tiers, program section, performances, food village, what to expect, what is Juneteenth, venue info |
| **Walking Tour: Pre-War Timeline** | `_data/pages/countdown-to-civil-war.json` | Intro paragraph; all 7 timeline entries (year, title, body text, images) |
| **Walking Tour: El Raval** | `_data/pages/el-raval.json` | Page title, section heading, stop numbers and titles |
| **Walking Tour: Spanish Slave Trade** | `_data/pages/spanish-slave-trade.json` | Page title, section heading |
| **Walking Tour: Post-War Intellectuals** | `_data/pages/post-war-intellectuals.json` | Intro paragraphs; stops 11–14 (titles, addresses, image URLs, image alt text) |
| **Announcements** | `_data/announcements/` | Create/edit/publish news posts |
| **Photo Gallery** | `_data/gallery.json` | Upload photos and captions |
| **Site Settings** | `_data/settings.json` | Tagline, contact email, social media links, gallery nav visibility |

### Updating an image in the CMS

For walking tour pages, images are referenced by URL (Wikimedia Commons or `/images/`). To change an image:

1. Open the relevant CMS section (e.g. "Walking Tour: Post-War Intellectuals")
2. Find the `Image URL` field for the stop you want to update
3. Paste in the new image URL (upload to `/images/` first if it's a local file)
4. Update the `Image Alt Text` field to describe the new image
5. Save — the change deploys automatically

### Updating venue photos (Event page carousel)

The venue gallery on the event page uses all images in `/images/roots/`. To add or replace photos:

1. Upload new JPEG files to `images/roots/` in the GitHub repo
2. Add the corresponding `<div class="venue-gallery-slide"><img src="images/roots/FILENAME.jpeg" ...>` in `event.html`
3. Update the `total` count in the gallery JS at the bottom of `event.html`

---

## Known Issues / To-Do

- [ ] `_data/event.json` — schedule still has placeholder data; needs real programme
- [ ] `_data/settings.json` — `instagram` and `facebook` fields are empty
- [ ] `index.html` — "Next Meetup" promo block date should be updated via CMS (`_data/pages/home.json`)
- [ ] Walking tour pages (slave trade, civil war, el raval, post-war) — most body text is still hardcoded in HTML; only headings and key fields are CMS-editable. Full content migration to JSON is a future task.
- [ ] `walking-tour/el-raval.html` — currently only covers Stop 10 (Little Harlem); expand to all Raval stops 1–10

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

Go to `juneteenth.es/admin` and log in with your invited Netlify Identity account.

Changes save directly to GitHub and publish automatically within ~30 seconds.

See the **CMS Sections** table above for a full breakdown of what each section controls.

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
