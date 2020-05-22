/*
 * This file is part of K8MVC (https://github.com/digi3colin/k8).
 * Copyright (c) 2019-2020 Colin Leung.
 *
 *  K8MVC is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  K8MVC is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with K8MVC.  If not, see <https://www.gnu.org/licenses/>.
 */
const pluralize = require('pluralize');
pluralize.addPluralRule('person', 'persons');
const K8 = require('../K8');
const {Model} = require('@komino/k8-core-mvc');

class ORM extends Model{
  constructor(id = null, options = {}){
    super();
    //private property this.db.
    Object.defineProperty(this, "db", {
      enumerable : false,
      value : options.database || ORM.database
    });

    this.id = id;
    this.created_at = null;
    this.updated_at = null;

    if(this.constructor !== ORM){
      if(!this.constructor.tableName){
        this.constructor.tableName = pluralize(this.constructor.name).toLowerCase();
      }
      if(!this.constructor.jointTablePrefix){
        this.constructor.jointTablePrefix = pluralize.singular(this.constructor.tableName);
      }
    }


    if( options.lazyload || !this.id )return;
    this.load();
  }

  load(){
    if(!this.id)return false;
    const result = this.prepare(`SELECT * from ${this.constructor.tableName} WHERE id = ?`).get(this.id);
    if(!result)return false;

    Object.assign(this, result);
    return true;
  }

  /**
   * @return ORM
   */
  save(){
    const tableName = this.constructor.tableName;
    const columns = [...this.constructor.fields.keys()];
    //add belongsTo to columns
    Array.from(this.constructor.belongsTo.keys()).forEach(x => columns.push(x));

    const values = columns.map(x => this[x]);

    let sql = '';
    if(this.id){
      sql = `UPDATE ${tableName} SET ${columns.map(x => `${x} = ?`).join(', ')} WHERE id = ?`;
    }else{
      this.id = ( ( (Date.now() - 1563741060000) / 1000 ) | 0 ) * 100000 + ((Math.random() * 100000) & 65535);
      sql = `INSERT INTO ${tableName} (${columns.join(', ')}, id) VALUES (?, ${columns.map(x => `?`).join(', ')})`;
    }

    values.push(this.id);
    const result = this.prepare(sql).run(...values);
    if(this.idx !== undefined){
      this.idx = result.lastInsertRowid;
    }

    return this;
  }

  /**
   * add belongsToMany
   * @param {ORM} model
   * @param {number|null} weight
   * @returns {boolean}
   */

  add(model, weight = null){
    const Model = model.constructor;

    const jointTableName = `${this.constructor.jointTablePrefix}_${Model.tableName}`;
    const lk = this.constructor.jointTablePrefix + '_id';
    const fk = Model.jointTablePrefix + '_id';

    const record = this.prepare(`SELECT * FROM ${jointTableName} WHERE ${lk} = ? AND ${fk} = ?`).get(this.id, model.id);
    if(record)return false;

    this.prepare(`INSERT INTO ${jointTableName} (${lk}, ${fk}, weight) VALUES (?, ?, ?)`).run(this.id, model.id, weight);
    return true;
  }

  /**
   * remove
   * @param {ORM} model
   */

  remove(model){
    const Model = model.constructor;
    const jointTableName = `${this.constructor.jointTablePrefix}_${Model.tableName}`;
    const lk = this.constructor.jointTablePrefix + '_id';
    const fk = Model.jointTablePrefix + '_id';

    this.prepare(`DELETE FROM ${jointTableName} WHERE ${lk} = ? AND ${fk} = ?`).run(this.id, model.id);
  }

  delete(){
    if(!this.id)throw new Error('ORM delete Error, no id defined');
    const tableName = this.constructor.tableName;
    this.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(this.id);

    //remove many to many
    this.constructor.belongsToMany.forEach(x => {
      const modelClass = K8.require(`models/${x}`);
      const lk = this.constructor.jointTablePrefix + '_id';
      const table = `${this.constructor.jointTablePrefix}_${modelClass.tableName}`;
      this.prepare(`DELETE FROM ${table} WHERE ${lk} = ?`).run(this.id);
    });
  }

  /**
   * belongs to - this table have xxx_id column
   * @param {string} fk
   * @returns {ORM}
   */

  belongsTo(fk){
    const modelName = this.constructor.belongsTo.get(fk);
    const modelClass = K8.require(`models/${modelName}`);
    return new modelClass(this[fk], {database: this.db});
  }

  /**
   * has many
   * @param {ORM} modelClass
   * @param {string} fk
   */

  hasMany(modelClass, fk= ""){
    const key = (fk === "") ? this.constructor.name.toLowerCase() + '_id' : fk;

    return this.prepare(`SELECT * FROM ${modelClass.tableName} WHERE ${key} = ?`)
      .all(this.id)
      .map(x => Object.assign(new modelClass(null, {database : this.db}), x));
  }

  /**
   *
   * @param {ORM} modelClass
   */
  belongsToMany(modelClass){
    const jointTableName = this.constructor.jointTablePrefix + '_' + modelClass.tableName;

    const sql = `SELECT ${modelClass.tableName}.* FROM ${modelClass.tableName} JOIN ${jointTableName} ON ${modelClass.tableName}.id = ${jointTableName}.${modelClass.jointTablePrefix}_id WHERE ${jointTableName}.${this.constructor.jointTablePrefix}_id = ? ORDER BY ${jointTableName}.weight`;
    return this.prepare(sql)
      .all(this.id)
      .map(x => Object.assign(new modelClass(null, {database : this.db}), x));
  }

  all(){
    const model = this.constructor;
    return this.prepare(`SELECT * from ${model.tableName}`)
      .all()
      .map(x => Object.assign(new model(null, {database: this.db}), x));
  }

  /**
   *
   * @param {string} sql
   */
  prepare(sql){
    if(!this.db)throw new Error('Database not assigned.');
    return this.db.prepare(sql);
  }
}

//ORM is abstract, jointTablePrefix and tableName is null.
ORM.jointTablePrefix = null;
ORM.tableName = null;
ORM.database = null;

ORM.fields = new Map();
ORM.belongsTo = new Map();
ORM.hasMany   = [];//hasMany cannot be Map, because children models may share same fk name.
ORM.belongsToMany = [];

Object.freeze(ORM.prototype);
module.exports = ORM;