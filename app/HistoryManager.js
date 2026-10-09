const mysqlDB = require('../utils/mysql');
const ImportPreview = require('./ImportPreview');

class HistoryManager {
  /**
   * Retrieves paginated or complete version history.
   */
  static async getHistory({ limit = 50, offset = 0 } = {}) {
    const [runs] = await mysqlDB.query(
      `SELECT * FROM \`ImportRun\`
       ORDER BY \`id\` DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );

    const [countResult] = await mysqlDB.query('SELECT COUNT(*) as total FROM `ImportRun`');
    const [stateRows] = await mysqlDB.query('SELECT * FROM `DatasetState` WHERE `id` = 1');
    const currentState = stateRows[0] || { current_version: 0, current_run_id: null };

    return {
      total: countResult[0].total,
      currentVersion: currentState.current_version,
      currentRunId: currentState.current_run_id,
      items: runs.map(run => ({
        ...run,
        isCurrent: run.version_number === currentState.current_version && run.status === 'successful',
        affected_brands: typeof run.affected_brands === 'string' ? JSON.parse(run.affected_brands || '[]') : run.affected_brands,
        summary_diff: typeof run.summary_diff === 'string' ? JSON.parse(run.summary_diff || '{}') : run.summary_diff,
      })),
    };
  }

  /**
   * Gets details for a specific version.
   */
  static async getVersionDetails(versionNumber) {
    const [runs] = await mysqlDB.query(
      'SELECT * FROM `ImportRun` WHERE `version_number` = ? AND `status` = \'successful\'',
      [versionNumber]
    );

    if (!runs.length) return null;
    const run = runs[0];

    const [reps] = await mysqlDB.query('SELECT * FROM `RepSnapshot` WHERE `run_id` = ?', [run.id]);
    const [territories] = await mysqlDB.query('SELECT * FROM `RepCountySnapshot` WHERE `run_id` = ?', [run.id]);

    return {
      run: {
        ...run,
        affected_brands: typeof run.affected_brands === 'string' ? JSON.parse(run.affected_brands || '[]') : run.affected_brands,
        summary_diff: typeof run.summary_diff === 'string' ? JSON.parse(run.summary_diff || '{}') : run.summary_diff,
      },
      repsCount: reps.length,
      territoriesCount: territories.length,
      repsSample: reps.slice(0, 20),
      territoriesSample: territories.slice(0, 20),
    };
  }

  /**
   * Compares two versions (Version A vs Version B).
   */
  static async compareVersions(versionA, versionB) {
    const [runsA] = await mysqlDB.query('SELECT * FROM `ImportRun` WHERE `version_number` = ?', [versionA]);
    const [runsB] = await mysqlDB.query('SELECT * FROM `ImportRun` WHERE `version_number` = ?', [versionB]);

    if (!runsA.length) throw new Error(`Version V${versionA} not found.`);
    if (!runsB.length) throw new Error(`Version V${versionB} not found.`);

    const [repsA] = await mysqlDB.query('SELECT * FROM `RepSnapshot` WHERE `run_id` = ?', [runsA[0].id]);
    const [territoriesA] = await mysqlDB.query('SELECT * FROM `RepCountySnapshot` WHERE `run_id` = ?', [runsA[0].id]);

    const [repsB] = await mysqlDB.query('SELECT * FROM `RepSnapshot` WHERE `run_id` = ?', [runsB[0].id]);
    const [territoriesB] = await mysqlDB.query('SELECT * FROM `RepCountySnapshot` WHERE `run_id` = ?', [runsB[0].id]);

    const diff = ImportPreview.computeDiff(repsA, territoriesA, repsB, territoriesB);

    return {
      versionA,
      versionB,
      diff,
    };
  }

  /**
   * Exports a version snapshot as JSON or CSV.
   */
  static async exportVersion(versionNumber, format = 'json') {
    const [runs] = await mysqlDB.query(
      'SELECT * FROM `ImportRun` WHERE `version_number` = ? AND `status` = \'successful\'',
      [versionNumber]
    );

    if (!runs.length) throw new Error(`Version V${versionNumber} not found.`);
    const run = runs[0];

    const [reps] = await mysqlDB.query('SELECT * FROM `RepSnapshot` WHERE `run_id` = ?', [run.id]);
    const [territories] = await mysqlDB.query('SELECT * FROM `RepCountySnapshot` WHERE `run_id` = ?', [run.id]);

    if (format === 'json') {
      return {
        manifest: {
          version: run.version_number,
          operation: run.operation,
          actor: run.actor,
          checksum: run.checksum,
          repsCount: reps.length,
          territoriesCount: territories.length,
          createdAt: run.completed_at,
        },
        reps,
        territories,
      };
    }

    // CSV format
    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      return `"${String(str).replace(/"/g, '""')}"`;
    };

    const repMap = new Map();
    for (const r of reps) {
      repMap.set(`${(r.brand || '').toUpperCase()}::${(r.rep_code || '').toUpperCase()}`, r);
    }

    const headers = [
      'County Name', 'State Abbv', 'State', 'Country1', 'TerritoryRegionCode',
      'TerritoryRegion', 'Brand', 'RepAgencyCode', 'RepAgency', 'Principal',
      'Main Contact', 'Address', 'City', 'State2', 'Zip',
      'Country2', 'Phone', 'Fax', 'Principal Email', 'Main Contact Email',
      'Notes'
    ];

    const rows = [headers.join(',')];

    for (const t of territories) {
      const rep = repMap.get(`${(t.brand || '').toUpperCase()}::${(t.rep_code || '').toUpperCase()}`) || {};
      const row = [
        escapeCsv(t.county),
        escapeCsv(t.state_abbr),
        escapeCsv(t.state),
        escapeCsv(t.country),
        escapeCsv(t.territory_id),
        escapeCsv(t.territory_name),
        escapeCsv(t.brand),
        escapeCsv(t.rep_code),
        escapeCsv(rep.agency),
        escapeCsv(''),
        escapeCsv(rep.contact),
        escapeCsv(rep.address),
        escapeCsv(rep.city),
        escapeCsv(rep.state),
        escapeCsv(rep.zip),
        escapeCsv(rep.country),
        escapeCsv(rep.phone),
        escapeCsv(rep.fax),
        escapeCsv(''),
        escapeCsv(rep.email),
        escapeCsv(t.notes),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }
}

module.exports = HistoryManager;
