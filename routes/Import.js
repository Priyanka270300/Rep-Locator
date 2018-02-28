const express = require('express');
const router = express.Router();
const Zip = require('../app/Zip');
const RepCountyComboImporter = require('../app/RepCountyComboImporter');

router.get('/', (req, res) => {
  res.send('test');
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
    await RepCountyComboImporter.importCSV('import/ecn.csv');
    res.send('Imported');
  } catch(error) {
    return res.status(500).send(error);
  }
});

module.exports = router;
