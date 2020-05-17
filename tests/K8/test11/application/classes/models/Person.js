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

Person.fields = [
  'first_name',
  'last_name',
  'phone',
  'email',
  'idx',
];

Person.belongsTo = new Map([
  
]);

Person.hasMany   = new Map([
  ['person_id', 'User']
]);

Person.belongsToMany = [
  
];


module.exports = Person;
