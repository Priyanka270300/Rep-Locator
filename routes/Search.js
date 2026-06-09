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

router.get('/countries', async (req, res) => {
  try {
    let brand = req.query.brand;

    let reps = await Rep.countriesByBrand(brand);
    res.json(reps);
  } catch(error) {
    return res.status(500).send(error);
  }
});


router.get('/states', async (req, res) => {
  try {
    let brand = req.query.brand;
    let country = req.query.country;

    let reps = await Rep.statesByBrandAndCountry(brand, country);
    res.json(reps);
  } catch(error) {
    return res.status(500).send(error);
  }
});

router.get('/counties', async (req, res) => {
  try {
    let brand = req.query.brand;
    let country = req.query.country;
    let state = req.query.state;

    let reps = await Rep.countiesByBrandCountryAndState(brand, country, state);
    res.json(reps);
  } catch(error) {
    return res.status(500).send(error);
  }
});

module.exports = router;
