const crypto = require('crypto');
const mysqlDB = require('../utils/mysql');
const Checksum = require('./Checksum');
const ImportPreview = require('./ImportPreview');

class RestoreEngine {
  /**
   * Generates a preview diff for restoring an older successful version.
   */
  static async createRestorePreview({
    targetVersion,
    actor = 'admin',
  }) {
    // 1. Fetch target version run
    const [targetRuns] = await mysqlDB.query(
      'SELECT * FROM `ImportRun` WHERE `version_number` = ? AND `status` = \'successful\'',
      [targetVersion]
    );

    if (!targetRuns.length) {
      throw new Error(`Target version V${targetVersion} not found in history.`);
    }

    const targetRun = targetRuns[0];

    // 2. Fetch target snapshot records
    const [targetReps] = await mysqlDB.query(
      'SELECT * FROM `RepSnapshot` WHERE `run_id` = ?',
      [targetRun.id]
    );
    const [targetTerritories] = await mysqlDB.query(
      'SELECT * FROM `RepCountySnapshot` WHERE `run_id` = ?',
      [targetRun.id]
    );

    // 3. Fetch current live state
    const [states] = await mysqlDB.query('SELECT * FROM `DatasetState` WHERE `id` = 1');
    const baseVersion = states.length ? states[0].current_version : 0;

    const [liveReps] = await mysqlDB.query('SELECT * FROM `Rep`');
    const [liveTerritories] = await mysqlDB.query('SELECT * FROM `RepCounty`');

    // 4. Compute diff against live data
    const diff = ImportPreview.computeDiff(liveReps, liveTerritories, targetReps, targetTerritories);

    // 5. Stage target dataset into candidate tables
    const previewId = `restore_v${targetVersion}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const candidateHash = Checksum.computeDatasetHash(targetReps, targetTerritories);

    if (targetReps.length > 0) {
      const repValues = targetReps.map(r => [
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
    for (let i = 0; i < targetTerritories.length; i += BATCH_SIZE) {
      const batch = targetTerritories.slice(i, i + BATCH_SIZE);
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

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await mysqlDB.query(
      `INSERT INTO \`ImportPreview\` (
        \`id\`, \`operation\`, \`mode\`, \`restore_from_run_id\`, \`restore_from_version\`,
        \`base_version\`, \`selected_brands\`, \`candidate_hash\`, \`validation_status\`,
        \`validation_errors\`, \`validation_warnings\`, \`summary_diff\`, \`actor\`,
        \`expires_at\`, \`created_at\`
      ) VALUES (?, 'restore', 'replace_all', ?, ?, ?, ?, ?, 'valid', '[]', '[]', ?, ?, ?, NOW())`,
      [
        previewId,
        targetRun.id,
        targetVersion,
        baseVersion,
        targetRun.affected_brands,
        candidateHash,
        JSON.stringify(diff),
        actor,
        expiresAt,
      ]
    );

    return {
      previewId,
      restoreFromVersion: targetVersion,
      baseVersion,
      diff,
      targetRun: {
        version: targetRun.version_number,
        operation: targetRun.operation,
        actor: targetRun.actor,
        totalReps: targetRun.total_reps,
        totalTerritories: targetRun.total_territories,
        checksum: targetRun.checksum,
        completedAt: targetRun.completed_at,
      },
      expiresAt,
    };
  }
}

module.exports = RestoreEngine;
