let mysqlDB = require('../utils/mysql');

const RepCounty = require('../app/RepCounty');

class Rep {
  constructor(valueObj = null) {
    this.rep_code = null;
    this.agency = null;
    this.contact = null;
    this.address = null;
    this.city = null;
    this.state = null;
    this.zip = null;
    this.phone = null;
    this.fax = null;

    if(typeof valueObj == 'object') {
      Object.assign(this, valueObj);
    }
  }

  static async queryRepsByLocation(brand, state, county, zip) {
    if(typeof brand === 'undefined' || brand == '') throw 'Brand argument required';
    const conditions = this._buildRepCodesConditions({brand, state, county, zip});

    const [rows] = await mysqlDB.query('SELECT DISTINCT `Rep`.`rep_code`, `Rep`.`agency`, `Rep`.`contact`, `Rep`.`address`, `Rep`.`city`, `Rep`.`state`, `Rep`.`zip`, `Rep`.`phone`, `Rep`.`fax`, `Rep`.`email`, `RepCounty`.`notes` FROM `RepCounty` INNER JOIN `Zip` ON `RepCounty`.`county` = `Zip`.`county` AND `RepCounty`.`state_abbr` = `Zip`.`state` INNER JOIN `Rep` ON `RepCounty`.`rep_code` = `Rep`.`rep_code` WHERE ' + conditions.where, conditions.values);

    return rows.map(row => new Rep(row));
  }

  static _buildRepCodesConditions(params) {
    let conditions = [];
    let values = [];

    if (typeof params.brand !== 'undefined' && params.brand != '') {
      conditions.push('`RepCounty`.`brand` = ?');
      values.push(params.brand);
    }

    if (typeof params.county !== 'undefined' && params.county != '') {
      conditions.push('`RepCounty`.`county` LIKE ?');
      values.push(params.county + '%');
    }

    if (typeof params.state !== 'undefined' && params.state != '') {
      conditions.push('`RepCounty`.`state_abbr` = ?');
      values.push(params.state);
    }

    if (typeof params.zip !== 'undefined' && params.zip != '') {
      conditions.push('`Zip`.`zip` = ?');
      values.push(params.zip);
    }

    return {
      where: conditions.length ?
        conditions.join(' AND ') : '1',
      values: values,
    };
  }
}

module.exports = Rep;
