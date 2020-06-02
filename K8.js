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

const fs = require('fs');
const {View} = require('@komino/k8-core-mvc');

//private methods
const resolve = (pathToFile, prefixPath, store)=>{
  if(!store[pathToFile]){
    //search application, then modules, then system
    const fetchList = [pathToFile, `${K8.APP_PATH}/${prefixPath}/${pathToFile}`];
    [...K8.bootstrap.modules].reverse().forEach(x => fetchList.push(`${K8.MOD_PATH}/${x}/${prefixPath}/${pathToFile}`));
    fetchList.push(`${K8.SYS_PATH}/${prefixPath}/${pathToFile}`);
    [...K8.nodePackages].reverse().forEach(x => fetchList.push(`${x}/${prefixPath}/${pathToFile}`));

    for(let i=0; i<fetchList.length; i++){
      const x = fetchList[i];
      if(fs.existsSync(x)){
        store[pathToFile] = x;
        break;
      }
    }

    if(!store[pathToFile]){
      throw new Error(`K8 resolve path error: path ${pathToFile} not found. ${prefixPath} , ${JSON.stringify(store)} `);
    }
  }

  return store[pathToFile];
};

const setPath = (EXE_PATH, APP_PATH, MOD_PATH) => {
  K8.EXE_PATH = EXE_PATH || fs.realpathSync('./');
  K8.APP_PATH = APP_PATH || K8.EXE_PATH + '/application';
  K8.MOD_PATH = MOD_PATH || K8.EXE_PATH + '/modules';

  const bootstrapFile = `${K8.APP_PATH}/bootstrap.js`;
  if(fs.existsSync(bootstrapFile)){
    K8.bootstrap = require(bootstrapFile);
  }
};

const updateConfig = () => {
  K8.configPath['site.js'] = null; // never cache site config file.
  const file = resolve('site.js', 'config', K8.configPath);

  K8.config = require(file);
  delete require.cache[file];
};

const clearRequireCache = ()=>{
  for(let name in K8.classPath){
    delete require.cache[K8.classPath[name]];
  }
  K8.classPath = {};
  K8.configPath = {};
};

const clearViewCache = ()=>{
  K8.viewPath = {};
  View.defaultViewClass.clearCache();
};

const reloadModuleInit = () => {
  //activate init.js in modules
  K8.bootstrap.modules.forEach(x => {
    const initPath = `${K8.MOD_PATH}/${x}/init.js`;

    if(fs.existsSync(initPath)){
      require(initPath);
      delete require.cache[initPath];
    }
  });

  //activate init.js in require('k8mvc-sample-module')
  K8.nodePackages.forEach(x =>{
    const initPath = `${x}/init.js`;
    if(fs.existsSync(initPath)){
      require(initPath);
      delete require.cache[initPath];
    }
  })
};

class K8 {
  static init(EXE_PATH = null, APP_PATH = null, MOD_PATH = null){
    K8.nodePackages = [];
    K8.config = require('./config/site');

    K8.classPath  = {}; //{'ORM'          => 'APP_PATH/classes/ORM.js'}
    K8.viewPath   = {}; //{'layout/index' => 'APP_PATH/views/layout/index'}
    K8.configPath = {}; //{'site.js       => 'APP_PATH/config/site.js'}

    K8.bootstrap = {modules: []};
    K8.SYS_PATH = require.resolve(`./K8`).replace('/K8.js', '');

    //set paths
    setPath(EXE_PATH, APP_PATH, MOD_PATH);
    updateConfig();
    reloadModuleInit();

    return K8;
  }

  static addNodeModules(packageFolder){
    //register by require('k8mvc-module');
    K8.nodePackages.push(packageFolder.replace('/index.js', ''));
  }

  static validateCache(){
    updateConfig();
    if(K8.config.cache.exports === false){
      clearRequireCache();
    }

    if(K8.config.cache.view === false){
      clearViewCache();
    }

    reloadModuleInit();
  }

  static require(pathToFile){
    //pathToFile may include file extension;
    pathToFile = /\..*$/.test(pathToFile)? pathToFile : (pathToFile + '.js');
    const file = resolve(pathToFile, 'classes', K8.classPath);
    return require(file);
  }

  static resolveView(pathToFile){
    return resolve(pathToFile, 'views', K8.viewPath);
  }
}

K8.VERSION  = '0.3.7';
module.exports = K8;