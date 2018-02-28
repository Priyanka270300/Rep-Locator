const express = require('express');
const router = express.Router();

const Rep = require('../app/Rep');

router.route('/')
  .get((req, res) => {
    res.send('test');
  });

router.get('/reps_by_location', async (req, res) => {
  try {
    let brand = req.query.brand;
    let state = req.query.state;
    let county = req.query.county;
    let zip = req.query.zip;

    let reps = await Rep.queryRepsByLocation(brand, state, county, zip);
    res.json(reps);
  } catch(error) {
    return res.status(500).send(error);
  }
});

module.exports = router;
