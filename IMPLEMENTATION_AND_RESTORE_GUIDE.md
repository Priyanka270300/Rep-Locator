# Robroy Stainless (RS) - Data Implementation, Import & Database Restore Guide

This document outlines the step-by-step instructions to implement and import representative contact & territory datasets (for brand **`RS`** - Robroy Stainless), restore the Drupal 8/9 database, and verify everything in the user interface.

---

## 1. Overview of Assets & Locations

| Component | Path | Description |
| :--- | :--- | :--- |
| **RS Source CSV** | [`Universal Rep Contact Info - All brands website_20260409.xlsx - TerritoryByCounties - RS.csv`](file:///home/sys0025/ygs/robroy/Robroy-Rep-Locator/Universal%20Rep%20Contact%20Info%20-%20All%20brands%20website_20260409.xlsx%20-%20TerritoryByCounties%20-%20RS.csv) | Full territory mapping and sales contact info for brand **RS**. |
| **Import Automation Script** | [`scripts/import-rs.js`](file:///home/sys0025/ygs/robroy/Robroy-Rep-Locator/scripts/import-rs.js) | Automated Node.js script to parse and insert RS records into MySQL. |
| **Rep Locator Server** | [`api.js`](file:///home/sys0025/ygs/robroy/Robroy-Rep-Locator/api.js) | Express.js backend hosting `/api/search/*` and public test pages. |
| **Drupal Site Root** | `/home/sys0025/ygs/robroy/robroy-stainless-d8` | Drupal 8/9 installation for Robroy Stainless. |
| **Drupal DB Restore File** | [`robroy-stainless-d8/stainless-db-aug1126.sql.gz`](file:///home/sys0025/ygs/robroy/robroy-stainless-d8/stainless-db-aug1126.sql.gz) | Compressed database dump for restoring the Drupal website. |
| **Drupal Locator UI Page** | `/locate-representative` or `/rep-finder` | Primary user-facing locator page on the Drupal site. |
| **Standalone Test Page** | [`public/rs.html`](file:///home/sys0025/ygs/robroy/Robroy-Rep-Locator/public/rs.html) | Direct HTML page for standalone browser testing of brand RS. |

---

## 2. CSV Data Mapping & Structure

The CSV contains **23 columns** mapped to MySQL database tables as follows:

```
CSV Columns (23)                               MySQL Tables & Columns
----------------------------------------       ---------------------------------
1.  County Name                         -----> RepCounty.county
2.  State Abbv (e.g. AK, CAN-ON)        -----> RepCounty.state_abbr (varchar 255)
3.  State (e.g. Alaska, Ontario)        -----> RepCounty.state
4.  Country1 (e.g. USA, Canada)         -----> RepCounty.country
5.  TerritoryRegionCode                 -----> RepCounty.territory_id
6.  TerritoryRegion                     -----> RepCounty.territory_name
7.  Brand                               -----> Rep.brand & RepCounty.brand ('RS')
8.  RepAgencyCode (e.g. S098, S073)     -----> Rep.rep_code & RepCounty.rep_code
9.  RepAgency                           -----> Rep.agency
10. Principal                           -----> (Contact metadata)
11. Main Contact                        -----> Rep.contact
12. Address                             -----> Rep.address
13. City                                -----> Rep.city
14. State2                              -----> Rep.state (Agency State)
15. Zip                                 -----> Rep.zip (Agency Zip)
16. Country2                            -----> Rep.country (Agency Country)
17. Phone                               -----> Rep.phone
18. Fax                                 -----> Rep.fax
19. Principal Email                     -----> (Principal contact email)
20. Main Contact Email                  -----> Rep.email
21. Notes                               -----> RepCounty.notes
22. ContactID                           -----> (Ignored)
23. DateStamp                           -----> (Ignored)
```

---

## 3. How to Execute the RS Data Import

The import script is automated and available in [`scripts/import-rs.js`](file:///home/sys0025/ygs/robroy/Robroy-Rep-Locator/scripts/import-rs.js).

### Run the Import Command:
```bash
cd /home/sys0025/ygs/robroy/Robroy-Rep-Locator
node scripts/import-rs.js
```

### What this command does:
1. Reads and parses the CSV file with quoted value support.
2. Clears existing `RS` brand records from `Rep` and `RepCounty` tables (to prevent duplicates or stale records).
3. Inserts all unique representative agency contact profiles into `Rep`.
4. Batch-inserts all **3,281 territory mapping records** across US and Canadian provinces into `RepCounty`.

---

## 4. How to Restore the Drupal Database in `robroy-stainless-d8`

To restore the Drupal 8/9 database state from the backup file [`stainless-db-aug1126.sql.gz`](file:///home/sys0025/ygs/robroy/robroy-stainless-d8/stainless-db-aug1126.sql.gz):

### Option 1: Using DDEV (Recommended)
```bash
cd /home/sys0025/ygs/robroy/robroy-stainless-d8

# 1. Start the DDEV environment (if not already running)
ddev start

# 2. Import the database dump
ddev import-db --file=stainless-db-aug1126.sql.gz

# 3. Clear Drupal cache
ddev drush cr
```

### Option 2: Using Lando
```bash
cd /home/sys0025/ygs/robroy/robroy-stainless-d8
lando start
lando db-import stainless-db-aug1126.sql.gz
lando drush cr
```

### Option 3: Using Direct MySQL CLI
```bash
cd /home/sys0025/ygs/robroy/robroy-stainless-d8
zcat stainless-db-aug1126.sql.gz | mysql -h 127.0.0.1 -P 32775 -u db -pdb db
```

---

## 5. Starting the Rep Locator API Server

Ensure your Rep Locator Node.js server is running:

```bash
cd /home/sys0025/ygs/robroy/Robroy-Rep-Locator
npm start
```
The server will start listening on the port defined in `.env` (`LOCATOR_API_PORT`, e.g., port `3000` or `80`).

---

## 6. How to View and Test in the UI

### Method 1: On the Drupal Website (Full Integrated UI)
1. Open your browser and navigate to:
   **`http://robroy-stainless.ddev.site/locate-representative`**
   *(or `http://robroy-stainless.ddev.site/rep-finder`)*
2. **Interactive Testing**:
   - **Click on a State on the US Map**: For example, click on **Texas (TX)** or **Alaska (AK)**.
   - The dropdown automatically sets the state and displays the reps (e.g. *Bell & McCoy Companies* in Texas, *Pro-Lines Sales & Marketing* in Alaska).
   - **Search by Country**: Switch country to **Canada** to see Canadian territory reps.
   - **Search by County / Zip**: Type a county name or 5-digit zip code to filter results.

### Method 2: On Standalone Locator Test Page
1. Open your browser to:
   **`http://localhost:3000/rs.html`** *(or `http://replocator.lndo.site/rs.html`)*
2. This standalone page directly loads the bundled widget with `brand: 'RS'` for quick verification without Drupal dependencies.

---

## 7. Verification API Checks

You can also directly verify the API responses using `curl`:

- **Countries for RS**:
  ```bash
  curl "http://localhost:3000/api/search/countries?brand=RS"
  ```
- **States for RS (USA)**:
  ```bash
  curl "http://localhost:3000/api/search/states?brand=RS&country=USA"
  ```
- **Reps in Texas (TX)**:
  ```bash
  curl "http://localhost:3000/api/search/reps_by_location?brand=RS&state=TX"
  ```
