const fs = require('fs');
const readline = require('readline');
const path = require('path');
const mysqlDB = require('../utils/mysql');

function getCsvFilePath(cliArg) {
  if (cliArg && fs.existsSync(cliArg)) return path.resolve(cliArg);
  const possiblePaths = [
    path.join(__dirname, '..', 'import', 'rs.csv'),
    path.join(__dirname, '..', 'Universal Rep Contact Info - All brands website_20260409.xlsx - TerritoryByCounties - RS.csv'),
    path.join(process.cwd(), 'rs.csv'),
    path.join(process.cwd(), 'import', 'rs.csv')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return cliArg ? path.resolve(cliArg) : possiblePaths[0];
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

async function importRSData(customCsvPath = null) {
  const csvFile = getCsvFilePath(customCsvPath || process.argv[2]);
  console.log('Starting RS Data Import from:', csvFile);

  if (!fs.existsSync(csvFile)) {
    throw new Error('CSV file not found: ' + csvFile + '\nUsage: node scripts/import-rs.js [path/to/rs.csv]');
  }

  const fileStream = fs.createReadStream(csvFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  const repsMap = new Map();
  const territories = [];

  for await (const line of rl) {
    lineNumber++;
    if (lineNumber === 1 || !line.trim()) continue; // Skip header and empty lines

    const cols = parseCSVLine(line);
    if (cols.length < 20) {
      continue;
    }

    const [
      county,
      stateAbbr,
      state,
      country,
      territoryId,
      territoryName,
      brand,
      repCode,
      agency,
      principal,
      mainContact,
      address,
      city,
      repState,
      zip,
      repCountry,
      phone,
      fax,
      principalEmail,
      mainContactEmail,
      notes
    ] = cols;

    const brandCode = (brand || 'RS').trim();
    const repCodeVal = (repCode || '').trim();

    if (!repCodeVal) continue;

    // Rep contact info
    if (!repsMap.has(repCodeVal)) {
      repsMap.set(repCodeVal, {
        rep_code: repCodeVal,
        brand: brandCode,
        agency: agency || '',
        contact: mainContact || principal || '',
        address: address || '',
        city: city || '',
        state: repState || '',
        zip: zip || '',
        country: repCountry || country || 'USA',
        phone: phone || '',
        fax: fax || '',
        email: mainContactEmail || principalEmail || ''
      });
    }

    // Territory info
    territories.push({
      county: county || '',
      state: state || '',
      country: country || 'USA',
      state_abbr: stateAbbr || '',
      territory_id: territoryId && !isNaN(parseInt(territoryId)) ? parseInt(territoryId) : null,
      territory_name: territoryName || '',
      brand: brandCode,
      rep_code: repCodeVal,
      notes: notes || ''
    });
  }

  console.log(`Parsed ${repsMap.size} unique reps and ${territories.length} territory records.`);

  // 1. Clear existing RS data
  console.log('Cleaning existing RS data from database...');
  await mysqlDB.query("DELETE FROM `RepCounty` WHERE `brand` = 'RS'");
  await mysqlDB.query("DELETE FROM `Rep` WHERE `brand` = 'RS'");

  // 2. Insert Reps
  console.log('Inserting Reps...');
  for (const rep of repsMap.values()) {
    await mysqlDB.query(
      `INSERT INTO \`Rep\` (\`rep_code\`, \`brand\`, \`agency\`, \`contact\`, \`address\`, \`city\`, \`state\`, \`zip\`, \`country\`, \`phone\`, \`fax\`, \`email\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE \`agency\`=VALUES(\`agency\`), \`contact\`=VALUES(\`contact\`), \`email\`=VALUES(\`email\`)`,
      [rep.rep_code, rep.brand, rep.agency, rep.contact, rep.address, rep.city, rep.state, rep.zip, rep.country, rep.phone, rep.fax, rep.email]
    );
  }

  // 3. Batch insert territories
  console.log('Inserting RepCounty territory mappings...');
  const BATCH_SIZE = 200;
  for (let i = 0; i < territories.length; i += BATCH_SIZE) {
    const batch = territories.slice(i, i + BATCH_SIZE);
    const valuePlaceholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = [];
    for (const t of batch) {
      flatValues.push(t.county, t.state, t.country, t.state_abbr, t.territory_id, t.territory_name, t.brand, t.rep_code, t.notes);
    }

    await mysqlDB.query(
      `INSERT INTO \`RepCounty\` (\`county\`, \`state\`, \`country\`, \`state_abbr\`, \`territory_id\`, \`territory_name\`, \`brand\`, \`rep_code\`, \`notes\`)
       VALUES ${valuePlaceholders}
       ON DUPLICATE KEY UPDATE \`notes\`=VALUES(\`notes\`)`,
      flatValues
    );
  }

  console.log('RS data import completed successfully!');
}

if (require.main === module) {
  importRSData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Import error:', err);
      process.exit(1);
    });
}

module.exports = importRSData;
