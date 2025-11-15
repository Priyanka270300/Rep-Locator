let mysqlDB = require('../utils/mysql');

class RepCounty {
  constructor() {
    this.id = null;
    this.county = null;
    this.state = null;
    this.territory_id = null;
    this.territory_name = null;
    this.brand = null;
    this.rep_code = null;
    this.notes = null;
    this.country = null;
  }
}

module.exports = RepCounty;
