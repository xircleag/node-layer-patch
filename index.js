/**
 * The layer.js.LayerPatchParser method will parse
 *
 * @method
 * @param {Boolean}   [camelCase=false]             Set the camel cased version of the name of the input object
 * @param {Object}    [propertyNameMap]             Maps property names in the operation to property names in the local object schema
 * @param {Object}    [changeCallbacks]             Callback made any time an object is changed
 * @param {Object}    [abortCallbacks]              Callback made to verify a change is permitted
 * @param {Function}  [doesObjectMatchIdCallback]   Callback returns boolean to indicate if a given object matches an ID.
 * @return {Boolean}                                Returns true if all operations completed successfully, false if some returned errors
 */

(function() {
  var opHandlers = {
    'set': setProp,
    'delete': deleteProp,
    'add': addProp,
    'remove': removeProp
  };

  function Parser(options) {
    this.camelCase = options.camelCase;
    this.propertyNameMap = options.propertyNameMap;
    this.changeCallbacks = options.changeCallbacks;
    this.abortCallbacks = options.abortCallbacks;
    this.getObjectCallback = options.getObjectCallback;
    this.createObjectCallback = options.createObjectCallback;
    this.doesObjectMatchIdCallback = options.doesObjectMatchIdCallback || function(id, obj) {
      return obj.id == id;
    };
    this.returnIds = options.returnIds;
    return this;
  };

  if (typeof module !== 'undefined') {
    module.exports = Parser;
  } else {
    window.LayerPatchParser = Parser;
  }

  Parser.prototype.parse = function(options) {
    var changes = {};
    options.operations.forEach(function(op) {
      var propertyDef = getPropertyDef.apply(this, [op.property, options, changes, op])
      opHandlers[op.operation].call(this,
        propertyDef,
        getValue.apply(this, [op, options]),
        op, options, changes);
    }, this);

    reportChanges.apply(this, [changes, options.object, options.type]);
  };

  function reportChanges(changes, updateObject, objectType) {
    if (this.changeCallbacks && objectType && this.changeCallbacks[objectType]) {
      Object.keys(changes).forEach(function(key) {
        if (this.changeCallbacks[objectType].all) {
          this.changeCallbacks[objectType].all(updateObject, updateObject[key], changes[key].before, changes[key].paths);
        }
        else if (this.changeCallbacks[objectType][key]) {
          this.changeCallbacks[objectType][key](updateObject, updateObject[key], changes[key].before, changes[key].paths);
        }
      }, this);
    }
  }

  function getPropertyDef(property, options, changes, operation) {
    var obj = options.object;
    var temporarySeparator = String.fromCharCode(145);
    property = property.replace(/\\\./g, temporarySeparator);
    property = property.replace(/\\(.)/g, '$1');
    var parts = property.split(/\./);
    var r = new RegExp(temporarySeparator, 'g')
    parts = parts.map(function(part) {
      return part.replace(r, '.');
    });
    if (this.camelCase) {
      parts[0] = parts[0].replace(/[-_]./g, function(str) {
        return str[1].toUpperCase();
      });
    }
    if (this.propertyNameMap) {
      var typeDef = this.propertyNameMap[options.type];
      parts[0] = (typeDef && typeDef[parts[0]]) || parts[0];
    }

    trackChanges.apply(this, [{
      baseName: parts[0],
      fullPath: property,
      object: options.object,
      options: options,
      changes: changes,
      operation: operation
    }]);

    var curObj = obj;
    for (var i = 0; i < parts.length-1; i++) {
      var part = parts[i];
      if (part in curObj) {
        curObj = curObj[part];
        if (curObj === null || typeof curObj !== 'object') throw new Error('Can not access property \'' + property + '\'');
      } else {
        curObj[part] = {};
        curObj = curObj[part];
      }
    }

    return {
      pointer: curObj,
      lastName: parts[parts.length-1],
      baseName: parts[0],
      fullPath: property,
      abortHandler: this.abortCallbacks && this.abortCallbacks[options.type] && (this.abortCallbacks[options.type].all || this.abortCallbacks[options.type][parts[0]])
    };
  }

  function getValue(op, options) {
    if (op.id) {
      if (!this.getObjectCallback) throw new Error('Must provide getObjectCallback in constructor to use ids');
      var result = this.getObjectCallback(op.id);
      if (!result && op.value) {
        result = this.createObjectCallback ? this.createObjectCallback(op.id, op.value) : op.value;
      }
      if (result) return result;
      if (this.returnIds) return op.id;
      return null;
    } else {
      return op.value;
    }
  }

  function cloneObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(function(item) {
        return cloneObject(item);
      });
    } else if (obj && typeof obj === 'object') {
      var keys = Object.keys(obj).filter(function(keyName) {
        return keyName.indexOf('_') !== 0;
      });
      var newObj = {};
      keys.forEach(function(keyName) {
        newObj[keyName] = cloneObject(obj[keyName]);
      });
      return newObj;
    } else {
      return obj;
    }
  }

  function trackChanges(options) {
    if (!options.changes[options.baseName]) {
      var initialValue = options.object[options.baseName];
      if ((options.operation === 'set' || options.operation === 'delete') && 'id' in options.operation && initialValue) {
        initialValue = initialValue.id;
      }
      var change = options.changes[options.baseName] = {paths: []};
      change.before = (initialValue && typeof initialValue === 'object') ? cloneObject(initialValue) : initialValue;
    }
    var paths = options.changes[options.baseName].paths;
    if (paths.indexOf(options.fullPath) === -1) {
      paths.push(options.fullPath);
    }
  }

  function setProp(propertyDef, value, op, options, changes) {
    if (propertyDef.abortHandler) {
      if (propertyDef.abortHandler(propertyDef.fullPath, 'set', value)) return;
    }
    propertyDef.pointer[propertyDef.lastName] = value;

  }

  function deleteProp(propertyDef, value, op, options, changes) {
    if (propertyDef.abortHandler) {
      if (propertyDef.abortHandler(propertyDef.fullPath, 'delete', value)) return;
    }
    delete propertyDef.pointer[propertyDef.lastName];
  }

  function addProp(propertyDef, value, op, options, changes) {
    if (propertyDef.abortHandler) {
      if (propertyDef.abortHandler(propertyDef.fullPath, 'add', value)) return;
    }
    var obj;
    if (propertyDef.lastName in propertyDef.pointer) {
      obj = propertyDef.pointer[propertyDef.lastName];
    } else {
      obj = propertyDef.pointer[propertyDef.lastName] = [];
    }
    if (!Array.isArray(obj)) throw new Error('The add operation requires an array or new structure to add to.');
    if (Array.isArray(value)) throw new Error('The add operation will not add arrays to sets.');
    if (!op.id) {
      if (value && typeof value === 'object') throw new Error('The add operation will not add objects to sets.');
      if (obj.indexOf(value) === -1) obj.push(value);
    } else {
      for (var i = 0; i < obj.length; i++) {
        if (this.doesObjectMatchIdCallback(op.id, obj[i])) return;
      }
      obj.push(value);
    }
  }

  function removeProp(propertyDef, value, op, options, changes) {
    if (propertyDef.abortHandler) {
      if (propertyDef.abortHandler(propertyDef.fullPath, 'remove', value)) return;
    }
    var obj;
    if (propertyDef.lastName in propertyDef.pointer) {
      obj = propertyDef.pointer[propertyDef.lastName];
    } else {
      obj = propertyDef.pointer[propertyDef.lastName] = [];
    }
    if (!Array.isArray(obj)) throw new Error('The remove operation requires an array or new structure to remove from.');

    if (!op.id) {
      if (Array.isArray(value)) throw new Error('The remove operation will not remove arrays from sets.');
      if (value && typeof value === 'object') throw new Error('The remove operation will not remove objects from sets.');

      var index = obj.indexOf(value);
      if (index !== -1) obj.splice(index, 1);
    } else {
      for (var i = 0; i < obj.length; i++) {
        if (this.doesObjectMatchIdCallback(op.id, obj[i])) {
          obj.splice(i, 1);
          break;
        }
      }
    }
  }
})();
