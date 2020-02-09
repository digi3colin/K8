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

class View{
  static factory(file, data){
    return new View(file, data);
  }

  static setGlobal(key, value){
    View.globalData[key] = value;
  }

  constructor(file, data, lookupDir){
    this.file = file;
    this.data = data;
    this.lookupDir = lookupDir;
  }

  async render(){
    return JSON.stringify(this.collectProps());
  }

  collectProps(){
    if(this.data)return Object.assign({}, View.globalData, this.data);

    const props = {};
    Object.keys(this).forEach(x => {
      props[x] = this[x];
    });

    return Object.assign({}, View.globalData, props);
  }

  static clearCache(){
    View.caches = {};
  }
}
View.defaultViewClass = View;

View.clearCache();
View.globalData = {};

module.exports = View;