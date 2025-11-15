const express = require('express');
const router = express.Router();
const Zip = require('../app/Zip');
const RepCountyComboImporter = require('../app/RepCountyComboImporter');

router.get('/', (req, res) => {
  res.send('<h1>Import API</h1><p>Use /zip to import zips, /repcountycombo to import rep-county combos.</p>');
});

router.get('/zip', async (req, res) => {
  try {
    await Zip.importCSV('import/zips.csv');
    res.send('Imported');
  } catch(error) {
    return res.status(500).send(error);
  }
});

router.get('/repcountycombo', async (req, res) => {
  try {
    var file = req.query.file;
    var append = req.query.append;
    var table = req.query.table;
    if (file) {
      await RepCountyComboImporter.importCSV(`import/${file}.csv`, !append, table);
      res.send('Imported ' + file);
    } else {
      await RepCountyComboImporter.importCSV('import/ecn.csv');
      res.send('Imported default');
    }

  } catch(error) {
    return res.status(500).send(error);
  }
});

module.exports = router;
