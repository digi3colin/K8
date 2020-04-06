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
const K8 = require('../K8');
const {Model} = require('@komino/k8-core-mvc');

//static private function
/**
 * has many
 * @param {typeof ORM} modelClass
 */
function assignTableName(modelClass){
  modelClass.jointTablePrefix = modelClass.name.toLowerCase();
  modelClass.tableName = pluralize(modelClass.jointTablePrefix);
}

class ORM extends Model{
  constructor(id = null, options = {}){
    super();
    //private property this.db.
    Object.defineProperty(this, "db", {
      enumerable : false,
      value : options.database
    });

    this.id = id;
    this.created_at = null;
    this.updated_at = null;

    if(this.constructor !== ORM){
      if(!this.constructor.tableName){
        assignTableName(this.constructor);
      }

      if(!this.constructor.jointTablePrefix){
        this.constructor.jointTablePrefix = this.constructor.tableName.replace(/s$/i, '')//singluar tableName;
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
    const columns = Object.keys(this.constructor.fieldType);
    //add belongsTo to columns
    this.constructor.belongsTo.forEach(x => columns.push(x.fk));

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
    const lk = this.constructor.key;
    const fk = Model.key;

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
    const lk = this.constructor.key;
    const fk = Model.key;

    this.prepare(`DELETE FROM ${jointTableName} WHERE ${lk} = ? AND ${fk} = ?`).run(this.id, model.id);
  }

  delete(){
    if(!this.id)throw new Error('ORM delete Error, no id defined');
    const tableName = this.constructor.tableName;
    this.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(this.id);

    //remove many to many
    this.constructor.belongsToMany.forEach(x => {
      const modelClass = K8.require(`models/${x}`);
      const lk = this.constructor.key;
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
    const modelName = this.constructor.belongsTo.find(x => x.fk === fk).model;
    const modelClass = K8.require(`models/${modelName}`);
    return new modelClass(this[fk], {database: this.db});
  }

  /**
   * has many
   * @param {typeof ORM} modelClass
   */

  hasMany(modelClass){
    if(!modelClass.tableName)assignTableName(modelClass);

    const key = this.constructor.key;
    return this.prepare(`SELECT * FROM ${modelClass.tableName} WHERE ${key} = ?`).all(this.id).map(x => Object.assign(new modelClass(null, {database : this.db}), x));
  }

  /**
   *
   * @param {typeof ORM} modelClass
   */
  belongsToMany(modelClass){
    const jointTableName = this.constructor.jointTablePrefix + '_' +modelClass.tableName;

    const sql = `SELECT ${modelClass.tableName}.* FROM ${modelClass.tableName} JOIN ${jointTableName} ON ${modelClass.tableName}.id = ${jointTableName}.${modelClass.key} WHERE ${jointTableName}.${this.constructor.key} = ? ORDER BY ${jointTableName}.weight`;
    return this.prepare(sql).all(this.id).map(x => Object.assign(new modelClass(null, {database : this.db}), x));
  }

  /**
   *
   * @param {Database} db
   */
  static setDB(db){
    ORM.db = db;
  }


  all(){
    const model = this.constructor;
    if(!model.tableName)assignTableName(model);
    return this.prepare(`SELECT * from ${model.tableName}`).all().map(x => Object.assign(new model(null, {database: this.db}), x));
  }

  /**
   *
   * @param {typef ORM} modelClass
   * @returns {Array}
   */
  static all(modelClass) {
    const m = new modelClass();
    return m.all();
  }

  /**
   *
   * @param {typeof ORM} modelClass
   * @param {Number} id
   * @returns {Object}
   */
  static get(modelClass, id){
    return new modelClass(id);
  }

  /**
   *
   * @param {string} sql
   */
  prepare(sql){
    if(this.db)return this.db.prepare(sql);
    return ORM.prepare(sql);
  }

  static prepare(sql){
    if(!ORM.db)throw new Error('ORM Database not assigned. Please provide database with ORM.setDB(db)');
    return ORM.db.prepare(sql);
  }
}

//ORM is abstract, jointTablePrefix and tableName must be undefined.
ORM.jointTablePrefix = undefined;
ORM.tableName = undefined;
ORM.key = undefined;
ORM.fieldType = {};
ORM.belongsTo = [];
ORM.hasMany   = [];
ORM.belongsToMany = [];

Object.freeze(ORM.prototype);
module.exports = ORM;