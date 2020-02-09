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

const K8 = require('../K8');
const Model = K8.require('Model');

//static private function
function assignTableName(model){
  model.jointTablePrefix = model.name.toLowerCase();
  model.tableName = model.jointTablePrefix + 's';
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
    if(!this.id)return;

    Object.assign(this, this.prepare(`SELECT * from ${this.constructor.tableName} WHERE id = ?`).get(this.id));
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
      this.id = (Math.floor(Date.now()-1563741060000)/1000)*100000 + Math.floor(Math.random()*100000);
      sql = `INSERT INTO ${tableName} (${columns.join(', ')}, id) VALUES (?, ${columns.map(x => `?`).join(', ')})`;
    }

    values.push(this.id);
    this.prepare(sql).run(...values);

    return this;
  }

  add(model, weight = null){
    const Model = model.constructor;

    const jointTableName = `${this.constructor.jointTablePrefix}_${Model.tableName}`;
    const lk = this.constructor.key;
    const fk = Model.key;

    const record = this.prepare(`SELECT * FROM ${jointTableName} WHERE ${lk} = ? AND ${fk} = ?`).get(this.id, model.id);
    if(record){
      throw new Error(`${Model.tableName}(${model.id}) already linked to ${this.constructor.tableName}(${this.id})`);
    }

    this.prepare(`INSERT INTO ${jointTableName} (${lk}, ${fk}, weight) VALUES (?, ?, ?)`).run(this.id, model.id, weight);
  }

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
      const model = K8.require(`models/${x}`);
      const lk = this.constructor.key;
      const table = `${this.constructor.jointTablePrefix}_${model.tableName}`;
      this.prepare(`DELETE FROM ${table} WHERE ${lk} = ?`).run(this.id);
    });
  }
  /**
   * belongs to - this table have xxx_id column
   * @param fk
   * @returns {Model}
   */
  belongsTo(fk){
    const modelName = this.constructor.belongsTo.find(x => x.fk === fk).model;
    const model = K8.require(`models/${modelName}`);
    return new model(this[fk], {database: this.db});
  }

  /**
   * has many
   * @param {ORM} model
   */
  hasMany(model){
    if(!model.tableName)assignTableName(model);

    const key = this.constructor.key;
    return this.prepare(`SELECT * FROM ${model.tableName} WHERE ${key} = ?`).all(this.id).map(x => Object.assign(new model(null, {database : this.db}), x));
  }

  /**
   *
   * @param {ORM} model
   */
  belongsToMany(model){
    const jointTableName = this.constructor.jointTablePrefix + '_' +model.tableName;

    const sql = `SELECT ${model.tableName}.* FROM ${model.tableName} JOIN ${jointTableName} ON ${model.tableName}.id = ${jointTableName}.${model.key} WHERE ${jointTableName}.${this.constructor.key} = ? ORDER BY ${jointTableName}.weight`;
    return this.prepare(sql).all(this.id).map(x => Object.assign(new model(null, {database : this.db}), x));
  }

  /**
   *
   * @param {Database} db
   */
  static setDB(db){
    ORM.db = db;
  }

  /**
   *
   * @param {Model} model
   * @returns {Array}
   */
  all(){
    const model = this.constructor;
    if(!model.tableName)assignTableName(model);
    return this.prepare(`SELECT * from ${model.tableName}`).all().map(x => Object.assign(new model(null, {database: this.db}), x));
  }

  static all(model) {
    const m = new model();
    return m.all();
  }

  /**
   *
   * @param {Model} model
   * @param {Number} id
   * @returns {Object}
   */
  static get(model, id){
    return new model(id);
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

module.exports = ORM;