let mysqlDB = require('../utils/mysql');

class RepCountyComboImporter {
  static async importCSV(filePath, truncate=true, table = '') {
    try {
      if (truncate) {
        await mysqlDB.query('TRUNCATE TABLE `RepCounty`');
        await mysqlDB.query('TRUNCATE TABLE `Rep`');
      }

      if (!table) {
        await mysqlDB.query(`CREATE TEMPORARY TABLE \`temp_import\` (
        \`county\` varchar(255) NOT NULL,
        \`state\` varchar(255) NOT NULL,
        \`country\` varchar(255) DEFAULT NULL,
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

        await mysqlDB.query(`LOAD DATA LOCAL INFILE ? INTO TABLE \`temp_import\` CHARACTER SET utf8 FIELDS OPTIONALLY ENCLOSED BY '"' TERMINATED BY ',' LINES TERMINATED BY "\n" IGNORE 1 ROWS
          (county, state_abbr, state, country, territory_id, territory_name, brand, rep_code, agency, contact, address, city, rep_state, zip, rep_country, phone, fax, email, notes)`, [filePath]);
      }

      var tableName = table ? table : 'temp_import';

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


      await mysqlDB.query(`INSERT INTO \`Rep\` (Rep.rep_code, Rep.brand, Rep.agency, Rep.contact, Rep.address, Rep.city, Rep.state, Rep.zip, Rep.country, Rep.phone, Rep.fax, Rep.email, Rep.contact_id)
      (SELECT DISTINCT ${tableName}.rep_code, ${tableName}.brand, ${tableName}.agency, ${tableName}.contact, ${tableName}.address, ${tableName}.city, ${tableName}.rep_state, ${tableName}.zip, ${tableName}.rep_country, ${tableName}.phone, ${tableName}.fax, ${tableName}.email
      FROM \`${tableName}\`)`);

      await mysqlDB.query(`INSERT INTO \`RepCounty\` (RepCounty.county, RepCounty.state, RepCounty.country, RepCounty.state_abbr, RepCounty.territory_id, RepCounty.territory_name, RepCounty.brand, RepCounty.rep_code, RepCounty.notes)
      (SELECT ${tableName}.county, ${tableName}.state, ${tableName}.country, ${tableName}.state_abbr, ${tableName}.territory_id, ${tableName}.territory_name, ${tableName}.brand, ${tableName}.rep_code, ${tableName}.notes, ${tableName}.contact_id
      FROM ${tableName})`);

      if (!table) {
        await mysqlDB.query('DROP TEMPORARY TABLE `temp_import`');
      }
    } catch(error) {
      await mysqlDB.query('DROP TEMPORARY TABLE `temp_import`');
      throw error;
    }
  }
}

module.exports = RepCountyComboImporter;
