describe('k8 test', ()=>{
  let K8;
  const EXE_PATH = __dirname.replace(/\/tests$/, '') + '/server';

  beforeEach(()=>{
    K8 = require('../../K8');
  });

  test('APP Path', () => {
      K8.init(EXE_PATH);
      expect(K8.APP_PATH).toBe(`${EXE_PATH}/application`);
  });

  test('K8.require', () => {
      const packagePath = `${__dirname}/test1/`;
      K8.init(packagePath);

      expect(K8.MOD_PATH).toBe(`${packagePath}/modules`);

      const Test = K8.require('Test');
      const t = new Test();
      expect(t.getFoo()).toBe('bar');
  });

  test('switch package', () => {
      let testDir = __dirname;
      K8.init(`${testDir}/test1`);
      expect(K8.MOD_PATH).toBe(`${testDir}/test1/modules`);

      let T = K8.require('Test');
      const t1 = new T();
      expect(t1.getFoo()).toBe('bar');

      const Foo1 = K8.require('Foo');
      const f1 = new Foo1();
      expect(f1.getFoo()).toBe('fooo');

      K8.init(`${testDir}/test2`);
      expect(K8.MOD_PATH).toBe(`${testDir}/test2/modules`);

      T = K8.require('Test');
      const t2 = new T();
      expect(t2.getFoo()).toBe('tar');

      try{
          const Foo2 = K8.require('Foo');
          const f2 = new Foo2();
      }catch(e){
          expect(e.message.replace(/ {[^}]+}/, '')).toBe('K8 resolve path error: path Foo.js not found. classes , ');
      }
  });

  test('application folder', () => {
      let testDir = __dirname;
      K8.init(`${testDir}/test1`);
      expect(K8.APP_PATH).toBe(`${testDir}/test1/application`);

      const Foo1 = K8.require('Foo');
      const f1 = new Foo1();
      expect(f1.getFoo()).toBe('fooo');

      K8.init(`${testDir}/test2`);
      expect(K8.APP_PATH).toBe(`${testDir}/test2/application`);

      try{
          const Foo2 = K8.require('Foo');
          const f2 = new Foo2();
      }catch(e){
          expect(e.message.replace(/ {[^}]+}/, '')).toBe('K8 resolve path error: path Foo.js not found. classes , {} ');
      }
  });

  test('custom module folder', () => {
      let testDir = __dirname;
      K8.init(`${testDir}/test1`, `${testDir}/test3/application`,`${testDir}/test1/modules`);
      expect(K8.APP_PATH).toBe(`${testDir}/test3/application`);
      expect(K8.MOD_PATH).toBe(`${testDir}/test1/modules`);

      const Foo1 = K8.require('Foo');//test3/Foo
      const f1 = new Foo1();
      expect(f1.getFoo()).toBe('waa');

      const Test = K8.require('Test');
      const t = new Test();
      expect(t.getFoo()).toBe('bar');

  });

  test('path not found', ()=>{
      try{
          K8.require('NotFound');
      }catch(e){
          expect(e.message.replace(/ {[^}]+}/, '')).toBe('K8 resolve path error: path NotFound.js not found. classes , ');
      }
  });

  test('inline modules init', ()=>{
      let testDir = __dirname;
      expect(global.testInit).toBe(undefined);
      K8.init(`${testDir}/test4`);
      expect(global.testInit).toBe(true);
      delete global.testInit;
  });

  test('npm modules init ', ()=>{
      let testDir = __dirname;
      expect(global.testInit).toBe(undefined);
      K8.init(`${testDir}/test5`);
      expect(global.testInit).toBe(true);
  });

  test('clear cache', ()=>{
      let testDir = __dirname;
      K8.init(`${testDir}/test6`);
      const Foo = K8.require('Foo');
      expect(Foo.id).toBe(1);

      const Foo2 = K8.require('Foo');
      expect(Foo2.id).toBe(1);

      K8.config.cache.exports = true;
      K8.validateCache();

      const Foo3 = K8.require('Foo');
      expect(Foo3.id).toBe(1);

      K8.config.cache.exports = false;
      K8.config.cache.view = false;
      K8.validateCache();
      //jest override require, need to use reset modules to invalidate
      jest.resetModules();

      const Foo4 = K8.require('Foo');
      expect(Foo4.id).toBe(2);

      const ins = new Foo4();
      expect(ins.getFooId()).toBe(2);
  });

  test('resolveView', ()=>{
      K8.init(`${__dirname}/test7`);
      const viewFile = K8.resolveView('test.html');
      expect(viewFile).toBe(`${__dirname}/test7/application/views/test.html`);
  });

  test('config path', ()=>{
      const fs = require('fs');
      const EXE_PATH = `${__dirname}/test8`;
      const APP_PATH = EXE_PATH + '/application';
      K8.init(EXE_PATH);
      expect(K8.config.salt).toBe('theencryptsaltatleast32character');


      fs.copyFileSync(APP_PATH+'/config/site.default.js', APP_PATH+'/config/site.js');
      jest.resetModules();
      K8.validateCache();
      expect(K8.config.salt).toBe('default salt 1');

      fs.unlinkSync(APP_PATH+'/config/site.js');
      jest.resetModules();
      K8.validateCache();
      expect(K8.config.salt).toBe('theencryptsaltatleast32character');

/*      fs.copyFileSync(APP_PATH+'/config/site.default2.js', APP_PATH+'/config/site.js');
      jest.resetModules();
      K8.validateCache();
      expect(K8.config.salt).toBe('default salt 2');*/

      //clean up
//      fs.unlinkSync(APP_PATH+'/config/site.js');
  });

  test('setPath default value', ()=>{
    const path = require('path');
    K8.init();
    expect(path.normalize(K8.EXE_PATH + '/')).toBe(path.normalize(__dirname+'/../../'));
  });

  test('set all init value', ()=>{
    K8.init(
      __dirname+'/test1',
      __dirname+'/test2/application',
      __dirname+'/test3/modules');
    expect(K8.EXE_PATH).toBe(__dirname+'/test1');
    expect(K8.APP_PATH).toBe(__dirname+'/test2/application');
    expect(K8.MOD_PATH).toBe(__dirname+'/test3/modules');
  });

  test('test default MODPATH ', ()=>{
    K8.init(
      __dirname+'/test1',
      __dirname+'/test2/application');
    expect(K8.EXE_PATH).toBe(__dirname+'/test1');
    expect(K8.APP_PATH).toBe(__dirname+'/test2/application');
    expect(K8.MOD_PATH).toBe(__dirname+'/test1/modules');
  });

  test('K8 nodePackages without init', ()=>{
    let testDir = __dirname;
    K8.init(`${testDir}/test9`);
    expect(K8.nodePackages.length).toBe(2);
    //K8 will load bootstrap from test9/application/bootstrap.js
    //
  });

  test('K8 require file with extension', ()=>{
    K8.init(`${__dirname}/test10`);
    const Foo = K8.require('Foo.js');
    const ins = new Foo();
    expect(ins.getFoo()).toBe('bar');
  });
});