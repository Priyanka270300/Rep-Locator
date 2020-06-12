let mysqlDB = require('../utils/mysql');

class RepCountyComboImporter {
  static async importCSV(filePath, truncate=true) {
    try {
      if (truncate) {
        await mysqlDB.query('TRUNCATE TABLE `RepCounty`');
        await mysqlDB.query('TRUNCATE TABLE `Rep`');
      }

      await mysqlDB.query(`CREATE TEMPORARY TABLE \`temp_import\` (
        \`county\` varchar(255) NOT NULL,
        \`state\` varchar(255) NOT NULL,
        \`state_abbr\` varchar(255) DEFAULT NULL,
        \`territory_id\` int(11) DEFAULT NULL,
        \`territory_name\` varchar(255) DEFAULT NULL,
        \`brand\` varchar(255) NOT NULL,
        \`rep_code\` varchar(11) NOT NULL,
        \`agency\` varchar(255) DEFAULT NULL,
        \`contact\` varchar(255) DEFAULT NULL,
        \`address\` varchar(255) DEFAULT NULL,
        \`city\` varchar(255) DEFAULT NULL,
        \`rep_state\` varchar(255) DEFAULT NULL,
        \`zip\` varchar(255) DEFAULT NULL,
        \`phone\` varchar(255) DEFAULT NULL,
        \`fax\` varchar(255) DEFAULT NULL,
        \`email\` varchar(255) DEFAULT NULL,
        \`notes\` text
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1`);

      await mysqlDB.query(`LOAD DATA LOCAL INFILE ? INTO TABLE \`temp_import\` CHARACTER SET utf8 FIELDS OPTIONALLY ENCLOSED BY '"' TERMINATED BY "," LINES TERMINATED BY "\n" IGNORE 1 ROWS
        (county, state_abbr, state, territory_id, territory_name, brand, rep_code, agency, contact, address, city, rep_state, zip, phone, fax, email, notes)`, [filePath]);

      // if (!truncate) {
      //   await mysqlDB.query(`DELETE FROM \`Rep\` WHERE rep_code in (SELECT DISTINCT rep_code FROM \`temp_import\`)`);
      // }

      // if(cleanUpdate) {
      //   var query = `DELETE FROM \`Rep\` WHERE rep_code in (
      //       SELECT cid FROM (
      //           SELECT DISTINCT Rep.rep_code as cid FROM \`Rep\`, \`RepCounty\`
      //           WHERE Rep.rep_code = RepCounty.rep_code AND RepCounty.brand in (SELECT DISTINCT temp_import.brand from \`temp_import\`)
      //       ) As c
      //   )`;
      //   await mysqlDB.query(query);
      //   await mysqlDB.query(`DELETE FROM \`RepCounty\` WHERE brand in (SELECT DISTINCT brand from \`temp_import\`)`);
      // }

      await mysqlDB.query(`INSERT INTO \`Rep\` (Rep.rep_code, Rep.brand, Rep.agency, Rep.contact, Rep.address, Rep.city, Rep.state, Rep.zip, Rep.phone, Rep.fax, Rep.email)
        (SELECT DISTINCT temp_import.rep_code, temp_import.brand, temp_import.agency, temp_import.contact, temp_import.address, temp_import.city, temp_import.rep_state, temp_import.zip, temp_import.phone, temp_import.fax, temp_import.email
        FROM \`temp_import\`)`);

      await mysqlDB.query(`INSERT INTO \`RepCounty\` (RepCounty.county, RepCounty.state, RepCounty.state_abbr, RepCounty.territory_id, RepCounty.territory_name, RepCounty.brand, RepCounty.rep_code, RepCounty.notes)
        (SELECT temp_import.county, temp_import.state, temp_import.state_abbr, temp_import.territory_id, temp_import.territory_name, temp_import.brand, temp_import.rep_code, temp_import.notes
        FROM temp_import)`);

      await mysqlDB.query('DROP TEMPORARY TABLE `temp_import`');
    } catch(error) {
      await mysqlDB.query('DROP TEMPORARY TABLE `temp_import`');
      throw error;
    }
  }
}

module.exports = RepCountyComboImporter;
