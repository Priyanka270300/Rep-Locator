const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mysqlDB = require('../utils/mysql');
const ImportUpload = require('../app/ImportUpload');
const ImportValidator = require('../app/ImportValidator');
const ImportPreview = require('../app/ImportPreview');
const DatasetPublisher = require('../app/DatasetPublisher');
const RestoreEngine = require('../app/RestoreEngine');
const HistoryManager = require('../app/HistoryManager');

// 1. Get current dataset state
router.get('/state', async (req, res) => {
  try {
    const [states] = await mysqlDB.query('SELECT * FROM `DatasetState` WHERE `id` = 1');
    const currentState = states[0] || { current_version: 0, current_run_id: null };

    const [repsCount] = await mysqlDB.query('SELECT COUNT(*) as c FROM `Rep`');
    const [territoriesCount] = await mysqlDB.query('SELECT COUNT(*) as c FROM `RepCounty`');
    const [brands] = await mysqlDB.query('SELECT DISTINCT `brand` FROM `RepCounty`');

    let latestRun = null;
    if (currentState.current_run_id) {
      const [runs] = await mysqlDB.query('SELECT * FROM `ImportRun` WHERE `id` = ?', [currentState.current_run_id]);
      if (runs.length) latestRun = runs[0];
    }

    res.json({
      currentVersion: currentState.current_version,
      currentRunId: currentState.current_run_id,
      updatedAt: currentState.updated_at,
      totalReps: repsCount[0].c,
      totalTerritories: territoriesCount[0].c,
      brands: brands.map(b => b.brand).filter(Boolean),
      latestRun,
    });
  } catch (err) {
    console.error('Admin state error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Get history list
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const history = await HistoryManager.getHistory({ limit, offset });
    res.json(history);
  } catch (err) {
    console.error('Admin history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Get specific version details
router.get('/history/:version', async (req, res) => {
  try {
    const version = parseInt(req.params.version, 10);
    const details = await HistoryManager.getVersionDetails(version);
    if (!details) {
      return res.status(404).json({ error: `Version V${version} not found.` });
    }
    res.json(details);
  } catch (err) {
    console.error('Admin version detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Export version as JSON or CSV
router.get('/history/:version/export', async (req, res) => {
  try {
    const version = parseInt(req.params.version, 10);
    const format = (req.query.format || 'csv').toLowerCase();
    const data = await HistoryManager.exportVersion(version, format);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="rep_locator_v${version}_export.json"`);
      return res.send(JSON.stringify(data, null, 2));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rep_locator_v${version}_export.csv"`);
    return res.send(data);
  } catch (err) {
    console.error('Admin export error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Upload file (via JSON payload with content string or base64)
router.post('/upload', async (req, res) => {
  try {
    const { filename, content, actor = 'admin' } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'No file content provided.' });
    }

    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const upload = await ImportUpload.saveUpload({
      originalFilename: filename || 'import.csv',
      buffer,
      actor,
    });

    res.json({ success: true, upload });
  } catch (err) {
    console.error('Admin upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Generate preview from upload or local file
router.post('/preview', async (req, res) => {
  try {
    const { uploadId, localFile, content, filename, mode = 'replace_selected', actor = 'admin' } = req.body;

    let targetFilePath = null;
    let actualUploadId = uploadId;

    if (uploadId) {
      const upload = await ImportUpload.getUpload(uploadId);
      if (!upload) return res.status(404).json({ error: `Upload ID ${uploadId} not found.` });
      targetFilePath = upload.storagePath;
    } else if (content) {
      const upload = await ImportUpload.saveUpload({
        originalFilename: filename || 'uploaded_import.csv',
        buffer: Buffer.from(content, 'utf8'),
        actor,
      });
      actualUploadId = upload.uploadId;
      targetFilePath = upload.storagePath;
    } else if (localFile) {
      targetFilePath = path.isAbsolute(localFile) ? localFile : path.join(__dirname, '..', localFile);
    } else {
      // Default to import/rs.csv if it exists
      const defaultPath = path.join(__dirname, '..', 'import', 'rs.csv');
      if (fs.existsSync(defaultPath)) {
        targetFilePath = defaultPath;
      } else {
        return res.status(400).json({ error: 'Please provide an uploadId, file content, or localFile path.' });
      }
    }

    const validationResult = await ImportValidator.validateFile(targetFilePath);

    if (!validationResult.isValid && validationResult.errors.length > 0) {
      return res.status(422).json({
        success: false,
        validationStatus: 'invalid',
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });
    }

    const preview = await ImportPreview.createImportPreview({
      uploadId: actualUploadId,
      validationResult,
      mode,
      actor,
    });

    res.json({ success: true, preview });
  } catch (err) {
    console.error('Admin preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Atomically publish an import preview
router.post('/publish', async (req, res) => {
  try {
    const { previewId, actor = 'admin' } = req.body;
    if (!previewId) {
      return res.status(400).json({ error: 'previewId is required.' });
    }

    const result = await DatasetPublisher.publishCandidate({
      previewId,
      actor,
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error('Admin publish error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Generate restore preview diff
router.post('/restore/preview', async (req, res) => {
  try {
    const { targetVersion, actor = 'admin' } = req.body;
    if (!targetVersion) {
      return res.status(400).json({ error: 'targetVersion is required.' });
    }

    const preview = await RestoreEngine.createRestorePreview({
      targetVersion: parseInt(targetVersion, 10),
      actor,
    });

    res.json({ success: true, preview });
  } catch (err) {
    console.error('Admin restore preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Atomically publish restore
router.post('/restore/publish', async (req, res) => {
  try {
    const { previewId, actor = 'admin' } = req.body;
    if (!previewId) {
      return res.status(400).json({ error: 'previewId is required.' });
    }

    const result = await DatasetPublisher.publishCandidate({
      previewId,
      actor,
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error('Admin restore publish error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. Compare any two versions
router.post('/compare', async (req, res) => {
  try {
    const { versionA, versionB } = req.body;
    if (!versionA || !versionB) {
      return res.status(400).json({ error: 'Both versionA and versionB are required.' });
    }

    const comparison = await HistoryManager.compareVersions(parseInt(versionA, 10), parseInt(versionB, 10));
    res.json({ success: true, comparison });
  } catch (err) {
    console.error('Admin compare error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
