const express = require('express');
const router = express.Router();

const Rep = require('../app/Rep');

router.route('/')
  .get((req, res) => {
    res.send('<h1>Search API</h1><p>Use /reps_by_location to search for reps by location.</p>');
  });

router.get('/reps_by_location', async (req, res) => {
  try {
    let brand = req.query.brand;
    let state = req.query.state;
    let county = req.query.county;
    let zip = req.query.zip;
    let country = req.query.country;

    let reps = await Rep.queryRepsByLocation(brand, state, county, zip, country);
    res.json(reps);
  } catch(error) {
    return res.status(500).send(error);
  }
});

module.exports = router;
