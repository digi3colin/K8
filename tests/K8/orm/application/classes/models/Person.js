const ORM = require('../../../../../../classes/ORM');

class Person extends ORM{
  constructor(id, db) {
    super(id, db);

    if(id)return;

    //foreignKeys


    //fields
    this.first_name = null;
    this.last_name = null;
    this.phone = null;
    this.email = null;
  }
}

Person.jointTablePrefix = 'person';
Person.tableName = 'persons';

Person.fields = [
  'first_name',
  'last_name',
  'phone',
  'email'
];

Person.belongsTo = new Map([
  
]);

Person.hasMany   = new Map([
  ['person_id', 'Address'],
  ['person_id', 'User'],
  ['person_id', 'Customer']
]);

Person.belongsToMany = [
  
];


module.exports = Person;
