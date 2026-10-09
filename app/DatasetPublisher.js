const mysqlDB = require('../utils/mysql');
const Checksum = require('./Checksum');

class DatasetPublisher {
  /**
   * Captures the initial baseline version (V1) from the current live database state.
   */
  static async captureBaseline(actor = 'system') {
    const [stateRows] = await mysqlDB.query('SELECT * FROM `DatasetState` WHERE `id` = 1');
    if (stateRows.length && stateRows[0].current_version > 0) {
      return {
        message: `Baseline already exists at Version V${stateRows[0].current_version}`,
        version: stateRows[0].current_version,
        runId: stateRows[0].current_run_id,
      };
    }

    // Fetch existing live data
    const [liveReps] = await mysqlDB.query('SELECT * FROM `Rep`');
    const [liveTerritories] = await mysqlDB.query('SELECT * FROM `RepCounty`');

    const affectedBrands = Array.from(new Set([
      ...liveReps.map(r => r.brand),
      ...liveTerritories.map(t => t.brand),
    ])).filter(Boolean);

    const checksum = Checksum.computeDatasetHash(liveReps, liveTerritories);

    const connection = await mysqlDB.getConnection();

    try {
      await connection.query('START TRANSACTION');

      const [state] = await connection.query('SELECT * FROM `DatasetState` WHERE `id` = 1 FOR UPDATE');
      const currentVersion = state[0] ? state[0].current_version : 0;
      if (currentVersion > 0) {
        await connection.query('ROLLBACK');
        connection.release();
        return { message: `Baseline already exists at V${currentVersion}`, version: currentVersion };
      }

      const versionNumber = 1;
      const [runResult] = await connection.query(
        `INSERT INTO \`ImportRun\` (
          \`version_number\`, \`operation\`, \`mode\`, \`status\`, \`actor\`,
          \`total_reps\`, \`total_territories\`, \`affected_brands\`, \`checksum\`,
          \`summary_diff\`, \`started_at\`, \`completed_at\`
        ) VALUES (?, 'baseline', 'replace_all', 'successful', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          versionNumber,
          actor,
          liveReps.length,
          liveTerritories.length,
          JSON.stringify(affectedBrands),
          checksum,
          JSON.stringify({ note: 'Initial baseline snapshot', affectedBrands }),
        ]
      );

      const runId = runResult.insertId;

      // Copy live reps into RepSnapshot
      if (liveReps.length > 0) {
        const repValues = liveReps.map(r => [
          runId, r.rep_code, r.brand, r.agency, r.contact, r.address,
          r.city, r.state, r.zip, r.country, r.phone, r.fax, r.email
        ]);
        const placeholders = repValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        await connection.query(
          `INSERT INTO \`RepSnapshot\` (
            \`run_id\`, \`rep_code\`, \`brand\`, \`agency\`, \`contact\`, \`address\`,
            \`city\`, \`state\`, \`zip\`, \`country\`, \`phone\`, \`fax\`, \`email\`
          ) VALUES ${placeholders}`,
          repValues.flat()
        );
      }

      // Copy live territories into RepCountySnapshot
      const BATCH_SIZE = 250;
      for (let i = 0; i < liveTerritories.length; i += BATCH_SIZE) {
        const batch = liveTerritories.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = [];
        for (const t of batch) {
          flatValues.push(runId, t.county, t.state, t.country, t.state_abbr, t.territory_id, t.territory_name, t.brand, t.rep_code, t.notes);
        }
        await connection.query(
          `INSERT INTO \`RepCountySnapshot\` (
            \`run_id\`, \`county\`, \`state\`, \`country\`, \`state_abbr\`,
            \`territory_id\`, \`territory_name\`, \`brand\`, \`rep_code\`, \`notes\`
          ) VALUES ${placeholders}`,
          flatValues
        );
      }

      // Update state
      await connection.query(
        'UPDATE `DatasetState` SET `current_run_id` = ?, `current_version` = ?, `updated_at` = NOW() WHERE `id` = 1',
        [runId, versionNumber]
      );

      await connection.commit ? await connection.commit() : await connection.query('COMMIT');
      connection.release();

      return {
        success: true,
        version: versionNumber,
        runId,
        repsCount: liveReps.length,
        territoriesCount: liveTerritories.length,
        checksum,
      };
    } catch (err) {
      if (connection) {
        try { await connection.query('ROLLBACK'); } catch (_) {}
        connection.release();
      }
      throw err;
    }
  }

  /**
   * Publishes a validated candidate preview or a restore snapshot atomically.
   */
  static async publishCandidate({
    previewId,
    actor = 'admin',
  }) {
    // 1. Fetch preview
    const [previews] = await mysqlDB.query('SELECT * FROM `ImportPreview` WHERE `id` = ?', [previewId]);
    if (!previews.length) {
      throw new Error(`Preview '${previewId}' not found.`);
    }
    const preview = previews[0];

    if (preview.is_consumed) {
      throw new Error('This preview has already been published.');
    }

    if (preview.validation_status === 'invalid') {
      throw new Error('Cannot publish an invalid preview. Fix validation errors first.');
    }

    const connection = await mysqlDB.getConnection();

    try {
      await connection.query('START TRANSACTION');

      // Lock state row
      const [states] = await connection.query('SELECT * FROM `DatasetState` WHERE `id` = 1 FOR UPDATE');
      const currentState = states[0] || { current_version: 0, current_run_id: null };

      // Concurrency check: Ensure base version hasn't changed since preview was created
      if (currentState.current_version !== preview.base_version) {
        throw new Error(
          `Version conflict: Current published version has changed to V${currentState.current_version} since this preview was generated (was V${preview.base_version}). Please refresh and regenerate preview.`
        );
      }

      const nextVersion = currentState.current_version + 1;
      const previousRunId = currentState.current_run_id;
      const previousVersion = currentState.current_version;

      // Fetch proposed dataset from candidate tables
      const [candidatesReps] = await connection.query(
        'SELECT * FROM `RepCandidate` WHERE `preview_id` = ?',
        [previewId]
      );
      const [candidatesTerritories] = await connection.query(
        'SELECT * FROM `RepCountyCandidate` WHERE `preview_id` = ?',
        [previewId]
      );

      const affectedBrands = preview.selected_brands ? JSON.parse(preview.selected_brands) : [];
      const checksum = Checksum.computeDatasetHash(candidatesReps, candidatesTerritories);

      // Create ImportRun record
      const [runResult] = await connection.query(
        `INSERT INTO \`ImportRun\` (
          \`version_number\`, \`operation\`, \`mode\`, \`status\`, \`upload_id\`, \`preview_id\`,
          \`previous_run_id\`, \`previous_version\`, \`restored_from_version\`, \`actor\`,
          \`total_reps\`, \`total_territories\`, \`affected_brands\`, \`checksum\`,
          \`summary_diff\`, \`started_at\`, \`completed_at\`
        ) VALUES (?, ?, ?, 'successful', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          nextVersion,
          preview.operation,
          preview.mode,
          preview.upload_id,
          preview.id,
          previousRunId,
          previousVersion,
          preview.restore_from_version,
          actor,
          candidatesReps.length,
          candidatesTerritories.length,
          JSON.stringify(affectedBrands),
          checksum,
          typeof preview.summary_diff === 'string' ? preview.summary_diff : JSON.stringify(preview.summary_diff),
        ]
      );

      const runId = runResult.insertId;

      // 1. Write immutable snapshot
      if (candidatesReps.length > 0) {
        const repValues = candidatesReps.map(r => [
          runId, r.rep_code, r.brand, r.agency, r.contact, r.address,
          r.city, r.state, r.zip, r.country, r.phone, r.fax, r.email
        ]);
        const placeholders = repValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        await connection.query(
          `INSERT INTO \`RepSnapshot\` (
            \`run_id\`, \`rep_code\`, \`brand\`, \`agency\`, \`contact\`, \`address\`,
            \`city\`, \`state\`, \`zip\`, \`country\`, \`phone\`, \`fax\`, \`email\`
          ) VALUES ${placeholders}`,
          repValues.flat()
        );
      }

      const BATCH_SIZE = 250;
      for (let i = 0; i < candidatesTerritories.length; i += BATCH_SIZE) {
        const batch = candidatesTerritories.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = [];
        for (const t of batch) {
          flatValues.push(runId, t.county, t.state, t.country, t.state_abbr, t.territory_id, t.territory_name, t.brand, t.rep_code, t.notes);
        }
        await connection.query(
          `INSERT INTO \`RepCountySnapshot\` (
            \`run_id\`, \`county\`, \`state\`, \`country\`, \`state_abbr\`,
            \`territory_id\`, \`territory_name\`, \`brand\`, \`rep_code\`, \`notes\`
          ) VALUES ${placeholders}`,
          flatValues
        );
      }

      // 2. Atomically update live tables
      // For all-brand replacement, restore, or baseline: clean wipe live tables and insert candidate
      // For selected-brand replacement: delete only affected brands from live tables and insert candidate
      if (preview.mode === 'replace_all' || preview.operation === 'restore') {
        await connection.query('DELETE FROM `RepCounty`');
        await connection.query('DELETE FROM `Rep`');
      } else if (preview.mode === 'replace_selected' && affectedBrands.length > 0) {
        const brandPlaceholders = affectedBrands.map(() => '?').join(', ');
        await connection.query(`DELETE FROM \`RepCounty\` WHERE \`brand\` IN (${brandPlaceholders})`, affectedBrands);
        await connection.query(`DELETE FROM \`Rep\` WHERE \`brand\` IN (${brandPlaceholders})`, affectedBrands);
      }

      // Insert full candidate data into live tables
      if (candidatesReps.length > 0) {
        // Group or insert with ON DUPLICATE KEY UPDATE
        for (const r of candidatesReps) {
          await connection.query(
            `INSERT INTO \`Rep\` (\`rep_code\`, \`brand\`, \`agency\`, \`contact\`, \`address\`, \`city\`, \`state\`, \`zip\`, \`country\`, \`phone\`, \`fax\`, \`email\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE \`agency\`=VALUES(\`agency\`), \`contact\`=VALUES(\`contact\`), \`address\`=VALUES(\`address\`),
             \`city\`=VALUES(\`city\`), \`state\`=VALUES(\`state\`), \`zip\`=VALUES(\`zip\`), \`country\`=VALUES(\`country\`),
             \`phone\`=VALUES(\`phone\`), \`fax\`=VALUES(\`fax\`), \`email\`=VALUES(\`email\`)`,
            [r.rep_code, r.brand, r.agency, r.contact, r.address, r.city, r.state, r.zip, r.country, r.phone, r.fax, r.email]
          );
        }
      }

      for (let i = 0; i < candidatesTerritories.length; i += BATCH_SIZE) {
        const batch = candidatesTerritories.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = [];
        for (const t of batch) {
          flatValues.push(t.county, t.state, t.country, t.state_abbr, t.territory_id, t.territory_name, t.brand, t.rep_code, t.notes);
        }
        await connection.query(
          `INSERT INTO \`RepCounty\` (\`county\`, \`state\`, \`country\`, \`state_abbr\`, \`territory_id\`, \`territory_name\`, \`brand\`, \`rep_code\`, \`notes\`)
           VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE \`notes\`=VALUES(\`notes\`)`,
          flatValues
        );
      }

      // 3. Mark preview consumed & clean candidate rows
      await connection.query('UPDATE `ImportPreview` SET `is_consumed` = 1 WHERE `id` = ?', [previewId]);
      await connection.query('DELETE FROM `RepCandidate` WHERE `preview_id` = ?', [previewId]);
      await connection.query('DELETE FROM `RepCountyCandidate` WHERE `preview_id` = ?', [previewId]);

      // 4. Update DatasetState
      await connection.query(
        'UPDATE `DatasetState` SET `current_run_id` = ?, `current_version` = ?, `updated_at` = NOW() WHERE `id` = 1',
        [runId, nextVersion]
      );

      await connection.commit ? await connection.commit() : await connection.query('COMMIT');
      connection.release();

      return {
        success: true,
        version: nextVersion,
        runId,
        operation: preview.operation,
        restoredFromVersion: preview.restore_from_version || null,
        totalReps: candidatesReps.length,
        totalTerritories: candidatesTerritories.length,
        checksum,
      };
    } catch (err) {
      if (connection) {
        try { await connection.query('ROLLBACK'); } catch (_) {}
        connection.release();
      }
      throw err;
    }
  }
}

module.exports = DatasetPublisher;
