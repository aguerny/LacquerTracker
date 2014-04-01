

/**
 * hasOwnProperty.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (has.call(require.modules, path)) return path;
  }

  if (has.call(require.aliases, index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!has.call(require.modules, from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return has.call(require.modules, localRequire.resolve(path));
  };

  return localRequire;
};
require.register("gjohnson-uuid/index.js", function(exports, require, module){

/**
 * Taken straight from jed's gist: https://gist.github.com/982883
 *
 * Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx,
 * where each x is replaced with a random hexadecimal digit from 0 to f, and
 * y is replaced with a random hexadecimal digit from 8 to b.
 */

module.exports = function uuid(a){
  return a           // if the placeholder was passed, return
    ? (              // a random number from 0 to 15
      a ^            // unless b is 8,
      Math.random()  // in which case
      * 16           // a random number from
      >> a/4         // 8 to 11
      ).toString(16) // in hexadecimal
    : (              // or otherwise a concatenated string:
      [1e7] +        // 10000000 +
      -1e3 +         // -1000 +
      -4e3 +         // -4000 +
      -8e3 +         // -80000000 +
      -1e11          // -100000000000,
      ).replace(     // replacing
        /[018]/g,    // zeroes, ones, and eights with
        uuid         // random hex digits
      )
};
});
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  fn._off = on;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners = function(event, fn){
  this._callbacks = this._callbacks || {};
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var i = callbacks.indexOf(fn._off || fn);
  if (~i) callbacks.splice(i, 1);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("jsdm/index.js", function(exports, require, module){
module.exports  =  require("./lib/Domain");
});
require.register("jsdm/lib/Repository.js", function(exports, require, module){
if(typeof window !== "undefined"){
    uuid = require("uuid");
}else{
    uuid = require("node-uuid").v1;
}

function Repository(className){
    
    var cache = {};
    this.className = className;
    
    this.getData = function(id,callback){
        var self = this;
        this.get(id,function(err,aggre){
            if(aggre){
                callback(self._aggre2data(aggre));
            }else{
                callback();
            }
        })
    }
        
    /* @public */
    this.get = function(id,callback){
        var self = this;
        if(cache[id]){
            callback(undefined,cache[id])
        }else if(typeof cache[id] === 'boolean'){
            callback();
        }else{
            self._db.get(this.className,id,function(err,data){
                if(data){
                    var aggobj = self._data2aggre(data);
                    callback(undefined,aggobj);
                }else{
                    callback(err);
                }
            })
        }
    }
    
    /* @public */
    this.create = function(data,callback){
        var self = this;
        this._create(data,function(err,aggobj){
            if(err){
                callback(err);
            }else{
                var data = self._aggre2data(aggobj);
                data.id = uuid();
                aggobj = self._data2aggre(data);
                cache[data.id] = aggobj;
                callback(undefined,aggobj);
                self._publish(className+".*.create",className,data);
                self._publish("*.*.create",className,data);
            };
        });
    }
    
    /* @public */
    this.remove = function(id){
        cache[id] = false;
        this._publish(this.className+"."+id+".remove",className,id);
        this._publish(this.className+".*.remove",className,id);
        this._publish("*.*.remove",className,id);
    }
    
}

module.exports = Repository;
});
require.register("jsdm/lib/Domain.js", function(exports, require, module){

module.exports = Domain;

var  Repository = require("./Repository"),
     is = require("./_type");
     

     if(typeof window !== 'undefined'){
        Emitter = require("emitter")
     }else{
        Emitter = require("events").EventEmitter;
     }
     
function Domain(){

    var self = this,
        emitter = new Emitter,
        AggreClassList = [],
        repositoryList = [],
        commandHandleList = [],
        serviceList = [],
        db = null,
        isSeal = false,
        Aggres = {},
        repos = {},
        openMethods = {},
        services = {},
        commandHandles = {},
        publish =  function(){
            emitter.emit.apply(emitter,arguments);
        }

    if(!(this instanceof Domain)){
       return new Domain();
    }
        
    function _push(cache,o){
        if(is(o) === "array"){
           o.forEach(function(obj){
              cache.push(obj);
           })
        }else{
              cache.push(o);
        }                
    }
    
    function _register(type,o){
        switch(type){
            case "DB":
               db = o;
            break;
            case "AggreClass":
               _push(AggreClassList,o);
            break;
            case "repository":
               _push(repositoryList,o)
            break;
            case "commandHandle":
               _push(commandHandleList,o);
            break;
            case "service":
               _push(serviceList,o);            
            break;
            case "listener":
                if(is(o) === "array"){
                   o.forEach(function(obj){
                      var handles = obj(repos,services);
                      if(is(o) === "array"){
                        handle.forEach(function(handle){
                            emitter.on(handle.eventName,handle);
                        })
                      }else{
                        emitter.on(handles.eventName,handles);
                      }
                   })
                }else{
                      var handles = o(repos,services);
                      if(is(handles) === "array"){
                        handles.forEach(function(handle){
                            emitter.on(handle.eventName,handle);
                        })
                      }else{
                        emitter.on(handles.eventName,handles);
                      }
                }
            break;
            case "listenerOne":
                if(is(o) === "array"){
                   o.forEach(function(obj){
                      var handles = obj(repos,services);
                      if(is(o) === "array"){
                        handle.forEach(function(handle){
                            emitter.once(handle.eventName,handle);
                        })
                      }else{
                        emitter.once(handles.eventName,handles);
                      }
                   })
                }else{
                      var handles = o(repos,services);
                      if(is(handles) === "array"){
                        handles.forEach(function(handle){
                            emitter.once(handle.eventName,handle);
                        })
                      }else{
                        emitter.once(handles.eventName,handles);
                      }
                }
            break;
        }    
    }
    
    this.register = function(){
    
        if(isSeal) return this;
        
        var self = this;
        
        var go = true,type = null;
        
        while(go){
            var first = [].shift.call(arguments);
            if(is(first) === "string"){
                type = first;
                var second = [].shift.call(arguments);
                _register(first,second);
            }else if(!first){
                go = false;
            }else{
                _register(type,first);
            }
        }
        
        return this;
    }
    
    this.seal = function(){
    
        if(isSeal){
            return this;
        }else{
            isSeal = true;
        }
        AggreClassList.forEach(function(wrap){
            var o = wrap(repos,services,publish);
            if(is(o) === "array"){
                o.forEach(function(a){
                  Aggres[a.className] = a;
                })
            }else{
                Aggres[o.className] = o;
            }            
        })
        
        serviceList.forEach(function(wrap){
            var o = wrap(repos,services);
            if(is(o) === "array"){
                o.forEach(function(a){
                  services[a.serviceName] = a;
                })
            }else{
                services[o.serviceName] = o;
            }   
        })
        
        Repository.prototype._db = db;
        Repository.prototype._publish = publish;
        
        repositoryList.forEach(function(wrap){
            var o = wrap(Repository,Aggres);
            if(is(o) === "array"){
                o.forEach(function(a){
                  repos[a.className] = a;
                })
            }else{
                repos[o.className] = o;
            }
        })
        
        commandHandleList.forEach(function(wrap){
            var o = wrap(repos,services);
            if(is(o) === "array"){
                o.forEach(function(a){
                  commandHandles[a.commandName] = a;
                })
            }else{
                commandHandles[o.commandName] = o;
            }
        })
        
        return this;
        
    }
    
    
    this.exec = function(commandName,args,callback){
        var handle = commandHandles[commandName];
        handle(args,callback);
    }
    
    this.openMethod = function(){
        for(var i=0;i<arguments.length;i++){
            openMethods[arguments[i]] = true;
        }
    }
    
    this.call = function(methodName,id,args,callback){
    
        if(!openMethods[methodName]){
            callback(new Error("the method no publish."));
        }else{
            var cm = methodName.split("."),
            className = cm[0],methodName = cm[1],
            args = JSON.parse(JSON.stringify(args? args:[])),
            callback = callback?callback:function(){};
                        
            var repo = repos[className];
            repo.get(id,function(err,a){
                if(a){
                  var method = a[methodName];
                  var rs;
                  try{
                    rs = method.apply(a,args);
                    callback(rs);
                  }catch(e){
                    callback(e);
                  }                  
                }else{
                  callback();
                }
            })  
        }
    }
    
    this.on = function(){
        emitter.on.apply(emitter,arguments);
    }
    
    this.once = function(){
        emitter.once.apply(emitter,arguments);
    }
    
}

module.exports = Domain;

});
require.register("jsdm/lib/_type.js", function(exports, require, module){

/**
 * toString ref.
 */

var toString = Object.prototype.toString;
/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object String]': return 'string';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val && val.nodeType === 1) return 'element';
  if (val === Object(val)) return 'object';

  return typeof val;
};
});
require.alias("gjohnson-uuid/index.js", "jsdm/deps/uuid/index.js");

require.alias("component-emitter/index.js", "jsdm/deps/emitter/index.js");

