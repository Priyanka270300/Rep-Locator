const crypto = require('crypto');
const mysqlDB = require('../utils/mysql');
const Checksum = require('./Checksum');

class ImportPreview {
  /**
   * Computes diff between a proposed dataset and the current live dataset.
   */
  static computeDiff(currentReps = [], currentTerritories = [], candidateReps = [], candidateTerritories = []) {
    // Index current reps by `${brand}::${rep_code}`
    const currentRepMap = new Map();
    for (const r of currentReps) {
      currentRepMap.set(`${(r.brand || '').toUpperCase()}::${(r.rep_code || '').toUpperCase()}`, r);
    }

    const candidateRepMap = new Map();
    for (const r of candidateReps) {
      candidateRepMap.set(`${(r.brand || '').toUpperCase()}::${(r.rep_code || '').toUpperCase()}`, r);
    }

    const repsAdded = [];
    const repsRemoved = [];
    const repsUpdated = [];
    let repsUnchangedCount = 0;

    for (const [key, cand] of candidateRepMap.entries()) {
      if (!currentRepMap.has(key)) {
        repsAdded.push({ brand: cand.brand, rep_code: cand.rep_code, agency: cand.agency, contact: cand.contact });
      } else {
        const curr = currentRepMap.get(key);
        const candNorm = Checksum.normalizeRep(cand);
        const currNorm = Checksum.normalizeRep(curr);
        if (candNorm !== currNorm) {
          repsUpdated.push({
            brand: cand.brand,
            rep_code: cand.rep_code,
            agency: cand.agency,
            previousAgency: curr.agency,
            contact: cand.contact,
            previousContact: curr.contact,
          });
        } else {
          repsUnchangedCount++;
        }
      }
    }

    for (const [key, curr] of currentRepMap.entries()) {
      if (!candidateRepMap.has(key)) {
        repsRemoved.push({ brand: curr.brand, rep_code: curr.rep_code, agency: curr.agency, contact: curr.contact });
      }
    }

    // Territories comparison
    const currTerritoryMap = new Map();
    for (const t of currentTerritories) {
      const key = `${(t.brand || '').toUpperCase()}::${(t.country || 'USA').toUpperCase()}::${(t.state_abbr || t.state || '').toUpperCase()}::${(t.county || '').toUpperCase()}`;
      currTerritoryMap.set(key, t);
    }

    const candTerritoryMap = new Map();
    for (const t of candidateTerritories) {
      const key = `${(t.brand || '').toUpperCase()}::${(t.country || 'USA').toUpperCase()}::${(t.state_abbr || t.state || '').toUpperCase()}::${(t.county || '').toUpperCase()}`;
      candTerritoryMap.set(key, t);
    }

    let territoriesAddedCount = 0;
    let territoriesRemovedCount = 0;
    let territoriesUpdatedCount = 0;
    let territoriesUnchangedCount = 0;

    for (const [key, cand] of candTerritoryMap.entries()) {
      if (!currTerritoryMap.has(key)) {
        territoriesAddedCount++;
      } else {
        const curr = currTerritoryMap.get(key);
        if (Checksum.normalizeTerritory(cand) !== Checksum.normalizeTerritory(curr)) {
          territoriesUpdatedCount++;
        } else {
          territoriesUnchangedCount++;
        }
      }
    }

    for (const [key] of currTerritoryMap.entries()) {
      if (!candTerritoryMap.has(key)) {
        territoriesRemovedCount++;
      }
    }

    const affectedBrands = Array.from(new Set([
      ...repsAdded.map(r => r.brand),
      ...repsRemoved.map(r => r.brand),
      ...repsUpdated.map(r => r.brand),
      ...candidateReps.map(r => r.brand),
    ]));

    const summaryText = `Changes: ${repsAdded.length} reps added, ${repsRemoved.length} removed, ${repsUpdated.length} updated. Territories: ${territoriesAddedCount} added, ${territoriesRemovedCount} removed, ${territoriesUpdatedCount} updated.`;

    return {
      summaryText,
      repsAdded,
      repsRemoved,
      repsUpdated,
      repsUnchangedCount,
      territoriesAddedCount,
      territoriesRemovedCount,
      territoriesUpdatedCount,
      territoriesUnchangedCount,
      affectedBrands,
      totalProposedReps: candidateReps.length,
      totalProposedTerritories: candidateTerritories.length,
    };
  }

