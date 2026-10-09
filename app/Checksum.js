const crypto = require('crypto');

class Checksum {
  /**
   * Normalizes a rep record to a deterministic string.
   */
  static normalizeRep(r) {
    return [
      (r.brand || '').trim().toUpperCase(),
      (r.rep_code || '').trim().toUpperCase(),
      (r.agency || '').trim(),
      (r.contact || '').trim(),
      (r.address || '').trim(),
      (r.city || '').trim(),
      (r.state || '').trim(),
      (r.zip || '').trim(),
      (r.country || '').trim(),
      (r.phone || '').trim(),
      (r.fax || '').trim(),
      (r.email || '').trim().toLowerCase(),
    ].join('||');
  }

  /**
   * Normalizes a territory record to a deterministic string.
   */
  static normalizeTerritory(t) {
    return [
      (t.brand || '').trim().toUpperCase(),
      (t.country || '').trim().toUpperCase(),
      (t.state_abbr || t.state || '').trim().toUpperCase(),
      (t.state || '').trim(),
      (t.county || '').trim(),
      t.territory_id !== null && t.territory_id !== undefined ? String(t.territory_id) : '',
      (t.territory_name || '').trim(),
      (t.rep_code || '').trim().toUpperCase(),
      (t.notes || '').trim(),
    ].join('||');
  }

  /**
   * Generates a SHA-256 hash for a complete dataset of reps and territories.
   */
  static computeDatasetHash(reps = [], territories = []) {
    const hash = crypto.createHash('sha256');

    // Sort canonically
    const sortedReps = [...reps]
      .map(r => Checksum.normalizeRep(r))
      .sort();

    const sortedTerritories = [...territories]
      .map(t => Checksum.normalizeTerritory(t))
      .sort();

    hash.update('REPS_START\n');
    for (const line of sortedReps) {
      hash.update(line + '\n');
    }
    hash.update('REPS_END\nTERRITORIES_START\n');
    for (const line of sortedTerritories) {
      hash.update(line + '\n');
    }
    hash.update('TERRITORIES_END\n');

    return hash.digest('hex');
  }
}

module.exports = Checksum;
