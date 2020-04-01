const ORM = require('../../../../../../classes/ORM');

class Product extends ORM{
  constructor(id, db) {
    super(id, db);

    if(id)return;

    //foreignKeys
    this.default_image_id = null;
    this.type_id = null;
    this.vendor_id = null;

    //fields
    this.name = null;
    this.content = null;
    this.handle = null;
    this.title = null;
    this.description = null;
    this.template_suffix = null;
    this.available = null;
  }
}

Product.jointTablePrefix = 'product';
Product.tableName = 'products';
Product.key       = 'product_id';

Product.fieldType = {
  name : ['TEXT', 'NOT NULL'],
  content : ['TEXT'],
  handle : ['TEXT'],
  title : ['TEXT'],
  description : ['TEXT'],
  template_suffix : ['TEXT'],
  available : ['BOOLEAN']
};

Product.belongsTo = [
  {fk: 'default_image_id', model: 'Image'},
  {fk: 'type_id', model: 'Type'},
  {fk: 'vendor_id', model: 'Vendor'}
];

Product.hasMany   = [
  {fk: 'product_id', model: 'Variant'},
  {fk: 'product_id', model: 'LineItem'},
  {fk: 'product_id', model: 'GiftCard'}
];

Product.belongsToMany = [
  'Tag',
];


module.exports = Product;
