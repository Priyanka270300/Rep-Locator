let mysqlDB = require('../utils/mysql');
const RepCounty = require('../app/RepCounty');

class Country {
  constructor(valueObj = null) {
    this.abbr = null;
    this.country = null;

    if (typeof valueObj === 'object') {
      Object.assign(this, valueObj);
    }
  }
}

class State {
  constructor(valueObj = null) {
    this.abbr = null;
    this.state = null;

    if (typeof valueObj === 'object') {
      Object.assign(this, valueObj);
    }
  }
}

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
    this.country = null;
    this.notes = null;
    this.contact_id = null;

    if (typeof valueObj === 'object') {
      Object.assign(this, valueObj);
    }
  }

  static async queryRepsByLocation(brand, state, county, zip, country) {
    if (!brand) throw new Error('Brand argument required');

    const conditions = this._buildRepCodesConditions({ brand, state, county, zip, country });
    let query = `SELECT DISTINCT 
          Rep.rep_code, Rep.agency, Rep.contact, Rep.address, Rep.city,
          Rep.state, Rep.zip, Rep.phone, Rep.fax, Rep.email, Rep.country, Rep.contact_id, RepCounty.notes
        FROM RepCounty`;
    if (zip) {
      query = `${query} INNER JOIN Zip 
          ON RepCounty.county = Zip.county AND RepCounty.state_abbr = Zip.state`
    }
    query = `${query} INNER JOIN Rep 
          ON RepCounty.rep_code = Rep.rep_code AND RepCounty.contact_id = Rep.contact_id and RepCounty.contact_id = Rep.contact_id`;
    const [rows] = await mysqlDB.query(
        `${query} where ${conditions.where}`,
        conditions.values
      );

    return rows.map(row => new Rep(row));
  }


  static async countriesByBrand(brand) {
    if (!brand) throw new Error('Brand argument required');

    let query = `SELECT DISTINCT RepCounty.country, RepCounty.country as abbr
        FROM RepCounty`;
    const [rows] = await mysqlDB.query(
        `${query} where RepCounty.brand = ?`,
        [brand]
      );

    return rows.map(row => new Country(row));
  }


  static async statesByBrandAndCountry(brand, country) {
    if (!brand) throw new Error('Brand argument required');
    if (!country) throw new Error('Country argument required');

    let query = `SELECT DISTINCT state, state_abbr as abbr
        FROM RepCounty`;
    const [rows] = await mysqlDB.query(
        `${query} where brand = ? and country = ? and state <> ''`,
        [brand, country]
      );

    return rows.map(row => new State(row));
  }

  static _buildRepCodesConditions(params) {
    const conditions = [];
    const values = [];

    if (params.brand) {
      conditions.push('RepCounty.brand = ?');
      values.push(params.brand);
    }

    if (params.county) {
      conditions.push('RepCounty.county LIKE ?');
      values.push(params.county + '%');
    }

    if (params.state) {
      conditions.push('RepCounty.state_abbr = ?');
      values.push(params.state);
    }

    if (params.zip) {
      conditions.push('Zip.zip = ?');
      values.push(params.zip);
    }

    if (params.country) {
      conditions.push('RepCounty.country = ?');
      values.push(params.country);
    }

    // if (params.country && params.country.toLowerCase() === 'canada') {
    //   conditions.push('RepCounty.country = ?');
    //   values.push('canada');

    //   if (params.county) {
    //     conditions.push('RepCounty.county LIKE ?');
    //     values.push(params.county + '%');
    //   }

    //   if (params.zip) {
    //     conditions.push('Zip.zip = ?');
    //     values.push(params.zip);
    //   }

    // }
    return {
      where: conditions.length ? conditions.join(' AND ') : '1',
      values,
    };
  }
}

module.exports = Rep;