  /**
   * Creates an import preview and stages candidate rows in RepCandidate / RepCountyCandidate.
   */
  static async createImportPreview({
    uploadId = null,
    validationResult,
    mode = 'replace_selected',
    actor = 'admin',
  }) {
    const previewId = `prev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Get current state
    const [states] = await mysqlDB.query('SELECT * FROM `DatasetState` WHERE `id` = 1');
    const baseVersion = states.length ? states[0].current_version : 0;

    // Fetch current live data
    const [liveReps] = await mysqlDB.query('SELECT * FROM `Rep`');
    const [liveTerritories] = await mysqlDB.query('SELECT * FROM `RepCounty`');

    // Build candidate dataset according to mode
    let candidateReps = [];
    let candidateTerritories = [];

    const uploadedReps = validationResult.reps || [];
    const uploadedTerritories = validationResult.territories || [];
    const uploadedBrands = validationResult.affectedBrands || [];

    if (mode === 'replace_all') {
      candidateReps = [...uploadedReps];
      candidateTerritories = [...uploadedTerritories];
    } else if (mode === 'replace_selected') {
      // Retain live rows for brands not being replaced
      const retainedReps = liveReps.filter(r => !uploadedBrands.includes(r.brand));
      const retainedTerritories = liveTerritories.filter(t => !uploadedBrands.includes(t.brand));
      candidateReps = [...retainedReps, ...uploadedReps];
      candidateTerritories = [...retainedTerritories, ...uploadedTerritories];
    } else if (mode === 'add_records') {
      // Merge
      candidateReps = [...liveReps];
      const liveRepKeys = new Set(liveReps.map(r => `${r.brand}::${r.rep_code}`));
      for (const r of uploadedReps) {
        if (!liveRepKeys.has(`${r.brand}::${r.rep_code}`)) {
          candidateReps.push(r);
        }
      }
      candidateTerritories = [...liveTerritories, ...uploadedTerritories];
    }

    const candidateHash = Checksum.computeDatasetHash(candidateReps, candidateTerritories);
    const diff = this.computeDiff(liveReps, liveTerritories, candidateReps, candidateTerritories);

    // Stage candidates in RepCandidate and RepCountyCandidate
    if (candidateReps.length > 0) {
      const repValues = candidateReps.map(r => [
        previewId, r.rep_code, r.brand, r.agency, r.contact, r.address,
        r.city, r.state, r.zip, r.country, r.phone, r.fax, r.email
      ]);
      const placeholders = repValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      await mysqlDB.query(
        `INSERT INTO \`RepCandidate\` (
          \`preview_id\`, \`rep_code\`, \`brand\`, \`agency\`, \`contact\`, \`address\`,
          \`city\`, \`state\`, \`zip\`, \`country\`, \`phone\`, \`fax\`, \`email\`
        ) VALUES ${placeholders}`,
        repValues.flat()
      );
    }

    const BATCH_SIZE = 250;
    for (let i = 0; i < candidateTerritories.length; i += BATCH_SIZE) {
      const batch = candidateTerritories.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatValues = [];
      for (const t of batch) {
        flatValues.push(previewId, t.county, t.state, t.country, t.state_abbr, t.territory_id, t.territory_name, t.brand, t.rep_code, t.notes);
      }
      await mysqlDB.query(
        `INSERT INTO \`RepCountyCandidate\` (
          \`preview_id\`, \`county\`, \`state\`, \`country\`, \`state_abbr\`,
          \`territory_id\`, \`territory_name\`, \`brand\`, \`rep_code\`, \`notes\`
        ) VALUES ${placeholders}`,
        flatValues
      );
    }

    // Save ImportPreview record
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
    await mysqlDB.query(
      `INSERT INTO \`ImportPreview\` (
        \`id\`, \`operation\`, \`mode\`, \`upload_id\`, \`base_version\`, \`selected_brands\`,
        \`candidate_hash\`, \`validation_status\`, \`validation_errors\`, \`validation_warnings\`,
        \`summary_diff\`, \`actor\`, \`expires_at\`, \`created_at\`
      ) VALUES (?, 'import', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        previewId,
        mode,
        uploadId,
        baseVersion,
        JSON.stringify(uploadedBrands),
        candidateHash,
        validationResult.validationStatus,
        JSON.stringify(validationResult.errors || []),
        JSON.stringify(validationResult.warnings || []),
        JSON.stringify(diff),
        actor,
        expiresAt,
      ]
    );

    return {
      previewId,
      baseVersion,
      mode,
      validationStatus: validationResult.validationStatus,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      diff,
      candidateHash,
      expiresAt,
    };
  }

  static async getPreview(previewId) {
    const [rows] = await mysqlDB.query('SELECT * FROM `ImportPreview` WHERE `id` = ?', [previewId]);
    if (!rows.length) return null;
    const preview = rows[0];
    return {
      ...preview,
      validation_errors: typeof preview.validation_errors === 'string' ? JSON.parse(preview.validation_errors) : preview.validation_errors,
      validation_warnings: typeof preview.validation_warnings === 'string' ? JSON.parse(preview.validation_warnings) : preview.validation_warnings,
      summary_diff: typeof preview.summary_diff === 'string' ? JSON.parse(preview.summary_diff) : preview.summary_diff,
      selected_brands: typeof preview.selected_brands === 'string' ? JSON.parse(preview.selected_brands) : preview.selected_brands,
    };
  }
}

module.exports = ImportPreview;
