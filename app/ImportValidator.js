const fs = require('fs');
const readline = require('readline');

class ImportValidator {
  /**
   * Parses a single CSV line with support for quotes and escaped quotes.
   */
  static parseCSVLine(line) {
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

  /**
   * Determines column indices from header or falls back to known layouts.
   */
  static mapHeaders(headers) {
    const cleanHeaders = headers.map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
    
    // Check if 23-column RS layout
    const isRS23 = cleanHeaders.some(h => h.includes('repagencycode') || h.includes('territoryregioncode') || h.includes('principal'));
    if (isRS23) {
      return {
        type: 'RS_23',
        county: cleanHeaders.findIndex(h => h.includes('county name') || h === 'county'),
        stateAbbr: cleanHeaders.findIndex(h => h.includes('state abbv') || h === 'state_abbr'),
        state: cleanHeaders.findIndex(h => h === 'state' || h.includes('state (e.g.')),
        country: cleanHeaders.findIndex(h => h.includes('country1') || h === 'country'),
        territoryId: cleanHeaders.findIndex(h => h.includes('territoryregioncode') || h.includes('territory_id')),
        territoryName: cleanHeaders.findIndex(h => h.includes('territoryregion') || h.includes('territory_name')),
        brand: cleanHeaders.findIndex(h => h === 'brand'),
        repCode: cleanHeaders.findIndex(h => h.includes('repagencycode') || h.includes('rep_code')),
        agency: cleanHeaders.findIndex(h => h === 'repagency' || h === 'agency'),
        principal: cleanHeaders.findIndex(h => h === 'principal'),
        mainContact: cleanHeaders.findIndex(h => h.includes('main contact') || h === 'contact'),
        address: cleanHeaders.findIndex(h => h === 'address'),
        city: cleanHeaders.findIndex(h => h === 'city'),
        repState: cleanHeaders.findIndex(h => h.includes('state2') || h === 'rep_state'),
        zip: cleanHeaders.findIndex(h => h === 'zip'),
        repCountry: cleanHeaders.findIndex(h => h.includes('country2') || h === 'rep_country'),
        phone: cleanHeaders.findIndex(h => h === 'phone'),
        fax: cleanHeaders.findIndex(h => h === 'fax'),
        principalEmail: cleanHeaders.findIndex(h => h.includes('principal email')),
        mainContactEmail: cleanHeaders.findIndex(h => h.includes('main contact email') || h.includes('email')),
        notes: cleanHeaders.findIndex(h => h === 'notes'),
      };
    }

    // Default 17-19 column standard layout
    return {
      type: 'STANDARD',
      county: 0,
      stateAbbr: 1,
      state: 2,
      country: 3,
      territoryId: 4,
      territoryName: 5,
      brand: 6,
      repCode: 7,
      agency: 8,
      contact: 9,
      address: 10,
      city: 11,
      repState: 12,
      zip: 13,
      repCountry: 14,
      phone: 15,
      fax: 16,
      email: 17,
      notes: 18,
    };
  }

  /**
   * Validates a CSV file and extracts normalized reps and territories.
   */
  static async validateFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    let headerMapping = null;
    const errors = [];
    const warnings = [];

    const repsMap = new Map(); // key: `${brand}::${rep_code}`
    const territories = [];
    const seenTerritoryKeys = new Set();

    for await (const rawLine of rl) {
      lineNumber++;
      const line = rawLine.replace(/^\uFEFF/, '').trim();
      if (!line) continue;

      const cols = this.parseCSVLine(line);

      if (lineNumber === 1) {
        headerMapping = this.mapHeaders(cols);
        continue;
      }

      const getCol = (idx, fallback = '') => {
        if (idx !== undefined && idx >= 0 && idx < cols.length) {
          return cols[idx] !== undefined ? cols[idx].trim() : fallback;
        }
        return fallback;
      };

      let county, stateAbbr, state, country, territoryId, territoryName, brand, repCode;
      let agency, contact, address, city, repState, zip, repCountry, phone, fax, email, notes;

      if (headerMapping.type === 'RS_23') {
        county = getCol(headerMapping.county);
        stateAbbr = getCol(headerMapping.stateAbbr);
        state = getCol(headerMapping.state);
        country = getCol(headerMapping.country, 'USA');
        territoryId = getCol(headerMapping.territoryId);
        territoryName = getCol(headerMapping.territoryName);
        brand = getCol(headerMapping.brand, 'RS');
        repCode = getCol(headerMapping.repCode);
        agency = getCol(headerMapping.agency);
        const principal = getCol(headerMapping.principal);
        const mainContact = getCol(headerMapping.mainContact);
        contact = mainContact || principal;
        address = getCol(headerMapping.address);
        city = getCol(headerMapping.city);
        repState = getCol(headerMapping.repState);
        zip = getCol(headerMapping.zip);
        repCountry = getCol(headerMapping.repCountry, country || 'USA');
        phone = getCol(headerMapping.phone);
        fax = getCol(headerMapping.fax);
        const principalEmail = getCol(headerMapping.principalEmail);
        const mainContactEmail = getCol(headerMapping.mainContactEmail);
        email = mainContactEmail || principalEmail;
        notes = getCol(headerMapping.notes);
      } else {
        county = getCol(headerMapping.county);
        stateAbbr = getCol(headerMapping.stateAbbr);
        state = getCol(headerMapping.state);
        country = getCol(headerMapping.country, 'USA');
        territoryId = getCol(headerMapping.territoryId);
        territoryName = getCol(headerMapping.territoryName);
        brand = getCol(headerMapping.brand);
        repCode = getCol(headerMapping.repCode);
        agency = getCol(headerMapping.agency);
        contact = getCol(headerMapping.contact);
        address = getCol(headerMapping.address);
        city = getCol(headerMapping.city);
        repState = getCol(headerMapping.repState);
        zip = getCol(headerMapping.zip);
        repCountry = getCol(headerMapping.repCountry, country || 'USA');
        phone = getCol(headerMapping.phone);
        fax = getCol(headerMapping.fax);
        email = getCol(headerMapping.email);
        notes = getCol(headerMapping.notes);
      }

      // Validations
      if (!brand) {
        errors.push({ row: lineNumber, message: 'Missing required field: Brand' });
        continue;
      }

      if (!repCode) {
        errors.push({ row: lineNumber, message: 'Missing required field: Rep Code' });
        continue;
      }

      if (!county && !state && !stateAbbr) {
        errors.push({ row: lineNumber, message: 'Missing territory location (County and State are empty)' });
        continue;
      }

      const repKey = `${brand.toUpperCase()}::${repCode.toUpperCase()}`;
      if (!repsMap.has(repKey)) {
        repsMap.set(repKey, {
          brand: brand.toUpperCase(),
          rep_code: repCode.toUpperCase(),
          agency: agency || '',
          contact: contact || '',
          address: address || '',
          city: city || '',
          state: repState || '',
          zip: zip || '',
          country: repCountry || country || 'USA',
          phone: phone || '',
          fax: fax || '',
          email: email || '',
        });
      }

      // Check for duplicate territory mapping within upload
      const territoryKey = `${brand.toUpperCase()}::${(country || 'USA').toUpperCase()}::${(stateAbbr || state || '').toUpperCase()}::${county.toUpperCase()}`;
      if (seenTerritoryKeys.has(territoryKey)) {
        warnings.push({ row: lineNumber, message: `Duplicate territory mapping for ${county}, ${stateAbbr || state}` });
      } else {
        seenTerritoryKeys.add(territoryKey);
      }

      territories.push({
        county: county || '',
        state: state || '',
        country: country || 'USA',
        state_abbr: stateAbbr || '',
        territory_id: territoryId && !isNaN(parseInt(territoryId)) ? parseInt(territoryId) : null,
        territory_name: territoryName || '',
        brand: brand.toUpperCase(),
        rep_code: repCode.toUpperCase(),
        notes: notes || '',
      });
    }

    if (lineNumber <= 1 || (repsMap.size === 0 && territories.length === 0)) {
      errors.push({ row: 0, message: 'CSV file contains no valid data rows.' });
    }

    const reps = Array.from(repsMap.values());
    const affectedBrands = Array.from(new Set(reps.map(r => r.brand)));

    return {
      isValid: errors.length === 0,
      validationStatus: errors.length > 0 ? 'invalid' : (warnings.length > 0 ? 'warnings' : 'valid'),
      errors,
      warnings,
      reps,
      territories,
      affectedBrands,
      totalRows: lineNumber - 1,
    };
  }
}

module.exports = ImportValidator;
