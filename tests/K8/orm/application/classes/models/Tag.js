const ORM = require('../../../../../../classes/ORM');

class Tag extends ORM{
  constructor(id, db) {
    super(id, db);

    if(id)return;

    //foreignKeys


    //fields
    this.name = null;
  }
}

Tag.jointTablePrefix = 'tag';
Tag.tableName = 'tags';

Tag.fields = ['name'];

Tag.belongsTo = new Map([
  
]);

Tag.hasMany   = new Map([
  
]);

Tag.belongsToMany = [
  
];


module.exports = Tag;
