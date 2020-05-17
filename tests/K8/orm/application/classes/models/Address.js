const ORM = require('../../../../../../classes/ORM');

class Address extends ORM{
  constructor(id, db) {
    super(id, db);

    if(id)return;

    //foreignKeys
    this.person_id = null;

    //fields
    this.address1 = null;
    this.address2 = null;
    this.city = null;
    this.company = null;
    this.country = null;
    this.country_code = null;
    this.province = null;
    this.province_code = null;
    this.street = null;
    this.zip = null;
  }
}

Address.jointTablePrefix = 'address';
Address.tableName = 'addresses';

Address.fields = [
  "address1",
  "address2",
  "city",
  "company",
  "country",
  "country_code",
  "province",
  "province_code",
  "street",
  "zip"
];

Address.belongsTo = new Map([
  ['person_id', 'Person']
]);

Address.hasMany   = new Map([
  ['address_id', 'Customer'],
  ['billing_address_id', 'Order'],
  ['shipping_address_id', 'Order'],
  ['address_id', 'Shop'],
  ['shipping_address_id', 'Checkout'],
  ['billing_address_id', 'Checkout']
]);

Address.belongsToMany = [
  
];


module.exports = Address;
