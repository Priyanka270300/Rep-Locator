let mysqlDB = require('../utils/mysql');

class Zip {
  constructor() {
    this.zip = null;
    this.county = null;
    this.state = null;
  }

  static async importCSV(filePath) {
    await mysqlDB.query('TRUNCATE TABLE `Zip`');
    await mysqlDB.query('LOAD DATA LOCAL INFILE ? INTO TABLE `Zip` CHARACTER SET utf8 FIELDS TERMINATED BY "," ENCLOSED BY \'"\' LINES TERMINATED BY "\n" IGNORE 1 ROWS (zip, @dummy, county, state)', [filePath]);

    return;
  }
}

module.exports = Zip;
