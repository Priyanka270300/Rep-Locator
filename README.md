# Robroy Rep Locator

A full-stack web application and embeddable locator widget for Robroy Industries brands (Plasti-Bond, Stahlin, Attabox, Rocket Rack, Robroy Stainless, etc.). Customers, distributors and internal users can find sales representatives and agencies by brand and geography — Country → State → County → Zip — with interactive US and World SVG maps.

## Features

- **Multi-brand support** — dynamic filtering across brand codes (`RR`, `PM`, `ST`, `AT`, `PB`, `RS`, ...).
- **Hierarchical geo search** — Country → State → County → Zip Code.
- **Interactive SVG maps** — clickable US map and a World map for non-US countries.
- **Embeddable widget** — pre-bundled `public/locator.bundle.js` customisable with Mustache.js templates.
- **Bulk CSV import** — fast ingestion into MySQL via `LOAD DATA LOCAL INFILE`.
- **Admin import & restore** — preview, validate, publish datasets and restore from history.

## Tech Stack

- **Backend:** Node.js, Express, MySQL (`mysql2` / `mysql-promise`)
- **Frontend:** Vanilla JS widget, Mustache.js, SVG maps, Browserify/Babel build
- **Local dev:** Lando / DDEV

## Project Structure

```
Robroy-Rep-Locator/
├── api.js                     # Express server entry point & static hosting
├── app/                       # Data models, import/validation/restore logic
├── routes/                    # API route handlers (Search, Import, Admin)
├── client/                    # Locator widget source (client/locator.js)
├── public/                    # Static assets & integration demo pages
├── migrations/                # SQL migration scripts
├── scripts/                   # Data import automation scripts
├── utils/                     # Shared utilities (MySQL pool wrapper)
├── database.sql               # Base MySQL schema
└── example.env                # Sample environment configuration
```

## Getting Started

### 1. Configure environment

Create a `.env` from `example.env`:

```ini
LOCATOR_API_DOMAIN=http://replocator.lndo.site
LOCATOR_API_PORT=80
MYSQL_HOST=db
MYSQL_PORT=3306
MYSQL_USER=mysql
MYSQL_PASSWORD=password
MYSQL_DATABASE=database
```

### 2. Install dependencies

```bash
npm install
```

### 3. Initialise the database

```bash
mysql -u mysql -p database < database.sql
mysql -u mysql -p database < migrations/20200117_db_migration_update_unique_key.sql
```

### 4. Build the frontend bundle

```bash
npm run build-client
```

### 5. Start the server

```bash
npm start
```

## API Overview

All endpoints are served under `/api`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/search/reps_by_location` | Representatives matching `brand` (+ optional `country`, `state`, `county`, `zip`) |
| GET | `/api/search/countries` | Countries available for a brand |
| GET | `/api/search/states` | States for a brand / country |
| GET | `/api/search/counties` | Counties for a brand / country / state |
| GET | `/api/import/zip` | Import `Zip` lookup table |
| GET | `/api/import/repcountycombo` | Bulk import reps & territory mappings |
| * | `/api/admin/*` | Dataset preview, validation, publishing and restore |

## Embedding the Widget

```html
<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>
<script src="/locator.bundle.js"></script>

<div id="replocator">
  <div id="locator-map"></div>
  <form id="locator-search">
    <select id="locator-country" name="country"></select>
    <select id="locator-state" name="state"></select>
    <input id="locator-county" name="county" placeholder="County">
    <input id="locator-zip" name="zip" placeholder="Zip Code">
    <button id="form-reset">Reset</button>
  </form>
  <div id="locator-results"></div>
</div>

<script>
  window.onload = function () {
    repLocator.init({
      brand: 'PB',
      map: document.getElementById('locator-map'),
      countryInput: document.getElementById('locator-country'),
      stateInput: document.getElementById('locator-state'),
      countyInput: document.getElementById('locator-county'),
      zipInput: document.getElementById('locator-zip'),
      resetForm: document.getElementById('form-reset'),
      resultsBox: document.getElementById('locator-results'),
      repTemplate: '<div class="rep-card"><h3>{{agency}}</h3>...',
      fallbackTemplate: '<div class="no-rep">Please contact factory customer support.</div>'
    });
  };
</script>
```

## Documentation

- [`agent.md`](agent.md) — architecture, schema, API reference and troubleshooting.
- [`IMPLEMENTATION_AND_RESTORE_GUIDE.md`](IMPLEMENTATION_AND_RESTORE_GUIDE.md) — RS data import and Drupal database restore steps.
