const ORM = require('../../../../../../classes/ORM');

class Person extends ORM{
  constructor(key, options) {
    super(key, options);

    //foreignKeys


    //fields
    this.first_name = null;
    this.last_name = null;
    this.phone = null;
    this.email = null;
    this.idx = null;
  }
}

Person.jointTablePrefix = 'person';
Person.tableName = 'persons';
Person.key       = 'person_id';

Person.fieldType = {
  first_name : ['TEXT', 'NOT NULL'],
  last_name : ['TEXT', 'NOT NULL'],
  phone : ['TEXT'],
  email : ['TEXT'],
  idx   : ['INTEGER', 'PRIMARY KEY AUTOINCREMENT NOT NULL']
};

Person.belongsTo = [
  
];

Person.hasMany   = [
  {fk: 'person_id', model: 'User'}
];

Person.belongsToMany = [
  
];


module.exports = Person;
