!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.abstractStateRouter=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

  function EventEmitter() {
    this._events = this._events || {};
    this._maxListeners = this._maxListeners || undefined;
  }
  module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
  EventEmitter.EventEmitter = EventEmitter;

  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
  EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
  EventEmitter.prototype.setMaxListeners = function(n) {
    if (!isNumber(n) || n < 0 || isNaN(n))
      throw TypeError('n must be a positive number');
    this._maxListeners = n;
    return this;
  };

  EventEmitter.prototype.emit = function(type) {
    var er, handler, len, args, i, listeners;

    if (!this._events)
      this._events = {};

    // If there is no 'error' event listener then throw.
    if (type === 'error') {
      if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
        er = arguments[1];
        if (er instanceof Error) {
          throw er; // Unhandled 'error' event
        }
        throw TypeError('Uncaught, unspecified "error" event.');
      }
    }

    handler = this._events[type];

    if (isUndefined(handler))
      return false;

    if (isFunction(handler)) {
      switch (arguments.length) {
        // fast cases
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        // slower
        default:
          len = arguments.length;
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          handler.apply(this, args);
      }
    } else if (isObject(handler)) {
      len = arguments.length;
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];

      listeners = handler.slice();
      len = listeners.length;
      for (i = 0; i < len; i++)
        listeners[i].apply(this, args);
    }

    return true;
  };

  EventEmitter.prototype.addListener = function(type, listener) {
    var m;

    if (!isFunction(listener))
      throw TypeError('listener must be a function');

    if (!this._events)
      this._events = {};

    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (this._events.newListener)
      this.emit('newListener', type,
        isFunction(listener.listener) ?
          listener.listener : listener);

    if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    else if (isObject(this._events[type]))
    // If we've already got an array, just append.
      this._events[type].push(listener);
    else
    // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];

    // Check for listener leak
    if (isObject(this._events[type]) && !this._events[type].warned) {
      var m;
      if (!isUndefined(this._maxListeners)) {
        m = this._maxListeners;
      } else {
        m = EventEmitter.defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
          'leak detected. %d listeners added. ' +
          'Use emitter.setMaxListeners() to increase limit.',
          this._events[type].length);
        if (typeof console.trace === 'function') {
          // not supported in IE 10
          console.trace();
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.once = function(type, listener) {
    if (!isFunction(listener))
      throw TypeError('listener must be a function');

    var fired = false;

    function g() {
      this.removeListener(type, g);

      if (!fired) {
        fired = true;
        listener.apply(this, arguments);
      }
    }

    g.listener = listener;
    this.on(type, g);

    return this;
  };

// emits a 'removeListener' event iff the listener was removed
  EventEmitter.prototype.removeListener = function(type, listener) {
    var list, position, length, i;

    if (!isFunction(listener))
      throw TypeError('listener must be a function');

    if (!this._events || !this._events[type])
      return this;

    list = this._events[type];
    length = list.length;
    position = -1;

    if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
      delete this._events[type];
      if (this._events.removeListener)
        this.emit('removeListener', type, listener);

    } else if (isObject(list)) {
      for (i = length; i-- > 0;) {
        if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
          position = i;
          break;
        }
      }

      if (position < 0)
        return this;

      if (list.length === 1) {
        list.length = 0;
        delete this._events[type];
      } else {
        list.splice(position, 1);
      }

      if (this._events.removeListener)
        this.emit('removeListener', type, listener);
    }

    return this;
  };

  EventEmitter.prototype.removeAllListeners = function(type) {
    var key, listeners;

    if (!this._events)
      return this;

    // not listening for removeListener, no need to emit
    if (!this._events.removeListener) {
      if (arguments.length === 0)
        this._events = {};
      else if (this._events[type])
        delete this._events[type];
      return this;
    }

    // emit removeListener for all listeners on all events
    if (arguments.length === 0) {
      for (key in this._events) {
        if (key === 'removeListener') continue;
        this.removeAllListeners(key);
      }
      this.removeAllListeners('removeListener');
      this._events = {};
      return this;
    }

    listeners = this._events[type];

    if (isFunction(listeners)) {
      this.removeListener(type, listeners);
    } else {
      // LIFO order
      while (listeners.length)
        this.removeListener(type, listeners[listeners.length - 1]);
    }
    delete this._events[type];

    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    var ret;
    if (!this._events || !this._events[type])
      ret = [];
    else if (isFunction(this._events[type]))
      ret = [this._events[type]];
    else
      ret = this._events[type].slice();
    return ret;
  };

  EventEmitter.listenerCount = function(emitter, type) {
    var ret;
    if (!emitter._events || !emitter._events[type])
      ret = 0;
    else if (isFunction(emitter._events[type]))
      ret = 1;
    else
      ret = emitter._events[type].length;
    return ret;
  };

  function isFunction(arg) {
    return typeof arg === 'function';
  }

  function isNumber(arg) {
    return typeof arg === 'number';
  }

  function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  }

  function isUndefined(arg) {
    return arg === void 0;
  }

},{}],2:[function(require,module,exports){
// shim for using process in browser

  var process = module.exports = {};

  process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
      && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
      && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
      ;

    if (canSetImmediate) {
      return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
      var hiddenDiv = document.createElement("div");
      var observer = new MutationObserver(function () {
        var queueList = queue.slice();
        queue.length = 0;
        queueList.forEach(function (fn) {
          fn();
        });
      });

      observer.observe(hiddenDiv, { attributes: true });

      return function nextTick(fn) {
        if (!queue.length) {
          hiddenDiv.setAttribute('yes', 'no');
        }
        queue.push(fn);
      };
    }

    if (canPost) {
      window.addEventListener('message', function (ev) {
        var source = ev.source;
        if ((source === window || source === null) && ev.data === 'process-tick') {
          ev.stopPropagation();
          if (queue.length > 0) {
            var fn = queue.shift();
            fn();
          }
        }
      }, true);

      return function nextTick(fn) {
        queue.push(fn);
        window.postMessage('process-tick', '*');
      };
    }

    return function nextTick(fn) {
      setTimeout(fn, 0);
    };
  })();

  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];

  function noop() {}

  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;

  process.binding = function (name) {
    throw new Error('process.binding is not supported');
  };

// TODO(shtylman)
  process.cwd = function () { return '/' };
  process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
  };

},{}],3:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

  'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }

  module.exports = function(qs, sep, eq, options) {
    sep = sep || '&';
    eq = eq || '=';
    var obj = {};

    if (typeof qs !== 'string' || qs.length === 0) {
      return obj;
    }

    var regexp = /\+/g;
    qs = qs.split(sep);

    var maxKeys = 1000;
    if (options && typeof options.maxKeys === 'number') {
      maxKeys = options.maxKeys;
    }

    var len = qs.length;
    // maxKeys <= 0 means that we should not limit keys count
    if (maxKeys > 0 && len > maxKeys) {
      len = maxKeys;
    }

    for (var i = 0; i < len; ++i) {
      var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

      if (idx >= 0) {
        kstr = x.substr(0, idx);
        vstr = x.substr(idx + 1);
      } else {
        kstr = x;
        vstr = '';
      }

      k = decodeURIComponent(kstr);
      v = decodeURIComponent(vstr);

      if (!hasOwnProperty(obj, k)) {
        obj[k] = v;
      } else if (isArray(obj[k])) {
        obj[k].push(v);
      } else {
        obj[k] = [obj[k], v];
      }
    }

    return obj;
  };

  var isArray = Array.isArray || function (xs) {
      return Object.prototype.toString.call(xs) === '[object Array]';
    };

},{}],4:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

  'use strict';

  var stringifyPrimitive = function(v) {
    switch (typeof v) {
      case 'string':
        return v;

      case 'boolean':
        return v ? 'true' : 'false';

      case 'number':
        return isFinite(v) ? v : '';

      default:
        return '';
    }
  };

  module.exports = function(obj, sep, eq, name) {
    sep = sep || '&';
    eq = eq || '=';
    if (obj === null) {
      obj = undefined;
    }

    if (typeof obj === 'object') {
      return map(objectKeys(obj), function(k) {
        var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
        if (isArray(obj[k])) {
          return map(obj[k], function(v) {
            return ks + encodeURIComponent(stringifyPrimitive(v));
          }).join(sep);
        } else {
          return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
        }
      }).join(sep);

    }

    if (!name) return '';
    return encodeURIComponent(stringifyPrimitive(name)) + eq +
      encodeURIComponent(stringifyPrimitive(obj));
  };

  var isArray = Array.isArray || function (xs) {
      return Object.prototype.toString.call(xs) === '[object Array]';
    };

  function map (xs, f) {
    if (xs.map) return xs.map(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
      res.push(f(xs[i], i));
    }
    return res;
  }

  var objectKeys = Object.keys || function (obj) {
      var res = [];
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
      }
      return res;
    };

},{}],5:[function(require,module,exports){
  'use strict';

  exports.decode = exports.parse = require('./decode');
  exports.encode = exports.stringify = require('./encode');

},{"./decode":3,"./encode":4}],6:[function(require,module,exports){
  module.exports = { reverse: false }
},{}],7:[function(require,module,exports){
  (function (process){
    var StateState = require('./lib/state-state')
    var StateComparison = require('./lib/state-comparison')
    var CurrentState = require('./lib/current-state')
    var stateChangeLogic = require('./lib/state-change-logic')
    var parse = require('./lib/state-string-parser')
    var StateTransitionManager = require('./lib/state-transition-manager')
    var defaultRouterOptions = require('./default-router-options.js')

    var series = require('./lib/promise-map-series')
    var denodeify = require('then-denodeify')

    var EventEmitter = require('events').EventEmitter
    var extend = require('xtend')
    var newHashBrownRouter = require('hash-brown-router')
    var combine = require('combine-arrays')
    var buildPath = require('page-path-builder')

    require('native-promise-only/npo')

    var expectedPropertiesOfAddState = ['name', 'route', 'defaultChild', 'data', 'template', 'resolve', 'activate', 'querystringParameters', 'defaultQuerystringParameters']

    module.exports = function StateProvider(makeRenderer, rootElement, stateRouterOptions) {
      var prototypalStateHolder = StateState()
      var lastCompletelyLoadedState = CurrentState()
      var lastStateStartedActivating = CurrentState()
      var stateProviderEmitter = new EventEmitter()
      StateTransitionManager(stateProviderEmitter)
      stateRouterOptions = extend({
        throwOnError: true,
        pathPrefix: '#'
      }, stateRouterOptions)

      if (!stateRouterOptions.router) {
        stateRouterOptions.router = newHashBrownRouter(defaultRouterOptions)
      }

      stateRouterOptions.router.setDefault(function(route, parameters) {
        stateProviderEmitter.emit('routeNotFound', route, parameters)
      })

      var destroyDom = null
      var getDomChild = null
      var renderDom = null
      var resetDom = null

      var activeDomApis = {}
      var activeStateResolveContent = {}
      var activeEmitters = {}

      function handleError(event, err) {
        process.nextTick(function() {
          stateProviderEmitter.emit(event, err)
          console.error(event + ' - ' + err.message)
          if (stateRouterOptions.throwOnError) {
            throw err
          }
        })
      }

      function destroyStateName(stateName) {
        var state = prototypalStateHolder.get(stateName)
        stateProviderEmitter.emit('beforeDestroyState', {
          state: state,
          domApi: activeDomApis[stateName]
        })

        activeEmitters[stateName].emit('destroy')
        activeEmitters[stateName].removeAllListeners()
        delete activeEmitters[stateName]
        delete activeStateResolveContent[stateName]

        return destroyDom(activeDomApis[stateName]).then(function() {
          delete activeDomApis[stateName]
          stateProviderEmitter.emit('afterDestroyState', {
            state: state
          })
        })
      }

      function resetStateName(parameters, stateName) {
        var domApi = activeDomApis[stateName]
        var content = getContentObject(activeStateResolveContent, stateName)
        var state = prototypalStateHolder.get(stateName)

        stateProviderEmitter.emit('beforeResetState', {
          domApi: domApi,
          content: content,
          state: state,
          parameters: parameters
        })

        activeEmitters[stateName].emit('destroy')
        delete activeEmitters[stateName]

        return resetDom({
          domApi: domApi,
          content: content,
          template: state.template,
          parameters: parameters
        }).then(function() {
          stateProviderEmitter.emit('afterResetState', {
            domApi: domApi,
            content: content,
            state: state,
            parameters: parameters
          })
        })
      }

      function getChildElementForStateName(stateName) {
        return new Promise(function(resolve) {
          var parent = prototypalStateHolder.getParent(stateName)
          if (parent) {
            var parentDomApi = activeDomApis[parent.name]
            resolve(getDomChild(parentDomApi))
          } else {
            resolve(rootElement)
          }
        })
      }

      function renderStateName(parameters, stateName) {
        return getChildElementForStateName(stateName).then(function(childElement) {
          var state = prototypalStateHolder.get(stateName)
          var content = getContentObject(activeStateResolveContent, stateName)

          stateProviderEmitter.emit('beforeCreateState', {
            state: state,
            content: content,
            parameters: parameters
          })

          return renderDom({
            element: childElement,
            template: state.template,
            content: content,
            parameters: parameters
          }).then(function(domApi) {
            activeDomApis[stateName] = domApi
            stateProviderEmitter.emit('afterCreateState', {
              state: state,
              domApi: domApi,
              content: content,
              parameters: parameters
            })
            return domApi
          })
        })
      }

      function renderAll(stateNames, parameters) {
        return series(stateNames, renderStateName.bind(null, parameters))
      }

      function onRouteChange(state, parameters) {
        try {
          var finalDestinationStateName = prototypalStateHolder.applyDefaultChildStates(state.name)

          if (finalDestinationStateName === state.name) {
            emitEventAndAttemptStateChange(finalDestinationStateName, parameters)
          } else {
            // There are default child states that need to be applied

            var theRouteWeNeedToEndUpAt = makePath(finalDestinationStateName, parameters)
            var currentRoute = stateRouterOptions.router.location.get()

            if (theRouteWeNeedToEndUpAt === currentRoute) {
              // the child state has the same route as the current one, just start navigating there
              emitEventAndAttemptStateChange(finalDestinationStateName, parameters)
            } else {
              // change the url to match the full default child state route
              stateProviderEmitter.go(finalDestinationStateName, parameters, { replace: true })
            }
          }
        } catch (err) {
          handleError('stateError', err)
        }
      }

      function addState(state) {
        if (typeof state === 'undefined') {
          throw new Error('Expected \'state\' to be passed in.')
        } else if (typeof state.name === 'undefined') {
          throw new Error('Expected the \'name\' option to be passed in.')
        } else if (typeof state.template === 'undefined') {
          throw new Error('Expected the \'template\' option to be passed in.')
        }
        Object.keys(state).filter(function(key) {
          return expectedPropertiesOfAddState.indexOf(key) === -1
        }).forEach(function(key) {
          console.warn('Unexpected property passed to addState:', key)
        })

        prototypalStateHolder.add(state.name, state)

        var route = prototypalStateHolder.buildFullStateRoute(state.name)

        stateRouterOptions.router.add(route, onRouteChange.bind(null, state))
      }

      function getStatesToResolve(stateChanges) {
        return stateChanges.change.concat(stateChanges.create).map(prototypalStateHolder.get)
      }

      function emitEventAndAttemptStateChange(newStateName, parameters) {
        stateProviderEmitter.emit('stateChangeAttempt', function stateGo(transition) {
          attemptStateChange(newStateName, parameters, transition)
        })
      }

      function attemptStateChange(newStateName, parameters, transition) {
        function ifNotCancelled(fn) {
          return function() {
            if (transition.cancelled) {
              var err = new Error('The transition to ' + newStateName + 'was cancelled')
              err.wasCancelledBySomeoneElse = true
              throw err
            } else {
              return fn.apply(null, arguments)
            }
          }
        }

        return promiseMe(prototypalStateHolder.guaranteeAllStatesExist, newStateName)
          .then(function applyDefaultParameters() {
            var state = prototypalStateHolder.get(newStateName)
            var defaultParams = state.defaultQuerystringParameters || {}
            var needToApplyDefaults = Object.keys(defaultParams).some(function missingParameterValue(param) {
              return !parameters[param]
            })

            if (needToApplyDefaults) {
              throw redirector(newStateName, extend(defaultParams, parameters))
            }
            return state
          }).then(ifNotCancelled(function(state) {
            stateProviderEmitter.emit('stateChangeStart', state, parameters)
            lastStateStartedActivating.set(state.name, parameters)
          })).then(function getStateChanges() {
            var stateComparisonResults = StateComparison(prototypalStateHolder)(lastCompletelyLoadedState.get().name, lastCompletelyLoadedState.get().parameters, newStateName, parameters)
            return stateChangeLogic(stateComparisonResults) // { destroy, change, create }
          }).then(ifNotCancelled(function resolveDestroyAndActivateStates(stateChanges) {
            return resolveStates(getStatesToResolve(stateChanges), extend(parameters)).catch(function onResolveError(e) {
              e.stateChangeError = true
              throw e
            }).then(ifNotCancelled(function destroyAndActivate(stateResolveResultsObject) {
              transition.cancellable = false

              function activateAll() {
                var statesToActivate = stateChanges.change.concat(stateChanges.create)

                return activateStates(statesToActivate)
              }

              activeStateResolveContent = extend(activeStateResolveContent, stateResolveResultsObject)

              return series(reverse(stateChanges.destroy), destroyStateName).then(function() {
                return series(reverse(stateChanges.change), resetStateName.bind(null, extend(parameters)))
              }).then(function() {
                return renderAll(stateChanges.create, extend(parameters)).then(activateAll)
              })
            }))

            function activateStates(stateNames) {
              return stateNames.map(prototypalStateHolder.get).forEach(function(state) {
                var emitter = new EventEmitter()
                var context = Object.create(emitter)
                context.domApi = activeDomApis[state.name]
                context.data = state.data
                context.parameters = parameters
                context.content = getContentObject(activeStateResolveContent, state.name)
                activeEmitters[state.name] = emitter

                try {
                  state.activate && state.activate(context)
                } catch (e) {
                  process.nextTick(function() {
                    throw e
                  })
                }
              })
            }
          })).then(function stateChangeComplete() {
            lastCompletelyLoadedState.set(newStateName, parameters)
            try {
              stateProviderEmitter.emit('stateChangeEnd', prototypalStateHolder.get(newStateName), parameters)
            } catch (e) {
              handleError('stateError', e)
            }
          }).catch(ifNotCancelled(function handleStateChangeError(err) {
            if (err && err.redirectTo) {
              stateProviderEmitter.emit('stateChangeCancelled', err)
              return stateProviderEmitter.go(err.redirectTo.name, err.redirectTo.params, { replace: true })
            } else if (err) {
              handleError('stateChangeError', err)
            }
          })).catch(function handleCancellation(err) {
            if (err && err.wasCancelledBySomeoneElse) {
              // we don't care, the state transition manager has already emitted the stateChangeCancelled for us
            } else {
              throw new Error("This probably shouldn't happen, maybe file an issue or something " + err)
            }
          })
      }

      function makePath(stateName, parameters, options) {
        function getGuaranteedPreviousState() {
          if (!lastStateStartedActivating.get().name) {
            throw new Error('makePath required a previous state to exist, and none was found')
          }
          return lastStateStartedActivating.get()
        }
        if (options && options.inherit) {
          parameters = extend(getGuaranteedPreviousState().parameters, parameters)
        }

        var destinationState = stateName === null ? getGuaranteedPreviousState().name : stateName

        prototypalStateHolder.guaranteeAllStatesExist(destinationState)
        var route = prototypalStateHolder.buildFullStateRoute(destinationState)
        return buildPath(route, parameters || {})
      }

      var defaultOptions = {
        replace: false
      }

      stateProviderEmitter.addState = addState
      stateProviderEmitter.go = function go(newStateName, parameters, options) {
        options = extend(defaultOptions, options)
        var goFunction = options.replace ? stateRouterOptions.router.replace : stateRouterOptions.router.go

        return promiseMe(makePath, newStateName, parameters, options).then(goFunction, handleError.bind(null, 'stateChangeError'))
      }
      stateProviderEmitter.evaluateCurrentRoute = function evaluateCurrentRoute(defaultState, defaultParams) {
        return promiseMe(makePath, defaultState, defaultParams).then(function(defaultPath) {
          stateRouterOptions.router.evaluateCurrent(defaultPath)
        }).catch(function(err) {
          handleError('stateError', err)
        })
      }
      stateProviderEmitter.makePath = function makePathAndPrependHash(stateName, parameters, options) {
        return stateRouterOptions.pathPrefix + makePath(stateName, parameters, options)
      }
      stateProviderEmitter.stateIsActive = function stateIsActive(stateName, opts) {
        var currentState = lastCompletelyLoadedState.get()
        return (currentState.name === stateName || currentState.name.indexOf(stateName + '.') === 0) && (typeof opts === 'undefined' || Object.keys(opts).every(function matches(key) {
            return opts[key] === currentState.parameters[key]
          }))
      }

      var renderer = makeRenderer(stateProviderEmitter)

      destroyDom = denodeify(renderer.destroy)
      getDomChild = denodeify(renderer.getChildElement)
      renderDom = denodeify(renderer.render)
      resetDom = denodeify(renderer.reset)

      return stateProviderEmitter
    }

    function getContentObject(stateResolveResultsObject, stateName) {
      var allPossibleResolvedStateNames = parse(stateName)

      return allPossibleResolvedStateNames.filter(function(stateName) {
        return stateResolveResultsObject[stateName]
      }).reduce(function(obj, stateName) {
        return extend(obj, stateResolveResultsObject[stateName])
      }, {})
    }

    function redirector(newStateName, parameters) {
      return {
        redirectTo: {
          name: newStateName,
          params: parameters
        }
      }
    }

// { [stateName]: resolveResult }
    function resolveStates(states, parameters) {
      var statesWithResolveFunctions = states.filter(isFunction('resolve'))
      var stateNamesWithResolveFunctions = statesWithResolveFunctions.map(property('name'))
      var resolves = Promise.all(statesWithResolveFunctions.map(function(state) {
        return new Promise(function (resolve, reject) {
          function resolveCb(err, content) {
            err ? reject(err) : resolve(content)
          }

          resolveCb.redirect = function redirect(newStateName, parameters) {
            reject(redirector(newStateName, parameters))
          }

          var res = state.resolve(state.data, parameters, resolveCb)
          if (res && (typeof res === 'object' || typeof res === 'function') && typeof res.then === 'function') {
            resolve(res)
          }
        })
      }))

      return resolves.then(function(resolveResults) {
        return combine({
          stateName: stateNamesWithResolveFunctions,
          resolveResult: resolveResults
        }).reduce(function(obj, result) {
          obj[result.stateName] = result.resolveResult
          return obj
        }, {})
      })
    }

    function property(name) {
      return function(obj) {
        return obj[name]
      }
    }

    function reverse(ary) {
      return ary.slice().reverse()
    }

    function isFunction(property) {
      return function(obj) {
        return typeof obj[property] === 'function'
      }
    }

    function promiseMe() {
      var fn = Array.prototype.shift.apply(arguments)
      var args = arguments
      return new Promise(function(resolve) {
        resolve(fn.apply(null, args))
      })
    }

  }).call(this,require('_process'))
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsidmFyIFN0YXRlU3RhdGUgPSByZXF1aXJlKCcuL2xpYi9zdGF0ZS1zdGF0ZScpXG52YXIgU3RhdGVDb21wYXJpc29uID0gcmVxdWlyZSgnLi9saWIvc3RhdGUtY29tcGFyaXNvbicpXG52YXIgQ3VycmVudFN0YXRlID0gcmVxdWlyZSgnLi9saWIvY3VycmVudC1zdGF0ZScpXG52YXIgc3RhdGVDaGFuZ2VMb2dpYyA9IHJlcXVpcmUoJy4vbGliL3N0YXRlLWNoYW5nZS1sb2dpYycpXG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL2xpYi9zdGF0ZS1zdHJpbmctcGFyc2VyJylcbnZhciBTdGF0ZVRyYW5zaXRpb25NYW5hZ2VyID0gcmVxdWlyZSgnLi9saWIvc3RhdGUtdHJhbnNpdGlvbi1tYW5hZ2VyJylcbnZhciBkZWZhdWx0Um91dGVyT3B0aW9ucyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1yb3V0ZXItb3B0aW9ucy5qcycpXG5cbnZhciBzZXJpZXMgPSByZXF1aXJlKCcuL2xpYi9wcm9taXNlLW1hcC1zZXJpZXMnKVxudmFyIGRlbm9kZWlmeSA9IHJlcXVpcmUoJ3RoZW4tZGVub2RlaWZ5JylcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlclxudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJylcbnZhciBuZXdIYXNoQnJvd25Sb3V0ZXIgPSByZXF1aXJlKCdoYXNoLWJyb3duLXJvdXRlcicpXG52YXIgY29tYmluZSA9IHJlcXVpcmUoJ2NvbWJpbmUtYXJyYXlzJylcbnZhciBidWlsZFBhdGggPSByZXF1aXJlKCdwYWdlLXBhdGgtYnVpbGRlcicpXG5cbnJlcXVpcmUoJ25hdGl2ZS1wcm9taXNlLW9ubHkvbnBvJylcblxudmFyIGV4cGVjdGVkUHJvcGVydGllc09mQWRkU3RhdGUgPSBbJ25hbWUnLCAncm91dGUnLCAnZGVmYXVsdENoaWxkJywgJ2RhdGEnLCAndGVtcGxhdGUnLCAncmVzb2x2ZScsICdhY3RpdmF0ZScsICdxdWVyeXN0cmluZ1BhcmFtZXRlcnMnLCAnZGVmYXVsdFF1ZXJ5c3RyaW5nUGFyYW1ldGVycyddXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gU3RhdGVQcm92aWRlcihtYWtlUmVuZGVyZXIsIHJvb3RFbGVtZW50LCBzdGF0ZVJvdXRlck9wdGlvbnMpIHtcblx0dmFyIHByb3RvdHlwYWxTdGF0ZUhvbGRlciA9IFN0YXRlU3RhdGUoKVxuXHR2YXIgbGFzdENvbXBsZXRlbHlMb2FkZWRTdGF0ZSA9IEN1cnJlbnRTdGF0ZSgpXG5cdHZhciBsYXN0U3RhdGVTdGFydGVkQWN0aXZhdGluZyA9IEN1cnJlbnRTdGF0ZSgpXG5cdHZhciBzdGF0ZVByb3ZpZGVyRW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKVxuXHRTdGF0ZVRyYW5zaXRpb25NYW5hZ2VyKHN0YXRlUHJvdmlkZXJFbWl0dGVyKVxuXHRzdGF0ZVJvdXRlck9wdGlvbnMgPSBleHRlbmQoe1xuXHRcdHRocm93T25FcnJvcjogdHJ1ZSxcblx0XHRwYXRoUHJlZml4OiAnIydcblx0fSwgc3RhdGVSb3V0ZXJPcHRpb25zKVxuXG5cdGlmICghc3RhdGVSb3V0ZXJPcHRpb25zLnJvdXRlcikge1xuXHRcdHN0YXRlUm91dGVyT3B0aW9ucy5yb3V0ZXIgPSBuZXdIYXNoQnJvd25Sb3V0ZXIoZGVmYXVsdFJvdXRlck9wdGlvbnMpXG5cdH1cblxuXHRzdGF0ZVJvdXRlck9wdGlvbnMucm91dGVyLnNldERlZmF1bHQoZnVuY3Rpb24ocm91dGUsIHBhcmFtZXRlcnMpIHtcblx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KCdyb3V0ZU5vdEZvdW5kJywgcm91dGUsIHBhcmFtZXRlcnMpXG5cdH0pXG5cblx0dmFyIGRlc3Ryb3lEb20gPSBudWxsXG5cdHZhciBnZXREb21DaGlsZCA9IG51bGxcblx0dmFyIHJlbmRlckRvbSA9IG51bGxcblx0dmFyIHJlc2V0RG9tID0gbnVsbFxuXG5cdHZhciBhY3RpdmVEb21BcGlzID0ge31cblx0dmFyIGFjdGl2ZVN0YXRlUmVzb2x2ZUNvbnRlbnQgPSB7fVxuXHR2YXIgYWN0aXZlRW1pdHRlcnMgPSB7fVxuXG5cdGZ1bmN0aW9uIGhhbmRsZUVycm9yKGV2ZW50LCBlcnIpIHtcblx0XHRwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZW1pdChldmVudCwgZXJyKVxuXHRcdFx0Y29uc29sZS5lcnJvcihldmVudCArICcgLSAnICsgZXJyLm1lc3NhZ2UpXG5cdFx0XHRpZiAoc3RhdGVSb3V0ZXJPcHRpb25zLnRocm93T25FcnJvcikge1xuXHRcdFx0XHR0aHJvdyBlcnJcblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cblx0ZnVuY3Rpb24gZGVzdHJveVN0YXRlTmFtZShzdGF0ZU5hbWUpIHtcblx0XHR2YXIgc3RhdGUgPSBwcm90b3R5cGFsU3RhdGVIb2xkZXIuZ2V0KHN0YXRlTmFtZSlcblx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KCdiZWZvcmVEZXN0cm95U3RhdGUnLCB7XG5cdFx0XHRzdGF0ZTogc3RhdGUsXG5cdFx0XHRkb21BcGk6IGFjdGl2ZURvbUFwaXNbc3RhdGVOYW1lXVxuXHRcdH0pXG5cblx0XHRhY3RpdmVFbWl0dGVyc1tzdGF0ZU5hbWVdLmVtaXQoJ2Rlc3Ryb3knKVxuXHRcdGFjdGl2ZUVtaXR0ZXJzW3N0YXRlTmFtZV0ucmVtb3ZlQWxsTGlzdGVuZXJzKClcblx0XHRkZWxldGUgYWN0aXZlRW1pdHRlcnNbc3RhdGVOYW1lXVxuXHRcdGRlbGV0ZSBhY3RpdmVTdGF0ZVJlc29sdmVDb250ZW50W3N0YXRlTmFtZV1cblxuXHRcdHJldHVybiBkZXN0cm95RG9tKGFjdGl2ZURvbUFwaXNbc3RhdGVOYW1lXSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdGRlbGV0ZSBhY3RpdmVEb21BcGlzW3N0YXRlTmFtZV1cblx0XHRcdHN0YXRlUHJvdmlkZXJFbWl0dGVyLmVtaXQoJ2FmdGVyRGVzdHJveVN0YXRlJywge1xuXHRcdFx0XHRzdGF0ZTogc3RhdGVcblx0XHRcdH0pXG5cdFx0fSlcblx0fVxuXG5cdGZ1bmN0aW9uIHJlc2V0U3RhdGVOYW1lKHBhcmFtZXRlcnMsIHN0YXRlTmFtZSkge1xuXHRcdHZhciBkb21BcGkgPSBhY3RpdmVEb21BcGlzW3N0YXRlTmFtZV1cblx0XHR2YXIgY29udGVudCA9IGdldENvbnRlbnRPYmplY3QoYWN0aXZlU3RhdGVSZXNvbHZlQ29udGVudCwgc3RhdGVOYW1lKVxuXHRcdHZhciBzdGF0ZSA9IHByb3RvdHlwYWxTdGF0ZUhvbGRlci5nZXQoc3RhdGVOYW1lKVxuXG5cdFx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZW1pdCgnYmVmb3JlUmVzZXRTdGF0ZScsIHtcblx0XHRcdGRvbUFwaTogZG9tQXBpLFxuXHRcdFx0Y29udGVudDogY29udGVudCxcblx0XHRcdHN0YXRlOiBzdGF0ZSxcblx0XHRcdHBhcmFtZXRlcnM6IHBhcmFtZXRlcnNcblx0XHR9KVxuXG5cdFx0YWN0aXZlRW1pdHRlcnNbc3RhdGVOYW1lXS5lbWl0KCdkZXN0cm95Jylcblx0XHRkZWxldGUgYWN0aXZlRW1pdHRlcnNbc3RhdGVOYW1lXVxuXG5cdFx0cmV0dXJuIHJlc2V0RG9tKHtcblx0XHRcdGRvbUFwaTogZG9tQXBpLFxuXHRcdFx0Y29udGVudDogY29udGVudCxcblx0XHRcdHRlbXBsYXRlOiBzdGF0ZS50ZW1wbGF0ZSxcblx0XHRcdHBhcmFtZXRlcnM6IHBhcmFtZXRlcnNcblx0XHR9KS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZW1pdCgnYWZ0ZXJSZXNldFN0YXRlJywge1xuXHRcdFx0XHRkb21BcGk6IGRvbUFwaSxcblx0XHRcdFx0Y29udGVudDogY29udGVudCxcblx0XHRcdFx0c3RhdGU6IHN0YXRlLFxuXHRcdFx0XHRwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzXG5cdFx0XHR9KVxuXHRcdH0pXG5cdH1cblxuXHRmdW5jdGlvbiBnZXRDaGlsZEVsZW1lbnRGb3JTdGF0ZU5hbWUoc3RhdGVOYW1lKSB7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcblx0XHRcdHZhciBwYXJlbnQgPSBwcm90b3R5cGFsU3RhdGVIb2xkZXIuZ2V0UGFyZW50KHN0YXRlTmFtZSlcblx0XHRcdGlmIChwYXJlbnQpIHtcblx0XHRcdFx0dmFyIHBhcmVudERvbUFwaSA9IGFjdGl2ZURvbUFwaXNbcGFyZW50Lm5hbWVdXG5cdFx0XHRcdHJlc29sdmUoZ2V0RG9tQ2hpbGQocGFyZW50RG9tQXBpKSlcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJlc29sdmUocm9vdEVsZW1lbnQpXG5cdFx0XHR9XG5cdFx0fSlcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbmRlclN0YXRlTmFtZShwYXJhbWV0ZXJzLCBzdGF0ZU5hbWUpIHtcblx0XHRyZXR1cm4gZ2V0Q2hpbGRFbGVtZW50Rm9yU3RhdGVOYW1lKHN0YXRlTmFtZSkudGhlbihmdW5jdGlvbihjaGlsZEVsZW1lbnQpIHtcblx0XHRcdHZhciBzdGF0ZSA9IHByb3RvdHlwYWxTdGF0ZUhvbGRlci5nZXQoc3RhdGVOYW1lKVxuXHRcdFx0dmFyIGNvbnRlbnQgPSBnZXRDb250ZW50T2JqZWN0KGFjdGl2ZVN0YXRlUmVzb2x2ZUNvbnRlbnQsIHN0YXRlTmFtZSlcblxuXHRcdFx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZW1pdCgnYmVmb3JlQ3JlYXRlU3RhdGUnLCB7XG5cdFx0XHRcdHN0YXRlOiBzdGF0ZSxcblx0XHRcdFx0Y29udGVudDogY29udGVudCxcblx0XHRcdFx0cGFyYW1ldGVyczogcGFyYW1ldGVyc1xuXHRcdFx0fSlcblxuXHRcdFx0cmV0dXJuIHJlbmRlckRvbSh7XG5cdFx0XHRcdGVsZW1lbnQ6IGNoaWxkRWxlbWVudCxcblx0XHRcdFx0dGVtcGxhdGU6IHN0YXRlLnRlbXBsYXRlLFxuXHRcdFx0XHRjb250ZW50OiBjb250ZW50LFxuXHRcdFx0XHRwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzXG5cdFx0XHR9KS50aGVuKGZ1bmN0aW9uKGRvbUFwaSkge1xuXHRcdFx0XHRhY3RpdmVEb21BcGlzW3N0YXRlTmFtZV0gPSBkb21BcGlcblx0XHRcdFx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZW1pdCgnYWZ0ZXJDcmVhdGVTdGF0ZScsIHtcblx0XHRcdFx0XHRzdGF0ZTogc3RhdGUsXG5cdFx0XHRcdFx0ZG9tQXBpOiBkb21BcGksXG5cdFx0XHRcdFx0Y29udGVudDogY29udGVudCxcblx0XHRcdFx0XHRwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzXG5cdFx0XHRcdH0pXG5cdFx0XHRcdHJldHVybiBkb21BcGlcblx0XHRcdH0pXG5cdFx0fSlcblx0fVxuXG5cdGZ1bmN0aW9uIHJlbmRlckFsbChzdGF0ZU5hbWVzLCBwYXJhbWV0ZXJzKSB7XG5cdFx0cmV0dXJuIHNlcmllcyhzdGF0ZU5hbWVzLCByZW5kZXJTdGF0ZU5hbWUuYmluZChudWxsLCBwYXJhbWV0ZXJzKSlcblx0fVxuXG5cdGZ1bmN0aW9uIG9uUm91dGVDaGFuZ2Uoc3RhdGUsIHBhcmFtZXRlcnMpIHtcblx0XHR0cnkge1xuXHRcdFx0dmFyIGZpbmFsRGVzdGluYXRpb25TdGF0ZU5hbWUgPSBwcm90b3R5cGFsU3RhdGVIb2xkZXIuYXBwbHlEZWZhdWx0Q2hpbGRTdGF0ZXMoc3RhdGUubmFtZSlcblxuXHRcdFx0aWYgKGZpbmFsRGVzdGluYXRpb25TdGF0ZU5hbWUgPT09IHN0YXRlLm5hbWUpIHtcblx0XHRcdFx0ZW1pdEV2ZW50QW5kQXR0ZW1wdFN0YXRlQ2hhbmdlKGZpbmFsRGVzdGluYXRpb25TdGF0ZU5hbWUsIHBhcmFtZXRlcnMpXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBUaGVyZSBhcmUgZGVmYXVsdCBjaGlsZCBzdGF0ZXMgdGhhdCBuZWVkIHRvIGJlIGFwcGxpZWRcblxuXHRcdFx0XHR2YXIgdGhlUm91dGVXZU5lZWRUb0VuZFVwQXQgPSBtYWtlUGF0aChmaW5hbERlc3RpbmF0aW9uU3RhdGVOYW1lLCBwYXJhbWV0ZXJzKVxuXHRcdFx0XHR2YXIgY3VycmVudFJvdXRlID0gc3RhdGVSb3V0ZXJPcHRpb25zLnJvdXRlci5sb2NhdGlvbi5nZXQoKVxuXG5cdFx0XHRcdGlmICh0aGVSb3V0ZVdlTmVlZFRvRW5kVXBBdCA9PT0gY3VycmVudFJvdXRlKSB7XG5cdFx0XHRcdFx0Ly8gdGhlIGNoaWxkIHN0YXRlIGhhcyB0aGUgc2FtZSByb3V0ZSBhcyB0aGUgY3VycmVudCBvbmUsIGp1c3Qgc3RhcnQgbmF2aWdhdGluZyB0aGVyZVxuXHRcdFx0XHRcdGVtaXRFdmVudEFuZEF0dGVtcHRTdGF0ZUNoYW5nZShmaW5hbERlc3RpbmF0aW9uU3RhdGVOYW1lLCBwYXJhbWV0ZXJzKVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIGNoYW5nZSB0aGUgdXJsIHRvIG1hdGNoIHRoZSBmdWxsIGRlZmF1bHQgY2hpbGQgc3RhdGUgcm91dGVcblx0XHRcdFx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5nbyhmaW5hbERlc3RpbmF0aW9uU3RhdGVOYW1lLCBwYXJhbWV0ZXJzLCB7IHJlcGxhY2U6IHRydWUgfSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0aGFuZGxlRXJyb3IoJ3N0YXRlRXJyb3InLCBlcnIpXG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gYWRkU3RhdGUoc3RhdGUpIHtcblx0XHRpZiAodHlwZW9mIHN0YXRlID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBcXCdzdGF0ZVxcJyB0byBiZSBwYXNzZWQgaW4uJylcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBzdGF0ZS5uYW1lID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCB0aGUgXFwnbmFtZVxcJyBvcHRpb24gdG8gYmUgcGFzc2VkIGluLicpXG5cdFx0fSBlbHNlIGlmICh0eXBlb2Ygc3RhdGUudGVtcGxhdGUgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHRoZSBcXCd0ZW1wbGF0ZVxcJyBvcHRpb24gdG8gYmUgcGFzc2VkIGluLicpXG5cdFx0fVxuXHRcdE9iamVjdC5rZXlzKHN0YXRlKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRyZXR1cm4gZXhwZWN0ZWRQcm9wZXJ0aWVzT2ZBZGRTdGF0ZS5pbmRleE9mKGtleSkgPT09IC0xXG5cdFx0fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdGNvbnNvbGUud2FybignVW5leHBlY3RlZCBwcm9wZXJ0eSBwYXNzZWQgdG8gYWRkU3RhdGU6Jywga2V5KVxuXHRcdH0pXG5cblx0XHRwcm90b3R5cGFsU3RhdGVIb2xkZXIuYWRkKHN0YXRlLm5hbWUsIHN0YXRlKVxuXG5cdFx0dmFyIHJvdXRlID0gcHJvdG90eXBhbFN0YXRlSG9sZGVyLmJ1aWxkRnVsbFN0YXRlUm91dGUoc3RhdGUubmFtZSlcblxuXHRcdHN0YXRlUm91dGVyT3B0aW9ucy5yb3V0ZXIuYWRkKHJvdXRlLCBvblJvdXRlQ2hhbmdlLmJpbmQobnVsbCwgc3RhdGUpKVxuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0U3RhdGVzVG9SZXNvbHZlKHN0YXRlQ2hhbmdlcykge1xuXHRcdHJldHVybiBzdGF0ZUNoYW5nZXMuY2hhbmdlLmNvbmNhdChzdGF0ZUNoYW5nZXMuY3JlYXRlKS5tYXAocHJvdG90eXBhbFN0YXRlSG9sZGVyLmdldClcblx0fVxuXG5cdGZ1bmN0aW9uIGVtaXRFdmVudEFuZEF0dGVtcHRTdGF0ZUNoYW5nZShuZXdTdGF0ZU5hbWUsIHBhcmFtZXRlcnMpIHtcblx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KCdzdGF0ZUNoYW5nZUF0dGVtcHQnLCBmdW5jdGlvbiBzdGF0ZUdvKHRyYW5zaXRpb24pIHtcblx0XHRcdGF0dGVtcHRTdGF0ZUNoYW5nZShuZXdTdGF0ZU5hbWUsIHBhcmFtZXRlcnMsIHRyYW5zaXRpb24pXG5cdFx0fSlcblx0fVxuXG5cdGZ1bmN0aW9uIGF0dGVtcHRTdGF0ZUNoYW5nZShuZXdTdGF0ZU5hbWUsIHBhcmFtZXRlcnMsIHRyYW5zaXRpb24pIHtcblx0XHRmdW5jdGlvbiBpZk5vdENhbmNlbGxlZChmbikge1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAodHJhbnNpdGlvbi5jYW5jZWxsZWQpIHtcblx0XHRcdFx0XHR2YXIgZXJyID0gbmV3IEVycm9yKCdUaGUgdHJhbnNpdGlvbiB0byAnICsgbmV3U3RhdGVOYW1lICsgJ3dhcyBjYW5jZWxsZWQnKVxuXHRcdFx0XHRcdGVyci53YXNDYW5jZWxsZWRCeVNvbWVvbmVFbHNlID0gdHJ1ZVxuXHRcdFx0XHRcdHRocm93IGVyclxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBmbi5hcHBseShudWxsLCBhcmd1bWVudHMpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gcHJvbWlzZU1lKHByb3RvdHlwYWxTdGF0ZUhvbGRlci5ndWFyYW50ZWVBbGxTdGF0ZXNFeGlzdCwgbmV3U3RhdGVOYW1lKVxuXHRcdC50aGVuKGZ1bmN0aW9uIGFwcGx5RGVmYXVsdFBhcmFtZXRlcnMoKSB7XG5cdFx0XHR2YXIgc3RhdGUgPSBwcm90b3R5cGFsU3RhdGVIb2xkZXIuZ2V0KG5ld1N0YXRlTmFtZSlcblx0XHRcdHZhciBkZWZhdWx0UGFyYW1zID0gc3RhdGUuZGVmYXVsdFF1ZXJ5c3RyaW5nUGFyYW1ldGVycyB8fCB7fVxuXHRcdFx0dmFyIG5lZWRUb0FwcGx5RGVmYXVsdHMgPSBPYmplY3Qua2V5cyhkZWZhdWx0UGFyYW1zKS5zb21lKGZ1bmN0aW9uIG1pc3NpbmdQYXJhbWV0ZXJWYWx1ZShwYXJhbSkge1xuXHRcdFx0XHRyZXR1cm4gIXBhcmFtZXRlcnNbcGFyYW1dXG5cdFx0XHR9KVxuXG5cdFx0XHRpZiAobmVlZFRvQXBwbHlEZWZhdWx0cykge1xuXHRcdFx0XHR0aHJvdyByZWRpcmVjdG9yKG5ld1N0YXRlTmFtZSwgZXh0ZW5kKGRlZmF1bHRQYXJhbXMsIHBhcmFtZXRlcnMpKVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHN0YXRlXG5cdFx0fSkudGhlbihpZk5vdENhbmNlbGxlZChmdW5jdGlvbihzdGF0ZSkge1xuXHRcdFx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZW1pdCgnc3RhdGVDaGFuZ2VTdGFydCcsIHN0YXRlLCBwYXJhbWV0ZXJzKVxuXHRcdFx0bGFzdFN0YXRlU3RhcnRlZEFjdGl2YXRpbmcuc2V0KHN0YXRlLm5hbWUsIHBhcmFtZXRlcnMpXG5cdFx0fSkpLnRoZW4oZnVuY3Rpb24gZ2V0U3RhdGVDaGFuZ2VzKCkge1xuXHRcdFx0dmFyIHN0YXRlQ29tcGFyaXNvblJlc3VsdHMgPSBTdGF0ZUNvbXBhcmlzb24ocHJvdG90eXBhbFN0YXRlSG9sZGVyKShsYXN0Q29tcGxldGVseUxvYWRlZFN0YXRlLmdldCgpLm5hbWUsIGxhc3RDb21wbGV0ZWx5TG9hZGVkU3RhdGUuZ2V0KCkucGFyYW1ldGVycywgbmV3U3RhdGVOYW1lLCBwYXJhbWV0ZXJzKVxuXHRcdFx0cmV0dXJuIHN0YXRlQ2hhbmdlTG9naWMoc3RhdGVDb21wYXJpc29uUmVzdWx0cykgLy8geyBkZXN0cm95LCBjaGFuZ2UsIGNyZWF0ZSB9XG5cdFx0fSkudGhlbihpZk5vdENhbmNlbGxlZChmdW5jdGlvbiByZXNvbHZlRGVzdHJveUFuZEFjdGl2YXRlU3RhdGVzKHN0YXRlQ2hhbmdlcykge1xuXHRcdFx0cmV0dXJuIHJlc29sdmVTdGF0ZXMoZ2V0U3RhdGVzVG9SZXNvbHZlKHN0YXRlQ2hhbmdlcyksIGV4dGVuZChwYXJhbWV0ZXJzKSkuY2F0Y2goZnVuY3Rpb24gb25SZXNvbHZlRXJyb3IoZSkge1xuXHRcdFx0XHRlLnN0YXRlQ2hhbmdlRXJyb3IgPSB0cnVlXG5cdFx0XHRcdHRocm93IGVcblx0XHRcdH0pLnRoZW4oaWZOb3RDYW5jZWxsZWQoZnVuY3Rpb24gZGVzdHJveUFuZEFjdGl2YXRlKHN0YXRlUmVzb2x2ZVJlc3VsdHNPYmplY3QpIHtcblx0XHRcdFx0dHJhbnNpdGlvbi5jYW5jZWxsYWJsZSA9IGZhbHNlXG5cblx0XHRcdFx0ZnVuY3Rpb24gYWN0aXZhdGVBbGwoKSB7XG5cdFx0XHRcdFx0dmFyIHN0YXRlc1RvQWN0aXZhdGUgPSBzdGF0ZUNoYW5nZXMuY2hhbmdlLmNvbmNhdChzdGF0ZUNoYW5nZXMuY3JlYXRlKVxuXG5cdFx0XHRcdFx0cmV0dXJuIGFjdGl2YXRlU3RhdGVzKHN0YXRlc1RvQWN0aXZhdGUpXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRhY3RpdmVTdGF0ZVJlc29sdmVDb250ZW50ID0gZXh0ZW5kKGFjdGl2ZVN0YXRlUmVzb2x2ZUNvbnRlbnQsIHN0YXRlUmVzb2x2ZVJlc3VsdHNPYmplY3QpXG5cblx0XHRcdFx0cmV0dXJuIHNlcmllcyhyZXZlcnNlKHN0YXRlQ2hhbmdlcy5kZXN0cm95KSwgZGVzdHJveVN0YXRlTmFtZSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2VyaWVzKHJldmVyc2Uoc3RhdGVDaGFuZ2VzLmNoYW5nZSksIHJlc2V0U3RhdGVOYW1lLmJpbmQobnVsbCwgZXh0ZW5kKHBhcmFtZXRlcnMpKSlcblx0XHRcdFx0fSkudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVuZGVyQWxsKHN0YXRlQ2hhbmdlcy5jcmVhdGUsIGV4dGVuZChwYXJhbWV0ZXJzKSkudGhlbihhY3RpdmF0ZUFsbClcblx0XHRcdFx0fSlcblx0XHRcdH0pKVxuXG5cdFx0XHRmdW5jdGlvbiBhY3RpdmF0ZVN0YXRlcyhzdGF0ZU5hbWVzKSB7XG5cdFx0XHRcdHJldHVybiBzdGF0ZU5hbWVzLm1hcChwcm90b3R5cGFsU3RhdGVIb2xkZXIuZ2V0KS5mb3JFYWNoKGZ1bmN0aW9uKHN0YXRlKSB7XG5cdFx0XHRcdFx0dmFyIGVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKClcblx0XHRcdFx0XHR2YXIgY29udGV4dCA9IE9iamVjdC5jcmVhdGUoZW1pdHRlcilcblx0XHRcdFx0XHRjb250ZXh0LmRvbUFwaSA9IGFjdGl2ZURvbUFwaXNbc3RhdGUubmFtZV1cblx0XHRcdFx0XHRjb250ZXh0LmRhdGEgPSBzdGF0ZS5kYXRhXG5cdFx0XHRcdFx0Y29udGV4dC5wYXJhbWV0ZXJzID0gcGFyYW1ldGVyc1xuXHRcdFx0XHRcdGNvbnRleHQuY29udGVudCA9IGdldENvbnRlbnRPYmplY3QoYWN0aXZlU3RhdGVSZXNvbHZlQ29udGVudCwgc3RhdGUubmFtZSlcblx0XHRcdFx0XHRhY3RpdmVFbWl0dGVyc1tzdGF0ZS5uYW1lXSA9IGVtaXR0ZXJcblxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRzdGF0ZS5hY3RpdmF0ZSAmJiBzdGF0ZS5hY3RpdmF0ZShjb250ZXh0KVxuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHRocm93IGVcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdH0pKS50aGVuKGZ1bmN0aW9uIHN0YXRlQ2hhbmdlQ29tcGxldGUoKSB7XG5cdFx0XHRsYXN0Q29tcGxldGVseUxvYWRlZFN0YXRlLnNldChuZXdTdGF0ZU5hbWUsIHBhcmFtZXRlcnMpXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KCdzdGF0ZUNoYW5nZUVuZCcsIHByb3RvdHlwYWxTdGF0ZUhvbGRlci5nZXQobmV3U3RhdGVOYW1lKSwgcGFyYW1ldGVycylcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0aGFuZGxlRXJyb3IoJ3N0YXRlRXJyb3InLCBlKVxuXHRcdFx0fVxuXHRcdH0pLmNhdGNoKGlmTm90Q2FuY2VsbGVkKGZ1bmN0aW9uIGhhbmRsZVN0YXRlQ2hhbmdlRXJyb3IoZXJyKSB7XG5cdFx0XHRpZiAoZXJyICYmIGVyci5yZWRpcmVjdFRvKSB7XG5cdFx0XHRcdHN0YXRlUHJvdmlkZXJFbWl0dGVyLmVtaXQoJ3N0YXRlQ2hhbmdlQ2FuY2VsbGVkJywgZXJyKVxuXHRcdFx0XHRyZXR1cm4gc3RhdGVQcm92aWRlckVtaXR0ZXIuZ28oZXJyLnJlZGlyZWN0VG8ubmFtZSwgZXJyLnJlZGlyZWN0VG8ucGFyYW1zLCB7IHJlcGxhY2U6IHRydWUgfSlcblx0XHRcdH0gZWxzZSBpZiAoZXJyKSB7XG5cdFx0XHRcdGhhbmRsZUVycm9yKCdzdGF0ZUNoYW5nZUVycm9yJywgZXJyKVxuXHRcdFx0fVxuXHRcdH0pKS5jYXRjaChmdW5jdGlvbiBoYW5kbGVDYW5jZWxsYXRpb24oZXJyKSB7XG5cdFx0XHRpZiAoZXJyICYmIGVyci53YXNDYW5jZWxsZWRCeVNvbWVvbmVFbHNlKSB7XG5cdFx0XHRcdC8vIHdlIGRvbid0IGNhcmUsIHRoZSBzdGF0ZSB0cmFuc2l0aW9uIG1hbmFnZXIgaGFzIGFscmVhZHkgZW1pdHRlZCB0aGUgc3RhdGVDaGFuZ2VDYW5jZWxsZWQgZm9yIHVzXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHByb2JhYmx5IHNob3VsZG4ndCBoYXBwZW4sIG1heWJlIGZpbGUgYW4gaXNzdWUgb3Igc29tZXRoaW5nIFwiICsgZXJyKVxuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHRmdW5jdGlvbiBtYWtlUGF0aChzdGF0ZU5hbWUsIHBhcmFtZXRlcnMsIG9wdGlvbnMpIHtcblx0XHRmdW5jdGlvbiBnZXRHdWFyYW50ZWVkUHJldmlvdXNTdGF0ZSgpIHtcblx0XHRcdGlmICghbGFzdFN0YXRlU3RhcnRlZEFjdGl2YXRpbmcuZ2V0KCkubmFtZSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ21ha2VQYXRoIHJlcXVpcmVkIGEgcHJldmlvdXMgc3RhdGUgdG8gZXhpc3QsIGFuZCBub25lIHdhcyBmb3VuZCcpXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGFzdFN0YXRlU3RhcnRlZEFjdGl2YXRpbmcuZ2V0KClcblx0XHR9XG5cdFx0aWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5pbmhlcml0KSB7XG5cdFx0XHRwYXJhbWV0ZXJzID0gZXh0ZW5kKGdldEd1YXJhbnRlZWRQcmV2aW91c1N0YXRlKCkucGFyYW1ldGVycywgcGFyYW1ldGVycylcblx0XHR9XG5cblx0XHR2YXIgZGVzdGluYXRpb25TdGF0ZSA9IHN0YXRlTmFtZSA9PT0gbnVsbCA/IGdldEd1YXJhbnRlZWRQcmV2aW91c1N0YXRlKCkubmFtZSA6IHN0YXRlTmFtZVxuXG5cdFx0cHJvdG90eXBhbFN0YXRlSG9sZGVyLmd1YXJhbnRlZUFsbFN0YXRlc0V4aXN0KGRlc3RpbmF0aW9uU3RhdGUpXG5cdFx0dmFyIHJvdXRlID0gcHJvdG90eXBhbFN0YXRlSG9sZGVyLmJ1aWxkRnVsbFN0YXRlUm91dGUoZGVzdGluYXRpb25TdGF0ZSlcblx0XHRyZXR1cm4gYnVpbGRQYXRoKHJvdXRlLCBwYXJhbWV0ZXJzIHx8IHt9KVxuXHR9XG5cblx0dmFyIGRlZmF1bHRPcHRpb25zID0ge1xuXHRcdHJlcGxhY2U6IGZhbHNlXG5cdH1cblxuXHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5hZGRTdGF0ZSA9IGFkZFN0YXRlXG5cdHN0YXRlUHJvdmlkZXJFbWl0dGVyLmdvID0gZnVuY3Rpb24gZ28obmV3U3RhdGVOYW1lLCBwYXJhbWV0ZXJzLCBvcHRpb25zKSB7XG5cdFx0b3B0aW9ucyA9IGV4dGVuZChkZWZhdWx0T3B0aW9ucywgb3B0aW9ucylcblx0XHR2YXIgZ29GdW5jdGlvbiA9IG9wdGlvbnMucmVwbGFjZSA/IHN0YXRlUm91dGVyT3B0aW9ucy5yb3V0ZXIucmVwbGFjZSA6IHN0YXRlUm91dGVyT3B0aW9ucy5yb3V0ZXIuZ29cblxuXHRcdHJldHVybiBwcm9taXNlTWUobWFrZVBhdGgsIG5ld1N0YXRlTmFtZSwgcGFyYW1ldGVycywgb3B0aW9ucykudGhlbihnb0Z1bmN0aW9uLCBoYW5kbGVFcnJvci5iaW5kKG51bGwsICdzdGF0ZUNoYW5nZUVycm9yJykpXG5cdH1cblx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZXZhbHVhdGVDdXJyZW50Um91dGUgPSBmdW5jdGlvbiBldmFsdWF0ZUN1cnJlbnRSb3V0ZShkZWZhdWx0U3RhdGUsIGRlZmF1bHRQYXJhbXMpIHtcblx0XHRyZXR1cm4gcHJvbWlzZU1lKG1ha2VQYXRoLCBkZWZhdWx0U3RhdGUsIGRlZmF1bHRQYXJhbXMpLnRoZW4oZnVuY3Rpb24oZGVmYXVsdFBhdGgpIHtcblx0XHRcdHN0YXRlUm91dGVyT3B0aW9ucy5yb3V0ZXIuZXZhbHVhdGVDdXJyZW50KGRlZmF1bHRQYXRoKVxuXHRcdH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuXHRcdFx0aGFuZGxlRXJyb3IoJ3N0YXRlRXJyb3InLCBlcnIpXG5cdFx0fSlcblx0fVxuXHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5tYWtlUGF0aCA9IGZ1bmN0aW9uIG1ha2VQYXRoQW5kUHJlcGVuZEhhc2goc3RhdGVOYW1lLCBwYXJhbWV0ZXJzLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHN0YXRlUm91dGVyT3B0aW9ucy5wYXRoUHJlZml4ICsgbWFrZVBhdGgoc3RhdGVOYW1lLCBwYXJhbWV0ZXJzLCBvcHRpb25zKVxuXHR9XG5cdHN0YXRlUHJvdmlkZXJFbWl0dGVyLnN0YXRlSXNBY3RpdmUgPSBmdW5jdGlvbiBzdGF0ZUlzQWN0aXZlKHN0YXRlTmFtZSwgb3B0cykge1xuXHRcdHZhciBjdXJyZW50U3RhdGUgPSBsYXN0Q29tcGxldGVseUxvYWRlZFN0YXRlLmdldCgpXG5cdFx0cmV0dXJuIChjdXJyZW50U3RhdGUubmFtZSA9PT0gc3RhdGVOYW1lIHx8IGN1cnJlbnRTdGF0ZS5uYW1lLmluZGV4T2Yoc3RhdGVOYW1lICsgJy4nKSA9PT0gMCkgJiYgKHR5cGVvZiBvcHRzID09PSAndW5kZWZpbmVkJyB8fCBPYmplY3Qua2V5cyhvcHRzKS5ldmVyeShmdW5jdGlvbiBtYXRjaGVzKGtleSkge1xuXHRcdFx0cmV0dXJuIG9wdHNba2V5XSA9PT0gY3VycmVudFN0YXRlLnBhcmFtZXRlcnNba2V5XVxuXHRcdH0pKVxuXHR9XG5cblx0dmFyIHJlbmRlcmVyID0gbWFrZVJlbmRlcmVyKHN0YXRlUHJvdmlkZXJFbWl0dGVyKVxuXG5cdGRlc3Ryb3lEb20gPSBkZW5vZGVpZnkocmVuZGVyZXIuZGVzdHJveSlcblx0Z2V0RG9tQ2hpbGQgPSBkZW5vZGVpZnkocmVuZGVyZXIuZ2V0Q2hpbGRFbGVtZW50KVxuXHRyZW5kZXJEb20gPSBkZW5vZGVpZnkocmVuZGVyZXIucmVuZGVyKVxuXHRyZXNldERvbSA9IGRlbm9kZWlmeShyZW5kZXJlci5yZXNldClcblxuXHRyZXR1cm4gc3RhdGVQcm92aWRlckVtaXR0ZXJcbn1cblxuZnVuY3Rpb24gZ2V0Q29udGVudE9iamVjdChzdGF0ZVJlc29sdmVSZXN1bHRzT2JqZWN0LCBzdGF0ZU5hbWUpIHtcblx0dmFyIGFsbFBvc3NpYmxlUmVzb2x2ZWRTdGF0ZU5hbWVzID0gcGFyc2Uoc3RhdGVOYW1lKVxuXG5cdHJldHVybiBhbGxQb3NzaWJsZVJlc29sdmVkU3RhdGVOYW1lcy5maWx0ZXIoZnVuY3Rpb24oc3RhdGVOYW1lKSB7XG5cdFx0cmV0dXJuIHN0YXRlUmVzb2x2ZVJlc3VsdHNPYmplY3Rbc3RhdGVOYW1lXVxuXHR9KS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBzdGF0ZU5hbWUpIHtcblx0XHRyZXR1cm4gZXh0ZW5kKG9iaiwgc3RhdGVSZXNvbHZlUmVzdWx0c09iamVjdFtzdGF0ZU5hbWVdKVxuXHR9LCB7fSlcbn1cblxuZnVuY3Rpb24gcmVkaXJlY3RvcihuZXdTdGF0ZU5hbWUsIHBhcmFtZXRlcnMpIHtcblx0cmV0dXJuIHtcblx0XHRyZWRpcmVjdFRvOiB7XG5cdFx0XHRuYW1lOiBuZXdTdGF0ZU5hbWUsXG5cdFx0XHRwYXJhbXM6IHBhcmFtZXRlcnNcblx0XHR9XG5cdH1cbn1cblxuLy8geyBbc3RhdGVOYW1lXTogcmVzb2x2ZVJlc3VsdCB9XG5mdW5jdGlvbiByZXNvbHZlU3RhdGVzKHN0YXRlcywgcGFyYW1ldGVycykge1xuXHR2YXIgc3RhdGVzV2l0aFJlc29sdmVGdW5jdGlvbnMgPSBzdGF0ZXMuZmlsdGVyKGlzRnVuY3Rpb24oJ3Jlc29sdmUnKSlcblx0dmFyIHN0YXRlTmFtZXNXaXRoUmVzb2x2ZUZ1bmN0aW9ucyA9IHN0YXRlc1dpdGhSZXNvbHZlRnVuY3Rpb25zLm1hcChwcm9wZXJ0eSgnbmFtZScpKVxuXHR2YXIgcmVzb2x2ZXMgPSBQcm9taXNlLmFsbChzdGF0ZXNXaXRoUmVzb2x2ZUZ1bmN0aW9ucy5tYXAoZnVuY3Rpb24oc3RhdGUpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0ZnVuY3Rpb24gcmVzb2x2ZUNiKGVyciwgY29udGVudCkge1xuXHRcdFx0XHRlcnIgPyByZWplY3QoZXJyKSA6IHJlc29sdmUoY29udGVudClcblx0XHRcdH1cblxuXHRcdFx0cmVzb2x2ZUNiLnJlZGlyZWN0ID0gZnVuY3Rpb24gcmVkaXJlY3QobmV3U3RhdGVOYW1lLCBwYXJhbWV0ZXJzKSB7XG5cdFx0XHRcdHJlamVjdChyZWRpcmVjdG9yKG5ld1N0YXRlTmFtZSwgcGFyYW1ldGVycykpXG5cdFx0XHR9XG5cblx0XHRcdHZhciByZXMgPSBzdGF0ZS5yZXNvbHZlKHN0YXRlLmRhdGEsIHBhcmFtZXRlcnMsIHJlc29sdmVDYilcblx0XHRcdGlmIChyZXMgJiYgKHR5cGVvZiByZXMgPT09ICdvYmplY3QnIHx8IHR5cGVvZiByZXMgPT09ICdmdW5jdGlvbicpICYmIHR5cGVvZiByZXMudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0XHRyZXNvbHZlKHJlcylcblx0XHRcdH1cblx0XHR9KVxuXHR9KSlcblxuXHRyZXR1cm4gcmVzb2x2ZXMudGhlbihmdW5jdGlvbihyZXNvbHZlUmVzdWx0cykge1xuXHRcdHJldHVybiBjb21iaW5lKHtcblx0XHRcdHN0YXRlTmFtZTogc3RhdGVOYW1lc1dpdGhSZXNvbHZlRnVuY3Rpb25zLFxuXHRcdFx0cmVzb2x2ZVJlc3VsdDogcmVzb2x2ZVJlc3VsdHNcblx0XHR9KS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCByZXN1bHQpIHtcblx0XHRcdG9ialtyZXN1bHQuc3RhdGVOYW1lXSA9IHJlc3VsdC5yZXNvbHZlUmVzdWx0XG5cdFx0XHRyZXR1cm4gb2JqXG5cdFx0fSwge30pXG5cdH0pXG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5KG5hbWUpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuXHRcdHJldHVybiBvYmpbbmFtZV1cblx0fVxufVxuXG5mdW5jdGlvbiByZXZlcnNlKGFyeSkge1xuXHRyZXR1cm4gYXJ5LnNsaWNlKCkucmV2ZXJzZSgpXG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24ocHJvcGVydHkpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuXHRcdHJldHVybiB0eXBlb2Ygb2JqW3Byb3BlcnR5XSA9PT0gJ2Z1bmN0aW9uJ1xuXHR9XG59XG5cbmZ1bmN0aW9uIHByb21pc2VNZSgpIHtcblx0dmFyIGZuID0gQXJyYXkucHJvdG90eXBlLnNoaWZ0LmFwcGx5KGFyZ3VtZW50cylcblx0dmFyIGFyZ3MgPSBhcmd1bWVudHNcblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcblx0XHRyZXNvbHZlKGZuLmFwcGx5KG51bGwsIGFyZ3MpKVxuXHR9KVxufVxuIl19
},{"./default-router-options.js":6,"./lib/current-state":8,"./lib/promise-map-series":9,"./lib/state-change-logic":10,"./lib/state-comparison":11,"./lib/state-state":12,"./lib/state-string-parser":13,"./lib/state-transition-manager":14,"_process":2,"combine-arrays":15,"events":1,"hash-brown-router":17,"native-promise-only/npo":19,"page-path-builder":20,"then-denodeify":24,"xtend":25}],8:[function(require,module,exports){
  module.exports = function CurrentState() {
    var current = {
      name: '',
      parameters: {}
    }

    return {
      get: function() {
        return current
      },
      set: function(name, parameters) {
        current = {
          name: name,
          parameters: parameters
        }
      }
    }
  }

},{}],9:[function(require,module,exports){
// Pulled from https://github.com/joliss/promise-map-series and prettied up a bit

  var Promise = require('native-promise-only/npo')

  module.exports = function sequence(array, iterator, thisArg) {
    var current = Promise.resolve()
    var cb = arguments.length > 2 ? iterator.bind(thisArg) : iterator

    var results = array.map(function(value, i) {
      return current = current.then(function(j) {
        return cb(value, j, array)
      }.bind(null, i))
    })

    return Promise.all(results)
  }

},{"native-promise-only/npo":19}],10:[function(require,module,exports){
  module.exports = function stateChangeLogic(stateComparisonResults) {
    var hitChangingState = false
    var hitDestroyedState = false

    var output = {
      destroy: [],
      change: [],
      create: []
    }

    stateComparisonResults.forEach(function(state) {
      hitChangingState = hitChangingState || state.stateParametersChanged
      hitDestroyedState = hitDestroyedState || state.stateNameChanged

      if (state.nameBefore) {
        if (hitDestroyedState) {
          output.destroy.push(state.nameBefore)
        } else if (hitChangingState) {
          output.change.push(state.nameBefore)
        }
      }

      if (state.nameAfter && hitDestroyedState) {
        output.create.push(state.nameAfter)
      }
    })

    return output
  }

},{}],11:[function(require,module,exports){
  var stateStringParser = require('./state-string-parser')
  var combine = require('combine-arrays')
  var pathToRegexp = require('path-to-regexp-with-reversible-keys')

  module.exports = function StateComparison(stateState) {
    var getPathParameters = pathParameters()

    var parametersChanged = parametersThatMatterWereChanged.bind(null, stateState, getPathParameters)

    return stateComparison.bind(null, parametersChanged)
  }

  function pathParameters() {
    var parameters = {}

    return function getPathParameters(path) {
      if (!path) {
        return []
      }

      if (!parameters[path]) {
        parameters[path] = pathToRegexp(path).keys.map(function(key) {
          return key.name
        })
      }

      return parameters[path]
    }
  }

  function parametersThatMatterWereChanged(stateState, getPathParameters, stateName, fromParameters, toParameters) {
    var state = stateState.get(stateName)
    var querystringParameters = state.querystringParameters || []
    var parameters = getPathParameters(state.route).concat(querystringParameters)

    return Array.isArray(parameters) && parameters.some(function(key) {
        return fromParameters[key] !== toParameters[key]
      })
  }

  function stateComparison(parametersChanged, originalState, originalParameters, newState, newParameters) {
    var states = combine({
      start: stateStringParser(originalState),
      end: stateStringParser(newState)
    })

    return states.map(function(states) {
      return {
        nameBefore: states.start,
        nameAfter: states.end,
        stateNameChanged: states.start !== states.end,
        stateParametersChanged: states.start === states.end && parametersChanged(states.start, originalParameters, newParameters)
      }
    })
  }

},{"./state-string-parser":13,"combine-arrays":15,"path-to-regexp-with-reversible-keys":22}],12:[function(require,module,exports){
  var stateStringParser = require('./state-string-parser')
  var parse = require('./state-string-parser')

  module.exports = function StateState() {
    var states = {}

    function getHierarchy(name) {
      var names = stateStringParser(name)

      return names.map(function(name) {
        if (!states[name]) {
          throw new Error('State ' + name + ' not found')
        }
        return states[name]
      })
    }

    function getParent(name) {
      var parentName = getParentName(name)

      return parentName && states[parentName]
    }

    function getParentName(name) {
      var names = stateStringParser(name)

      if (names.length > 1) {
        var secondToLast = names.length - 2

        return names[secondToLast]
      } else {
        return null
      }
    }

    function guaranteeAllStatesExist(newStateName) {
      var stateNames = parse(newStateName)
      var statesThatDontExist = stateNames.filter(function(name) {
        return !states[name]
      })

      if (statesThatDontExist.length > 0) {
        throw new Error('State ' + statesThatDontExist[statesThatDontExist.length - 1] + ' does not exist')
      }
    }

    function buildFullStateRoute(stateName) {
      return getHierarchy(stateName).map(function(state) {
        return '/' + (state.route || '')
      }).join('').replace(/\/{2,}/g, '/')
    }

    function applyDefaultChildStates(stateName) {
      var state = states[stateName]

      function getDefaultChildStateName() {
        return state && (typeof state.defaultChild === 'function'
            ? state.defaultChild()
            : state.defaultChild)
      }

      var defaultChildStateName = getDefaultChildStateName()

      if (!defaultChildStateName) {
        return stateName
      }

      var fullStateName = stateName + '.' + defaultChildStateName

      return applyDefaultChildStates(fullStateName)
    }


    return {
      add: function(name, state) {
        states[name] = state
      },
      get: function(name) {
        return name && states[name]
      },
      getHierarchy: getHierarchy,
      getParent: getParent,
      getParentName: getParentName,
      guaranteeAllStatesExist: guaranteeAllStatesExist,
      buildFullStateRoute: buildFullStateRoute,
      applyDefaultChildStates: applyDefaultChildStates
    }
  }

},{"./state-string-parser":13}],13:[function(require,module,exports){
  module.exports = function(stateString) {
    return stateString.split('.').reduce(function(stateNames, latestNameChunk) {
      if (stateNames.length) {
        latestNameChunk = stateNames[stateNames.length - 1] + '.' + latestNameChunk
      }
      stateNames.push(latestNameChunk)
      return stateNames
    }, [])
  }

},{}],14:[function(require,module,exports){
  module.exports = function (emitter) {
    var currentTransitionAttempt = null
    var nextTransition = null

    function doneTransitioning() {
      currentTransitionAttempt = null
      if (nextTransition) {
        beginNextTransitionAttempt()
      }
    }

    function isTransitioning() {
      return !!currentTransitionAttempt
    }

    function beginNextTransitionAttempt() {
      currentTransitionAttempt = nextTransition
      nextTransition = null
      currentTransitionAttempt.beginStateChange()
    }

    function cancelCurrentTransition() {
      currentTransitionAttempt.transition.cancelled = true
      var err = new Error('State transition cancelled by the state transition manager')
      err.wasCancelledBySomeoneElse = true
      emitter.emit('stateChangeCancelled', err)
    }

    emitter.on('stateChangeAttempt', function(beginStateChange) {
      nextTransition = createStateTransitionAttempt(beginStateChange)

      if (isTransitioning() && currentTransitionAttempt.transition.cancellable) {
        cancelCurrentTransition()
      } else if (!isTransitioning()) {
        beginNextTransitionAttempt()
      }
    })

    emitter.on('stateChangeError', doneTransitioning)
    emitter.on('stateChangeCancelled', doneTransitioning)
    emitter.on('stateChangeEnd', doneTransitioning)

    function createStateTransitionAttempt(beginStateChange) {
      var transition = {
        cancelled: false,
        cancellable: true
      }
      return {
        transition: transition,
        beginStateChange: beginStateChange.bind(null, transition)
      }
    }
  }

},{}],15:[function(require,module,exports){
  module.exports = function(obj) {
    var keys = Object.keys(obj)

    keys.forEach(function(key) {
      if (!Array.isArray(obj[key])) {
        throw new Error(key + ' is not an array')
      }
    })

    var maxIndex = keys.reduce(function(maxSoFar, key) {
      var len = obj[key].length
      return maxSoFar > len ? maxSoFar : len
    }, 0)

    var output = []

    function getObject(index) {
      var o = {}
      keys.forEach(function(key) {
        o[key] = obj[key][index]
      })
      return o
    }

    for (var i = 0; i < maxIndex; ++i) {
      output.push(getObject(i))
    }

    return output
  }

},{}],16:[function(require,module,exports){
  var EventEmitter = require('events').EventEmitter

  module.exports = function HashLocation(window) {
    var emitter = new EventEmitter()
    var last = ''
    var needToDecode = getNeedToDecode()

    window.addEventListener('hashchange', function() {
      if (last !== emitter.get()) {
        last = emitter.get()
        emitter.emit('hashchange')
      }
    })

    emitter.go = go.bind(null, window)
    emitter.replace = replace.bind(null, window)
    emitter.get = get.bind(null, window, needToDecode)

    return emitter
  }

  function replace(window, newPath) {
    window.location.replace(everythingBeforeTheSlash(window.location.href) + '#' + newPath)
  }

  function everythingBeforeTheSlash(url) {
    var hashIndex = url.indexOf('#')
    return hashIndex === -1 ? url : url.substring(0, hashIndex)
  }

  function go(window, newPath) {
    window.location.hash = newPath
  }

  function get(window, needToDecode) {
    var hash = removeHashFromPath(window.location.hash)
    return needToDecode ? decodeURI(hash) : hash
  }

  function removeHashFromPath(path) {
    return (path && path[0] === '#') ? path.substr(1) : path
  }

  function getNeedToDecode() {
    var a = document.createElement('a')
    a.href = '#x x'
    return !/x x/.test(a.hash)
  }

},{"events":1}],17:[function(require,module,exports){
  var pathToRegexp = require('path-to-regexp-with-reversible-keys')
  var qs = require('querystring')
  var xtend = require('xtend')
  var browserHashLocation = require('./hash-location.js')
  require('array.prototype.find')

  module.exports = function Router(opts, hashLocation) {
    if (isHashLocation(opts)) {
      hashLocation = opts
      opts = null
    }

    opts = opts || {}

    if (!hashLocation) {
      hashLocation = browserHashLocation(window)
    }

    var routes = []

    var onHashChange = evaluateCurrentPath.bind(null, routes, hashLocation, !!opts.reverse)

    hashLocation.on('hashchange', onHashChange)

    function stop() {
      hashLocation.removeListener('hashchange', onHashChange)
    }

    return {
      add: add.bind(null, routes),
      stop: stop,
      evaluateCurrent: evaluateCurrentPathOrGoToDefault.bind(null, routes, hashLocation, !!opts.reverse),
      setDefault: setDefault.bind(null, routes),
      replace: hashLocation.replace,
      go: hashLocation.go,
      location: hashLocation
    }
  }

  function evaluateCurrentPath(routes, hashLocation, reverse) {
    evaluatePath(routes, hashLocation.get(), reverse)
  }

  function getPathParts(path) {
    var chunks = path.split('?')
    return {
      path: chunks.shift(),
      queryString: qs.parse(chunks.join(''))
    }
  }

  function evaluatePath(routes, path, reverse) {
    var pathParts = getPathParts(path)
    path = pathParts.path
    var queryStringParameters = pathParts.queryString

    var matchingRoute = (reverse ? reverseArray(routes) : routes).find("".match, path)

    if (matchingRoute) {
      var regexResult = matchingRoute.exec(path)
      var routeParameters = makeParametersObjectFromRegexResult(matchingRoute.keys, regexResult)
      var params = xtend(queryStringParameters, routeParameters)
      matchingRoute.fn(params)
    } else if (routes.defaultFn) {
      routes.defaultFn(path, queryStringParameters)
    }
  }

  function reverseArray(ary) {
    return ary.slice().reverse()
  }

  function makeParametersObjectFromRegexResult(keys, regexResult) {
    return keys.reduce(function(memo, urlKey, index) {
      memo[urlKey.name] = regexResult[index + 1]
      return memo
    }, {})
  }

  function add(routes, routeString, routeFunction) {
    if (typeof routeFunction !== 'function') {
      throw new Error('The router add function must be passed a callback function')
    }
    var newRoute = pathToRegexp(routeString)
    newRoute.fn = routeFunction
    routes.push(newRoute)
  }

  function evaluateCurrentPathOrGoToDefault(routes, hashLocation, reverse, defaultPath) {
    if (hashLocation.get()) {
      var routesCopy = routes.slice()
      routesCopy.defaultFn = function() {
        hashLocation.go(defaultPath)
      }
      evaluateCurrentPath(routesCopy, hashLocation, reverse)
    } else {
      hashLocation.go(defaultPath)
    }
  }

  function setDefault(routes, defaultFn) {
    routes.defaultFn = defaultFn
  }

  function isHashLocation(hashLocation) {
    return hashLocation && hashLocation.go && hashLocation.replace && hashLocation.on
  }
},{"./hash-location.js":16,"array.prototype.find":18,"path-to-regexp-with-reversible-keys":22,"querystring":5,"xtend":25}],18:[function(require,module,exports){
// Array.prototype.find - MIT License (c) 2013 Paul Miller <http://paulmillr.com>
// For all details and docs: https://github.com/paulmillr/array.prototype.find
// Fixes and tests supplied by Duncan Hall <http://duncanhall.net>
  (function(globals){
    if (Array.prototype.find) return;

    var find = function(predicate) {
      var list = Object(this);
      var length = list.length < 0 ? 0 : list.length >>> 0; // ES.ToUint32;
      if (length === 0) return undefined;
      if (typeof predicate !== 'function' || Object.prototype.toString.call(predicate) !== '[object Function]') {
        throw new TypeError('Array#find: predicate must be a function');
      }
      var thisArg = arguments[1];
      for (var i = 0, value; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) return value;
      }
      return undefined;
    };

    if (Object.defineProperty) {
      try {
        Object.defineProperty(Array.prototype, 'find', {
          value: find, configurable: true, enumerable: false, writable: true
        });
      } catch(e) {}
    }

    if (!Array.prototype.find) {
      Array.prototype.find = find;
    }
  })(this);

},{}],19:[function(require,module,exports){
  (function (global){
    /*! Native Promise Only
     v0.8.1 (c) Kyle Simpson
     MIT License: http://getify.mit-license.org
     */
    !function(t,n,e){n[t]=n[t]||e(),"undefined"!=typeof module&&module.exports?module.exports=n[t]:"function"==typeof define&&define.amd&&define(function(){return n[t]})}("Promise","undefined"!=typeof global?global:this,function(){"use strict";function t(t,n){l.add(t,n),h||(h=y(l.drain))}function n(t){var n,e=typeof t;return null==t||"object"!=e&&"function"!=e||(n=t.then),"function"==typeof n?n:!1}function e(){for(var t=0;t<this.chain.length;t++)o(this,1===this.state?this.chain[t].success:this.chain[t].failure,this.chain[t]);this.chain.length=0}function o(t,e,o){var r,i;try{e===!1?o.reject(t.msg):(r=e===!0?t.msg:e.call(void 0,t.msg),r===o.promise?o.reject(TypeError("Promise-chain cycle")):(i=n(r))?i.call(r,o.resolve,o.reject):o.resolve(r))}catch(c){o.reject(c)}}function r(o){var c,u=this;if(!u.triggered){u.triggered=!0,u.def&&(u=u.def);try{(c=n(o))?t(function(){var t=new f(u);try{c.call(o,function(){r.apply(t,arguments)},function(){i.apply(t,arguments)})}catch(n){i.call(t,n)}}):(u.msg=o,u.state=1,u.chain.length>0&&t(e,u))}catch(a){i.call(new f(u),a)}}}function i(n){var o=this;o.triggered||(o.triggered=!0,o.def&&(o=o.def),o.msg=n,o.state=2,o.chain.length>0&&t(e,o))}function c(t,n,e,o){for(var r=0;r<n.length;r++)!function(r){t.resolve(n[r]).then(function(t){e(r,t)},o)}(r)}function f(t){this.def=t,this.triggered=!1}function u(t){this.promise=t,this.state=0,this.triggered=!1,this.chain=[],this.msg=void 0}function a(n){if("function"!=typeof n)throw TypeError("Not a function");if(0!==this.__NPO__)throw TypeError("Not a promise");this.__NPO__=1;var o=new u(this);this.then=function(n,r){var i={success:"function"==typeof n?n:!0,failure:"function"==typeof r?r:!1};return i.promise=new this.constructor(function(t,n){if("function"!=typeof t||"function"!=typeof n)throw TypeError("Not a function");i.resolve=t,i.reject=n}),o.chain.push(i),0!==o.state&&t(e,o),i.promise},this["catch"]=function(t){return this.then(void 0,t)};try{n.call(void 0,function(t){r.call(o,t)},function(t){i.call(o,t)})}catch(c){i.call(o,c)}}var s,h,l,p=Object.prototype.toString,y="undefined"!=typeof setImmediate?function(t){return setImmediate(t)}:setTimeout;try{Object.defineProperty({},"x",{}),s=function(t,n,e,o){return Object.defineProperty(t,n,{value:e,writable:!0,configurable:o!==!1})}}catch(d){s=function(t,n,e){return t[n]=e,t}}l=function(){function t(t,n){this.fn=t,this.self=n,this.next=void 0}var n,e,o;return{add:function(r,i){o=new t(r,i),e?e.next=o:n=o,e=o,o=void 0},drain:function(){var t=n;for(n=e=h=void 0;t;)t.fn.call(t.self),t=t.next}}}();var g=s({},"constructor",a,!1);return a.prototype=g,s(g,"__NPO__",0,!1),s(a,"resolve",function(t){var n=this;return t&&"object"==typeof t&&1===t.__NPO__?t:new n(function(n,e){if("function"!=typeof n||"function"!=typeof e)throw TypeError("Not a function");n(t)})}),s(a,"reject",function(t){return new this(function(n,e){if("function"!=typeof n||"function"!=typeof e)throw TypeError("Not a function");e(t)})}),s(a,"all",function(t){var n=this;return"[object Array]"!=p.call(t)?n.reject(TypeError("Not an array")):0===t.length?n.resolve([]):new n(function(e,o){if("function"!=typeof e||"function"!=typeof o)throw TypeError("Not a function");var r=t.length,i=Array(r),f=0;c(n,t,function(t,n){i[t]=n,++f===r&&e(i)},o)})}),s(a,"race",function(t){var n=this;return"[object Array]"!=p.call(t)?n.reject(TypeError("Not an array")):new n(function(e,o){if("function"!=typeof e||"function"!=typeof o)throw TypeError("Not a function");c(n,t,function(t,n){e(n)},o)})}),a});

  }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9uYXRpdmUtcHJvbWlzZS1vbmx5L25wby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIvKiEgTmF0aXZlIFByb21pc2UgT25seVxuICAgIHYwLjguMSAoYykgS3lsZSBTaW1wc29uXG4gICAgTUlUIExpY2Vuc2U6IGh0dHA6Ly9nZXRpZnkubWl0LWxpY2Vuc2Uub3JnXG4qL1xuIWZ1bmN0aW9uKHQsbixlKXtuW3RdPW5bdF18fGUoKSxcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1uW3RdOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZCYmZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIG5bdF19KX0oXCJQcm9taXNlXCIsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9nbG9iYWw6dGhpcyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHQodCxuKXtsLmFkZCh0LG4pLGh8fChoPXkobC5kcmFpbikpfWZ1bmN0aW9uIG4odCl7dmFyIG4sZT10eXBlb2YgdDtyZXR1cm4gbnVsbD09dHx8XCJvYmplY3RcIiE9ZSYmXCJmdW5jdGlvblwiIT1lfHwobj10LnRoZW4pLFwiZnVuY3Rpb25cIj09dHlwZW9mIG4/bjohMX1mdW5jdGlvbiBlKCl7Zm9yKHZhciB0PTA7dDx0aGlzLmNoYWluLmxlbmd0aDt0Kyspbyh0aGlzLDE9PT10aGlzLnN0YXRlP3RoaXMuY2hhaW5bdF0uc3VjY2Vzczp0aGlzLmNoYWluW3RdLmZhaWx1cmUsdGhpcy5jaGFpblt0XSk7dGhpcy5jaGFpbi5sZW5ndGg9MH1mdW5jdGlvbiBvKHQsZSxvKXt2YXIgcixpO3RyeXtlPT09ITE/by5yZWplY3QodC5tc2cpOihyPWU9PT0hMD90Lm1zZzplLmNhbGwodm9pZCAwLHQubXNnKSxyPT09by5wcm9taXNlP28ucmVqZWN0KFR5cGVFcnJvcihcIlByb21pc2UtY2hhaW4gY3ljbGVcIikpOihpPW4ocikpP2kuY2FsbChyLG8ucmVzb2x2ZSxvLnJlamVjdCk6by5yZXNvbHZlKHIpKX1jYXRjaChjKXtvLnJlamVjdChjKX19ZnVuY3Rpb24gcihvKXt2YXIgYyx1PXRoaXM7aWYoIXUudHJpZ2dlcmVkKXt1LnRyaWdnZXJlZD0hMCx1LmRlZiYmKHU9dS5kZWYpO3RyeXsoYz1uKG8pKT90KGZ1bmN0aW9uKCl7dmFyIHQ9bmV3IGYodSk7dHJ5e2MuY2FsbChvLGZ1bmN0aW9uKCl7ci5hcHBseSh0LGFyZ3VtZW50cyl9LGZ1bmN0aW9uKCl7aS5hcHBseSh0LGFyZ3VtZW50cyl9KX1jYXRjaChuKXtpLmNhbGwodCxuKX19KToodS5tc2c9byx1LnN0YXRlPTEsdS5jaGFpbi5sZW5ndGg+MCYmdChlLHUpKX1jYXRjaChhKXtpLmNhbGwobmV3IGYodSksYSl9fX1mdW5jdGlvbiBpKG4pe3ZhciBvPXRoaXM7by50cmlnZ2VyZWR8fChvLnRyaWdnZXJlZD0hMCxvLmRlZiYmKG89by5kZWYpLG8ubXNnPW4sby5zdGF0ZT0yLG8uY2hhaW4ubGVuZ3RoPjAmJnQoZSxvKSl9ZnVuY3Rpb24gYyh0LG4sZSxvKXtmb3IodmFyIHI9MDtyPG4ubGVuZ3RoO3IrKykhZnVuY3Rpb24ocil7dC5yZXNvbHZlKG5bcl0pLnRoZW4oZnVuY3Rpb24odCl7ZShyLHQpfSxvKX0ocil9ZnVuY3Rpb24gZih0KXt0aGlzLmRlZj10LHRoaXMudHJpZ2dlcmVkPSExfWZ1bmN0aW9uIHUodCl7dGhpcy5wcm9taXNlPXQsdGhpcy5zdGF0ZT0wLHRoaXMudHJpZ2dlcmVkPSExLHRoaXMuY2hhaW49W10sdGhpcy5tc2c9dm9pZCAwfWZ1bmN0aW9uIGEobil7aWYoXCJmdW5jdGlvblwiIT10eXBlb2Ygbil0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtpZigwIT09dGhpcy5fX05QT19fKXRocm93IFR5cGVFcnJvcihcIk5vdCBhIHByb21pc2VcIik7dGhpcy5fX05QT19fPTE7dmFyIG89bmV3IHUodGhpcyk7dGhpcy50aGVuPWZ1bmN0aW9uKG4scil7dmFyIGk9e3N1Y2Nlc3M6XCJmdW5jdGlvblwiPT10eXBlb2Ygbj9uOiEwLGZhaWx1cmU6XCJmdW5jdGlvblwiPT10eXBlb2Ygcj9yOiExfTtyZXR1cm4gaS5wcm9taXNlPW5ldyB0aGlzLmNvbnN0cnVjdG9yKGZ1bmN0aW9uKHQsbil7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdHx8XCJmdW5jdGlvblwiIT10eXBlb2Ygbil0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtpLnJlc29sdmU9dCxpLnJlamVjdD1ufSksby5jaGFpbi5wdXNoKGkpLDAhPT1vLnN0YXRlJiZ0KGUsbyksaS5wcm9taXNlfSx0aGlzW1wiY2F0Y2hcIl09ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMudGhlbih2b2lkIDAsdCl9O3RyeXtuLmNhbGwodm9pZCAwLGZ1bmN0aW9uKHQpe3IuY2FsbChvLHQpfSxmdW5jdGlvbih0KXtpLmNhbGwobyx0KX0pfWNhdGNoKGMpe2kuY2FsbChvLGMpfX12YXIgcyxoLGwscD1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLHk9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNldEltbWVkaWF0ZT9mdW5jdGlvbih0KXtyZXR1cm4gc2V0SW1tZWRpYXRlKHQpfTpzZXRUaW1lb3V0O3RyeXtPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sXCJ4XCIse30pLHM9ZnVuY3Rpb24odCxuLGUsbyl7cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LG4se3ZhbHVlOmUsd3JpdGFibGU6ITAsY29uZmlndXJhYmxlOm8hPT0hMX0pfX1jYXRjaChkKXtzPWZ1bmN0aW9uKHQsbixlKXtyZXR1cm4gdFtuXT1lLHR9fWw9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQsbil7dGhpcy5mbj10LHRoaXMuc2VsZj1uLHRoaXMubmV4dD12b2lkIDB9dmFyIG4sZSxvO3JldHVybnthZGQ6ZnVuY3Rpb24ocixpKXtvPW5ldyB0KHIsaSksZT9lLm5leHQ9bzpuPW8sZT1vLG89dm9pZCAwfSxkcmFpbjpmdW5jdGlvbigpe3ZhciB0PW47Zm9yKG49ZT1oPXZvaWQgMDt0Oyl0LmZuLmNhbGwodC5zZWxmKSx0PXQubmV4dH19fSgpO3ZhciBnPXMoe30sXCJjb25zdHJ1Y3RvclwiLGEsITEpO3JldHVybiBhLnByb3RvdHlwZT1nLHMoZyxcIl9fTlBPX19cIiwwLCExKSxzKGEsXCJyZXNvbHZlXCIsZnVuY3Rpb24odCl7dmFyIG49dGhpcztyZXR1cm4gdCYmXCJvYmplY3RcIj09dHlwZW9mIHQmJjE9PT10Ll9fTlBPX18/dDpuZXcgbihmdW5jdGlvbihuLGUpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIG58fFwiZnVuY3Rpb25cIiE9dHlwZW9mIGUpdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7bih0KX0pfSkscyhhLFwicmVqZWN0XCIsZnVuY3Rpb24odCl7cmV0dXJuIG5ldyB0aGlzKGZ1bmN0aW9uKG4sZSl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2Ygbnx8XCJmdW5jdGlvblwiIT10eXBlb2YgZSl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtlKHQpfSl9KSxzKGEsXCJhbGxcIixmdW5jdGlvbih0KXt2YXIgbj10aGlzO3JldHVyblwiW29iamVjdCBBcnJheV1cIiE9cC5jYWxsKHQpP24ucmVqZWN0KFR5cGVFcnJvcihcIk5vdCBhbiBhcnJheVwiKSk6MD09PXQubGVuZ3RoP24ucmVzb2x2ZShbXSk6bmV3IG4oZnVuY3Rpb24oZSxvKXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBlfHxcImZ1bmN0aW9uXCIhPXR5cGVvZiBvKXRocm93IFR5cGVFcnJvcihcIk5vdCBhIGZ1bmN0aW9uXCIpO3ZhciByPXQubGVuZ3RoLGk9QXJyYXkociksZj0wO2Mobix0LGZ1bmN0aW9uKHQsbil7aVt0XT1uLCsrZj09PXImJmUoaSl9LG8pfSl9KSxzKGEsXCJyYWNlXCIsZnVuY3Rpb24odCl7dmFyIG49dGhpcztyZXR1cm5cIltvYmplY3QgQXJyYXldXCIhPXAuY2FsbCh0KT9uLnJlamVjdChUeXBlRXJyb3IoXCJOb3QgYW4gYXJyYXlcIikpOm5ldyBuKGZ1bmN0aW9uKGUsbyl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZXx8XCJmdW5jdGlvblwiIT10eXBlb2Ygbyl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtjKG4sdCxmdW5jdGlvbih0LG4pe2Uobil9LG8pfSl9KSxhfSk7XG4iXX0=
},{}],20:[function(require,module,exports){
  var parser = require('./path-parser')
  var stringifyQuerystring = require('querystring').stringify

  module.exports = function(pathStr, parameters) {

    var parsed = typeof pathStr === 'string' ? parser(pathStr) : pathStr
    var allTokens = parsed.allTokens
    var regex = parsed.regex

    if (parameters) {
      var path = allTokens.map(function(bit) {
        if (bit.string) {
          return bit.string
        }

        var defined = typeof parameters[bit.name] !== 'undefined'
        if (!bit.optional && !defined) {
          throw new Error('Must supply argument ' + bit.name + ' for path ' + pathStr)
        }

        return defined ? (bit.delimiter + encodeURIComponent(parameters[bit.name])) : ''
      }).join('')

      if (!regex.test(path)) {
        throw new Error('Provided arguments do not match the original arguments')
      }

      return buildPathWithQuerystring(path, parameters, allTokens)
    } else {
      return parsed
    }
  }

  function buildPathWithQuerystring(path, parameters, tokenArray) {
    var parametersInQuerystring = getParametersWithoutMatchingToken(parameters, tokenArray)

    if (Object.keys(parametersInQuerystring).length === 0) {
      return path
    }

    return path + '?' + stringifyQuerystring(parametersInQuerystring)
  }

  function getParametersWithoutMatchingToken(parameters, tokenArray) {
    var tokenHash = tokenArray.reduce(function(memo, bit) {
      if (!bit.string) {
        memo[bit.name] = bit
      }
      return memo
    }, {})

    return Object.keys(parameters).filter(function(param) {
      return !tokenHash[param]
    }).reduce(function(newParameters, param) {
      newParameters[param] = parameters[param]
      return newParameters
    }, {})
  }

},{"./path-parser":21,"querystring":5}],21:[function(require,module,exports){
// This file to be replaced with an official implementation maintained by
// the page.js crew if and when that becomes an option

  var pathToRegexp = require('path-to-regexp-with-reversible-keys')

  module.exports = function(pathString) {
    var parseResults = pathToRegexp(pathString)

    // The only reason I'm returning a new object instead of the results of the pathToRegexp
    // function is so that if the official implementation ends up returning an
    // allTokens-style array via some other mechanism, I may be able to change this file
    // without having to change the rest of the module in index.js
    return {
      regex: parseResults,
      allTokens: parseResults.allTokens
    }
  }

},{"path-to-regexp-with-reversible-keys":22}],22:[function(require,module,exports){
  var isArray = require('isarray');

  /**
   * Expose `pathToRegexp`.
   */
  module.exports = pathToRegexp;

  /**
   * The main path matching regexp utility.
   *
   * @type {RegExp}
   */
  var PATH_REGEXP = new RegExp([
    // Match escaped characters that would otherwise appear in future matches.
    // This allows the user to escape special characters that won't transform.
    '(\\\\.)',
    // Match Express-style parameters and un-named parameters with a prefix
    // and optional suffixes. Matches appear as:
    //
    // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?"]
    // "/route(\\d+)" => [undefined, undefined, undefined, "\d+", undefined]
    '([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))([+*?])?',
    // Match regexp special characters that are always escaped.
    '([.+*?=^!:${}()[\\]|\\/])'
  ].join('|'), 'g');

  /**
   * Escape the capturing group by escaping special characters and meaning.
   *
   * @param  {String} group
   * @return {String}
   */
  function escapeGroup (group) {
    return group.replace(/([=!:$\/()])/g, '\\$1');
  }

  /**
   * Attach the keys as a property of the regexp.
   *
   * @param  {RegExp} re
   * @param  {Array}  keys
   * @return {RegExp}
   */
  function attachKeys (re, keys, allTokens) {
    re.keys = keys;
    re.allTokens = allTokens;
    return re;
  }

  /**
   * Get the flags for a regexp from the options.
   *
   * @param  {Object} options
   * @return {String}
   */
  function flags (options) {
    return options.sensitive ? '' : 'i';
  }

  /**
   * Pull out keys from a regexp.
   *
   * @param  {RegExp} path
   * @param  {Array}  keys
   * @return {RegExp}
   */
  function regexpToRegexp (path, keys, allTokens) {
    // Use a negative lookahead to match only capturing groups.
    var groups = path.source.match(/\((?!\?)/g);

    if (groups) {
      for (var i = 0; i < groups.length; i++) {
        keys.push({
          name:      i,
          delimiter: null,
          optional:  false,
          repeat:    false
        });
      }
    }

    return attachKeys(path, keys, allTokens);
  }

  /**
   * Transform an array into a regexp.
   *
   * @param  {Array}  path
   * @param  {Array}  keys
   * @param  {Object} options
   * @return {RegExp}
   */
  function arrayToRegexp (path, keys, options, allTokens) {
    var parts = [];

    for (var i = 0; i < path.length; i++) {
      parts.push(pathToRegexp(path[i], keys, options, allTokens).source);
    }

    var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));
    return attachKeys(regexp, keys, allTokens);
  }

  /**
   * Replace the specific tags with regexp strings.
   *
   * @param  {String} path
   * @param  {Array}  keys
   * @return {String}
   */
  function replacePath (path, keys, allTokens) {
    var index = 0;
    var lastEndIndex = 0

    function addLastToken(lastToken) {
      if (lastEndIndex === 0 && lastToken[0] !== '/') {
        lastToken = '/' + lastToken
      }
      allTokens.push({
        string: lastToken
      });
    }


    function replace (match, escaped, prefix, key, capture, group, suffix, escape, offset) {
      if (escaped) {
        return escaped;
      }

      if (escape) {
        return '\\' + escape;
      }

      var repeat   = suffix === '+' || suffix === '*';
      var optional = suffix === '?' || suffix === '*';

      if (offset > lastEndIndex) {
        addLastToken(path.substring(lastEndIndex, offset));
      }

      lastEndIndex = offset + match.length;

      var newKey = {
        name:      key || index++,
        delimiter: prefix || '/',
        optional:  optional,
        repeat:    repeat
      }

      keys.push(newKey);
      allTokens.push(newKey);

      prefix = prefix ? ('\\' + prefix) : '';
      capture = escapeGroup(capture || group || '[^' + (prefix || '\\/') + ']+?');

      if (repeat) {
        capture = capture + '(?:' + prefix + capture + ')*';
      }

      if (optional) {
        return '(?:' + prefix + '(' + capture + '))?';
      }

      // Basic parameter support.
      return prefix + '(' + capture + ')';
    }

    var newPath = path.replace(PATH_REGEXP, replace);

    if (lastEndIndex < path.length) {
      addLastToken(path.substring(lastEndIndex))
    }

    return newPath;
  }

  /**
   * Normalize the given path string, returning a regular expression.
   *
   * An empty array can be passed in for the keys, which will hold the
   * placeholder key descriptions. For example, using `/user/:id`, `keys` will
   * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
   *
   * @param  {(String|RegExp|Array)} path
   * @param  {Array}                 [keys]
   * @param  {Object}                [options]
   * @return {RegExp}
   */
  function pathToRegexp (path, keys, options, allTokens) {
    keys = keys || [];
    allTokens = allTokens || [];

    if (!isArray(keys)) {
      options = keys;
      keys = [];
    } else if (!options) {
      options = {};
    }

    if (path instanceof RegExp) {
      return regexpToRegexp(path, keys, options, allTokens);
    }

    if (isArray(path)) {
      return arrayToRegexp(path, keys, options, allTokens);
    }

    var strict = options.strict;
    var end = options.end !== false;
    var route = replacePath(path, keys, allTokens);
    var endsWithSlash = path.charAt(path.length - 1) === '/';

    // In non-strict mode we allow a slash at the end of match. If the path to
    // match already ends with a slash, we remove it for consistency. The slash
    // is valid at the end of a path match, not in the middle. This is important
    // in non-ending mode, where "/test/" shouldn't match "/test//route".
    if (!strict) {
      route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
    }

    if (end) {
      route += '$';
    } else {
      // In non-ending mode, we need the capturing groups to match as much as
      // possible by using a positive lookahead to the end or next path segment.
      route += strict && endsWithSlash ? '' : '(?=\\/|$)';
    }

    return attachKeys(new RegExp('^' + route, flags(options)), keys, allTokens);
  }

},{"isarray":23}],23:[function(require,module,exports){
  module.exports = Array.isArray || function (arr) {
      return Object.prototype.toString.call(arr) == '[object Array]';
    };

},{}],24:[function(require,module,exports){
  module.exports = function denodeify(fn) {
    return function() {
      var self = this
      var args = Array.prototype.slice.call(arguments)
      return new Promise(function(resolve, reject) {
        args.push(function(err, res) {
          if (err) {
            reject(err)
          } else {
            resolve(res)
          }
        })

        var res = fn.apply(self, args)

        var isPromise = res
          && (typeof res === 'object' || typeof res === 'function')
          && typeof res.then === 'function'

        if (isPromise) {
          resolve(res)
        }
      })
    }
  }

},{}],25:[function(require,module,exports){
  module.exports = extend

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
      var source = arguments[i]

      for (var key in source) {
        if (hasOwnProperty.call(source, key)) {
          target[key] = source[key]
        }
      }
    }

    return target
  }

},{}]},{},[7])(7)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2hvbWUvYWRtaW4vYnJvd3NlcmlmeS1jZG4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uLy4uL2hvbWUvYWRtaW4vYnJvd3NlcmlmeS1jZG4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIuLi8uLi8uLi8uLi9ob21lL2FkbWluL2Jyb3dzZXJpZnktY2RuL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi9ob21lL2FkbWluL2Jyb3dzZXJpZnktY2RuL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZGVjb2RlLmpzIiwiLi4vLi4vLi4vLi4vaG9tZS9hZG1pbi9icm93c2VyaWZ5LWNkbi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2VuY29kZS5qcyIsIi4uLy4uLy4uLy4uL2hvbWUvYWRtaW4vYnJvd3NlcmlmeS1jZG4vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9pbmRleC5qcyIsImRlZmF1bHQtcm91dGVyLW9wdGlvbnMuanMiLCJpbmRleC5qcyIsImxpYi9jdXJyZW50LXN0YXRlLmpzIiwibGliL3Byb21pc2UtbWFwLXNlcmllcy5qcyIsImxpYi9zdGF0ZS1jaGFuZ2UtbG9naWMuanMiLCJsaWIvc3RhdGUtY29tcGFyaXNvbi5qcyIsImxpYi9zdGF0ZS1zdGF0ZS5qcyIsImxpYi9zdGF0ZS1zdHJpbmctcGFyc2VyLmpzIiwibGliL3N0YXRlLXRyYW5zaXRpb24tbWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9jb21iaW5lLWFycmF5cy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oYXNoLWJyb3duLXJvdXRlci9oYXNoLWxvY2F0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2hhc2gtYnJvd24tcm91dGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2hhc2gtYnJvd24tcm91dGVyL25vZGVfbW9kdWxlcy9hcnJheS5wcm90b3R5cGUuZmluZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9uYXRpdmUtcHJvbWlzZS1vbmx5L25wby5qcyIsIm5vZGVfbW9kdWxlcy9wYWdlLXBhdGgtYnVpbGRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYWdlLXBhdGgtYnVpbGRlci9wYXRoLXBhcnNlci5qcyIsIm5vZGVfbW9kdWxlcy9wYXRoLXRvLXJlZ2V4cC13aXRoLXJldmVyc2libGUta2V5cy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYXRoLXRvLXJlZ2V4cC13aXRoLXJldmVyc2libGUta2V5cy9ub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90aGVuLWRlbm9kZWlmeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy94dGVuZC9pbW11dGFibGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gSWYgb2JqLmhhc093blByb3BlcnR5IGhhcyBiZWVuIG92ZXJyaWRkZW4sIHRoZW4gY2FsbGluZ1xuLy8gb2JqLmhhc093blByb3BlcnR5KHByb3ApIHdpbGwgYnJlYWsuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvMTcwN1xuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihxcywgc2VwLCBlcSwgb3B0aW9ucykge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgdmFyIG9iaiA9IHt9O1xuXG4gIGlmICh0eXBlb2YgcXMgIT09ICdzdHJpbmcnIHx8IHFzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICB2YXIgcmVnZXhwID0gL1xcKy9nO1xuICBxcyA9IHFzLnNwbGl0KHNlcCk7XG5cbiAgdmFyIG1heEtleXMgPSAxMDAwO1xuICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5tYXhLZXlzID09PSAnbnVtYmVyJykge1xuICAgIG1heEtleXMgPSBvcHRpb25zLm1heEtleXM7XG4gIH1cblxuICB2YXIgbGVuID0gcXMubGVuZ3RoO1xuICAvLyBtYXhLZXlzIDw9IDAgbWVhbnMgdGhhdCB3ZSBzaG91bGQgbm90IGxpbWl0IGtleXMgY291bnRcbiAgaWYgKG1heEtleXMgPiAwICYmIGxlbiA+IG1heEtleXMpIHtcbiAgICBsZW4gPSBtYXhLZXlzO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIHZhciB4ID0gcXNbaV0ucmVwbGFjZShyZWdleHAsICclMjAnKSxcbiAgICAgICAgaWR4ID0geC5pbmRleE9mKGVxKSxcbiAgICAgICAga3N0ciwgdnN0ciwgaywgdjtcblxuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAga3N0ciA9IHguc3Vic3RyKDAsIGlkeCk7XG4gICAgICB2c3RyID0geC5zdWJzdHIoaWR4ICsgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtzdHIgPSB4O1xuICAgICAgdnN0ciA9ICcnO1xuICAgIH1cblxuICAgIGsgPSBkZWNvZGVVUklDb21wb25lbnQoa3N0cik7XG4gICAgdiA9IGRlY29kZVVSSUNvbXBvbmVudCh2c3RyKTtcblxuICAgIGlmICghaGFzT3duUHJvcGVydHkob2JqLCBrKSkge1xuICAgICAgb2JqW2tdID0gdjtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgb2JqW2tdLnB1c2godik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtrXSA9IFtvYmpba10sIHZdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdHJpbmdpZnlQcmltaXRpdmUgPSBmdW5jdGlvbih2KSB7XG4gIHN3aXRjaCAodHlwZW9mIHYpIHtcbiAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgcmV0dXJuIHY7XG5cbiAgICBjYXNlICdib29sZWFuJzpcbiAgICAgIHJldHVybiB2ID8gJ3RydWUnIDogJ2ZhbHNlJztcblxuICAgIGNhc2UgJ251bWJlcic6XG4gICAgICByZXR1cm4gaXNGaW5pdGUodikgPyB2IDogJyc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iaiwgc2VwLCBlcSwgbmFtZSkge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgIG9iaiA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBtYXAob2JqZWN0S2V5cyhvYmopLCBmdW5jdGlvbihrKSB7XG4gICAgICB2YXIga3MgPSBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKGspKSArIGVxO1xuICAgICAgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgICByZXR1cm4gbWFwKG9ialtrXSwgZnVuY3Rpb24odikge1xuICAgICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUodikpO1xuICAgICAgICB9KS5qb2luKHNlcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ga3MgKyBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG9ialtrXSkpO1xuICAgICAgfVxuICAgIH0pLmpvaW4oc2VwKTtcblxuICB9XG5cbiAgaWYgKCFuYW1lKSByZXR1cm4gJyc7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG5hbWUpKSArIGVxICtcbiAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqKSk7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuZnVuY3Rpb24gbWFwICh4cywgZikge1xuICBpZiAoeHMubWFwKSByZXR1cm4geHMubWFwKGYpO1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICByZXMucHVzaChmKHhzW2ldLCBpKSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSByZXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmRlY29kZSA9IGV4cG9ydHMucGFyc2UgPSByZXF1aXJlKCcuL2RlY29kZScpO1xuZXhwb3J0cy5lbmNvZGUgPSBleHBvcnRzLnN0cmluZ2lmeSA9IHJlcXVpcmUoJy4vZW5jb2RlJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHsgcmV2ZXJzZTogZmFsc2UgfSIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG52YXIgU3RhdGVTdGF0ZSA9IHJlcXVpcmUoJy4vbGliL3N0YXRlLXN0YXRlJylcbnZhciBTdGF0ZUNvbXBhcmlzb24gPSByZXF1aXJlKCcuL2xpYi9zdGF0ZS1jb21wYXJpc29uJylcbnZhciBDdXJyZW50U3RhdGUgPSByZXF1aXJlKCcuL2xpYi9jdXJyZW50LXN0YXRlJylcbnZhciBzdGF0ZUNoYW5nZUxvZ2ljID0gcmVxdWlyZSgnLi9saWIvc3RhdGUtY2hhbmdlLWxvZ2ljJylcbnZhciBwYXJzZSA9IHJlcXVpcmUoJy4vbGliL3N0YXRlLXN0cmluZy1wYXJzZXInKVxudmFyIFN0YXRlVHJhbnNpdGlvbk1hbmFnZXIgPSByZXF1aXJlKCcuL2xpYi9zdGF0ZS10cmFuc2l0aW9uLW1hbmFnZXInKVxudmFyIGRlZmF1bHRSb3V0ZXJPcHRpb25zID0gcmVxdWlyZSgnLi9kZWZhdWx0LXJvdXRlci1vcHRpb25zLmpzJylcblxudmFyIHNlcmllcyA9IHJlcXVpcmUoJy4vbGliL3Byb21pc2UtbWFwLXNlcmllcycpXG52YXIgZGVub2RlaWZ5ID0gcmVxdWlyZSgndGhlbi1kZW5vZGVpZnknKVxuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKVxudmFyIG5ld0hhc2hCcm93blJvdXRlciA9IHJlcXVpcmUoJ2hhc2gtYnJvd24tcm91dGVyJylcbnZhciBjb21iaW5lID0gcmVxdWlyZSgnY29tYmluZS1hcnJheXMnKVxudmFyIGJ1aWxkUGF0aCA9IHJlcXVpcmUoJ3BhZ2UtcGF0aC1idWlsZGVyJylcblxucmVxdWlyZSgnbmF0aXZlLXByb21pc2Utb25seS9ucG8nKVxuXG52YXIgZXhwZWN0ZWRQcm9wZXJ0aWVzT2ZBZGRTdGF0ZSA9IFsnbmFtZScsICdyb3V0ZScsICdkZWZhdWx0Q2hpbGQnLCAnZGF0YScsICd0ZW1wbGF0ZScsICdyZXNvbHZlJywgJ2FjdGl2YXRlJywgJ3F1ZXJ5c3RyaW5nUGFyYW1ldGVycycsICdkZWZhdWx0UXVlcnlzdHJpbmdQYXJhbWV0ZXJzJ11cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBTdGF0ZVByb3ZpZGVyKG1ha2VSZW5kZXJlciwgcm9vdEVsZW1lbnQsIHN0YXRlUm91dGVyT3B0aW9ucykge1xuXHR2YXIgcHJvdG90eXBhbFN0YXRlSG9sZGVyID0gU3RhdGVTdGF0ZSgpXG5cdHZhciBsYXN0Q29tcGxldGVseUxvYWRlZFN0YXRlID0gQ3VycmVudFN0YXRlKClcblx0dmFyIGxhc3RTdGF0ZVN0YXJ0ZWRBY3RpdmF0aW5nID0gQ3VycmVudFN0YXRlKClcblx0dmFyIHN0YXRlUHJvdmlkZXJFbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcigpXG5cdFN0YXRlVHJhbnNpdGlvbk1hbmFnZXIoc3RhdGVQcm92aWRlckVtaXR0ZXIpXG5cdHN0YXRlUm91dGVyT3B0aW9ucyA9IGV4dGVuZCh7XG5cdFx0dGhyb3dPbkVycm9yOiB0cnVlLFxuXHRcdHBhdGhQcmVmaXg6ICcjJ1xuXHR9LCBzdGF0ZVJvdXRlck9wdGlvbnMpXG5cblx0aWYgKCFzdGF0ZVJvdXRlck9wdGlvbnMucm91dGVyKSB7XG5cdFx0c3RhdGVSb3V0ZXJPcHRpb25zLnJvdXRlciA9IG5ld0hhc2hCcm93blJvdXRlcihkZWZhdWx0Um91dGVyT3B0aW9ucylcblx0fVxuXG5cdHN0YXRlUm91dGVyT3B0aW9ucy5yb3V0ZXIuc2V0RGVmYXVsdChmdW5jdGlvbihyb3V0ZSwgcGFyYW1ldGVycykge1xuXHRcdHN0YXRlUHJvdmlkZXJFbWl0dGVyLmVtaXQoJ3JvdXRlTm90Rm91bmQnLCByb3V0ZSwgcGFyYW1ldGVycylcblx0fSlcblxuXHR2YXIgZGVzdHJveURvbSA9IG51bGxcblx0dmFyIGdldERvbUNoaWxkID0gbnVsbFxuXHR2YXIgcmVuZGVyRG9tID0gbnVsbFxuXHR2YXIgcmVzZXREb20gPSBudWxsXG5cblx0dmFyIGFjdGl2ZURvbUFwaXMgPSB7fVxuXHR2YXIgYWN0aXZlU3RhdGVSZXNvbHZlQ29udGVudCA9IHt9XG5cdHZhciBhY3RpdmVFbWl0dGVycyA9IHt9XG5cblx0ZnVuY3Rpb24gaGFuZGxlRXJyb3IoZXZlbnQsIGVycikge1xuXHRcdHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KGV2ZW50LCBlcnIpXG5cdFx0XHRjb25zb2xlLmVycm9yKGV2ZW50ICsgJyAtICcgKyBlcnIubWVzc2FnZSlcblx0XHRcdGlmIChzdGF0ZVJvdXRlck9wdGlvbnMudGhyb3dPbkVycm9yKSB7XG5cdFx0XHRcdHRocm93IGVyclxuXHRcdFx0fVxuXHRcdH0pXG5cdH1cblxuXHRmdW5jdGlvbiBkZXN0cm95U3RhdGVOYW1lKHN0YXRlTmFtZSkge1xuXHRcdHZhciBzdGF0ZSA9IHByb3RvdHlwYWxTdGF0ZUhvbGRlci5nZXQoc3RhdGVOYW1lKVxuXHRcdHN0YXRlUHJvdmlkZXJFbWl0dGVyLmVtaXQoJ2JlZm9yZURlc3Ryb3lTdGF0ZScsIHtcblx0XHRcdHN0YXRlOiBzdGF0ZSxcblx0XHRcdGRvbUFwaTogYWN0aXZlRG9tQXBpc1tzdGF0ZU5hbWVdXG5cdFx0fSlcblxuXHRcdGFjdGl2ZUVtaXR0ZXJzW3N0YXRlTmFtZV0uZW1pdCgnZGVzdHJveScpXG5cdFx0YWN0aXZlRW1pdHRlcnNbc3RhdGVOYW1lXS5yZW1vdmVBbGxMaXN0ZW5lcnMoKVxuXHRcdGRlbGV0ZSBhY3RpdmVFbWl0dGVyc1tzdGF0ZU5hbWVdXG5cdFx0ZGVsZXRlIGFjdGl2ZVN0YXRlUmVzb2x2ZUNvbnRlbnRbc3RhdGVOYW1lXVxuXG5cdFx0cmV0dXJuIGRlc3Ryb3lEb20oYWN0aXZlRG9tQXBpc1tzdGF0ZU5hbWVdKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0ZGVsZXRlIGFjdGl2ZURvbUFwaXNbc3RhdGVOYW1lXVxuXHRcdFx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZW1pdCgnYWZ0ZXJEZXN0cm95U3RhdGUnLCB7XG5cdFx0XHRcdHN0YXRlOiBzdGF0ZVxuXHRcdFx0fSlcblx0XHR9KVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVzZXRTdGF0ZU5hbWUocGFyYW1ldGVycywgc3RhdGVOYW1lKSB7XG5cdFx0dmFyIGRvbUFwaSA9IGFjdGl2ZURvbUFwaXNbc3RhdGVOYW1lXVxuXHRcdHZhciBjb250ZW50ID0gZ2V0Q29udGVudE9iamVjdChhY3RpdmVTdGF0ZVJlc29sdmVDb250ZW50LCBzdGF0ZU5hbWUpXG5cdFx0dmFyIHN0YXRlID0gcHJvdG90eXBhbFN0YXRlSG9sZGVyLmdldChzdGF0ZU5hbWUpXG5cblx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KCdiZWZvcmVSZXNldFN0YXRlJywge1xuXHRcdFx0ZG9tQXBpOiBkb21BcGksXG5cdFx0XHRjb250ZW50OiBjb250ZW50LFxuXHRcdFx0c3RhdGU6IHN0YXRlLFxuXHRcdFx0cGFyYW1ldGVyczogcGFyYW1ldGVyc1xuXHRcdH0pXG5cblx0XHRhY3RpdmVFbWl0dGVyc1tzdGF0ZU5hbWVdLmVtaXQoJ2Rlc3Ryb3knKVxuXHRcdGRlbGV0ZSBhY3RpdmVFbWl0dGVyc1tzdGF0ZU5hbWVdXG5cblx0XHRyZXR1cm4gcmVzZXREb20oe1xuXHRcdFx0ZG9tQXBpOiBkb21BcGksXG5cdFx0XHRjb250ZW50OiBjb250ZW50LFxuXHRcdFx0dGVtcGxhdGU6IHN0YXRlLnRlbXBsYXRlLFxuXHRcdFx0cGFyYW1ldGVyczogcGFyYW1ldGVyc1xuXHRcdH0pLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KCdhZnRlclJlc2V0U3RhdGUnLCB7XG5cdFx0XHRcdGRvbUFwaTogZG9tQXBpLFxuXHRcdFx0XHRjb250ZW50OiBjb250ZW50LFxuXHRcdFx0XHRzdGF0ZTogc3RhdGUsXG5cdFx0XHRcdHBhcmFtZXRlcnM6IHBhcmFtZXRlcnNcblx0XHRcdH0pXG5cdFx0fSlcblx0fVxuXG5cdGZ1bmN0aW9uIGdldENoaWxkRWxlbWVudEZvclN0YXRlTmFtZShzdGF0ZU5hbWUpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuXHRcdFx0dmFyIHBhcmVudCA9IHByb3RvdHlwYWxTdGF0ZUhvbGRlci5nZXRQYXJlbnQoc3RhdGVOYW1lKVxuXHRcdFx0aWYgKHBhcmVudCkge1xuXHRcdFx0XHR2YXIgcGFyZW50RG9tQXBpID0gYWN0aXZlRG9tQXBpc1twYXJlbnQubmFtZV1cblx0XHRcdFx0cmVzb2x2ZShnZXREb21DaGlsZChwYXJlbnREb21BcGkpKVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVzb2x2ZShyb290RWxlbWVudClcblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVuZGVyU3RhdGVOYW1lKHBhcmFtZXRlcnMsIHN0YXRlTmFtZSkge1xuXHRcdHJldHVybiBnZXRDaGlsZEVsZW1lbnRGb3JTdGF0ZU5hbWUoc3RhdGVOYW1lKS50aGVuKGZ1bmN0aW9uKGNoaWxkRWxlbWVudCkge1xuXHRcdFx0dmFyIHN0YXRlID0gcHJvdG90eXBhbFN0YXRlSG9sZGVyLmdldChzdGF0ZU5hbWUpXG5cdFx0XHR2YXIgY29udGVudCA9IGdldENvbnRlbnRPYmplY3QoYWN0aXZlU3RhdGVSZXNvbHZlQ29udGVudCwgc3RhdGVOYW1lKVxuXG5cdFx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KCdiZWZvcmVDcmVhdGVTdGF0ZScsIHtcblx0XHRcdFx0c3RhdGU6IHN0YXRlLFxuXHRcdFx0XHRjb250ZW50OiBjb250ZW50LFxuXHRcdFx0XHRwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzXG5cdFx0XHR9KVxuXG5cdFx0XHRyZXR1cm4gcmVuZGVyRG9tKHtcblx0XHRcdFx0ZWxlbWVudDogY2hpbGRFbGVtZW50LFxuXHRcdFx0XHR0ZW1wbGF0ZTogc3RhdGUudGVtcGxhdGUsXG5cdFx0XHRcdGNvbnRlbnQ6IGNvbnRlbnQsXG5cdFx0XHRcdHBhcmFtZXRlcnM6IHBhcmFtZXRlcnNcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24oZG9tQXBpKSB7XG5cdFx0XHRcdGFjdGl2ZURvbUFwaXNbc3RhdGVOYW1lXSA9IGRvbUFwaVxuXHRcdFx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KCdhZnRlckNyZWF0ZVN0YXRlJywge1xuXHRcdFx0XHRcdHN0YXRlOiBzdGF0ZSxcblx0XHRcdFx0XHRkb21BcGk6IGRvbUFwaSxcblx0XHRcdFx0XHRjb250ZW50OiBjb250ZW50LFxuXHRcdFx0XHRcdHBhcmFtZXRlcnM6IHBhcmFtZXRlcnNcblx0XHRcdFx0fSlcblx0XHRcdFx0cmV0dXJuIGRvbUFwaVxuXHRcdFx0fSlcblx0XHR9KVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVuZGVyQWxsKHN0YXRlTmFtZXMsIHBhcmFtZXRlcnMpIHtcblx0XHRyZXR1cm4gc2VyaWVzKHN0YXRlTmFtZXMsIHJlbmRlclN0YXRlTmFtZS5iaW5kKG51bGwsIHBhcmFtZXRlcnMpKVxuXHR9XG5cblx0ZnVuY3Rpb24gb25Sb3V0ZUNoYW5nZShzdGF0ZSwgcGFyYW1ldGVycykge1xuXHRcdHRyeSB7XG5cdFx0XHR2YXIgZmluYWxEZXN0aW5hdGlvblN0YXRlTmFtZSA9IHByb3RvdHlwYWxTdGF0ZUhvbGRlci5hcHBseURlZmF1bHRDaGlsZFN0YXRlcyhzdGF0ZS5uYW1lKVxuXG5cdFx0XHRpZiAoZmluYWxEZXN0aW5hdGlvblN0YXRlTmFtZSA9PT0gc3RhdGUubmFtZSkge1xuXHRcdFx0XHRlbWl0RXZlbnRBbmRBdHRlbXB0U3RhdGVDaGFuZ2UoZmluYWxEZXN0aW5hdGlvblN0YXRlTmFtZSwgcGFyYW1ldGVycylcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIFRoZXJlIGFyZSBkZWZhdWx0IGNoaWxkIHN0YXRlcyB0aGF0IG5lZWQgdG8gYmUgYXBwbGllZFxuXG5cdFx0XHRcdHZhciB0aGVSb3V0ZVdlTmVlZFRvRW5kVXBBdCA9IG1ha2VQYXRoKGZpbmFsRGVzdGluYXRpb25TdGF0ZU5hbWUsIHBhcmFtZXRlcnMpXG5cdFx0XHRcdHZhciBjdXJyZW50Um91dGUgPSBzdGF0ZVJvdXRlck9wdGlvbnMucm91dGVyLmxvY2F0aW9uLmdldCgpXG5cblx0XHRcdFx0aWYgKHRoZVJvdXRlV2VOZWVkVG9FbmRVcEF0ID09PSBjdXJyZW50Um91dGUpIHtcblx0XHRcdFx0XHQvLyB0aGUgY2hpbGQgc3RhdGUgaGFzIHRoZSBzYW1lIHJvdXRlIGFzIHRoZSBjdXJyZW50IG9uZSwganVzdCBzdGFydCBuYXZpZ2F0aW5nIHRoZXJlXG5cdFx0XHRcdFx0ZW1pdEV2ZW50QW5kQXR0ZW1wdFN0YXRlQ2hhbmdlKGZpbmFsRGVzdGluYXRpb25TdGF0ZU5hbWUsIHBhcmFtZXRlcnMpXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gY2hhbmdlIHRoZSB1cmwgdG8gbWF0Y2ggdGhlIGZ1bGwgZGVmYXVsdCBjaGlsZCBzdGF0ZSByb3V0ZVxuXHRcdFx0XHRcdHN0YXRlUHJvdmlkZXJFbWl0dGVyLmdvKGZpbmFsRGVzdGluYXRpb25TdGF0ZU5hbWUsIHBhcmFtZXRlcnMsIHsgcmVwbGFjZTogdHJ1ZSB9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRoYW5kbGVFcnJvcignc3RhdGVFcnJvcicsIGVycilcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBhZGRTdGF0ZShzdGF0ZSkge1xuXHRcdGlmICh0eXBlb2Ygc3RhdGUgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIFxcJ3N0YXRlXFwnIHRvIGJlIHBhc3NlZCBpbi4nKVxuXHRcdH0gZWxzZSBpZiAodHlwZW9mIHN0YXRlLm5hbWUgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIHRoZSBcXCduYW1lXFwnIG9wdGlvbiB0byBiZSBwYXNzZWQgaW4uJylcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBzdGF0ZS50ZW1wbGF0ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgdGhlIFxcJ3RlbXBsYXRlXFwnIG9wdGlvbiB0byBiZSBwYXNzZWQgaW4uJylcblx0XHR9XG5cdFx0T2JqZWN0LmtleXMoc3RhdGUpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRcdHJldHVybiBleHBlY3RlZFByb3BlcnRpZXNPZkFkZFN0YXRlLmluZGV4T2Yoa2V5KSA9PT0gLTFcblx0XHR9KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0Y29uc29sZS53YXJuKCdVbmV4cGVjdGVkIHByb3BlcnR5IHBhc3NlZCB0byBhZGRTdGF0ZTonLCBrZXkpXG5cdFx0fSlcblxuXHRcdHByb3RvdHlwYWxTdGF0ZUhvbGRlci5hZGQoc3RhdGUubmFtZSwgc3RhdGUpXG5cblx0XHR2YXIgcm91dGUgPSBwcm90b3R5cGFsU3RhdGVIb2xkZXIuYnVpbGRGdWxsU3RhdGVSb3V0ZShzdGF0ZS5uYW1lKVxuXG5cdFx0c3RhdGVSb3V0ZXJPcHRpb25zLnJvdXRlci5hZGQocm91dGUsIG9uUm91dGVDaGFuZ2UuYmluZChudWxsLCBzdGF0ZSkpXG5cdH1cblxuXHRmdW5jdGlvbiBnZXRTdGF0ZXNUb1Jlc29sdmUoc3RhdGVDaGFuZ2VzKSB7XG5cdFx0cmV0dXJuIHN0YXRlQ2hhbmdlcy5jaGFuZ2UuY29uY2F0KHN0YXRlQ2hhbmdlcy5jcmVhdGUpLm1hcChwcm90b3R5cGFsU3RhdGVIb2xkZXIuZ2V0KVxuXHR9XG5cblx0ZnVuY3Rpb24gZW1pdEV2ZW50QW5kQXR0ZW1wdFN0YXRlQ2hhbmdlKG5ld1N0YXRlTmFtZSwgcGFyYW1ldGVycykge1xuXHRcdHN0YXRlUHJvdmlkZXJFbWl0dGVyLmVtaXQoJ3N0YXRlQ2hhbmdlQXR0ZW1wdCcsIGZ1bmN0aW9uIHN0YXRlR28odHJhbnNpdGlvbikge1xuXHRcdFx0YXR0ZW1wdFN0YXRlQ2hhbmdlKG5ld1N0YXRlTmFtZSwgcGFyYW1ldGVycywgdHJhbnNpdGlvbilcblx0XHR9KVxuXHR9XG5cblx0ZnVuY3Rpb24gYXR0ZW1wdFN0YXRlQ2hhbmdlKG5ld1N0YXRlTmFtZSwgcGFyYW1ldGVycywgdHJhbnNpdGlvbikge1xuXHRcdGZ1bmN0aW9uIGlmTm90Q2FuY2VsbGVkKGZuKSB7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0cmFuc2l0aW9uLmNhbmNlbGxlZCkge1xuXHRcdFx0XHRcdHZhciBlcnIgPSBuZXcgRXJyb3IoJ1RoZSB0cmFuc2l0aW9uIHRvICcgKyBuZXdTdGF0ZU5hbWUgKyAnd2FzIGNhbmNlbGxlZCcpXG5cdFx0XHRcdFx0ZXJyLndhc0NhbmNlbGxlZEJ5U29tZW9uZUVsc2UgPSB0cnVlXG5cdFx0XHRcdFx0dGhyb3cgZXJyXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZuLmFwcGx5KG51bGwsIGFyZ3VtZW50cylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBwcm9taXNlTWUocHJvdG90eXBhbFN0YXRlSG9sZGVyLmd1YXJhbnRlZUFsbFN0YXRlc0V4aXN0LCBuZXdTdGF0ZU5hbWUpXG5cdFx0LnRoZW4oZnVuY3Rpb24gYXBwbHlEZWZhdWx0UGFyYW1ldGVycygpIHtcblx0XHRcdHZhciBzdGF0ZSA9IHByb3RvdHlwYWxTdGF0ZUhvbGRlci5nZXQobmV3U3RhdGVOYW1lKVxuXHRcdFx0dmFyIGRlZmF1bHRQYXJhbXMgPSBzdGF0ZS5kZWZhdWx0UXVlcnlzdHJpbmdQYXJhbWV0ZXJzIHx8IHt9XG5cdFx0XHR2YXIgbmVlZFRvQXBwbHlEZWZhdWx0cyA9IE9iamVjdC5rZXlzKGRlZmF1bHRQYXJhbXMpLnNvbWUoZnVuY3Rpb24gbWlzc2luZ1BhcmFtZXRlclZhbHVlKHBhcmFtKSB7XG5cdFx0XHRcdHJldHVybiAhcGFyYW1ldGVyc1twYXJhbV1cblx0XHRcdH0pXG5cblx0XHRcdGlmIChuZWVkVG9BcHBseURlZmF1bHRzKSB7XG5cdFx0XHRcdHRocm93IHJlZGlyZWN0b3IobmV3U3RhdGVOYW1lLCBleHRlbmQoZGVmYXVsdFBhcmFtcywgcGFyYW1ldGVycykpXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gc3RhdGVcblx0XHR9KS50aGVuKGlmTm90Q2FuY2VsbGVkKGZ1bmN0aW9uKHN0YXRlKSB7XG5cdFx0XHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5lbWl0KCdzdGF0ZUNoYW5nZVN0YXJ0Jywgc3RhdGUsIHBhcmFtZXRlcnMpXG5cdFx0XHRsYXN0U3RhdGVTdGFydGVkQWN0aXZhdGluZy5zZXQoc3RhdGUubmFtZSwgcGFyYW1ldGVycylcblx0XHR9KSkudGhlbihmdW5jdGlvbiBnZXRTdGF0ZUNoYW5nZXMoKSB7XG5cdFx0XHR2YXIgc3RhdGVDb21wYXJpc29uUmVzdWx0cyA9IFN0YXRlQ29tcGFyaXNvbihwcm90b3R5cGFsU3RhdGVIb2xkZXIpKGxhc3RDb21wbGV0ZWx5TG9hZGVkU3RhdGUuZ2V0KCkubmFtZSwgbGFzdENvbXBsZXRlbHlMb2FkZWRTdGF0ZS5nZXQoKS5wYXJhbWV0ZXJzLCBuZXdTdGF0ZU5hbWUsIHBhcmFtZXRlcnMpXG5cdFx0XHRyZXR1cm4gc3RhdGVDaGFuZ2VMb2dpYyhzdGF0ZUNvbXBhcmlzb25SZXN1bHRzKSAvLyB7IGRlc3Ryb3ksIGNoYW5nZSwgY3JlYXRlIH1cblx0XHR9KS50aGVuKGlmTm90Q2FuY2VsbGVkKGZ1bmN0aW9uIHJlc29sdmVEZXN0cm95QW5kQWN0aXZhdGVTdGF0ZXMoc3RhdGVDaGFuZ2VzKSB7XG5cdFx0XHRyZXR1cm4gcmVzb2x2ZVN0YXRlcyhnZXRTdGF0ZXNUb1Jlc29sdmUoc3RhdGVDaGFuZ2VzKSwgZXh0ZW5kKHBhcmFtZXRlcnMpKS5jYXRjaChmdW5jdGlvbiBvblJlc29sdmVFcnJvcihlKSB7XG5cdFx0XHRcdGUuc3RhdGVDaGFuZ2VFcnJvciA9IHRydWVcblx0XHRcdFx0dGhyb3cgZVxuXHRcdFx0fSkudGhlbihpZk5vdENhbmNlbGxlZChmdW5jdGlvbiBkZXN0cm95QW5kQWN0aXZhdGUoc3RhdGVSZXNvbHZlUmVzdWx0c09iamVjdCkge1xuXHRcdFx0XHR0cmFuc2l0aW9uLmNhbmNlbGxhYmxlID0gZmFsc2VcblxuXHRcdFx0XHRmdW5jdGlvbiBhY3RpdmF0ZUFsbCgpIHtcblx0XHRcdFx0XHR2YXIgc3RhdGVzVG9BY3RpdmF0ZSA9IHN0YXRlQ2hhbmdlcy5jaGFuZ2UuY29uY2F0KHN0YXRlQ2hhbmdlcy5jcmVhdGUpXG5cblx0XHRcdFx0XHRyZXR1cm4gYWN0aXZhdGVTdGF0ZXMoc3RhdGVzVG9BY3RpdmF0ZSlcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGFjdGl2ZVN0YXRlUmVzb2x2ZUNvbnRlbnQgPSBleHRlbmQoYWN0aXZlU3RhdGVSZXNvbHZlQ29udGVudCwgc3RhdGVSZXNvbHZlUmVzdWx0c09iamVjdClcblxuXHRcdFx0XHRyZXR1cm4gc2VyaWVzKHJldmVyc2Uoc3RhdGVDaGFuZ2VzLmRlc3Ryb3kpLCBkZXN0cm95U3RhdGVOYW1lKS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBzZXJpZXMocmV2ZXJzZShzdGF0ZUNoYW5nZXMuY2hhbmdlKSwgcmVzZXRTdGF0ZU5hbWUuYmluZChudWxsLCBleHRlbmQocGFyYW1ldGVycykpKVxuXHRcdFx0XHR9KS50aGVuKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiByZW5kZXJBbGwoc3RhdGVDaGFuZ2VzLmNyZWF0ZSwgZXh0ZW5kKHBhcmFtZXRlcnMpKS50aGVuKGFjdGl2YXRlQWxsKVxuXHRcdFx0XHR9KVxuXHRcdFx0fSkpXG5cblx0XHRcdGZ1bmN0aW9uIGFjdGl2YXRlU3RhdGVzKHN0YXRlTmFtZXMpIHtcblx0XHRcdFx0cmV0dXJuIHN0YXRlTmFtZXMubWFwKHByb3RvdHlwYWxTdGF0ZUhvbGRlci5nZXQpLmZvckVhY2goZnVuY3Rpb24oc3RhdGUpIHtcblx0XHRcdFx0XHR2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKVxuXHRcdFx0XHRcdHZhciBjb250ZXh0ID0gT2JqZWN0LmNyZWF0ZShlbWl0dGVyKVxuXHRcdFx0XHRcdGNvbnRleHQuZG9tQXBpID0gYWN0aXZlRG9tQXBpc1tzdGF0ZS5uYW1lXVxuXHRcdFx0XHRcdGNvbnRleHQuZGF0YSA9IHN0YXRlLmRhdGFcblx0XHRcdFx0XHRjb250ZXh0LnBhcmFtZXRlcnMgPSBwYXJhbWV0ZXJzXG5cdFx0XHRcdFx0Y29udGV4dC5jb250ZW50ID0gZ2V0Q29udGVudE9iamVjdChhY3RpdmVTdGF0ZVJlc29sdmVDb250ZW50LCBzdGF0ZS5uYW1lKVxuXHRcdFx0XHRcdGFjdGl2ZUVtaXR0ZXJzW3N0YXRlLm5hbWVdID0gZW1pdHRlclxuXG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHN0YXRlLmFjdGl2YXRlICYmIHN0YXRlLmFjdGl2YXRlKGNvbnRleHQpXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0cHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0dGhyb3cgZVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fSkpLnRoZW4oZnVuY3Rpb24gc3RhdGVDaGFuZ2VDb21wbGV0ZSgpIHtcblx0XHRcdGxhc3RDb21wbGV0ZWx5TG9hZGVkU3RhdGUuc2V0KG5ld1N0YXRlTmFtZSwgcGFyYW1ldGVycylcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHN0YXRlUHJvdmlkZXJFbWl0dGVyLmVtaXQoJ3N0YXRlQ2hhbmdlRW5kJywgcHJvdG90eXBhbFN0YXRlSG9sZGVyLmdldChuZXdTdGF0ZU5hbWUpLCBwYXJhbWV0ZXJzKVxuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRoYW5kbGVFcnJvcignc3RhdGVFcnJvcicsIGUpXG5cdFx0XHR9XG5cdFx0fSkuY2F0Y2goaWZOb3RDYW5jZWxsZWQoZnVuY3Rpb24gaGFuZGxlU3RhdGVDaGFuZ2VFcnJvcihlcnIpIHtcblx0XHRcdGlmIChlcnIgJiYgZXJyLnJlZGlyZWN0VG8pIHtcblx0XHRcdFx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZW1pdCgnc3RhdGVDaGFuZ2VDYW5jZWxsZWQnLCBlcnIpXG5cdFx0XHRcdHJldHVybiBzdGF0ZVByb3ZpZGVyRW1pdHRlci5nbyhlcnIucmVkaXJlY3RUby5uYW1lLCBlcnIucmVkaXJlY3RUby5wYXJhbXMsIHsgcmVwbGFjZTogdHJ1ZSB9KVxuXHRcdFx0fSBlbHNlIGlmIChlcnIpIHtcblx0XHRcdFx0aGFuZGxlRXJyb3IoJ3N0YXRlQ2hhbmdlRXJyb3InLCBlcnIpXG5cdFx0XHR9XG5cdFx0fSkpLmNhdGNoKGZ1bmN0aW9uIGhhbmRsZUNhbmNlbGxhdGlvbihlcnIpIHtcblx0XHRcdGlmIChlcnIgJiYgZXJyLndhc0NhbmNlbGxlZEJ5U29tZW9uZUVsc2UpIHtcblx0XHRcdFx0Ly8gd2UgZG9uJ3QgY2FyZSwgdGhlIHN0YXRlIHRyYW5zaXRpb24gbWFuYWdlciBoYXMgYWxyZWFkeSBlbWl0dGVkIHRoZSBzdGF0ZUNoYW5nZUNhbmNlbGxlZCBmb3IgdXNcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgcHJvYmFibHkgc2hvdWxkbid0IGhhcHBlbiwgbWF5YmUgZmlsZSBhbiBpc3N1ZSBvciBzb21ldGhpbmcgXCIgKyBlcnIpXG5cdFx0XHR9XG5cdFx0fSlcblx0fVxuXG5cdGZ1bmN0aW9uIG1ha2VQYXRoKHN0YXRlTmFtZSwgcGFyYW1ldGVycywgb3B0aW9ucykge1xuXHRcdGZ1bmN0aW9uIGdldEd1YXJhbnRlZWRQcmV2aW91c1N0YXRlKCkge1xuXHRcdFx0aWYgKCFsYXN0U3RhdGVTdGFydGVkQWN0aXZhdGluZy5nZXQoKS5uYW1lKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignbWFrZVBhdGggcmVxdWlyZWQgYSBwcmV2aW91cyBzdGF0ZSB0byBleGlzdCwgYW5kIG5vbmUgd2FzIGZvdW5kJylcblx0XHRcdH1cblx0XHRcdHJldHVybiBsYXN0U3RhdGVTdGFydGVkQWN0aXZhdGluZy5nZXQoKVxuXHRcdH1cblx0XHRpZiAob3B0aW9ucyAmJiBvcHRpb25zLmluaGVyaXQpIHtcblx0XHRcdHBhcmFtZXRlcnMgPSBleHRlbmQoZ2V0R3VhcmFudGVlZFByZXZpb3VzU3RhdGUoKS5wYXJhbWV0ZXJzLCBwYXJhbWV0ZXJzKVxuXHRcdH1cblxuXHRcdHZhciBkZXN0aW5hdGlvblN0YXRlID0gc3RhdGVOYW1lID09PSBudWxsID8gZ2V0R3VhcmFudGVlZFByZXZpb3VzU3RhdGUoKS5uYW1lIDogc3RhdGVOYW1lXG5cblx0XHRwcm90b3R5cGFsU3RhdGVIb2xkZXIuZ3VhcmFudGVlQWxsU3RhdGVzRXhpc3QoZGVzdGluYXRpb25TdGF0ZSlcblx0XHR2YXIgcm91dGUgPSBwcm90b3R5cGFsU3RhdGVIb2xkZXIuYnVpbGRGdWxsU3RhdGVSb3V0ZShkZXN0aW5hdGlvblN0YXRlKVxuXHRcdHJldHVybiBidWlsZFBhdGgocm91dGUsIHBhcmFtZXRlcnMgfHwge30pXG5cdH1cblxuXHR2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG5cdFx0cmVwbGFjZTogZmFsc2Vcblx0fVxuXG5cdHN0YXRlUHJvdmlkZXJFbWl0dGVyLmFkZFN0YXRlID0gYWRkU3RhdGVcblx0c3RhdGVQcm92aWRlckVtaXR0ZXIuZ28gPSBmdW5jdGlvbiBnbyhuZXdTdGF0ZU5hbWUsIHBhcmFtZXRlcnMsIG9wdGlvbnMpIHtcblx0XHRvcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRPcHRpb25zLCBvcHRpb25zKVxuXHRcdHZhciBnb0Z1bmN0aW9uID0gb3B0aW9ucy5yZXBsYWNlID8gc3RhdGVSb3V0ZXJPcHRpb25zLnJvdXRlci5yZXBsYWNlIDogc3RhdGVSb3V0ZXJPcHRpb25zLnJvdXRlci5nb1xuXG5cdFx0cmV0dXJuIHByb21pc2VNZShtYWtlUGF0aCwgbmV3U3RhdGVOYW1lLCBwYXJhbWV0ZXJzLCBvcHRpb25zKS50aGVuKGdvRnVuY3Rpb24sIGhhbmRsZUVycm9yLmJpbmQobnVsbCwgJ3N0YXRlQ2hhbmdlRXJyb3InKSlcblx0fVxuXHRzdGF0ZVByb3ZpZGVyRW1pdHRlci5ldmFsdWF0ZUN1cnJlbnRSb3V0ZSA9IGZ1bmN0aW9uIGV2YWx1YXRlQ3VycmVudFJvdXRlKGRlZmF1bHRTdGF0ZSwgZGVmYXVsdFBhcmFtcykge1xuXHRcdHJldHVybiBwcm9taXNlTWUobWFrZVBhdGgsIGRlZmF1bHRTdGF0ZSwgZGVmYXVsdFBhcmFtcykudGhlbihmdW5jdGlvbihkZWZhdWx0UGF0aCkge1xuXHRcdFx0c3RhdGVSb3V0ZXJPcHRpb25zLnJvdXRlci5ldmFsdWF0ZUN1cnJlbnQoZGVmYXVsdFBhdGgpXG5cdFx0fSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHRoYW5kbGVFcnJvcignc3RhdGVFcnJvcicsIGVycilcblx0XHR9KVxuXHR9XG5cdHN0YXRlUHJvdmlkZXJFbWl0dGVyLm1ha2VQYXRoID0gZnVuY3Rpb24gbWFrZVBhdGhBbmRQcmVwZW5kSGFzaChzdGF0ZU5hbWUsIHBhcmFtZXRlcnMsIG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gc3RhdGVSb3V0ZXJPcHRpb25zLnBhdGhQcmVmaXggKyBtYWtlUGF0aChzdGF0ZU5hbWUsIHBhcmFtZXRlcnMsIG9wdGlvbnMpXG5cdH1cblx0c3RhdGVQcm92aWRlckVtaXR0ZXIuc3RhdGVJc0FjdGl2ZSA9IGZ1bmN0aW9uIHN0YXRlSXNBY3RpdmUoc3RhdGVOYW1lLCBvcHRzKSB7XG5cdFx0dmFyIGN1cnJlbnRTdGF0ZSA9IGxhc3RDb21wbGV0ZWx5TG9hZGVkU3RhdGUuZ2V0KClcblx0XHRyZXR1cm4gKGN1cnJlbnRTdGF0ZS5uYW1lID09PSBzdGF0ZU5hbWUgfHwgY3VycmVudFN0YXRlLm5hbWUuaW5kZXhPZihzdGF0ZU5hbWUgKyAnLicpID09PSAwKSAmJiAodHlwZW9mIG9wdHMgPT09ICd1bmRlZmluZWQnIHx8IE9iamVjdC5rZXlzKG9wdHMpLmV2ZXJ5KGZ1bmN0aW9uIG1hdGNoZXMoa2V5KSB7XG5cdFx0XHRyZXR1cm4gb3B0c1trZXldID09PSBjdXJyZW50U3RhdGUucGFyYW1ldGVyc1trZXldXG5cdFx0fSkpXG5cdH1cblxuXHR2YXIgcmVuZGVyZXIgPSBtYWtlUmVuZGVyZXIoc3RhdGVQcm92aWRlckVtaXR0ZXIpXG5cblx0ZGVzdHJveURvbSA9IGRlbm9kZWlmeShyZW5kZXJlci5kZXN0cm95KVxuXHRnZXREb21DaGlsZCA9IGRlbm9kZWlmeShyZW5kZXJlci5nZXRDaGlsZEVsZW1lbnQpXG5cdHJlbmRlckRvbSA9IGRlbm9kZWlmeShyZW5kZXJlci5yZW5kZXIpXG5cdHJlc2V0RG9tID0gZGVub2RlaWZ5KHJlbmRlcmVyLnJlc2V0KVxuXG5cdHJldHVybiBzdGF0ZVByb3ZpZGVyRW1pdHRlclxufVxuXG5mdW5jdGlvbiBnZXRDb250ZW50T2JqZWN0KHN0YXRlUmVzb2x2ZVJlc3VsdHNPYmplY3QsIHN0YXRlTmFtZSkge1xuXHR2YXIgYWxsUG9zc2libGVSZXNvbHZlZFN0YXRlTmFtZXMgPSBwYXJzZShzdGF0ZU5hbWUpXG5cblx0cmV0dXJuIGFsbFBvc3NpYmxlUmVzb2x2ZWRTdGF0ZU5hbWVzLmZpbHRlcihmdW5jdGlvbihzdGF0ZU5hbWUpIHtcblx0XHRyZXR1cm4gc3RhdGVSZXNvbHZlUmVzdWx0c09iamVjdFtzdGF0ZU5hbWVdXG5cdH0pLnJlZHVjZShmdW5jdGlvbihvYmosIHN0YXRlTmFtZSkge1xuXHRcdHJldHVybiBleHRlbmQob2JqLCBzdGF0ZVJlc29sdmVSZXN1bHRzT2JqZWN0W3N0YXRlTmFtZV0pXG5cdH0sIHt9KVxufVxuXG5mdW5jdGlvbiByZWRpcmVjdG9yKG5ld1N0YXRlTmFtZSwgcGFyYW1ldGVycykge1xuXHRyZXR1cm4ge1xuXHRcdHJlZGlyZWN0VG86IHtcblx0XHRcdG5hbWU6IG5ld1N0YXRlTmFtZSxcblx0XHRcdHBhcmFtczogcGFyYW1ldGVyc1xuXHRcdH1cblx0fVxufVxuXG4vLyB7IFtzdGF0ZU5hbWVdOiByZXNvbHZlUmVzdWx0IH1cbmZ1bmN0aW9uIHJlc29sdmVTdGF0ZXMoc3RhdGVzLCBwYXJhbWV0ZXJzKSB7XG5cdHZhciBzdGF0ZXNXaXRoUmVzb2x2ZUZ1bmN0aW9ucyA9IHN0YXRlcy5maWx0ZXIoaXNGdW5jdGlvbigncmVzb2x2ZScpKVxuXHR2YXIgc3RhdGVOYW1lc1dpdGhSZXNvbHZlRnVuY3Rpb25zID0gc3RhdGVzV2l0aFJlc29sdmVGdW5jdGlvbnMubWFwKHByb3BlcnR5KCduYW1lJykpXG5cdHZhciByZXNvbHZlcyA9IFByb21pc2UuYWxsKHN0YXRlc1dpdGhSZXNvbHZlRnVuY3Rpb25zLm1hcChmdW5jdGlvbihzdGF0ZSkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cdFx0XHRmdW5jdGlvbiByZXNvbHZlQ2IoZXJyLCBjb250ZW50KSB7XG5cdFx0XHRcdGVyciA/IHJlamVjdChlcnIpIDogcmVzb2x2ZShjb250ZW50KVxuXHRcdFx0fVxuXG5cdFx0XHRyZXNvbHZlQ2IucmVkaXJlY3QgPSBmdW5jdGlvbiByZWRpcmVjdChuZXdTdGF0ZU5hbWUsIHBhcmFtZXRlcnMpIHtcblx0XHRcdFx0cmVqZWN0KHJlZGlyZWN0b3IobmV3U3RhdGVOYW1lLCBwYXJhbWV0ZXJzKSlcblx0XHRcdH1cblxuXHRcdFx0dmFyIHJlcyA9IHN0YXRlLnJlc29sdmUoc3RhdGUuZGF0YSwgcGFyYW1ldGVycywgcmVzb2x2ZUNiKVxuXHRcdFx0aWYgKHJlcyAmJiAodHlwZW9mIHJlcyA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHJlcyA9PT0gJ2Z1bmN0aW9uJykgJiYgdHlwZW9mIHJlcy50aGVuID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRcdHJlc29sdmUocmVzKVxuXHRcdFx0fVxuXHRcdH0pXG5cdH0pKVxuXG5cdHJldHVybiByZXNvbHZlcy50aGVuKGZ1bmN0aW9uKHJlc29sdmVSZXN1bHRzKSB7XG5cdFx0cmV0dXJuIGNvbWJpbmUoe1xuXHRcdFx0c3RhdGVOYW1lOiBzdGF0ZU5hbWVzV2l0aFJlc29sdmVGdW5jdGlvbnMsXG5cdFx0XHRyZXNvbHZlUmVzdWx0OiByZXNvbHZlUmVzdWx0c1xuXHRcdH0pLnJlZHVjZShmdW5jdGlvbihvYmosIHJlc3VsdCkge1xuXHRcdFx0b2JqW3Jlc3VsdC5zdGF0ZU5hbWVdID0gcmVzdWx0LnJlc29sdmVSZXN1bHRcblx0XHRcdHJldHVybiBvYmpcblx0XHR9LCB7fSlcblx0fSlcbn1cblxuZnVuY3Rpb24gcHJvcGVydHkobmFtZSkge1xuXHRyZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG5cdFx0cmV0dXJuIG9ialtuYW1lXVxuXHR9XG59XG5cbmZ1bmN0aW9uIHJldmVyc2UoYXJ5KSB7XG5cdHJldHVybiBhcnkuc2xpY2UoKS5yZXZlcnNlKClcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbihwcm9wZXJ0eSkge1xuXHRyZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG5cdFx0cmV0dXJuIHR5cGVvZiBvYmpbcHJvcGVydHldID09PSAnZnVuY3Rpb24nXG5cdH1cbn1cblxuZnVuY3Rpb24gcHJvbWlzZU1lKCkge1xuXHR2YXIgZm4gPSBBcnJheS5wcm90b3R5cGUuc2hpZnQuYXBwbHkoYXJndW1lbnRzKVxuXHR2YXIgYXJncyA9IGFyZ3VtZW50c1xuXHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuXHRcdHJlc29sdmUoZm4uYXBwbHkobnVsbCwgYXJncykpXG5cdH0pXG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW1sdVpHVjRMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUk3UVVGQlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lkbUZ5SUZOMFlYUmxVM1JoZEdVZ1BTQnlaWEYxYVhKbEtDY3VMMnhwWWk5emRHRjBaUzF6ZEdGMFpTY3BYRzUyWVhJZ1UzUmhkR1ZEYjIxd1lYSnBjMjl1SUQwZ2NtVnhkV2x5WlNnbkxpOXNhV0l2YzNSaGRHVXRZMjl0Y0dGeWFYTnZiaWNwWEc1MllYSWdRM1Z5Y21WdWRGTjBZWFJsSUQwZ2NtVnhkV2x5WlNnbkxpOXNhV0l2WTNWeWNtVnVkQzF6ZEdGMFpTY3BYRzUyWVhJZ2MzUmhkR1ZEYUdGdVoyVk1iMmRwWXlBOUlISmxjWFZwY21Vb0p5NHZiR2xpTDNOMFlYUmxMV05vWVc1blpTMXNiMmRwWXljcFhHNTJZWElnY0dGeWMyVWdQU0J5WlhGMWFYSmxLQ2N1TDJ4cFlpOXpkR0YwWlMxemRISnBibWN0Y0dGeWMyVnlKeWxjYm5aaGNpQlRkR0YwWlZSeVlXNXphWFJwYjI1TllXNWhaMlZ5SUQwZ2NtVnhkV2x5WlNnbkxpOXNhV0l2YzNSaGRHVXRkSEpoYm5OcGRHbHZiaTF0WVc1aFoyVnlKeWxjYm5aaGNpQmtaV1poZFd4MFVtOTFkR1Z5VDNCMGFXOXVjeUE5SUhKbGNYVnBjbVVvSnk0dlpHVm1ZWFZzZEMxeWIzVjBaWEl0YjNCMGFXOXVjeTVxY3ljcFhHNWNiblpoY2lCelpYSnBaWE1nUFNCeVpYRjFhWEpsS0NjdUwyeHBZaTl3Y205dGFYTmxMVzFoY0MxelpYSnBaWE1uS1Z4dWRtRnlJR1JsYm05a1pXbG1lU0E5SUhKbGNYVnBjbVVvSjNSb1pXNHRaR1Z1YjJSbGFXWjVKeWxjYmx4dWRtRnlJRVYyWlc1MFJXMXBkSFJsY2lBOUlISmxjWFZwY21Vb0oyVjJaVzUwY3ljcExrVjJaVzUwUlcxcGRIUmxjbHh1ZG1GeUlHVjRkR1Z1WkNBOUlISmxjWFZwY21Vb0ozaDBaVzVrSnlsY2JuWmhjaUJ1WlhkSVlYTm9Rbkp2ZDI1U2IzVjBaWElnUFNCeVpYRjFhWEpsS0Nkb1lYTm9MV0p5YjNkdUxYSnZkWFJsY2ljcFhHNTJZWElnWTI5dFltbHVaU0E5SUhKbGNYVnBjbVVvSjJOdmJXSnBibVV0WVhKeVlYbHpKeWxjYm5aaGNpQmlkV2xzWkZCaGRHZ2dQU0J5WlhGMWFYSmxLQ2R3WVdkbExYQmhkR2d0WW5WcGJHUmxjaWNwWEc1Y2JuSmxjWFZwY21Vb0oyNWhkR2wyWlMxd2NtOXRhWE5sTFc5dWJIa3ZibkJ2SnlsY2JseHVkbUZ5SUdWNGNHVmpkR1ZrVUhKdmNHVnlkR2xsYzA5bVFXUmtVM1JoZEdVZ1BTQmJKMjVoYldVbkxDQW5jbTkxZEdVbkxDQW5aR1ZtWVhWc2RFTm9hV3hrSnl3Z0oyUmhkR0VuTENBbmRHVnRjR3hoZEdVbkxDQW5jbVZ6YjJ4MlpTY3NJQ2RoWTNScGRtRjBaU2NzSUNkeGRXVnllWE4wY21sdVoxQmhjbUZ0WlhSbGNuTW5MQ0FuWkdWbVlYVnNkRkYxWlhKNWMzUnlhVzVuVUdGeVlXMWxkR1Z5Y3lkZFhHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdablZ1WTNScGIyNGdVM1JoZEdWUWNtOTJhV1JsY2lodFlXdGxVbVZ1WkdWeVpYSXNJSEp2YjNSRmJHVnRaVzUwTENCemRHRjBaVkp2ZFhSbGNrOXdkR2x2Ym5NcElIdGNibHgwZG1GeUlIQnliM1J2ZEhsd1lXeFRkR0YwWlVodmJHUmxjaUE5SUZOMFlYUmxVM1JoZEdVb0tWeHVYSFIyWVhJZ2JHRnpkRU52YlhCc1pYUmxiSGxNYjJGa1pXUlRkR0YwWlNBOUlFTjFjbkpsYm5SVGRHRjBaU2dwWEc1Y2RIWmhjaUJzWVhOMFUzUmhkR1ZUZEdGeWRHVmtRV04wYVhaaGRHbHVaeUE5SUVOMWNuSmxiblJUZEdGMFpTZ3BYRzVjZEhaaGNpQnpkR0YwWlZCeWIzWnBaR1Z5UlcxcGRIUmxjaUE5SUc1bGR5QkZkbVZ1ZEVWdGFYUjBaWElvS1Z4dVhIUlRkR0YwWlZSeVlXNXphWFJwYjI1TllXNWhaMlZ5S0hOMFlYUmxVSEp2ZG1sa1pYSkZiV2wwZEdWeUtWeHVYSFJ6ZEdGMFpWSnZkWFJsY2s5d2RHbHZibk1nUFNCbGVIUmxibVFvZTF4dVhIUmNkSFJvY205M1QyNUZjbkp2Y2pvZ2RISjFaU3hjYmx4MFhIUndZWFJvVUhKbFptbDRPaUFuSXlkY2JseDBmU3dnYzNSaGRHVlNiM1YwWlhKUGNIUnBiMjV6S1Z4dVhHNWNkR2xtSUNnaGMzUmhkR1ZTYjNWMFpYSlBjSFJwYjI1ekxuSnZkWFJsY2lrZ2UxeHVYSFJjZEhOMFlYUmxVbTkxZEdWeVQzQjBhVzl1Y3k1eWIzVjBaWElnUFNCdVpYZElZWE5vUW5KdmQyNVNiM1YwWlhJb1pHVm1ZWFZzZEZKdmRYUmxjazl3ZEdsdmJuTXBYRzVjZEgxY2JseHVYSFJ6ZEdGMFpWSnZkWFJsY2s5d2RHbHZibk11Y205MWRHVnlMbk5sZEVSbFptRjFiSFFvWm5WdVkzUnBiMjRvY205MWRHVXNJSEJoY21GdFpYUmxjbk1wSUh0Y2JseDBYSFJ6ZEdGMFpWQnliM1pwWkdWeVJXMXBkSFJsY2k1bGJXbDBLQ2R5YjNWMFpVNXZkRVp2ZFc1a0p5d2djbTkxZEdVc0lIQmhjbUZ0WlhSbGNuTXBYRzVjZEgwcFhHNWNibHgwZG1GeUlHUmxjM1J5YjNsRWIyMGdQU0J1ZFd4c1hHNWNkSFpoY2lCblpYUkViMjFEYUdsc1pDQTlJRzUxYkd4Y2JseDBkbUZ5SUhKbGJtUmxja1J2YlNBOUlHNTFiR3hjYmx4MGRtRnlJSEpsYzJWMFJHOXRJRDBnYm5Wc2JGeHVYRzVjZEhaaGNpQmhZM1JwZG1WRWIyMUJjR2x6SUQwZ2UzMWNibHgwZG1GeUlHRmpkR2wyWlZOMFlYUmxVbVZ6YjJ4MlpVTnZiblJsYm5RZ1BTQjdmVnh1WEhSMllYSWdZV04wYVhabFJXMXBkSFJsY25NZ1BTQjdmVnh1WEc1Y2RHWjFibU4wYVc5dUlHaGhibVJzWlVWeWNtOXlLR1YyWlc1MExDQmxjbklwSUh0Y2JseDBYSFJ3Y205alpYTnpMbTVsZUhSVWFXTnJLR1oxYm1OMGFXOXVLQ2tnZTF4dVhIUmNkRngwYzNSaGRHVlFjbTkyYVdSbGNrVnRhWFIwWlhJdVpXMXBkQ2hsZG1WdWRDd2daWEp5S1Z4dVhIUmNkRngwWTI5dWMyOXNaUzVsY25KdmNpaGxkbVZ1ZENBcklDY2dMU0FuSUNzZ1pYSnlMbTFsYzNOaFoyVXBYRzVjZEZ4MFhIUnBaaUFvYzNSaGRHVlNiM1YwWlhKUGNIUnBiMjV6TG5Sb2NtOTNUMjVGY25KdmNpa2dlMXh1WEhSY2RGeDBYSFIwYUhKdmR5QmxjbkpjYmx4MFhIUmNkSDFjYmx4MFhIUjlLVnh1WEhSOVhHNWNibHgwWm5WdVkzUnBiMjRnWkdWemRISnZlVk4wWVhSbFRtRnRaU2h6ZEdGMFpVNWhiV1VwSUh0Y2JseDBYSFIyWVhJZ2MzUmhkR1VnUFNCd2NtOTBiM1I1Y0dGc1UzUmhkR1ZJYjJ4a1pYSXVaMlYwS0hOMFlYUmxUbUZ0WlNsY2JseDBYSFJ6ZEdGMFpWQnliM1pwWkdWeVJXMXBkSFJsY2k1bGJXbDBLQ2RpWldadmNtVkVaWE4wY205NVUzUmhkR1VuTENCN1hHNWNkRngwWEhSemRHRjBaVG9nYzNSaGRHVXNYRzVjZEZ4MFhIUmtiMjFCY0drNklHRmpkR2wyWlVSdmJVRndhWE5iYzNSaGRHVk9ZVzFsWFZ4dVhIUmNkSDBwWEc1Y2JseDBYSFJoWTNScGRtVkZiV2wwZEdWeWMxdHpkR0YwWlU1aGJXVmRMbVZ0YVhRb0oyUmxjM1J5YjNrbktWeHVYSFJjZEdGamRHbDJaVVZ0YVhSMFpYSnpXM04wWVhSbFRtRnRaVjB1Y21WdGIzWmxRV3hzVEdsemRHVnVaWEp6S0NsY2JseDBYSFJrWld4bGRHVWdZV04wYVhabFJXMXBkSFJsY25OYmMzUmhkR1ZPWVcxbFhWeHVYSFJjZEdSbGJHVjBaU0JoWTNScGRtVlRkR0YwWlZKbGMyOXNkbVZEYjI1MFpXNTBXM04wWVhSbFRtRnRaVjFjYmx4dVhIUmNkSEpsZEhWeWJpQmtaWE4wY205NVJHOXRLR0ZqZEdsMlpVUnZiVUZ3YVhOYmMzUmhkR1ZPWVcxbFhTa3VkR2hsYmlobWRXNWpkR2x2YmlncElIdGNibHgwWEhSY2RHUmxiR1YwWlNCaFkzUnBkbVZFYjIxQmNHbHpXM04wWVhSbFRtRnRaVjFjYmx4MFhIUmNkSE4wWVhSbFVISnZkbWxrWlhKRmJXbDBkR1Z5TG1WdGFYUW9KMkZtZEdWeVJHVnpkSEp2ZVZOMFlYUmxKeXdnZTF4dVhIUmNkRngwWEhSemRHRjBaVG9nYzNSaGRHVmNibHgwWEhSY2RIMHBYRzVjZEZ4MGZTbGNibHgwZlZ4dVhHNWNkR1oxYm1OMGFXOXVJSEpsYzJWMFUzUmhkR1ZPWVcxbEtIQmhjbUZ0WlhSbGNuTXNJSE4wWVhSbFRtRnRaU2tnZTF4dVhIUmNkSFpoY2lCa2IyMUJjR2tnUFNCaFkzUnBkbVZFYjIxQmNHbHpXM04wWVhSbFRtRnRaVjFjYmx4MFhIUjJZWElnWTI5dWRHVnVkQ0E5SUdkbGRFTnZiblJsYm5SUFltcGxZM1FvWVdOMGFYWmxVM1JoZEdWU1pYTnZiSFpsUTI5dWRHVnVkQ3dnYzNSaGRHVk9ZVzFsS1Z4dVhIUmNkSFpoY2lCemRHRjBaU0E5SUhCeWIzUnZkSGx3WVd4VGRHRjBaVWh2YkdSbGNpNW5aWFFvYzNSaGRHVk9ZVzFsS1Z4dVhHNWNkRngwYzNSaGRHVlFjbTkyYVdSbGNrVnRhWFIwWlhJdVpXMXBkQ2duWW1WbWIzSmxVbVZ6WlhSVGRHRjBaU2NzSUh0Y2JseDBYSFJjZEdSdmJVRndhVG9nWkc5dFFYQnBMRnh1WEhSY2RGeDBZMjl1ZEdWdWREb2dZMjl1ZEdWdWRDeGNibHgwWEhSY2RITjBZWFJsT2lCemRHRjBaU3hjYmx4MFhIUmNkSEJoY21GdFpYUmxjbk02SUhCaGNtRnRaWFJsY25OY2JseDBYSFI5S1Z4dVhHNWNkRngwWVdOMGFYWmxSVzFwZEhSbGNuTmJjM1JoZEdWT1lXMWxYUzVsYldsMEtDZGtaWE4wY205NUp5bGNibHgwWEhSa1pXeGxkR1VnWVdOMGFYWmxSVzFwZEhSbGNuTmJjM1JoZEdWT1lXMWxYVnh1WEc1Y2RGeDBjbVYwZFhKdUlISmxjMlYwUkc5dEtIdGNibHgwWEhSY2RHUnZiVUZ3YVRvZ1pHOXRRWEJwTEZ4dVhIUmNkRngwWTI5dWRHVnVkRG9nWTI5dWRHVnVkQ3hjYmx4MFhIUmNkSFJsYlhCc1lYUmxPaUJ6ZEdGMFpTNTBaVzF3YkdGMFpTeGNibHgwWEhSY2RIQmhjbUZ0WlhSbGNuTTZJSEJoY21GdFpYUmxjbk5jYmx4MFhIUjlLUzUwYUdWdUtHWjFibU4wYVc5dUtDa2dlMXh1WEhSY2RGeDBjM1JoZEdWUWNtOTJhV1JsY2tWdGFYUjBaWEl1WlcxcGRDZ25ZV1owWlhKU1pYTmxkRk4wWVhSbEp5d2dlMXh1WEhSY2RGeDBYSFJrYjIxQmNHazZJR1J2YlVGd2FTeGNibHgwWEhSY2RGeDBZMjl1ZEdWdWREb2dZMjl1ZEdWdWRDeGNibHgwWEhSY2RGeDBjM1JoZEdVNklITjBZWFJsTEZ4dVhIUmNkRngwWEhSd1lYSmhiV1YwWlhKek9pQndZWEpoYldWMFpYSnpYRzVjZEZ4MFhIUjlLVnh1WEhSY2RIMHBYRzVjZEgxY2JseHVYSFJtZFc1amRHbHZiaUJuWlhSRGFHbHNaRVZzWlcxbGJuUkdiM0pUZEdGMFpVNWhiV1VvYzNSaGRHVk9ZVzFsS1NCN1hHNWNkRngwY21WMGRYSnVJRzVsZHlCUWNtOXRhWE5sS0daMWJtTjBhVzl1S0hKbGMyOXNkbVVwSUh0Y2JseDBYSFJjZEhaaGNpQndZWEpsYm5RZ1BTQndjbTkwYjNSNWNHRnNVM1JoZEdWSWIyeGtaWEl1WjJWMFVHRnlaVzUwS0hOMFlYUmxUbUZ0WlNsY2JseDBYSFJjZEdsbUlDaHdZWEpsYm5RcElIdGNibHgwWEhSY2RGeDBkbUZ5SUhCaGNtVnVkRVJ2YlVGd2FTQTlJR0ZqZEdsMlpVUnZiVUZ3YVhOYmNHRnlaVzUwTG01aGJXVmRYRzVjZEZ4MFhIUmNkSEpsYzI5c2RtVW9aMlYwUkc5dFEyaHBiR1FvY0dGeVpXNTBSRzl0UVhCcEtTbGNibHgwWEhSY2RIMGdaV3h6WlNCN1hHNWNkRngwWEhSY2RISmxjMjlzZG1Vb2NtOXZkRVZzWlcxbGJuUXBYRzVjZEZ4MFhIUjlYRzVjZEZ4MGZTbGNibHgwZlZ4dVhHNWNkR1oxYm1OMGFXOXVJSEpsYm1SbGNsTjBZWFJsVG1GdFpTaHdZWEpoYldWMFpYSnpMQ0J6ZEdGMFpVNWhiV1VwSUh0Y2JseDBYSFJ5WlhSMWNtNGdaMlYwUTJocGJHUkZiR1Z0Wlc1MFJtOXlVM1JoZEdWT1lXMWxLSE4wWVhSbFRtRnRaU2t1ZEdobGJpaG1kVzVqZEdsdmJpaGphR2xzWkVWc1pXMWxiblFwSUh0Y2JseDBYSFJjZEhaaGNpQnpkR0YwWlNBOUlIQnliM1J2ZEhsd1lXeFRkR0YwWlVodmJHUmxjaTVuWlhRb2MzUmhkR1ZPWVcxbEtWeHVYSFJjZEZ4MGRtRnlJR052Ym5SbGJuUWdQU0JuWlhSRGIyNTBaVzUwVDJKcVpXTjBLR0ZqZEdsMlpWTjBZWFJsVW1WemIyeDJaVU52Ym5SbGJuUXNJSE4wWVhSbFRtRnRaU2xjYmx4dVhIUmNkRngwYzNSaGRHVlFjbTkyYVdSbGNrVnRhWFIwWlhJdVpXMXBkQ2duWW1WbWIzSmxRM0psWVhSbFUzUmhkR1VuTENCN1hHNWNkRngwWEhSY2RITjBZWFJsT2lCemRHRjBaU3hjYmx4MFhIUmNkRngwWTI5dWRHVnVkRG9nWTI5dWRHVnVkQ3hjYmx4MFhIUmNkRngwY0dGeVlXMWxkR1Z5Y3pvZ2NHRnlZVzFsZEdWeWMxeHVYSFJjZEZ4MGZTbGNibHh1WEhSY2RGeDBjbVYwZFhKdUlISmxibVJsY2tSdmJTaDdYRzVjZEZ4MFhIUmNkR1ZzWlcxbGJuUTZJR05vYVd4a1JXeGxiV1Z1ZEN4Y2JseDBYSFJjZEZ4MGRHVnRjR3hoZEdVNklITjBZWFJsTG5SbGJYQnNZWFJsTEZ4dVhIUmNkRngwWEhSamIyNTBaVzUwT2lCamIyNTBaVzUwTEZ4dVhIUmNkRngwWEhSd1lYSmhiV1YwWlhKek9pQndZWEpoYldWMFpYSnpYRzVjZEZ4MFhIUjlLUzUwYUdWdUtHWjFibU4wYVc5dUtHUnZiVUZ3YVNrZ2UxeHVYSFJjZEZ4MFhIUmhZM1JwZG1WRWIyMUJjR2x6VzNOMFlYUmxUbUZ0WlYwZ1BTQmtiMjFCY0dsY2JseDBYSFJjZEZ4MGMzUmhkR1ZRY205MmFXUmxja1Z0YVhSMFpYSXVaVzFwZENnbllXWjBaWEpEY21WaGRHVlRkR0YwWlNjc0lIdGNibHgwWEhSY2RGeDBYSFJ6ZEdGMFpUb2djM1JoZEdVc1hHNWNkRngwWEhSY2RGeDBaRzl0UVhCcE9pQmtiMjFCY0drc1hHNWNkRngwWEhSY2RGeDBZMjl1ZEdWdWREb2dZMjl1ZEdWdWRDeGNibHgwWEhSY2RGeDBYSFJ3WVhKaGJXVjBaWEp6T2lCd1lYSmhiV1YwWlhKelhHNWNkRngwWEhSY2RIMHBYRzVjZEZ4MFhIUmNkSEpsZEhWeWJpQmtiMjFCY0dsY2JseDBYSFJjZEgwcFhHNWNkRngwZlNsY2JseDBmVnh1WEc1Y2RHWjFibU4wYVc5dUlISmxibVJsY2tGc2JDaHpkR0YwWlU1aGJXVnpMQ0J3WVhKaGJXVjBaWEp6S1NCN1hHNWNkRngwY21WMGRYSnVJSE5sY21sbGN5aHpkR0YwWlU1aGJXVnpMQ0J5Wlc1a1pYSlRkR0YwWlU1aGJXVXVZbWx1WkNodWRXeHNMQ0J3WVhKaGJXVjBaWEp6S1NsY2JseDBmVnh1WEc1Y2RHWjFibU4wYVc5dUlHOXVVbTkxZEdWRGFHRnVaMlVvYzNSaGRHVXNJSEJoY21GdFpYUmxjbk1wSUh0Y2JseDBYSFIwY25rZ2UxeHVYSFJjZEZ4MGRtRnlJR1pwYm1Gc1JHVnpkR2x1WVhScGIyNVRkR0YwWlU1aGJXVWdQU0J3Y205MGIzUjVjR0ZzVTNSaGRHVkliMnhrWlhJdVlYQndiSGxFWldaaGRXeDBRMmhwYkdSVGRHRjBaWE1vYzNSaGRHVXVibUZ0WlNsY2JseHVYSFJjZEZ4MGFXWWdLR1pwYm1Gc1JHVnpkR2x1WVhScGIyNVRkR0YwWlU1aGJXVWdQVDA5SUhOMFlYUmxMbTVoYldVcElIdGNibHgwWEhSY2RGeDBaVzFwZEVWMlpXNTBRVzVrUVhSMFpXMXdkRk4wWVhSbFEyaGhibWRsS0dacGJtRnNSR1Z6ZEdsdVlYUnBiMjVUZEdGMFpVNWhiV1VzSUhCaGNtRnRaWFJsY25NcFhHNWNkRngwWEhSOUlHVnNjMlVnZTF4dVhIUmNkRngwWEhRdkx5QlVhR1Z5WlNCaGNtVWdaR1ZtWVhWc2RDQmphR2xzWkNCemRHRjBaWE1nZEdoaGRDQnVaV1ZrSUhSdklHSmxJR0Z3Y0d4cFpXUmNibHh1WEhSY2RGeDBYSFIyWVhJZ2RHaGxVbTkxZEdWWFpVNWxaV1JVYjBWdVpGVndRWFFnUFNCdFlXdGxVR0YwYUNobWFXNWhiRVJsYzNScGJtRjBhVzl1VTNSaGRHVk9ZVzFsTENCd1lYSmhiV1YwWlhKektWeHVYSFJjZEZ4MFhIUjJZWElnWTNWeWNtVnVkRkp2ZFhSbElEMGdjM1JoZEdWU2IzVjBaWEpQY0hScGIyNXpMbkp2ZFhSbGNpNXNiMk5oZEdsdmJpNW5aWFFvS1Z4dVhHNWNkRngwWEhSY2RHbG1JQ2gwYUdWU2IzVjBaVmRsVG1WbFpGUnZSVzVrVlhCQmRDQTlQVDBnWTNWeWNtVnVkRkp2ZFhSbEtTQjdYRzVjZEZ4MFhIUmNkRngwTHk4Z2RHaGxJR05vYVd4a0lITjBZWFJsSUdoaGN5QjBhR1VnYzJGdFpTQnliM1YwWlNCaGN5QjBhR1VnWTNWeWNtVnVkQ0J2Ym1Vc0lHcDFjM1FnYzNSaGNuUWdibUYyYVdkaGRHbHVaeUIwYUdWeVpWeHVYSFJjZEZ4MFhIUmNkR1Z0YVhSRmRtVnVkRUZ1WkVGMGRHVnRjSFJUZEdGMFpVTm9ZVzVuWlNobWFXNWhiRVJsYzNScGJtRjBhVzl1VTNSaGRHVk9ZVzFsTENCd1lYSmhiV1YwWlhKektWeHVYSFJjZEZ4MFhIUjlJR1ZzYzJVZ2UxeHVYSFJjZEZ4MFhIUmNkQzh2SUdOb1lXNW5aU0IwYUdVZ2RYSnNJSFJ2SUcxaGRHTm9JSFJvWlNCbWRXeHNJR1JsWm1GMWJIUWdZMmhwYkdRZ2MzUmhkR1VnY205MWRHVmNibHgwWEhSY2RGeDBYSFJ6ZEdGMFpWQnliM1pwWkdWeVJXMXBkSFJsY2k1bmJ5aG1hVzVoYkVSbGMzUnBibUYwYVc5dVUzUmhkR1ZPWVcxbExDQndZWEpoYldWMFpYSnpMQ0I3SUhKbGNHeGhZMlU2SUhSeWRXVWdmU2xjYmx4MFhIUmNkRngwZlZ4dVhIUmNkRngwZlZ4dVhIUmNkSDBnWTJGMFkyZ2dLR1Z5Y2lrZ2UxeHVYSFJjZEZ4MGFHRnVaR3hsUlhKeWIzSW9KM04wWVhSbFJYSnliM0luTENCbGNuSXBYRzVjZEZ4MGZWeHVYSFI5WEc1Y2JseDBablZ1WTNScGIyNGdZV1JrVTNSaGRHVW9jM1JoZEdVcElIdGNibHgwWEhScFppQW9kSGx3Wlc5bUlITjBZWFJsSUQwOVBTQW5kVzVrWldacGJtVmtKeWtnZTF4dVhIUmNkRngwZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2RGZUhCbFkzUmxaQ0JjWENkemRHRjBaVnhjSnlCMGJ5QmlaU0J3WVhOelpXUWdhVzR1SnlsY2JseDBYSFI5SUdWc2MyVWdhV1lnS0hSNWNHVnZaaUJ6ZEdGMFpTNXVZVzFsSUQwOVBTQW5kVzVrWldacGJtVmtKeWtnZTF4dVhIUmNkRngwZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2RGZUhCbFkzUmxaQ0IwYUdVZ1hGd25ibUZ0WlZ4Y0p5QnZjSFJwYjI0Z2RHOGdZbVVnY0dGemMyVmtJR2x1TGljcFhHNWNkRngwZlNCbGJITmxJR2xtSUNoMGVYQmxiMllnYzNSaGRHVXVkR1Z0Y0d4aGRHVWdQVDA5SUNkMWJtUmxabWx1WldRbktTQjdYRzVjZEZ4MFhIUjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0owVjRjR1ZqZEdWa0lIUm9aU0JjWENkMFpXMXdiR0YwWlZ4Y0p5QnZjSFJwYjI0Z2RHOGdZbVVnY0dGemMyVmtJR2x1TGljcFhHNWNkRngwZlZ4dVhIUmNkRTlpYW1WamRDNXJaWGx6S0hOMFlYUmxLUzVtYVd4MFpYSW9ablZ1WTNScGIyNG9hMlY1S1NCN1hHNWNkRngwWEhSeVpYUjFjbTRnWlhod1pXTjBaV1JRY205d1pYSjBhV1Z6VDJaQlpHUlRkR0YwWlM1cGJtUmxlRTltS0d0bGVTa2dQVDA5SUMweFhHNWNkRngwZlNrdVptOXlSV0ZqYUNobWRXNWpkR2x2YmloclpYa3BJSHRjYmx4MFhIUmNkR052Ym5OdmJHVXVkMkZ5YmlnblZXNWxlSEJsWTNSbFpDQndjbTl3WlhKMGVTQndZWE56WldRZ2RHOGdZV1JrVTNSaGRHVTZKeXdnYTJWNUtWeHVYSFJjZEgwcFhHNWNibHgwWEhSd2NtOTBiM1I1Y0dGc1UzUmhkR1ZJYjJ4a1pYSXVZV1JrS0hOMFlYUmxMbTVoYldVc0lITjBZWFJsS1Z4dVhHNWNkRngwZG1GeUlISnZkWFJsSUQwZ2NISnZkRzkwZVhCaGJGTjBZWFJsU0c5c1pHVnlMbUoxYVd4a1JuVnNiRk4wWVhSbFVtOTFkR1VvYzNSaGRHVXVibUZ0WlNsY2JseHVYSFJjZEhOMFlYUmxVbTkxZEdWeVQzQjBhVzl1Y3k1eWIzVjBaWEl1WVdSa0tISnZkWFJsTENCdmJsSnZkWFJsUTJoaGJtZGxMbUpwYm1Rb2JuVnNiQ3dnYzNSaGRHVXBLVnh1WEhSOVhHNWNibHgwWm5WdVkzUnBiMjRnWjJWMFUzUmhkR1Z6Vkc5U1pYTnZiSFpsS0hOMFlYUmxRMmhoYm1kbGN5a2dlMXh1WEhSY2RISmxkSFZ5YmlCemRHRjBaVU5vWVc1blpYTXVZMmhoYm1kbExtTnZibU5oZENoemRHRjBaVU5vWVc1blpYTXVZM0psWVhSbEtTNXRZWEFvY0hKdmRHOTBlWEJoYkZOMFlYUmxTRzlzWkdWeUxtZGxkQ2xjYmx4MGZWeHVYRzVjZEdaMWJtTjBhVzl1SUdWdGFYUkZkbVZ1ZEVGdVpFRjBkR1Z0Y0hSVGRHRjBaVU5vWVc1blpTaHVaWGRUZEdGMFpVNWhiV1VzSUhCaGNtRnRaWFJsY25NcElIdGNibHgwWEhSemRHRjBaVkJ5YjNacFpHVnlSVzFwZEhSbGNpNWxiV2wwS0NkemRHRjBaVU5vWVc1blpVRjBkR1Z0Y0hRbkxDQm1kVzVqZEdsdmJpQnpkR0YwWlVkdktIUnlZVzV6YVhScGIyNHBJSHRjYmx4MFhIUmNkR0YwZEdWdGNIUlRkR0YwWlVOb1lXNW5aU2h1WlhkVGRHRjBaVTVoYldVc0lIQmhjbUZ0WlhSbGNuTXNJSFJ5WVc1emFYUnBiMjRwWEc1Y2RGeDBmU2xjYmx4MGZWeHVYRzVjZEdaMWJtTjBhVzl1SUdGMGRHVnRjSFJUZEdGMFpVTm9ZVzVuWlNodVpYZFRkR0YwWlU1aGJXVXNJSEJoY21GdFpYUmxjbk1zSUhSeVlXNXphWFJwYjI0cElIdGNibHgwWEhSbWRXNWpkR2x2YmlCcFprNXZkRU5oYm1ObGJHeGxaQ2htYmlrZ2UxeHVYSFJjZEZ4MGNtVjBkWEp1SUdaMWJtTjBhVzl1S0NrZ2UxeHVYSFJjZEZ4MFhIUnBaaUFvZEhKaGJuTnBkR2x2Ymk1allXNWpaV3hzWldRcElIdGNibHgwWEhSY2RGeDBYSFIyWVhJZ1pYSnlJRDBnYm1WM0lFVnljbTl5S0NkVWFHVWdkSEpoYm5OcGRHbHZiaUIwYnlBbklDc2dibVYzVTNSaGRHVk9ZVzFsSUNzZ0ozZGhjeUJqWVc1alpXeHNaV1FuS1Z4dVhIUmNkRngwWEhSY2RHVnljaTUzWVhORFlXNWpaV3hzWldSQ2VWTnZiV1Z2Ym1WRmJITmxJRDBnZEhKMVpWeHVYSFJjZEZ4MFhIUmNkSFJvY205M0lHVnljbHh1WEhSY2RGeDBYSFI5SUdWc2MyVWdlMXh1WEhSY2RGeDBYSFJjZEhKbGRIVnliaUJtYmk1aGNIQnNlU2h1ZFd4c0xDQmhjbWQxYldWdWRITXBYRzVjZEZ4MFhIUmNkSDFjYmx4MFhIUmNkSDFjYmx4MFhIUjlYRzVjYmx4MFhIUnlaWFIxY200Z2NISnZiV2x6WlUxbEtIQnliM1J2ZEhsd1lXeFRkR0YwWlVodmJHUmxjaTVuZFdGeVlXNTBaV1ZCYkd4VGRHRjBaWE5GZUdsemRDd2dibVYzVTNSaGRHVk9ZVzFsS1Z4dVhIUmNkQzUwYUdWdUtHWjFibU4wYVc5dUlHRndjR3g1UkdWbVlYVnNkRkJoY21GdFpYUmxjbk1vS1NCN1hHNWNkRngwWEhSMllYSWdjM1JoZEdVZ1BTQndjbTkwYjNSNWNHRnNVM1JoZEdWSWIyeGtaWEl1WjJWMEtHNWxkMU4wWVhSbFRtRnRaU2xjYmx4MFhIUmNkSFpoY2lCa1pXWmhkV3gwVUdGeVlXMXpJRDBnYzNSaGRHVXVaR1ZtWVhWc2RGRjFaWEo1YzNSeWFXNW5VR0Z5WVcxbGRHVnljeUI4ZkNCN2ZWeHVYSFJjZEZ4MGRtRnlJRzVsWldSVWIwRndjR3g1UkdWbVlYVnNkSE1nUFNCUFltcGxZM1F1YTJWNWN5aGtaV1poZFd4MFVHRnlZVzF6S1M1emIyMWxLR1oxYm1OMGFXOXVJRzFwYzNOcGJtZFFZWEpoYldWMFpYSldZV3gxWlNod1lYSmhiU2tnZTF4dVhIUmNkRngwWEhSeVpYUjFjbTRnSVhCaGNtRnRaWFJsY25OYmNHRnlZVzFkWEc1Y2RGeDBYSFI5S1Z4dVhHNWNkRngwWEhScFppQW9ibVZsWkZSdlFYQndiSGxFWldaaGRXeDBjeWtnZTF4dVhIUmNkRngwWEhSMGFISnZkeUJ5WldScGNtVmpkRzl5S0c1bGQxTjBZWFJsVG1GdFpTd2daWGgwWlc1a0tHUmxabUYxYkhSUVlYSmhiWE1zSUhCaGNtRnRaWFJsY25NcEtWeHVYSFJjZEZ4MGZWeHVYSFJjZEZ4MGNtVjBkWEp1SUhOMFlYUmxYRzVjZEZ4MGZTa3VkR2hsYmlocFprNXZkRU5oYm1ObGJHeGxaQ2htZFc1amRHbHZiaWh6ZEdGMFpTa2dlMXh1WEhSY2RGeDBjM1JoZEdWUWNtOTJhV1JsY2tWdGFYUjBaWEl1WlcxcGRDZ25jM1JoZEdWRGFHRnVaMlZUZEdGeWRDY3NJSE4wWVhSbExDQndZWEpoYldWMFpYSnpLVnh1WEhSY2RGeDBiR0Z6ZEZOMFlYUmxVM1JoY25SbFpFRmpkR2wyWVhScGJtY3VjMlYwS0hOMFlYUmxMbTVoYldVc0lIQmhjbUZ0WlhSbGNuTXBYRzVjZEZ4MGZTa3BMblJvWlc0b1puVnVZM1JwYjI0Z1oyVjBVM1JoZEdWRGFHRnVaMlZ6S0NrZ2UxeHVYSFJjZEZ4MGRtRnlJSE4wWVhSbFEyOXRjR0Z5YVhOdmJsSmxjM1ZzZEhNZ1BTQlRkR0YwWlVOdmJYQmhjbWx6YjI0b2NISnZkRzkwZVhCaGJGTjBZWFJsU0c5c1pHVnlLU2hzWVhOMFEyOXRjR3hsZEdWc2VVeHZZV1JsWkZOMFlYUmxMbWRsZENncExtNWhiV1VzSUd4aGMzUkRiMjF3YkdWMFpXeDVURzloWkdWa1UzUmhkR1V1WjJWMEtDa3VjR0Z5WVcxbGRHVnljeXdnYm1WM1UzUmhkR1ZPWVcxbExDQndZWEpoYldWMFpYSnpLVnh1WEhSY2RGeDBjbVYwZFhKdUlITjBZWFJsUTJoaGJtZGxURzluYVdNb2MzUmhkR1ZEYjIxd1lYSnBjMjl1VW1WemRXeDBjeWtnTHk4Z2V5QmtaWE4wY205NUxDQmphR0Z1WjJVc0lHTnlaV0YwWlNCOVhHNWNkRngwZlNrdWRHaGxiaWhwWms1dmRFTmhibU5sYkd4bFpDaG1kVzVqZEdsdmJpQnlaWE52YkhabFJHVnpkSEp2ZVVGdVpFRmpkR2wyWVhSbFUzUmhkR1Z6S0hOMFlYUmxRMmhoYm1kbGN5a2dlMXh1WEhSY2RGeDBjbVYwZFhKdUlISmxjMjlzZG1WVGRHRjBaWE1vWjJWMFUzUmhkR1Z6Vkc5U1pYTnZiSFpsS0hOMFlYUmxRMmhoYm1kbGN5a3NJR1Y0ZEdWdVpDaHdZWEpoYldWMFpYSnpLU2t1WTJGMFkyZ29ablZ1WTNScGIyNGdiMjVTWlhOdmJIWmxSWEp5YjNJb1pTa2dlMXh1WEhSY2RGeDBYSFJsTG5OMFlYUmxRMmhoYm1kbFJYSnliM0lnUFNCMGNuVmxYRzVjZEZ4MFhIUmNkSFJvY205M0lHVmNibHgwWEhSY2RIMHBMblJvWlc0b2FXWk9iM1JEWVc1alpXeHNaV1FvWm5WdVkzUnBiMjRnWkdWemRISnZlVUZ1WkVGamRHbDJZWFJsS0hOMFlYUmxVbVZ6YjJ4MlpWSmxjM1ZzZEhOUFltcGxZM1FwSUh0Y2JseDBYSFJjZEZ4MGRISmhibk5wZEdsdmJpNWpZVzVqWld4c1lXSnNaU0E5SUdaaGJITmxYRzVjYmx4MFhIUmNkRngwWm5WdVkzUnBiMjRnWVdOMGFYWmhkR1ZCYkd3b0tTQjdYRzVjZEZ4MFhIUmNkRngwZG1GeUlITjBZWFJsYzFSdlFXTjBhWFpoZEdVZ1BTQnpkR0YwWlVOb1lXNW5aWE11WTJoaGJtZGxMbU52Ym1OaGRDaHpkR0YwWlVOb1lXNW5aWE11WTNKbFlYUmxLVnh1WEc1Y2RGeDBYSFJjZEZ4MGNtVjBkWEp1SUdGamRHbDJZWFJsVTNSaGRHVnpLSE4wWVhSbGMxUnZRV04wYVhaaGRHVXBYRzVjZEZ4MFhIUmNkSDFjYmx4dVhIUmNkRngwWEhSaFkzUnBkbVZUZEdGMFpWSmxjMjlzZG1WRGIyNTBaVzUwSUQwZ1pYaDBaVzVrS0dGamRHbDJaVk4wWVhSbFVtVnpiMngyWlVOdmJuUmxiblFzSUhOMFlYUmxVbVZ6YjJ4MlpWSmxjM1ZzZEhOUFltcGxZM1FwWEc1Y2JseDBYSFJjZEZ4MGNtVjBkWEp1SUhObGNtbGxjeWh5WlhabGNuTmxLSE4wWVhSbFEyaGhibWRsY3k1a1pYTjBjbTk1S1N3Z1pHVnpkSEp2ZVZOMFlYUmxUbUZ0WlNrdWRHaGxiaWhtZFc1amRHbHZiaWdwSUh0Y2JseDBYSFJjZEZ4MFhIUnlaWFIxY200Z2MyVnlhV1Z6S0hKbGRtVnljMlVvYzNSaGRHVkRhR0Z1WjJWekxtTm9ZVzVuWlNrc0lISmxjMlYwVTNSaGRHVk9ZVzFsTG1KcGJtUW9iblZzYkN3Z1pYaDBaVzVrS0hCaGNtRnRaWFJsY25NcEtTbGNibHgwWEhSY2RGeDBmU2t1ZEdobGJpaG1kVzVqZEdsdmJpZ3BJSHRjYmx4MFhIUmNkRngwWEhSeVpYUjFjbTRnY21WdVpHVnlRV3hzS0hOMFlYUmxRMmhoYm1kbGN5NWpjbVZoZEdVc0lHVjRkR1Z1WkNod1lYSmhiV1YwWlhKektTa3VkR2hsYmloaFkzUnBkbUYwWlVGc2JDbGNibHgwWEhSY2RGeDBmU2xjYmx4MFhIUmNkSDBwS1Z4dVhHNWNkRngwWEhSbWRXNWpkR2x2YmlCaFkzUnBkbUYwWlZOMFlYUmxjeWh6ZEdGMFpVNWhiV1Z6S1NCN1hHNWNkRngwWEhSY2RISmxkSFZ5YmlCemRHRjBaVTVoYldWekxtMWhjQ2h3Y205MGIzUjVjR0ZzVTNSaGRHVkliMnhrWlhJdVoyVjBLUzVtYjNKRllXTm9LR1oxYm1OMGFXOXVLSE4wWVhSbEtTQjdYRzVjZEZ4MFhIUmNkRngwZG1GeUlHVnRhWFIwWlhJZ1BTQnVaWGNnUlhabGJuUkZiV2wwZEdWeUtDbGNibHgwWEhSY2RGeDBYSFIyWVhJZ1kyOXVkR1Y0ZENBOUlFOWlhbVZqZEM1amNtVmhkR1VvWlcxcGRIUmxjaWxjYmx4MFhIUmNkRngwWEhSamIyNTBaWGgwTG1SdmJVRndhU0E5SUdGamRHbDJaVVJ2YlVGd2FYTmJjM1JoZEdVdWJtRnRaVjFjYmx4MFhIUmNkRngwWEhSamIyNTBaWGgwTG1SaGRHRWdQU0J6ZEdGMFpTNWtZWFJoWEc1Y2RGeDBYSFJjZEZ4MFkyOXVkR1Y0ZEM1d1lYSmhiV1YwWlhKeklEMGdjR0Z5WVcxbGRHVnljMXh1WEhSY2RGeDBYSFJjZEdOdmJuUmxlSFF1WTI5dWRHVnVkQ0E5SUdkbGRFTnZiblJsYm5SUFltcGxZM1FvWVdOMGFYWmxVM1JoZEdWU1pYTnZiSFpsUTI5dWRHVnVkQ3dnYzNSaGRHVXVibUZ0WlNsY2JseDBYSFJjZEZ4MFhIUmhZM1JwZG1WRmJXbDBkR1Z5YzF0emRHRjBaUzV1WVcxbFhTQTlJR1Z0YVhSMFpYSmNibHh1WEhSY2RGeDBYSFJjZEhSeWVTQjdYRzVjZEZ4MFhIUmNkRngwWEhSemRHRjBaUzVoWTNScGRtRjBaU0FtSmlCemRHRjBaUzVoWTNScGRtRjBaU2hqYjI1MFpYaDBLVnh1WEhSY2RGeDBYSFJjZEgwZ1kyRjBZMmdnS0dVcElIdGNibHgwWEhSY2RGeDBYSFJjZEhCeWIyTmxjM011Ym1WNGRGUnBZMnNvWm5WdVkzUnBiMjRvS1NCN1hHNWNkRngwWEhSY2RGeDBYSFJjZEhSb2NtOTNJR1ZjYmx4MFhIUmNkRngwWEhSY2RIMHBYRzVjZEZ4MFhIUmNkRngwZlZ4dVhIUmNkRngwWEhSOUtWeHVYSFJjZEZ4MGZWeHVYSFJjZEgwcEtTNTBhR1Z1S0daMWJtTjBhVzl1SUhOMFlYUmxRMmhoYm1kbFEyOXRjR3hsZEdVb0tTQjdYRzVjZEZ4MFhIUnNZWE4wUTI5dGNHeGxkR1ZzZVV4dllXUmxaRk4wWVhSbExuTmxkQ2h1WlhkVGRHRjBaVTVoYldVc0lIQmhjbUZ0WlhSbGNuTXBYRzVjZEZ4MFhIUjBjbmtnZTF4dVhIUmNkRngwWEhSemRHRjBaVkJ5YjNacFpHVnlSVzFwZEhSbGNpNWxiV2wwS0NkemRHRjBaVU5vWVc1blpVVnVaQ2NzSUhCeWIzUnZkSGx3WVd4VGRHRjBaVWh2YkdSbGNpNW5aWFFvYm1WM1UzUmhkR1ZPWVcxbEtTd2djR0Z5WVcxbGRHVnljeWxjYmx4MFhIUmNkSDBnWTJGMFkyZ2dLR1VwSUh0Y2JseDBYSFJjZEZ4MGFHRnVaR3hsUlhKeWIzSW9KM04wWVhSbFJYSnliM0luTENCbEtWeHVYSFJjZEZ4MGZWeHVYSFJjZEgwcExtTmhkR05vS0dsbVRtOTBRMkZ1WTJWc2JHVmtLR1oxYm1OMGFXOXVJR2hoYm1Sc1pWTjBZWFJsUTJoaGJtZGxSWEp5YjNJb1pYSnlLU0I3WEc1Y2RGeDBYSFJwWmlBb1pYSnlJQ1ltSUdWeWNpNXlaV1JwY21WamRGUnZLU0I3WEc1Y2RGeDBYSFJjZEhOMFlYUmxVSEp2ZG1sa1pYSkZiV2wwZEdWeUxtVnRhWFFvSjNOMFlYUmxRMmhoYm1kbFEyRnVZMlZzYkdWa0p5d2daWEp5S1Z4dVhIUmNkRngwWEhSeVpYUjFjbTRnYzNSaGRHVlFjbTkyYVdSbGNrVnRhWFIwWlhJdVoyOG9aWEp5TG5KbFpHbHlaV04wVkc4dWJtRnRaU3dnWlhKeUxuSmxaR2x5WldOMFZHOHVjR0Z5WVcxekxDQjdJSEpsY0d4aFkyVTZJSFJ5ZFdVZ2ZTbGNibHgwWEhSY2RIMGdaV3h6WlNCcFppQW9aWEp5S1NCN1hHNWNkRngwWEhSY2RHaGhibVJzWlVWeWNtOXlLQ2R6ZEdGMFpVTm9ZVzVuWlVWeWNtOXlKeXdnWlhKeUtWeHVYSFJjZEZ4MGZWeHVYSFJjZEgwcEtTNWpZWFJqYUNobWRXNWpkR2x2YmlCb1lXNWtiR1ZEWVc1alpXeHNZWFJwYjI0b1pYSnlLU0I3WEc1Y2RGeDBYSFJwWmlBb1pYSnlJQ1ltSUdWeWNpNTNZWE5EWVc1alpXeHNaV1JDZVZOdmJXVnZibVZGYkhObEtTQjdYRzVjZEZ4MFhIUmNkQzh2SUhkbElHUnZiaWQwSUdOaGNtVXNJSFJvWlNCemRHRjBaU0IwY21GdWMybDBhVzl1SUcxaGJtRm5aWElnYUdGeklHRnNjbVZoWkhrZ1pXMXBkSFJsWkNCMGFHVWdjM1JoZEdWRGFHRnVaMlZEWVc1alpXeHNaV1FnWm05eUlIVnpYRzVjZEZ4MFhIUjlJR1ZzYzJVZ2UxeHVYSFJjZEZ4MFhIUjBhSEp2ZHlCdVpYY2dSWEp5YjNJb1hDSlVhR2x6SUhCeWIySmhZbXg1SUhOb2IzVnNaRzRuZENCb1lYQndaVzRzSUcxaGVXSmxJR1pwYkdVZ1lXNGdhWE56ZFdVZ2IzSWdjMjl0WlhSb2FXNW5JRndpSUNzZ1pYSnlLVnh1WEhSY2RGeDBmVnh1WEhSY2RIMHBYRzVjZEgxY2JseHVYSFJtZFc1amRHbHZiaUJ0WVd0bFVHRjBhQ2h6ZEdGMFpVNWhiV1VzSUhCaGNtRnRaWFJsY25Nc0lHOXdkR2x2Ym5NcElIdGNibHgwWEhSbWRXNWpkR2x2YmlCblpYUkhkV0Z5WVc1MFpXVmtVSEpsZG1sdmRYTlRkR0YwWlNncElIdGNibHgwWEhSY2RHbG1JQ2doYkdGemRGTjBZWFJsVTNSaGNuUmxaRUZqZEdsMllYUnBibWN1WjJWMEtDa3VibUZ0WlNrZ2UxeHVYSFJjZEZ4MFhIUjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0oyMWhhMlZRWVhSb0lISmxjWFZwY21Wa0lHRWdjSEpsZG1sdmRYTWdjM1JoZEdVZ2RHOGdaWGhwYzNRc0lHRnVaQ0J1YjI1bElIZGhjeUJtYjNWdVpDY3BYRzVjZEZ4MFhIUjlYRzVjZEZ4MFhIUnlaWFIxY200Z2JHRnpkRk4wWVhSbFUzUmhjblJsWkVGamRHbDJZWFJwYm1jdVoyVjBLQ2xjYmx4MFhIUjlYRzVjZEZ4MGFXWWdLRzl3ZEdsdmJuTWdKaVlnYjNCMGFXOXVjeTVwYm1obGNtbDBLU0I3WEc1Y2RGeDBYSFJ3WVhKaGJXVjBaWEp6SUQwZ1pYaDBaVzVrS0dkbGRFZDFZWEpoYm5SbFpXUlFjbVYyYVc5MWMxTjBZWFJsS0NrdWNHRnlZVzFsZEdWeWN5d2djR0Z5WVcxbGRHVnljeWxjYmx4MFhIUjlYRzVjYmx4MFhIUjJZWElnWkdWemRHbHVZWFJwYjI1VGRHRjBaU0E5SUhOMFlYUmxUbUZ0WlNBOVBUMGdiblZzYkNBL0lHZGxkRWQxWVhKaGJuUmxaV1JRY21WMmFXOTFjMU4wWVhSbEtDa3VibUZ0WlNBNklITjBZWFJsVG1GdFpWeHVYRzVjZEZ4MGNISnZkRzkwZVhCaGJGTjBZWFJsU0c5c1pHVnlMbWQxWVhKaGJuUmxaVUZzYkZOMFlYUmxjMFY0YVhOMEtHUmxjM1JwYm1GMGFXOXVVM1JoZEdVcFhHNWNkRngwZG1GeUlISnZkWFJsSUQwZ2NISnZkRzkwZVhCaGJGTjBZWFJsU0c5c1pHVnlMbUoxYVd4a1JuVnNiRk4wWVhSbFVtOTFkR1VvWkdWemRHbHVZWFJwYjI1VGRHRjBaU2xjYmx4MFhIUnlaWFIxY200Z1luVnBiR1JRWVhSb0tISnZkWFJsTENCd1lYSmhiV1YwWlhKeklIeDhJSHQ5S1Z4dVhIUjlYRzVjYmx4MGRtRnlJR1JsWm1GMWJIUlBjSFJwYjI1eklEMGdlMXh1WEhSY2RISmxjR3hoWTJVNklHWmhiSE5sWEc1Y2RIMWNibHh1WEhSemRHRjBaVkJ5YjNacFpHVnlSVzFwZEhSbGNpNWhaR1JUZEdGMFpTQTlJR0ZrWkZOMFlYUmxYRzVjZEhOMFlYUmxVSEp2ZG1sa1pYSkZiV2wwZEdWeUxtZHZJRDBnWm5WdVkzUnBiMjRnWjI4b2JtVjNVM1JoZEdWT1lXMWxMQ0J3WVhKaGJXVjBaWEp6TENCdmNIUnBiMjV6S1NCN1hHNWNkRngwYjNCMGFXOXVjeUE5SUdWNGRHVnVaQ2hrWldaaGRXeDBUM0IwYVc5dWN5d2diM0IwYVc5dWN5bGNibHgwWEhSMllYSWdaMjlHZFc1amRHbHZiaUE5SUc5d2RHbHZibk11Y21Wd2JHRmpaU0EvSUhOMFlYUmxVbTkxZEdWeVQzQjBhVzl1Y3k1eWIzVjBaWEl1Y21Wd2JHRmpaU0E2SUhOMFlYUmxVbTkxZEdWeVQzQjBhVzl1Y3k1eWIzVjBaWEl1WjI5Y2JseHVYSFJjZEhKbGRIVnliaUJ3Y205dGFYTmxUV1VvYldGclpWQmhkR2dzSUc1bGQxTjBZWFJsVG1GdFpTd2djR0Z5WVcxbGRHVnljeXdnYjNCMGFXOXVjeWt1ZEdobGJpaG5iMFoxYm1OMGFXOXVMQ0JvWVc1a2JHVkZjbkp2Y2k1aWFXNWtLRzUxYkd3c0lDZHpkR0YwWlVOb1lXNW5aVVZ5Y205eUp5a3BYRzVjZEgxY2JseDBjM1JoZEdWUWNtOTJhV1JsY2tWdGFYUjBaWEl1WlhaaGJIVmhkR1ZEZFhKeVpXNTBVbTkxZEdVZ1BTQm1kVzVqZEdsdmJpQmxkbUZzZFdGMFpVTjFjbkpsYm5SU2IzVjBaU2hrWldaaGRXeDBVM1JoZEdVc0lHUmxabUYxYkhSUVlYSmhiWE1wSUh0Y2JseDBYSFJ5WlhSMWNtNGdjSEp2YldselpVMWxLRzFoYTJWUVlYUm9MQ0JrWldaaGRXeDBVM1JoZEdVc0lHUmxabUYxYkhSUVlYSmhiWE1wTG5Sb1pXNG9ablZ1WTNScGIyNG9aR1ZtWVhWc2RGQmhkR2dwSUh0Y2JseDBYSFJjZEhOMFlYUmxVbTkxZEdWeVQzQjBhVzl1Y3k1eWIzVjBaWEl1WlhaaGJIVmhkR1ZEZFhKeVpXNTBLR1JsWm1GMWJIUlFZWFJvS1Z4dVhIUmNkSDBwTG1OaGRHTm9LR1oxYm1OMGFXOXVLR1Z5Y2lrZ2UxeHVYSFJjZEZ4MGFHRnVaR3hsUlhKeWIzSW9KM04wWVhSbFJYSnliM0luTENCbGNuSXBYRzVjZEZ4MGZTbGNibHgwZlZ4dVhIUnpkR0YwWlZCeWIzWnBaR1Z5UlcxcGRIUmxjaTV0WVd0bFVHRjBhQ0E5SUdaMWJtTjBhVzl1SUcxaGEyVlFZWFJvUVc1a1VISmxjR1Z1WkVoaGMyZ29jM1JoZEdWT1lXMWxMQ0J3WVhKaGJXVjBaWEp6TENCdmNIUnBiMjV6S1NCN1hHNWNkRngwY21WMGRYSnVJSE4wWVhSbFVtOTFkR1Z5VDNCMGFXOXVjeTV3WVhSb1VISmxabWw0SUNzZ2JXRnJaVkJoZEdnb2MzUmhkR1ZPWVcxbExDQndZWEpoYldWMFpYSnpMQ0J2Y0hScGIyNXpLVnh1WEhSOVhHNWNkSE4wWVhSbFVISnZkbWxrWlhKRmJXbDBkR1Z5TG5OMFlYUmxTWE5CWTNScGRtVWdQU0JtZFc1amRHbHZiaUJ6ZEdGMFpVbHpRV04wYVhabEtITjBZWFJsVG1GdFpTd2diM0IwY3lrZ2UxeHVYSFJjZEhaaGNpQmpkWEp5Wlc1MFUzUmhkR1VnUFNCc1lYTjBRMjl0Y0d4bGRHVnNlVXh2WVdSbFpGTjBZWFJsTG1kbGRDZ3BYRzVjZEZ4MGNtVjBkWEp1SUNoamRYSnlaVzUwVTNSaGRHVXVibUZ0WlNBOVBUMGdjM1JoZEdWT1lXMWxJSHg4SUdOMWNuSmxiblJUZEdGMFpTNXVZVzFsTG1sdVpHVjRUMllvYzNSaGRHVk9ZVzFsSUNzZ0p5NG5LU0E5UFQwZ01Da2dKaVlnS0hSNWNHVnZaaUJ2Y0hSeklEMDlQU0FuZFc1a1pXWnBibVZrSnlCOGZDQlBZbXBsWTNRdWEyVjVjeWh2Y0hSektTNWxkbVZ5ZVNobWRXNWpkR2x2YmlCdFlYUmphR1Z6S0d0bGVTa2dlMXh1WEhSY2RGeDBjbVYwZFhKdUlHOXdkSE5iYTJWNVhTQTlQVDBnWTNWeWNtVnVkRk4wWVhSbExuQmhjbUZ0WlhSbGNuTmJhMlY1WFZ4dVhIUmNkSDBwS1Z4dVhIUjlYRzVjYmx4MGRtRnlJSEpsYm1SbGNtVnlJRDBnYldGclpWSmxibVJsY21WeUtITjBZWFJsVUhKdmRtbGtaWEpGYldsMGRHVnlLVnh1WEc1Y2RHUmxjM1J5YjNsRWIyMGdQU0JrWlc1dlpHVnBabmtvY21WdVpHVnlaWEl1WkdWemRISnZlU2xjYmx4MFoyVjBSRzl0UTJocGJHUWdQU0JrWlc1dlpHVnBabmtvY21WdVpHVnlaWEl1WjJWMFEyaHBiR1JGYkdWdFpXNTBLVnh1WEhSeVpXNWtaWEpFYjIwZ1BTQmtaVzV2WkdWcFpua29jbVZ1WkdWeVpYSXVjbVZ1WkdWeUtWeHVYSFJ5WlhObGRFUnZiU0E5SUdSbGJtOWtaV2xtZVNoeVpXNWtaWEpsY2k1eVpYTmxkQ2xjYmx4dVhIUnlaWFIxY200Z2MzUmhkR1ZRY205MmFXUmxja1Z0YVhSMFpYSmNibjFjYmx4dVpuVnVZM1JwYjI0Z1oyVjBRMjl1ZEdWdWRFOWlhbVZqZENoemRHRjBaVkpsYzI5c2RtVlNaWE4xYkhSelQySnFaV04wTENCemRHRjBaVTVoYldVcElIdGNibHgwZG1GeUlHRnNiRkJ2YzNOcFlteGxVbVZ6YjJ4MlpXUlRkR0YwWlU1aGJXVnpJRDBnY0dGeWMyVW9jM1JoZEdWT1lXMWxLVnh1WEc1Y2RISmxkSFZ5YmlCaGJHeFFiM056YVdKc1pWSmxjMjlzZG1Wa1UzUmhkR1ZPWVcxbGN5NW1hV3gwWlhJb1puVnVZM1JwYjI0b2MzUmhkR1ZPWVcxbEtTQjdYRzVjZEZ4MGNtVjBkWEp1SUhOMFlYUmxVbVZ6YjJ4MlpWSmxjM1ZzZEhOUFltcGxZM1JiYzNSaGRHVk9ZVzFsWFZ4dVhIUjlLUzV5WldSMVkyVW9ablZ1WTNScGIyNG9iMkpxTENCemRHRjBaVTVoYldVcElIdGNibHgwWEhSeVpYUjFjbTRnWlhoMFpXNWtLRzlpYWl3Z2MzUmhkR1ZTWlhOdmJIWmxVbVZ6ZFd4MGMwOWlhbVZqZEZ0emRHRjBaVTVoYldWZEtWeHVYSFI5TENCN2ZTbGNibjFjYmx4dVpuVnVZM1JwYjI0Z2NtVmthWEpsWTNSdmNpaHVaWGRUZEdGMFpVNWhiV1VzSUhCaGNtRnRaWFJsY25NcElIdGNibHgwY21WMGRYSnVJSHRjYmx4MFhIUnlaV1JwY21WamRGUnZPaUI3WEc1Y2RGeDBYSFJ1WVcxbE9pQnVaWGRUZEdGMFpVNWhiV1VzWEc1Y2RGeDBYSFJ3WVhKaGJYTTZJSEJoY21GdFpYUmxjbk5jYmx4MFhIUjlYRzVjZEgxY2JuMWNibHh1THk4Z2V5QmJjM1JoZEdWT1lXMWxYVG9nY21WemIyeDJaVkpsYzNWc2RDQjlYRzVtZFc1amRHbHZiaUJ5WlhOdmJIWmxVM1JoZEdWektITjBZWFJsY3l3Z2NHRnlZVzFsZEdWeWN5a2dlMXh1WEhSMllYSWdjM1JoZEdWelYybDBhRkpsYzI5c2RtVkdkVzVqZEdsdmJuTWdQU0J6ZEdGMFpYTXVabWxzZEdWeUtHbHpSblZ1WTNScGIyNG9KM0psYzI5c2RtVW5LU2xjYmx4MGRtRnlJSE4wWVhSbFRtRnRaWE5YYVhSb1VtVnpiMngyWlVaMWJtTjBhVzl1Y3lBOUlITjBZWFJsYzFkcGRHaFNaWE52YkhabFJuVnVZM1JwYjI1ekxtMWhjQ2h3Y205d1pYSjBlU2duYm1GdFpTY3BLVnh1WEhSMllYSWdjbVZ6YjJ4MlpYTWdQU0JRY205dGFYTmxMbUZzYkNoemRHRjBaWE5YYVhSb1VtVnpiMngyWlVaMWJtTjBhVzl1Y3k1dFlYQW9ablZ1WTNScGIyNG9jM1JoZEdVcElIdGNibHgwWEhSeVpYUjFjbTRnYm1WM0lGQnliMjFwYzJVb1puVnVZM1JwYjI0Z0tISmxjMjlzZG1Vc0lISmxhbVZqZENrZ2UxeHVYSFJjZEZ4MFpuVnVZM1JwYjI0Z2NtVnpiMngyWlVOaUtHVnljaXdnWTI5dWRHVnVkQ2tnZTF4dVhIUmNkRngwWEhSbGNuSWdQeUJ5WldwbFkzUW9aWEp5S1NBNklISmxjMjlzZG1Vb1kyOXVkR1Z1ZENsY2JseDBYSFJjZEgxY2JseHVYSFJjZEZ4MGNtVnpiMngyWlVOaUxuSmxaR2x5WldOMElEMGdablZ1WTNScGIyNGdjbVZrYVhKbFkzUW9ibVYzVTNSaGRHVk9ZVzFsTENCd1lYSmhiV1YwWlhKektTQjdYRzVjZEZ4MFhIUmNkSEpsYW1WamRDaHlaV1JwY21WamRHOXlLRzVsZDFOMFlYUmxUbUZ0WlN3Z2NHRnlZVzFsZEdWeWN5a3BYRzVjZEZ4MFhIUjlYRzVjYmx4MFhIUmNkSFpoY2lCeVpYTWdQU0J6ZEdGMFpTNXlaWE52YkhabEtITjBZWFJsTG1SaGRHRXNJSEJoY21GdFpYUmxjbk1zSUhKbGMyOXNkbVZEWWlsY2JseDBYSFJjZEdsbUlDaHlaWE1nSmlZZ0tIUjVjR1Z2WmlCeVpYTWdQVDA5SUNkdlltcGxZM1FuSUh4OElIUjVjR1Z2WmlCeVpYTWdQVDA5SUNkbWRXNWpkR2x2YmljcElDWW1JSFI1Y0dWdlppQnlaWE11ZEdobGJpQTlQVDBnSjJaMWJtTjBhVzl1SnlrZ2UxeHVYSFJjZEZ4MFhIUnlaWE52YkhabEtISmxjeWxjYmx4MFhIUmNkSDFjYmx4MFhIUjlLVnh1WEhSOUtTbGNibHh1WEhSeVpYUjFjbTRnY21WemIyeDJaWE11ZEdobGJpaG1kVzVqZEdsdmJpaHlaWE52YkhabFVtVnpkV3gwY3lrZ2UxeHVYSFJjZEhKbGRIVnliaUJqYjIxaWFXNWxLSHRjYmx4MFhIUmNkSE4wWVhSbFRtRnRaVG9nYzNSaGRHVk9ZVzFsYzFkcGRHaFNaWE52YkhabFJuVnVZM1JwYjI1ekxGeHVYSFJjZEZ4MGNtVnpiMngyWlZKbGMzVnNkRG9nY21WemIyeDJaVkpsYzNWc2RITmNibHgwWEhSOUtTNXlaV1IxWTJVb1puVnVZM1JwYjI0b2IySnFMQ0J5WlhOMWJIUXBJSHRjYmx4MFhIUmNkRzlpYWx0eVpYTjFiSFF1YzNSaGRHVk9ZVzFsWFNBOUlISmxjM1ZzZEM1eVpYTnZiSFpsVW1WemRXeDBYRzVjZEZ4MFhIUnlaWFIxY200Z2IySnFYRzVjZEZ4MGZTd2dlMzBwWEc1Y2RIMHBYRzU5WEc1Y2JtWjFibU4wYVc5dUlIQnliM0JsY25SNUtHNWhiV1VwSUh0Y2JseDBjbVYwZFhKdUlHWjFibU4wYVc5dUtHOWlhaWtnZTF4dVhIUmNkSEpsZEhWeWJpQnZZbXBiYm1GdFpWMWNibHgwZlZ4dWZWeHVYRzVtZFc1amRHbHZiaUJ5WlhabGNuTmxLR0Z5ZVNrZ2UxeHVYSFJ5WlhSMWNtNGdZWEo1TG5Oc2FXTmxLQ2t1Y21WMlpYSnpaU2dwWEc1OVhHNWNibVoxYm1OMGFXOXVJR2x6Um5WdVkzUnBiMjRvY0hKdmNHVnlkSGtwSUh0Y2JseDBjbVYwZFhKdUlHWjFibU4wYVc5dUtHOWlhaWtnZTF4dVhIUmNkSEpsZEhWeWJpQjBlWEJsYjJZZ2IySnFXM0J5YjNCbGNuUjVYU0E5UFQwZ0oyWjFibU4wYVc5dUoxeHVYSFI5WEc1OVhHNWNibVoxYm1OMGFXOXVJSEJ5YjIxcGMyVk5aU2dwSUh0Y2JseDBkbUZ5SUdadUlEMGdRWEp5WVhrdWNISnZkRzkwZVhCbExuTm9hV1owTG1Gd2NHeDVLR0Z5WjNWdFpXNTBjeWxjYmx4MGRtRnlJR0Z5WjNNZ1BTQmhjbWQxYldWdWRITmNibHgwY21WMGRYSnVJRzVsZHlCUWNtOXRhWE5sS0daMWJtTjBhVzl1S0hKbGMyOXNkbVVwSUh0Y2JseDBYSFJ5WlhOdmJIWmxLR1p1TG1Gd2NHeDVLRzUxYkd3c0lHRnlaM01wS1Z4dVhIUjlLVnh1ZlZ4dUlsMTkiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIEN1cnJlbnRTdGF0ZSgpIHtcblx0dmFyIGN1cnJlbnQgPSB7XG5cdFx0bmFtZTogJycsXG5cdFx0cGFyYW1ldGVyczoge31cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBjdXJyZW50XG5cdFx0fSxcblx0XHRzZXQ6IGZ1bmN0aW9uKG5hbWUsIHBhcmFtZXRlcnMpIHtcblx0XHRcdGN1cnJlbnQgPSB7XG5cdFx0XHRcdG5hbWU6IG5hbWUsXG5cdFx0XHRcdHBhcmFtZXRlcnM6IHBhcmFtZXRlcnNcblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cbiIsIi8vIFB1bGxlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9qb2xpc3MvcHJvbWlzZS1tYXAtc2VyaWVzIGFuZCBwcmV0dGllZCB1cCBhIGJpdFxuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ25hdGl2ZS1wcm9taXNlLW9ubHkvbnBvJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzZXF1ZW5jZShhcnJheSwgaXRlcmF0b3IsIHRoaXNBcmcpIHtcblx0dmFyIGN1cnJlbnQgPSBQcm9taXNlLnJlc29sdmUoKVxuXHR2YXIgY2IgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGl0ZXJhdG9yLmJpbmQodGhpc0FyZykgOiBpdGVyYXRvclxuXG5cdHZhciByZXN1bHRzID0gYXJyYXkubWFwKGZ1bmN0aW9uKHZhbHVlLCBpKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnQgPSBjdXJyZW50LnRoZW4oZnVuY3Rpb24oaikge1xuXHRcdFx0cmV0dXJuIGNiKHZhbHVlLCBqLCBhcnJheSlcblx0XHR9LmJpbmQobnVsbCwgaSkpXG5cdH0pXG5cblx0cmV0dXJuIFByb21pc2UuYWxsKHJlc3VsdHMpXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHN0YXRlQ2hhbmdlTG9naWMoc3RhdGVDb21wYXJpc29uUmVzdWx0cykge1xuXHR2YXIgaGl0Q2hhbmdpbmdTdGF0ZSA9IGZhbHNlXG5cdHZhciBoaXREZXN0cm95ZWRTdGF0ZSA9IGZhbHNlXG5cblx0dmFyIG91dHB1dCA9IHtcblx0XHRkZXN0cm95OiBbXSxcblx0XHRjaGFuZ2U6IFtdLFxuXHRcdGNyZWF0ZTogW11cblx0fVxuXG5cdHN0YXRlQ29tcGFyaXNvblJlc3VsdHMuZm9yRWFjaChmdW5jdGlvbihzdGF0ZSkge1xuXHRcdGhpdENoYW5naW5nU3RhdGUgPSBoaXRDaGFuZ2luZ1N0YXRlIHx8IHN0YXRlLnN0YXRlUGFyYW1ldGVyc0NoYW5nZWRcblx0XHRoaXREZXN0cm95ZWRTdGF0ZSA9IGhpdERlc3Ryb3llZFN0YXRlIHx8IHN0YXRlLnN0YXRlTmFtZUNoYW5nZWRcblxuXHRcdGlmIChzdGF0ZS5uYW1lQmVmb3JlKSB7XG5cdFx0XHRpZiAoaGl0RGVzdHJveWVkU3RhdGUpIHtcblx0XHRcdFx0b3V0cHV0LmRlc3Ryb3kucHVzaChzdGF0ZS5uYW1lQmVmb3JlKVxuXHRcdFx0fSBlbHNlIGlmIChoaXRDaGFuZ2luZ1N0YXRlKSB7XG5cdFx0XHRcdG91dHB1dC5jaGFuZ2UucHVzaChzdGF0ZS5uYW1lQmVmb3JlKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChzdGF0ZS5uYW1lQWZ0ZXIgJiYgaGl0RGVzdHJveWVkU3RhdGUpIHtcblx0XHRcdG91dHB1dC5jcmVhdGUucHVzaChzdGF0ZS5uYW1lQWZ0ZXIpXG5cdFx0fVxuXHR9KVxuXG5cdHJldHVybiBvdXRwdXRcbn1cbiIsInZhciBzdGF0ZVN0cmluZ1BhcnNlciA9IHJlcXVpcmUoJy4vc3RhdGUtc3RyaW5nLXBhcnNlcicpXG52YXIgY29tYmluZSA9IHJlcXVpcmUoJ2NvbWJpbmUtYXJyYXlzJylcbnZhciBwYXRoVG9SZWdleHAgPSByZXF1aXJlKCdwYXRoLXRvLXJlZ2V4cC13aXRoLXJldmVyc2libGUta2V5cycpXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gU3RhdGVDb21wYXJpc29uKHN0YXRlU3RhdGUpIHtcblx0dmFyIGdldFBhdGhQYXJhbWV0ZXJzID0gcGF0aFBhcmFtZXRlcnMoKVxuXG5cdHZhciBwYXJhbWV0ZXJzQ2hhbmdlZCA9IHBhcmFtZXRlcnNUaGF0TWF0dGVyV2VyZUNoYW5nZWQuYmluZChudWxsLCBzdGF0ZVN0YXRlLCBnZXRQYXRoUGFyYW1ldGVycylcblxuXHRyZXR1cm4gc3RhdGVDb21wYXJpc29uLmJpbmQobnVsbCwgcGFyYW1ldGVyc0NoYW5nZWQpXG59XG5cbmZ1bmN0aW9uIHBhdGhQYXJhbWV0ZXJzKCkge1xuXHR2YXIgcGFyYW1ldGVycyA9IHt9XG5cblx0cmV0dXJuIGZ1bmN0aW9uIGdldFBhdGhQYXJhbWV0ZXJzKHBhdGgpIHtcblx0XHRpZiAoIXBhdGgpIHtcblx0XHRcdHJldHVybiBbXVxuXHRcdH1cblxuXHRcdGlmICghcGFyYW1ldGVyc1twYXRoXSkge1xuXHRcdFx0cGFyYW1ldGVyc1twYXRoXSA9IHBhdGhUb1JlZ2V4cChwYXRoKS5rZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0cmV0dXJuIGtleS5uYW1lXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdHJldHVybiBwYXJhbWV0ZXJzW3BhdGhdXG5cdH1cbn1cblxuZnVuY3Rpb24gcGFyYW1ldGVyc1RoYXRNYXR0ZXJXZXJlQ2hhbmdlZChzdGF0ZVN0YXRlLCBnZXRQYXRoUGFyYW1ldGVycywgc3RhdGVOYW1lLCBmcm9tUGFyYW1ldGVycywgdG9QYXJhbWV0ZXJzKSB7XG5cdHZhciBzdGF0ZSA9IHN0YXRlU3RhdGUuZ2V0KHN0YXRlTmFtZSlcblx0dmFyIHF1ZXJ5c3RyaW5nUGFyYW1ldGVycyA9IHN0YXRlLnF1ZXJ5c3RyaW5nUGFyYW1ldGVycyB8fCBbXVxuXHR2YXIgcGFyYW1ldGVycyA9IGdldFBhdGhQYXJhbWV0ZXJzKHN0YXRlLnJvdXRlKS5jb25jYXQocXVlcnlzdHJpbmdQYXJhbWV0ZXJzKVxuXG5cdHJldHVybiBBcnJheS5pc0FycmF5KHBhcmFtZXRlcnMpICYmIHBhcmFtZXRlcnMuc29tZShmdW5jdGlvbihrZXkpIHtcblx0XHRyZXR1cm4gZnJvbVBhcmFtZXRlcnNba2V5XSAhPT0gdG9QYXJhbWV0ZXJzW2tleV1cblx0fSlcbn1cblxuZnVuY3Rpb24gc3RhdGVDb21wYXJpc29uKHBhcmFtZXRlcnNDaGFuZ2VkLCBvcmlnaW5hbFN0YXRlLCBvcmlnaW5hbFBhcmFtZXRlcnMsIG5ld1N0YXRlLCBuZXdQYXJhbWV0ZXJzKSB7XG5cdHZhciBzdGF0ZXMgPSBjb21iaW5lKHtcblx0XHRzdGFydDogc3RhdGVTdHJpbmdQYXJzZXIob3JpZ2luYWxTdGF0ZSksXG5cdFx0ZW5kOiBzdGF0ZVN0cmluZ1BhcnNlcihuZXdTdGF0ZSlcblx0fSlcblxuXHRyZXR1cm4gc3RhdGVzLm1hcChmdW5jdGlvbihzdGF0ZXMpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0bmFtZUJlZm9yZTogc3RhdGVzLnN0YXJ0LFxuXHRcdFx0bmFtZUFmdGVyOiBzdGF0ZXMuZW5kLFxuXHRcdFx0c3RhdGVOYW1lQ2hhbmdlZDogc3RhdGVzLnN0YXJ0ICE9PSBzdGF0ZXMuZW5kLFxuXHRcdFx0c3RhdGVQYXJhbWV0ZXJzQ2hhbmdlZDogc3RhdGVzLnN0YXJ0ID09PSBzdGF0ZXMuZW5kICYmIHBhcmFtZXRlcnNDaGFuZ2VkKHN0YXRlcy5zdGFydCwgb3JpZ2luYWxQYXJhbWV0ZXJzLCBuZXdQYXJhbWV0ZXJzKVxuXHRcdH1cblx0fSlcbn1cbiIsInZhciBzdGF0ZVN0cmluZ1BhcnNlciA9IHJlcXVpcmUoJy4vc3RhdGUtc3RyaW5nLXBhcnNlcicpXG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL3N0YXRlLXN0cmluZy1wYXJzZXInKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIFN0YXRlU3RhdGUoKSB7XG5cdHZhciBzdGF0ZXMgPSB7fVxuXG5cdGZ1bmN0aW9uIGdldEhpZXJhcmNoeShuYW1lKSB7XG5cdFx0dmFyIG5hbWVzID0gc3RhdGVTdHJpbmdQYXJzZXIobmFtZSlcblxuXHRcdHJldHVybiBuYW1lcy5tYXAoZnVuY3Rpb24obmFtZSkge1xuXHRcdFx0aWYgKCFzdGF0ZXNbbmFtZV0pIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdTdGF0ZSAnICsgbmFtZSArICcgbm90IGZvdW5kJylcblx0XHRcdH1cblx0XHRcdHJldHVybiBzdGF0ZXNbbmFtZV1cblx0XHR9KVxuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0UGFyZW50KG5hbWUpIHtcblx0XHR2YXIgcGFyZW50TmFtZSA9IGdldFBhcmVudE5hbWUobmFtZSlcblxuXHRcdHJldHVybiBwYXJlbnROYW1lICYmIHN0YXRlc1twYXJlbnROYW1lXVxuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0UGFyZW50TmFtZShuYW1lKSB7XG5cdFx0dmFyIG5hbWVzID0gc3RhdGVTdHJpbmdQYXJzZXIobmFtZSlcblxuXHRcdGlmIChuYW1lcy5sZW5ndGggPiAxKSB7XG5cdFx0XHR2YXIgc2Vjb25kVG9MYXN0ID0gbmFtZXMubGVuZ3RoIC0gMlxuXG5cdFx0XHRyZXR1cm4gbmFtZXNbc2Vjb25kVG9MYXN0XVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gbnVsbFxuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGd1YXJhbnRlZUFsbFN0YXRlc0V4aXN0KG5ld1N0YXRlTmFtZSkge1xuXHRcdHZhciBzdGF0ZU5hbWVzID0gcGFyc2UobmV3U3RhdGVOYW1lKVxuXHRcdHZhciBzdGF0ZXNUaGF0RG9udEV4aXN0ID0gc3RhdGVOYW1lcy5maWx0ZXIoZnVuY3Rpb24obmFtZSkge1xuXHRcdFx0cmV0dXJuICFzdGF0ZXNbbmFtZV1cblx0XHR9KVxuXG5cdFx0aWYgKHN0YXRlc1RoYXREb250RXhpc3QubGVuZ3RoID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdTdGF0ZSAnICsgc3RhdGVzVGhhdERvbnRFeGlzdFtzdGF0ZXNUaGF0RG9udEV4aXN0Lmxlbmd0aCAtIDFdICsgJyBkb2VzIG5vdCBleGlzdCcpXG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gYnVpbGRGdWxsU3RhdGVSb3V0ZShzdGF0ZU5hbWUpIHtcblx0XHRyZXR1cm4gZ2V0SGllcmFyY2h5KHN0YXRlTmFtZSkubWFwKGZ1bmN0aW9uKHN0YXRlKSB7XG5cdFx0XHRyZXR1cm4gJy8nICsgKHN0YXRlLnJvdXRlIHx8ICcnKVxuXHRcdH0pLmpvaW4oJycpLnJlcGxhY2UoL1xcL3syLH0vZywgJy8nKVxuXHR9XG5cblx0ZnVuY3Rpb24gYXBwbHlEZWZhdWx0Q2hpbGRTdGF0ZXMoc3RhdGVOYW1lKSB7XG5cdFx0dmFyIHN0YXRlID0gc3RhdGVzW3N0YXRlTmFtZV1cblxuXHRcdGZ1bmN0aW9uIGdldERlZmF1bHRDaGlsZFN0YXRlTmFtZSgpIHtcblx0XHRcdHJldHVybiBzdGF0ZSAmJiAodHlwZW9mIHN0YXRlLmRlZmF1bHRDaGlsZCA9PT0gJ2Z1bmN0aW9uJ1xuXHRcdFx0XHQ/IHN0YXRlLmRlZmF1bHRDaGlsZCgpXG5cdFx0XHRcdDogc3RhdGUuZGVmYXVsdENoaWxkKVxuXHRcdH1cblxuXHRcdHZhciBkZWZhdWx0Q2hpbGRTdGF0ZU5hbWUgPSBnZXREZWZhdWx0Q2hpbGRTdGF0ZU5hbWUoKVxuXG5cdFx0aWYgKCFkZWZhdWx0Q2hpbGRTdGF0ZU5hbWUpIHtcblx0XHRcdHJldHVybiBzdGF0ZU5hbWVcblx0XHR9XG5cblx0XHR2YXIgZnVsbFN0YXRlTmFtZSA9IHN0YXRlTmFtZSArICcuJyArIGRlZmF1bHRDaGlsZFN0YXRlTmFtZVxuXG5cdFx0cmV0dXJuIGFwcGx5RGVmYXVsdENoaWxkU3RhdGVzKGZ1bGxTdGF0ZU5hbWUpXG5cdH1cblxuXG5cdHJldHVybiB7XG5cdFx0YWRkOiBmdW5jdGlvbihuYW1lLCBzdGF0ZSkge1xuXHRcdFx0c3RhdGVzW25hbWVdID0gc3RhdGVcblx0XHR9LFxuXHRcdGdldDogZnVuY3Rpb24obmFtZSkge1xuXHRcdFx0cmV0dXJuIG5hbWUgJiYgc3RhdGVzW25hbWVdXG5cdFx0fSxcblx0XHRnZXRIaWVyYXJjaHk6IGdldEhpZXJhcmNoeSxcblx0XHRnZXRQYXJlbnQ6IGdldFBhcmVudCxcblx0XHRnZXRQYXJlbnROYW1lOiBnZXRQYXJlbnROYW1lLFxuXHRcdGd1YXJhbnRlZUFsbFN0YXRlc0V4aXN0OiBndWFyYW50ZWVBbGxTdGF0ZXNFeGlzdCxcblx0XHRidWlsZEZ1bGxTdGF0ZVJvdXRlOiBidWlsZEZ1bGxTdGF0ZVJvdXRlLFxuXHRcdGFwcGx5RGVmYXVsdENoaWxkU3RhdGVzOiBhcHBseURlZmF1bHRDaGlsZFN0YXRlc1xuXHR9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN0YXRlU3RyaW5nKSB7XG5cdHJldHVybiBzdGF0ZVN0cmluZy5zcGxpdCgnLicpLnJlZHVjZShmdW5jdGlvbihzdGF0ZU5hbWVzLCBsYXRlc3ROYW1lQ2h1bmspIHtcblx0XHRpZiAoc3RhdGVOYW1lcy5sZW5ndGgpIHtcblx0XHRcdGxhdGVzdE5hbWVDaHVuayA9IHN0YXRlTmFtZXNbc3RhdGVOYW1lcy5sZW5ndGggLSAxXSArICcuJyArIGxhdGVzdE5hbWVDaHVua1xuXHRcdH1cblx0XHRzdGF0ZU5hbWVzLnB1c2gobGF0ZXN0TmFtZUNodW5rKVxuXHRcdHJldHVybiBzdGF0ZU5hbWVzXG5cdH0sIFtdKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZW1pdHRlcikge1xyXG5cdHZhciBjdXJyZW50VHJhbnNpdGlvbkF0dGVtcHQgPSBudWxsXHJcblx0dmFyIG5leHRUcmFuc2l0aW9uID0gbnVsbFxyXG5cclxuXHRmdW5jdGlvbiBkb25lVHJhbnNpdGlvbmluZygpIHtcclxuXHRcdGN1cnJlbnRUcmFuc2l0aW9uQXR0ZW1wdCA9IG51bGxcclxuXHRcdGlmIChuZXh0VHJhbnNpdGlvbikge1xyXG5cdFx0XHRiZWdpbk5leHRUcmFuc2l0aW9uQXR0ZW1wdCgpXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBpc1RyYW5zaXRpb25pbmcoKSB7XHJcblx0XHRyZXR1cm4gISFjdXJyZW50VHJhbnNpdGlvbkF0dGVtcHRcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGJlZ2luTmV4dFRyYW5zaXRpb25BdHRlbXB0KCkge1xyXG5cdFx0Y3VycmVudFRyYW5zaXRpb25BdHRlbXB0ID0gbmV4dFRyYW5zaXRpb25cclxuXHRcdG5leHRUcmFuc2l0aW9uID0gbnVsbFxyXG5cdFx0Y3VycmVudFRyYW5zaXRpb25BdHRlbXB0LmJlZ2luU3RhdGVDaGFuZ2UoKVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gY2FuY2VsQ3VycmVudFRyYW5zaXRpb24oKSB7XHJcblx0XHRjdXJyZW50VHJhbnNpdGlvbkF0dGVtcHQudHJhbnNpdGlvbi5jYW5jZWxsZWQgPSB0cnVlXHJcblx0XHR2YXIgZXJyID0gbmV3IEVycm9yKCdTdGF0ZSB0cmFuc2l0aW9uIGNhbmNlbGxlZCBieSB0aGUgc3RhdGUgdHJhbnNpdGlvbiBtYW5hZ2VyJylcclxuXHRcdGVyci53YXNDYW5jZWxsZWRCeVNvbWVvbmVFbHNlID0gdHJ1ZVxyXG5cdFx0ZW1pdHRlci5lbWl0KCdzdGF0ZUNoYW5nZUNhbmNlbGxlZCcsIGVycilcclxuXHR9XHJcblxyXG5cdGVtaXR0ZXIub24oJ3N0YXRlQ2hhbmdlQXR0ZW1wdCcsIGZ1bmN0aW9uKGJlZ2luU3RhdGVDaGFuZ2UpIHtcclxuXHRcdG5leHRUcmFuc2l0aW9uID0gY3JlYXRlU3RhdGVUcmFuc2l0aW9uQXR0ZW1wdChiZWdpblN0YXRlQ2hhbmdlKVxyXG5cclxuXHRcdGlmIChpc1RyYW5zaXRpb25pbmcoKSAmJiBjdXJyZW50VHJhbnNpdGlvbkF0dGVtcHQudHJhbnNpdGlvbi5jYW5jZWxsYWJsZSkge1xyXG5cdFx0XHRjYW5jZWxDdXJyZW50VHJhbnNpdGlvbigpXHJcblx0XHR9IGVsc2UgaWYgKCFpc1RyYW5zaXRpb25pbmcoKSkge1xyXG5cdFx0XHRiZWdpbk5leHRUcmFuc2l0aW9uQXR0ZW1wdCgpXHJcblx0XHR9XHJcblx0fSlcclxuXHJcblx0ZW1pdHRlci5vbignc3RhdGVDaGFuZ2VFcnJvcicsIGRvbmVUcmFuc2l0aW9uaW5nKVxyXG5cdGVtaXR0ZXIub24oJ3N0YXRlQ2hhbmdlQ2FuY2VsbGVkJywgZG9uZVRyYW5zaXRpb25pbmcpXHJcblx0ZW1pdHRlci5vbignc3RhdGVDaGFuZ2VFbmQnLCBkb25lVHJhbnNpdGlvbmluZylcclxuXHJcblx0ZnVuY3Rpb24gY3JlYXRlU3RhdGVUcmFuc2l0aW9uQXR0ZW1wdChiZWdpblN0YXRlQ2hhbmdlKSB7XHJcblx0XHR2YXIgdHJhbnNpdGlvbiA9IHtcclxuXHRcdFx0Y2FuY2VsbGVkOiBmYWxzZSxcclxuXHRcdFx0Y2FuY2VsbGFibGU6IHRydWVcclxuXHRcdH1cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHRyYW5zaXRpb246IHRyYW5zaXRpb24sXHJcblx0XHRcdGJlZ2luU3RhdGVDaGFuZ2U6IGJlZ2luU3RhdGVDaGFuZ2UuYmluZChudWxsLCB0cmFuc2l0aW9uKVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iaikge1xuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iailcblxuXHRrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KG9ialtrZXldKSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGtleSArICcgaXMgbm90IGFuIGFycmF5Jylcblx0XHR9XG5cdH0pXG5cblx0dmFyIG1heEluZGV4ID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24obWF4U29GYXIsIGtleSkge1xuXHRcdHZhciBsZW4gPSBvYmpba2V5XS5sZW5ndGhcblx0XHRyZXR1cm4gbWF4U29GYXIgPiBsZW4gPyBtYXhTb0ZhciA6IGxlblxuXHR9LCAwKVxuXG5cdHZhciBvdXRwdXQgPSBbXVxuXG5cdGZ1bmN0aW9uIGdldE9iamVjdChpbmRleCkge1xuXHRcdHZhciBvID0ge31cblx0XHRrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRvW2tleV0gPSBvYmpba2V5XVtpbmRleF1cblx0XHR9KVxuXHRcdHJldHVybiBvXG5cdH1cblxuXHRmb3IgKHZhciBpID0gMDsgaSA8IG1heEluZGV4OyArK2kpIHtcblx0XHRvdXRwdXQucHVzaChnZXRPYmplY3QoaSkpXG5cdH1cblxuXHRyZXR1cm4gb3V0cHV0XG59XG4iLCJ2YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gSGFzaExvY2F0aW9uKHdpbmRvdykge1xuXHR2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKVxuXHR2YXIgbGFzdCA9ICcnXG5cdHZhciBuZWVkVG9EZWNvZGUgPSBnZXROZWVkVG9EZWNvZGUoKVxuXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGxhc3QgIT09IGVtaXR0ZXIuZ2V0KCkpIHtcblx0XHRcdGxhc3QgPSBlbWl0dGVyLmdldCgpXG5cdFx0XHRlbWl0dGVyLmVtaXQoJ2hhc2hjaGFuZ2UnKVxuXHRcdH1cblx0fSlcblxuXHRlbWl0dGVyLmdvID0gZ28uYmluZChudWxsLCB3aW5kb3cpXG5cdGVtaXR0ZXIucmVwbGFjZSA9IHJlcGxhY2UuYmluZChudWxsLCB3aW5kb3cpXG5cdGVtaXR0ZXIuZ2V0ID0gZ2V0LmJpbmQobnVsbCwgd2luZG93LCBuZWVkVG9EZWNvZGUpXG5cblx0cmV0dXJuIGVtaXR0ZXJcbn1cblxuZnVuY3Rpb24gcmVwbGFjZSh3aW5kb3csIG5ld1BhdGgpIHtcblx0d2luZG93LmxvY2F0aW9uLnJlcGxhY2UoZXZlcnl0aGluZ0JlZm9yZVRoZVNsYXNoKHdpbmRvdy5sb2NhdGlvbi5ocmVmKSArICcjJyArIG5ld1BhdGgpXG59XG5cbmZ1bmN0aW9uIGV2ZXJ5dGhpbmdCZWZvcmVUaGVTbGFzaCh1cmwpIHtcblx0dmFyIGhhc2hJbmRleCA9IHVybC5pbmRleE9mKCcjJylcblx0cmV0dXJuIGhhc2hJbmRleCA9PT0gLTEgPyB1cmwgOiB1cmwuc3Vic3RyaW5nKDAsIGhhc2hJbmRleClcbn1cblxuZnVuY3Rpb24gZ28od2luZG93LCBuZXdQYXRoKSB7XG5cdHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gbmV3UGF0aFxufVxuXG5mdW5jdGlvbiBnZXQod2luZG93LCBuZWVkVG9EZWNvZGUpIHtcblx0dmFyIGhhc2ggPSByZW1vdmVIYXNoRnJvbVBhdGgod2luZG93LmxvY2F0aW9uLmhhc2gpXG5cdHJldHVybiBuZWVkVG9EZWNvZGUgPyBkZWNvZGVVUkkoaGFzaCkgOiBoYXNoXG59XG5cbmZ1bmN0aW9uIHJlbW92ZUhhc2hGcm9tUGF0aChwYXRoKSB7XG5cdHJldHVybiAocGF0aCAmJiBwYXRoWzBdID09PSAnIycpID8gcGF0aC5zdWJzdHIoMSkgOiBwYXRoXG59XG5cbmZ1bmN0aW9uIGdldE5lZWRUb0RlY29kZSgpIHtcblx0dmFyIGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJylcblx0YS5ocmVmID0gJyN4IHgnXG5cdHJldHVybiAhL3ggeC8udGVzdChhLmhhc2gpXG59XG4iLCJ2YXIgcGF0aFRvUmVnZXhwID0gcmVxdWlyZSgncGF0aC10by1yZWdleHAtd2l0aC1yZXZlcnNpYmxlLWtleXMnKVxudmFyIHFzID0gcmVxdWlyZSgncXVlcnlzdHJpbmcnKVxudmFyIHh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKVxudmFyIGJyb3dzZXJIYXNoTG9jYXRpb24gPSByZXF1aXJlKCcuL2hhc2gtbG9jYXRpb24uanMnKVxucmVxdWlyZSgnYXJyYXkucHJvdG90eXBlLmZpbmQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIFJvdXRlcihvcHRzLCBoYXNoTG9jYXRpb24pIHtcblx0aWYgKGlzSGFzaExvY2F0aW9uKG9wdHMpKSB7XG5cdFx0aGFzaExvY2F0aW9uID0gb3B0c1xuXHRcdG9wdHMgPSBudWxsXG5cdH1cblxuXHRvcHRzID0gb3B0cyB8fCB7fVxuXG5cdGlmICghaGFzaExvY2F0aW9uKSB7XG5cdFx0aGFzaExvY2F0aW9uID0gYnJvd3Nlckhhc2hMb2NhdGlvbih3aW5kb3cpXG5cdH1cblxuXHR2YXIgcm91dGVzID0gW11cblxuXHR2YXIgb25IYXNoQ2hhbmdlID0gZXZhbHVhdGVDdXJyZW50UGF0aC5iaW5kKG51bGwsIHJvdXRlcywgaGFzaExvY2F0aW9uLCAhIW9wdHMucmV2ZXJzZSlcblxuXHRoYXNoTG9jYXRpb24ub24oJ2hhc2hjaGFuZ2UnLCBvbkhhc2hDaGFuZ2UpXG5cblx0ZnVuY3Rpb24gc3RvcCgpIHtcblx0XHRoYXNoTG9jYXRpb24ucmVtb3ZlTGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCBvbkhhc2hDaGFuZ2UpXG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdGFkZDogYWRkLmJpbmQobnVsbCwgcm91dGVzKSxcblx0XHRzdG9wOiBzdG9wLFxuXHRcdGV2YWx1YXRlQ3VycmVudDogZXZhbHVhdGVDdXJyZW50UGF0aE9yR29Ub0RlZmF1bHQuYmluZChudWxsLCByb3V0ZXMsIGhhc2hMb2NhdGlvbiwgISFvcHRzLnJldmVyc2UpLFxuXHRcdHNldERlZmF1bHQ6IHNldERlZmF1bHQuYmluZChudWxsLCByb3V0ZXMpLFxuXHRcdHJlcGxhY2U6IGhhc2hMb2NhdGlvbi5yZXBsYWNlLFxuXHRcdGdvOiBoYXNoTG9jYXRpb24uZ28sXG5cdFx0bG9jYXRpb246IGhhc2hMb2NhdGlvblxuXHR9XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlQ3VycmVudFBhdGgocm91dGVzLCBoYXNoTG9jYXRpb24sIHJldmVyc2UpIHtcblx0ZXZhbHVhdGVQYXRoKHJvdXRlcywgaGFzaExvY2F0aW9uLmdldCgpLCByZXZlcnNlKVxufVxuXG5mdW5jdGlvbiBnZXRQYXRoUGFydHMocGF0aCkge1xuXHR2YXIgY2h1bmtzID0gcGF0aC5zcGxpdCgnPycpXG5cdHJldHVybiB7XG5cdFx0cGF0aDogY2h1bmtzLnNoaWZ0KCksXG5cdFx0cXVlcnlTdHJpbmc6IHFzLnBhcnNlKGNodW5rcy5qb2luKCcnKSlcblx0fVxufVxuXG5mdW5jdGlvbiBldmFsdWF0ZVBhdGgocm91dGVzLCBwYXRoLCByZXZlcnNlKSB7XG5cdHZhciBwYXRoUGFydHMgPSBnZXRQYXRoUGFydHMocGF0aClcblx0cGF0aCA9IHBhdGhQYXJ0cy5wYXRoXG5cdHZhciBxdWVyeVN0cmluZ1BhcmFtZXRlcnMgPSBwYXRoUGFydHMucXVlcnlTdHJpbmdcblxuXHR2YXIgbWF0Y2hpbmdSb3V0ZSA9IChyZXZlcnNlID8gcmV2ZXJzZUFycmF5KHJvdXRlcykgOiByb3V0ZXMpLmZpbmQoXCJcIi5tYXRjaCwgcGF0aClcblxuXHRpZiAobWF0Y2hpbmdSb3V0ZSkge1xuXHRcdHZhciByZWdleFJlc3VsdCA9IG1hdGNoaW5nUm91dGUuZXhlYyhwYXRoKVxuXHRcdHZhciByb3V0ZVBhcmFtZXRlcnMgPSBtYWtlUGFyYW1ldGVyc09iamVjdEZyb21SZWdleFJlc3VsdChtYXRjaGluZ1JvdXRlLmtleXMsIHJlZ2V4UmVzdWx0KVxuXHRcdHZhciBwYXJhbXMgPSB4dGVuZChxdWVyeVN0cmluZ1BhcmFtZXRlcnMsIHJvdXRlUGFyYW1ldGVycylcblx0XHRtYXRjaGluZ1JvdXRlLmZuKHBhcmFtcylcblx0fSBlbHNlIGlmIChyb3V0ZXMuZGVmYXVsdEZuKSB7XG5cdFx0cm91dGVzLmRlZmF1bHRGbihwYXRoLCBxdWVyeVN0cmluZ1BhcmFtZXRlcnMpXG5cdH1cbn1cblxuZnVuY3Rpb24gcmV2ZXJzZUFycmF5KGFyeSkge1xuXHRyZXR1cm4gYXJ5LnNsaWNlKCkucmV2ZXJzZSgpXG59XG5cbmZ1bmN0aW9uIG1ha2VQYXJhbWV0ZXJzT2JqZWN0RnJvbVJlZ2V4UmVzdWx0KGtleXMsIHJlZ2V4UmVzdWx0KSB7XG5cdHJldHVybiBrZXlzLnJlZHVjZShmdW5jdGlvbihtZW1vLCB1cmxLZXksIGluZGV4KSB7XG5cdFx0bWVtb1t1cmxLZXkubmFtZV0gPSByZWdleFJlc3VsdFtpbmRleCArIDFdXG5cdFx0cmV0dXJuIG1lbW9cblx0fSwge30pXG59XG5cbmZ1bmN0aW9uIGFkZChyb3V0ZXMsIHJvdXRlU3RyaW5nLCByb3V0ZUZ1bmN0aW9uKSB7XG5cdGlmICh0eXBlb2Ygcm91dGVGdW5jdGlvbiAhPT0gJ2Z1bmN0aW9uJykge1xuXHRcdHRocm93IG5ldyBFcnJvcignVGhlIHJvdXRlciBhZGQgZnVuY3Rpb24gbXVzdCBiZSBwYXNzZWQgYSBjYWxsYmFjayBmdW5jdGlvbicpXG5cdH1cblx0dmFyIG5ld1JvdXRlID0gcGF0aFRvUmVnZXhwKHJvdXRlU3RyaW5nKVxuXHRuZXdSb3V0ZS5mbiA9IHJvdXRlRnVuY3Rpb25cblx0cm91dGVzLnB1c2gobmV3Um91dGUpXG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlQ3VycmVudFBhdGhPckdvVG9EZWZhdWx0KHJvdXRlcywgaGFzaExvY2F0aW9uLCByZXZlcnNlLCBkZWZhdWx0UGF0aCkge1xuXHRpZiAoaGFzaExvY2F0aW9uLmdldCgpKSB7XG5cdFx0dmFyIHJvdXRlc0NvcHkgPSByb3V0ZXMuc2xpY2UoKVxuXHRcdHJvdXRlc0NvcHkuZGVmYXVsdEZuID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRoYXNoTG9jYXRpb24uZ28oZGVmYXVsdFBhdGgpXG5cdFx0fVxuXHRcdGV2YWx1YXRlQ3VycmVudFBhdGgocm91dGVzQ29weSwgaGFzaExvY2F0aW9uLCByZXZlcnNlKVxuXHR9IGVsc2Uge1xuXHRcdGhhc2hMb2NhdGlvbi5nbyhkZWZhdWx0UGF0aClcblx0fVxufVxuXG5mdW5jdGlvbiBzZXREZWZhdWx0KHJvdXRlcywgZGVmYXVsdEZuKSB7XG5cdHJvdXRlcy5kZWZhdWx0Rm4gPSBkZWZhdWx0Rm5cbn1cblxuZnVuY3Rpb24gaXNIYXNoTG9jYXRpb24oaGFzaExvY2F0aW9uKSB7XG5cdHJldHVybiBoYXNoTG9jYXRpb24gJiYgaGFzaExvY2F0aW9uLmdvICYmIGhhc2hMb2NhdGlvbi5yZXBsYWNlICYmIGhhc2hMb2NhdGlvbi5vblxufSIsIi8vIEFycmF5LnByb3RvdHlwZS5maW5kIC0gTUlUIExpY2Vuc2UgKGMpIDIwMTMgUGF1bCBNaWxsZXIgPGh0dHA6Ly9wYXVsbWlsbHIuY29tPlxuLy8gRm9yIGFsbCBkZXRhaWxzIGFuZCBkb2NzOiBodHRwczovL2dpdGh1Yi5jb20vcGF1bG1pbGxyL2FycmF5LnByb3RvdHlwZS5maW5kXG4vLyBGaXhlcyBhbmQgdGVzdHMgc3VwcGxpZWQgYnkgRHVuY2FuIEhhbGwgPGh0dHA6Ly9kdW5jYW5oYWxsLm5ldD4gXG4oZnVuY3Rpb24oZ2xvYmFscyl7XG4gIGlmIChBcnJheS5wcm90b3R5cGUuZmluZCkgcmV0dXJuO1xuXG4gIHZhciBmaW5kID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgdmFyIGxpc3QgPSBPYmplY3QodGhpcyk7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoIDwgMCA/IDAgOiBsaXN0Lmxlbmd0aCA+Pj4gMDsgLy8gRVMuVG9VaW50MzI7XG4gICAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZW9mIHByZWRpY2F0ZSAhPT0gJ2Z1bmN0aW9uJyB8fCBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocHJlZGljYXRlKSAhPT0gJ1tvYmplY3QgRnVuY3Rpb25dJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkjZmluZDogcHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICBmb3IgKHZhciBpID0gMCwgdmFsdWU7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBsaXN0KSkgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9O1xuXG4gIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHtcbiAgICB0cnkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJ2ZpbmQnLCB7XG4gICAgICAgIHZhbHVlOiBmaW5kLCBjb25maWd1cmFibGU6IHRydWUsIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfSBjYXRjaChlKSB7fVxuICB9XG5cbiAgaWYgKCFBcnJheS5wcm90b3R5cGUuZmluZCkge1xuICAgIEFycmF5LnByb3RvdHlwZS5maW5kID0gZmluZDtcbiAgfVxufSkodGhpcyk7XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKiEgTmF0aXZlIFByb21pc2UgT25seVxuICAgIHYwLjguMSAoYykgS3lsZSBTaW1wc29uXG4gICAgTUlUIExpY2Vuc2U6IGh0dHA6Ly9nZXRpZnkubWl0LWxpY2Vuc2Uub3JnXG4qL1xuIWZ1bmN0aW9uKHQsbixlKXtuW3RdPW5bdF18fGUoKSxcInVuZGVmaW5lZFwiIT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1uW3RdOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZCYmZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIG5bdF19KX0oXCJQcm9taXNlXCIsXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9nbG9iYWw6dGhpcyxmdW5jdGlvbigpe1widXNlIHN0cmljdFwiO2Z1bmN0aW9uIHQodCxuKXtsLmFkZCh0LG4pLGh8fChoPXkobC5kcmFpbikpfWZ1bmN0aW9uIG4odCl7dmFyIG4sZT10eXBlb2YgdDtyZXR1cm4gbnVsbD09dHx8XCJvYmplY3RcIiE9ZSYmXCJmdW5jdGlvblwiIT1lfHwobj10LnRoZW4pLFwiZnVuY3Rpb25cIj09dHlwZW9mIG4/bjohMX1mdW5jdGlvbiBlKCl7Zm9yKHZhciB0PTA7dDx0aGlzLmNoYWluLmxlbmd0aDt0Kyspbyh0aGlzLDE9PT10aGlzLnN0YXRlP3RoaXMuY2hhaW5bdF0uc3VjY2Vzczp0aGlzLmNoYWluW3RdLmZhaWx1cmUsdGhpcy5jaGFpblt0XSk7dGhpcy5jaGFpbi5sZW5ndGg9MH1mdW5jdGlvbiBvKHQsZSxvKXt2YXIgcixpO3RyeXtlPT09ITE/by5yZWplY3QodC5tc2cpOihyPWU9PT0hMD90Lm1zZzplLmNhbGwodm9pZCAwLHQubXNnKSxyPT09by5wcm9taXNlP28ucmVqZWN0KFR5cGVFcnJvcihcIlByb21pc2UtY2hhaW4gY3ljbGVcIikpOihpPW4ocikpP2kuY2FsbChyLG8ucmVzb2x2ZSxvLnJlamVjdCk6by5yZXNvbHZlKHIpKX1jYXRjaChjKXtvLnJlamVjdChjKX19ZnVuY3Rpb24gcihvKXt2YXIgYyx1PXRoaXM7aWYoIXUudHJpZ2dlcmVkKXt1LnRyaWdnZXJlZD0hMCx1LmRlZiYmKHU9dS5kZWYpO3RyeXsoYz1uKG8pKT90KGZ1bmN0aW9uKCl7dmFyIHQ9bmV3IGYodSk7dHJ5e2MuY2FsbChvLGZ1bmN0aW9uKCl7ci5hcHBseSh0LGFyZ3VtZW50cyl9LGZ1bmN0aW9uKCl7aS5hcHBseSh0LGFyZ3VtZW50cyl9KX1jYXRjaChuKXtpLmNhbGwodCxuKX19KToodS5tc2c9byx1LnN0YXRlPTEsdS5jaGFpbi5sZW5ndGg+MCYmdChlLHUpKX1jYXRjaChhKXtpLmNhbGwobmV3IGYodSksYSl9fX1mdW5jdGlvbiBpKG4pe3ZhciBvPXRoaXM7by50cmlnZ2VyZWR8fChvLnRyaWdnZXJlZD0hMCxvLmRlZiYmKG89by5kZWYpLG8ubXNnPW4sby5zdGF0ZT0yLG8uY2hhaW4ubGVuZ3RoPjAmJnQoZSxvKSl9ZnVuY3Rpb24gYyh0LG4sZSxvKXtmb3IodmFyIHI9MDtyPG4ubGVuZ3RoO3IrKykhZnVuY3Rpb24ocil7dC5yZXNvbHZlKG5bcl0pLnRoZW4oZnVuY3Rpb24odCl7ZShyLHQpfSxvKX0ocil9ZnVuY3Rpb24gZih0KXt0aGlzLmRlZj10LHRoaXMudHJpZ2dlcmVkPSExfWZ1bmN0aW9uIHUodCl7dGhpcy5wcm9taXNlPXQsdGhpcy5zdGF0ZT0wLHRoaXMudHJpZ2dlcmVkPSExLHRoaXMuY2hhaW49W10sdGhpcy5tc2c9dm9pZCAwfWZ1bmN0aW9uIGEobil7aWYoXCJmdW5jdGlvblwiIT10eXBlb2Ygbil0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtpZigwIT09dGhpcy5fX05QT19fKXRocm93IFR5cGVFcnJvcihcIk5vdCBhIHByb21pc2VcIik7dGhpcy5fX05QT19fPTE7dmFyIG89bmV3IHUodGhpcyk7dGhpcy50aGVuPWZ1bmN0aW9uKG4scil7dmFyIGk9e3N1Y2Nlc3M6XCJmdW5jdGlvblwiPT10eXBlb2Ygbj9uOiEwLGZhaWx1cmU6XCJmdW5jdGlvblwiPT10eXBlb2Ygcj9yOiExfTtyZXR1cm4gaS5wcm9taXNlPW5ldyB0aGlzLmNvbnN0cnVjdG9yKGZ1bmN0aW9uKHQsbil7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdHx8XCJmdW5jdGlvblwiIT10eXBlb2Ygbil0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtpLnJlc29sdmU9dCxpLnJlamVjdD1ufSksby5jaGFpbi5wdXNoKGkpLDAhPT1vLnN0YXRlJiZ0KGUsbyksaS5wcm9taXNlfSx0aGlzW1wiY2F0Y2hcIl09ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMudGhlbih2b2lkIDAsdCl9O3RyeXtuLmNhbGwodm9pZCAwLGZ1bmN0aW9uKHQpe3IuY2FsbChvLHQpfSxmdW5jdGlvbih0KXtpLmNhbGwobyx0KX0pfWNhdGNoKGMpe2kuY2FsbChvLGMpfX12YXIgcyxoLGwscD1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLHk9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNldEltbWVkaWF0ZT9mdW5jdGlvbih0KXtyZXR1cm4gc2V0SW1tZWRpYXRlKHQpfTpzZXRUaW1lb3V0O3RyeXtPYmplY3QuZGVmaW5lUHJvcGVydHkoe30sXCJ4XCIse30pLHM9ZnVuY3Rpb24odCxuLGUsbyl7cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LG4se3ZhbHVlOmUsd3JpdGFibGU6ITAsY29uZmlndXJhYmxlOm8hPT0hMX0pfX1jYXRjaChkKXtzPWZ1bmN0aW9uKHQsbixlKXtyZXR1cm4gdFtuXT1lLHR9fWw9ZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQsbil7dGhpcy5mbj10LHRoaXMuc2VsZj1uLHRoaXMubmV4dD12b2lkIDB9dmFyIG4sZSxvO3JldHVybnthZGQ6ZnVuY3Rpb24ocixpKXtvPW5ldyB0KHIsaSksZT9lLm5leHQ9bzpuPW8sZT1vLG89dm9pZCAwfSxkcmFpbjpmdW5jdGlvbigpe3ZhciB0PW47Zm9yKG49ZT1oPXZvaWQgMDt0Oyl0LmZuLmNhbGwodC5zZWxmKSx0PXQubmV4dH19fSgpO3ZhciBnPXMoe30sXCJjb25zdHJ1Y3RvclwiLGEsITEpO3JldHVybiBhLnByb3RvdHlwZT1nLHMoZyxcIl9fTlBPX19cIiwwLCExKSxzKGEsXCJyZXNvbHZlXCIsZnVuY3Rpb24odCl7dmFyIG49dGhpcztyZXR1cm4gdCYmXCJvYmplY3RcIj09dHlwZW9mIHQmJjE9PT10Ll9fTlBPX18/dDpuZXcgbihmdW5jdGlvbihuLGUpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIG58fFwiZnVuY3Rpb25cIiE9dHlwZW9mIGUpdGhyb3cgVHlwZUVycm9yKFwiTm90IGEgZnVuY3Rpb25cIik7bih0KX0pfSkscyhhLFwicmVqZWN0XCIsZnVuY3Rpb24odCl7cmV0dXJuIG5ldyB0aGlzKGZ1bmN0aW9uKG4sZSl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2Ygbnx8XCJmdW5jdGlvblwiIT10eXBlb2YgZSl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtlKHQpfSl9KSxzKGEsXCJhbGxcIixmdW5jdGlvbih0KXt2YXIgbj10aGlzO3JldHVyblwiW29iamVjdCBBcnJheV1cIiE9cC5jYWxsKHQpP24ucmVqZWN0KFR5cGVFcnJvcihcIk5vdCBhbiBhcnJheVwiKSk6MD09PXQubGVuZ3RoP24ucmVzb2x2ZShbXSk6bmV3IG4oZnVuY3Rpb24oZSxvKXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBlfHxcImZ1bmN0aW9uXCIhPXR5cGVvZiBvKXRocm93IFR5cGVFcnJvcihcIk5vdCBhIGZ1bmN0aW9uXCIpO3ZhciByPXQubGVuZ3RoLGk9QXJyYXkociksZj0wO2Mobix0LGZ1bmN0aW9uKHQsbil7aVt0XT1uLCsrZj09PXImJmUoaSl9LG8pfSl9KSxzKGEsXCJyYWNlXCIsZnVuY3Rpb24odCl7dmFyIG49dGhpcztyZXR1cm5cIltvYmplY3QgQXJyYXldXCIhPXAuY2FsbCh0KT9uLnJlamVjdChUeXBlRXJyb3IoXCJOb3QgYW4gYXJyYXlcIikpOm5ldyBuKGZ1bmN0aW9uKGUsbyl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZXx8XCJmdW5jdGlvblwiIT10eXBlb2Ygbyl0aHJvdyBUeXBlRXJyb3IoXCJOb3QgYSBmdW5jdGlvblwiKTtjKG4sdCxmdW5jdGlvbih0LG4pe2Uobil9LG8pfSl9KSxhfSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OXVZWFJwZG1VdGNISnZiV2x6WlMxdmJteDVMMjV3Ynk1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaU8wRkJRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJJaXdpWm1sc1pTSTZJbWRsYm1WeVlYUmxaQzVxY3lJc0luTnZkWEpqWlZKdmIzUWlPaUlpTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lJdktpRWdUbUYwYVhabElGQnliMjFwYzJVZ1QyNXNlVnh1SUNBZ0lIWXdMamd1TVNBb1l5a2dTM2xzWlNCVGFXMXdjMjl1WEc0Z0lDQWdUVWxVSUV4cFkyVnVjMlU2SUdoMGRIQTZMeTluWlhScFpua3ViV2wwTFd4cFkyVnVjMlV1YjNKblhHNHFMMXh1SVdaMWJtTjBhVzl1S0hRc2JpeGxLWHR1VzNSZFBXNWJkRjE4ZkdVb0tTeGNJblZ1WkdWbWFXNWxaRndpSVQxMGVYQmxiMllnYlc5a2RXeGxKaVp0YjJSMWJHVXVaWGh3YjNKMGN6OXRiMlIxYkdVdVpYaHdiM0owY3oxdVczUmRPbHdpWm5WdVkzUnBiMjVjSWowOWRIbHdaVzltSUdSbFptbHVaU1ltWkdWbWFXNWxMbUZ0WkNZbVpHVm1hVzVsS0daMWJtTjBhVzl1S0NsN2NtVjBkWEp1SUc1YmRGMTlLWDBvWENKUWNtOXRhWE5sWENJc1hDSjFibVJsWm1sdVpXUmNJaUU5ZEhsd1pXOW1JR2RzYjJKaGJEOW5iRzlpWVd3NmRHaHBjeXhtZFc1amRHbHZiaWdwZTF3aWRYTmxJSE4wY21samRGd2lPMloxYm1OMGFXOXVJSFFvZEN4dUtYdHNMbUZrWkNoMExHNHBMR2g4ZkNob1BYa29iQzVrY21GcGJpa3BmV1oxYm1OMGFXOXVJRzRvZENsN2RtRnlJRzRzWlQxMGVYQmxiMllnZER0eVpYUjFjbTRnYm5Wc2JEMDlkSHg4WENKdlltcGxZM1JjSWlFOVpTWW1YQ0ptZFc1amRHbHZibHdpSVQxbGZId29iajEwTG5Sb1pXNHBMRndpWm5WdVkzUnBiMjVjSWowOWRIbHdaVzltSUc0L2Jqb2hNWDFtZFc1amRHbHZiaUJsS0NsN1ptOXlLSFpoY2lCMFBUQTdkRHgwYUdsekxtTm9ZV2x1TG14bGJtZDBhRHQwS3lzcGJ5aDBhR2x6TERFOVBUMTBhR2x6TG5OMFlYUmxQM1JvYVhNdVkyaGhhVzViZEYwdWMzVmpZMlZ6Y3pwMGFHbHpMbU5vWVdsdVczUmRMbVpoYVd4MWNtVXNkR2hwY3k1amFHRnBibHQwWFNrN2RHaHBjeTVqYUdGcGJpNXNaVzVuZEdnOU1IMW1kVzVqZEdsdmJpQnZLSFFzWlN4dktYdDJZWElnY2l4cE8zUnllWHRsUFQwOUlURS9ieTV5WldwbFkzUW9kQzV0YzJjcE9paHlQV1U5UFQwaE1EOTBMbTF6WnpwbExtTmhiR3dvZG05cFpDQXdMSFF1YlhObktTeHlQVDA5Ynk1d2NtOXRhWE5sUDI4dWNtVnFaV04wS0ZSNWNHVkZjbkp2Y2loY0lsQnliMjFwYzJVdFkyaGhhVzRnWTNsamJHVmNJaWtwT2locFBXNG9jaWtwUDJrdVkyRnNiQ2h5TEc4dWNtVnpiMngyWlN4dkxuSmxhbVZqZENrNmJ5NXlaWE52YkhabEtISXBLWDFqWVhSamFDaGpLWHR2TG5KbGFtVmpkQ2hqS1gxOVpuVnVZM1JwYjI0Z2NpaHZLWHQyWVhJZ1l5eDFQWFJvYVhNN2FXWW9JWFV1ZEhKcFoyZGxjbVZrS1h0MUxuUnlhV2RuWlhKbFpEMGhNQ3gxTG1SbFppWW1LSFU5ZFM1a1pXWXBPM1J5ZVhzb1l6MXVLRzhwS1Q5MEtHWjFibU4wYVc5dUtDbDdkbUZ5SUhROWJtVjNJR1lvZFNrN2RISjVlMk11WTJGc2JDaHZMR1oxYm1OMGFXOXVLQ2w3Y2k1aGNIQnNlU2gwTEdGeVozVnRaVzUwY3lsOUxHWjFibU4wYVc5dUtDbDdhUzVoY0hCc2VTaDBMR0Z5WjNWdFpXNTBjeWw5S1gxallYUmphQ2h1S1h0cExtTmhiR3dvZEN4dUtYMTlLVG9vZFM1dGMyYzlieXgxTG5OMFlYUmxQVEVzZFM1amFHRnBiaTVzWlc1bmRHZytNQ1ltZENobExIVXBLWDFqWVhSamFDaGhLWHRwTG1OaGJHd29ibVYzSUdZb2RTa3NZU2w5ZlgxbWRXNWpkR2x2YmlCcEtHNHBlM1poY2lCdlBYUm9hWE03Ynk1MGNtbG5aMlZ5WldSOGZDaHZMblJ5YVdkblpYSmxaRDBoTUN4dkxtUmxaaVltS0c4OWJ5NWtaV1lwTEc4dWJYTm5QVzRzYnk1emRHRjBaVDB5TEc4dVkyaGhhVzR1YkdWdVozUm9QakFtSm5Rb1pTeHZLU2w5Wm5WdVkzUnBiMjRnWXloMExHNHNaU3h2S1h0bWIzSW9kbUZ5SUhJOU1EdHlQRzR1YkdWdVozUm9PM0lyS3lraFpuVnVZM1JwYjI0b2NpbDdkQzV5WlhOdmJIWmxLRzViY2wwcExuUm9aVzRvWm5WdVkzUnBiMjRvZENsN1pTaHlMSFFwZlN4dktYMG9jaWw5Wm5WdVkzUnBiMjRnWmloMEtYdDBhR2x6TG1SbFpqMTBMSFJvYVhNdWRISnBaMmRsY21Wa1BTRXhmV1oxYm1OMGFXOXVJSFVvZENsN2RHaHBjeTV3Y205dGFYTmxQWFFzZEdocGN5NXpkR0YwWlQwd0xIUm9hWE11ZEhKcFoyZGxjbVZrUFNFeExIUm9hWE11WTJoaGFXNDlXMTBzZEdocGN5NXRjMmM5ZG05cFpDQXdmV1oxYm1OMGFXOXVJR0VvYmlsN2FXWW9YQ0ptZFc1amRHbHZibHdpSVQxMGVYQmxiMllnYmlsMGFISnZkeUJVZVhCbFJYSnliM0lvWENKT2IzUWdZU0JtZFc1amRHbHZibHdpS1R0cFppZ3dJVDA5ZEdocGN5NWZYMDVRVDE5ZktYUm9jbTkzSUZSNWNHVkZjbkp2Y2loY0lrNXZkQ0JoSUhCeWIyMXBjMlZjSWlrN2RHaHBjeTVmWDA1UVQxOWZQVEU3ZG1GeUlHODlibVYzSUhVb2RHaHBjeWs3ZEdocGN5NTBhR1Z1UFdaMWJtTjBhVzl1S0c0c2NpbDdkbUZ5SUdrOWUzTjFZMk5sYzNNNlhDSm1kVzVqZEdsdmJsd2lQVDEwZVhCbGIyWWdiajl1T2lFd0xHWmhhV3gxY21VNlhDSm1kVzVqZEdsdmJsd2lQVDEwZVhCbGIyWWdjajl5T2lFeGZUdHlaWFIxY200Z2FTNXdjbTl0YVhObFBXNWxkeUIwYUdsekxtTnZibk4wY25WamRHOXlLR1oxYm1OMGFXOXVLSFFzYmlsN2FXWW9YQ0ptZFc1amRHbHZibHdpSVQxMGVYQmxiMllnZEh4OFhDSm1kVzVqZEdsdmJsd2lJVDEwZVhCbGIyWWdiaWwwYUhKdmR5QlVlWEJsUlhKeWIzSW9YQ0pPYjNRZ1lTQm1kVzVqZEdsdmJsd2lLVHRwTG5KbGMyOXNkbVU5ZEN4cExuSmxhbVZqZEQxdWZTa3NieTVqYUdGcGJpNXdkWE5vS0drcExEQWhQVDF2TG5OMFlYUmxKaVowS0dVc2J5a3NhUzV3Y205dGFYTmxmU3gwYUdselcxd2lZMkYwWTJoY0lsMDlablZ1WTNScGIyNG9kQ2w3Y21WMGRYSnVJSFJvYVhNdWRHaGxiaWgyYjJsa0lEQXNkQ2w5TzNSeWVYdHVMbU5oYkd3b2RtOXBaQ0F3TEdaMWJtTjBhVzl1S0hRcGUzSXVZMkZzYkNodkxIUXBmU3htZFc1amRHbHZiaWgwS1h0cExtTmhiR3dvYnl4MEtYMHBmV05oZEdOb0tHTXBlMmt1WTJGc2JDaHZMR01wZlgxMllYSWdjeXhvTEd3c2NEMVBZbXBsWTNRdWNISnZkRzkwZVhCbExuUnZVM1J5YVc1bkxIazlYQ0oxYm1SbFptbHVaV1JjSWlFOWRIbHdaVzltSUhObGRFbHRiV1ZrYVdGMFpUOW1kVzVqZEdsdmJpaDBLWHR5WlhSMWNtNGdjMlYwU1cxdFpXUnBZWFJsS0hRcGZUcHpaWFJVYVcxbGIzVjBPM1J5ZVh0UFltcGxZM1F1WkdWbWFXNWxVSEp2Y0dWeWRIa29lMzBzWENKNFhDSXNlMzBwTEhNOVpuVnVZM1JwYjI0b2RDeHVMR1VzYnlsN2NtVjBkWEp1SUU5aWFtVmpkQzVrWldacGJtVlFjbTl3WlhKMGVTaDBMRzRzZTNaaGJIVmxPbVVzZDNKcGRHRmliR1U2SVRBc1kyOXVabWxuZFhKaFlteGxPbThoUFQwaE1YMHBmWDFqWVhSamFDaGtLWHR6UFdaMWJtTjBhVzl1S0hRc2JpeGxLWHR5WlhSMWNtNGdkRnR1WFQxbExIUjlmV3c5Wm5WdVkzUnBiMjRvS1h0bWRXNWpkR2x2YmlCMEtIUXNiaWw3ZEdocGN5NW1iajEwTEhSb2FYTXVjMlZzWmoxdUxIUm9hWE11Ym1WNGREMTJiMmxrSURCOWRtRnlJRzRzWlN4dk8zSmxkSFZ5Ym50aFpHUTZablZ1WTNScGIyNG9jaXhwS1h0dlBXNWxkeUIwS0hJc2FTa3NaVDlsTG01bGVIUTlienB1UFc4c1pUMXZMRzg5ZG05cFpDQXdmU3hrY21GcGJqcG1kVzVqZEdsdmJpZ3BlM1poY2lCMFBXNDdabTl5S0c0OVpUMW9QWFp2YVdRZ01EdDBPeWwwTG1adUxtTmhiR3dvZEM1elpXeG1LU3gwUFhRdWJtVjRkSDE5ZlNncE8zWmhjaUJuUFhNb2UzMHNYQ0pqYjI1emRISjFZM1J2Y2x3aUxHRXNJVEVwTzNKbGRIVnliaUJoTG5CeWIzUnZkSGx3WlQxbkxITW9aeXhjSWw5ZlRsQlBYMTljSWl3d0xDRXhLU3h6S0dFc1hDSnlaWE52YkhabFhDSXNablZ1WTNScGIyNG9kQ2w3ZG1GeUlHNDlkR2hwY3p0eVpYUjFjbTRnZENZbVhDSnZZbXBsWTNSY0lqMDlkSGx3Wlc5bUlIUW1KakU5UFQxMExsOWZUbEJQWDE4L2REcHVaWGNnYmlobWRXNWpkR2x2YmlodUxHVXBlMmxtS0Z3aVpuVnVZM1JwYjI1Y0lpRTlkSGx3Wlc5bUlHNThmRndpWm5WdVkzUnBiMjVjSWlFOWRIbHdaVzltSUdVcGRHaHliM2NnVkhsd1pVVnljbTl5S0Z3aVRtOTBJR0VnWm5WdVkzUnBiMjVjSWlrN2JpaDBLWDBwZlNrc2N5aGhMRndpY21WcVpXTjBYQ0lzWm5WdVkzUnBiMjRvZENsN2NtVjBkWEp1SUc1bGR5QjBhR2x6S0daMWJtTjBhVzl1S0c0c1pTbDdhV1lvWENKbWRXNWpkR2x2Ymx3aUlUMTBlWEJsYjJZZ2JueDhYQ0ptZFc1amRHbHZibHdpSVQxMGVYQmxiMllnWlNsMGFISnZkeUJVZVhCbFJYSnliM0lvWENKT2IzUWdZU0JtZFc1amRHbHZibHdpS1R0bEtIUXBmU2w5S1N4ektHRXNYQ0poYkd4Y0lpeG1kVzVqZEdsdmJpaDBLWHQyWVhJZ2JqMTBhR2x6TzNKbGRIVnlibHdpVzI5aWFtVmpkQ0JCY25KaGVWMWNJaUU5Y0M1allXeHNLSFFwUDI0dWNtVnFaV04wS0ZSNWNHVkZjbkp2Y2loY0lrNXZkQ0JoYmlCaGNuSmhlVndpS1NrNk1EMDlQWFF1YkdWdVozUm9QMjR1Y21WemIyeDJaU2hiWFNrNmJtVjNJRzRvWm5WdVkzUnBiMjRvWlN4dktYdHBaaWhjSW1aMWJtTjBhVzl1WENJaFBYUjVjR1Z2WmlCbGZIeGNJbVoxYm1OMGFXOXVYQ0loUFhSNWNHVnZaaUJ2S1hSb2NtOTNJRlI1Y0dWRmNuSnZjaWhjSWs1dmRDQmhJR1oxYm1OMGFXOXVYQ0lwTzNaaGNpQnlQWFF1YkdWdVozUm9MR2s5UVhKeVlYa29jaWtzWmowd08yTW9iaXgwTEdaMWJtTjBhVzl1S0hRc2JpbDdhVnQwWFQxdUxDc3JaajA5UFhJbUptVW9hU2w5TEc4cGZTbDlLU3h6S0dFc1hDSnlZV05sWENJc1puVnVZM1JwYjI0b2RDbDdkbUZ5SUc0OWRHaHBjenR5WlhSMWNtNWNJbHR2WW1wbFkzUWdRWEp5WVhsZFhDSWhQWEF1WTJGc2JDaDBLVDl1TG5KbGFtVmpkQ2hVZVhCbFJYSnliM0lvWENKT2IzUWdZVzRnWVhKeVlYbGNJaWtwT201bGR5QnVLR1oxYm1OMGFXOXVLR1VzYnlsN2FXWW9YQ0ptZFc1amRHbHZibHdpSVQxMGVYQmxiMllnWlh4OFhDSm1kVzVqZEdsdmJsd2lJVDEwZVhCbGIyWWdieWwwYUhKdmR5QlVlWEJsUlhKeWIzSW9YQ0pPYjNRZ1lTQm1kVzVqZEdsdmJsd2lLVHRqS0c0c2RDeG1kVzVqZEdsdmJpaDBMRzRwZTJVb2JpbDlMRzhwZlNsOUtTeGhmU2s3WEc0aVhYMD0iLCJ2YXIgcGFyc2VyID0gcmVxdWlyZSgnLi9wYXRoLXBhcnNlcicpXG52YXIgc3RyaW5naWZ5UXVlcnlzdHJpbmcgPSByZXF1aXJlKCdxdWVyeXN0cmluZycpLnN0cmluZ2lmeVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBhdGhTdHIsIHBhcmFtZXRlcnMpIHtcblxuXHR2YXIgcGFyc2VkID0gdHlwZW9mIHBhdGhTdHIgPT09ICdzdHJpbmcnID8gcGFyc2VyKHBhdGhTdHIpIDogcGF0aFN0clxuXHR2YXIgYWxsVG9rZW5zID0gcGFyc2VkLmFsbFRva2Vuc1xuXHR2YXIgcmVnZXggPSBwYXJzZWQucmVnZXhcblxuXHRpZiAocGFyYW1ldGVycykge1xuXHRcdHZhciBwYXRoID0gYWxsVG9rZW5zLm1hcChmdW5jdGlvbihiaXQpIHtcblx0XHRcdGlmIChiaXQuc3RyaW5nKSB7XG5cdFx0XHRcdHJldHVybiBiaXQuc3RyaW5nXG5cdFx0XHR9XG5cblx0XHRcdHZhciBkZWZpbmVkID0gdHlwZW9mIHBhcmFtZXRlcnNbYml0Lm5hbWVdICE9PSAndW5kZWZpbmVkJ1xuXHRcdFx0aWYgKCFiaXQub3B0aW9uYWwgJiYgIWRlZmluZWQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdNdXN0IHN1cHBseSBhcmd1bWVudCAnICsgYml0Lm5hbWUgKyAnIGZvciBwYXRoICcgKyBwYXRoU3RyKVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZGVmaW5lZCA/IChiaXQuZGVsaW1pdGVyICsgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtZXRlcnNbYml0Lm5hbWVdKSkgOiAnJ1xuXHRcdH0pLmpvaW4oJycpXG5cblx0XHRpZiAoIXJlZ2V4LnRlc3QocGF0aCkpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignUHJvdmlkZWQgYXJndW1lbnRzIGRvIG5vdCBtYXRjaCB0aGUgb3JpZ2luYWwgYXJndW1lbnRzJylcblx0XHR9XG5cblx0XHRyZXR1cm4gYnVpbGRQYXRoV2l0aFF1ZXJ5c3RyaW5nKHBhdGgsIHBhcmFtZXRlcnMsIGFsbFRva2Vucylcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gcGFyc2VkXG5cdH1cbn1cblxuZnVuY3Rpb24gYnVpbGRQYXRoV2l0aFF1ZXJ5c3RyaW5nKHBhdGgsIHBhcmFtZXRlcnMsIHRva2VuQXJyYXkpIHtcblx0dmFyIHBhcmFtZXRlcnNJblF1ZXJ5c3RyaW5nID0gZ2V0UGFyYW1ldGVyc1dpdGhvdXRNYXRjaGluZ1Rva2VuKHBhcmFtZXRlcnMsIHRva2VuQXJyYXkpXG5cblx0aWYgKE9iamVjdC5rZXlzKHBhcmFtZXRlcnNJblF1ZXJ5c3RyaW5nKS5sZW5ndGggPT09IDApIHtcblx0XHRyZXR1cm4gcGF0aFxuXHR9XG5cblx0cmV0dXJuIHBhdGggKyAnPycgKyBzdHJpbmdpZnlRdWVyeXN0cmluZyhwYXJhbWV0ZXJzSW5RdWVyeXN0cmluZylcbn1cblxuZnVuY3Rpb24gZ2V0UGFyYW1ldGVyc1dpdGhvdXRNYXRjaGluZ1Rva2VuKHBhcmFtZXRlcnMsIHRva2VuQXJyYXkpIHtcblx0dmFyIHRva2VuSGFzaCA9IHRva2VuQXJyYXkucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGJpdCkge1xuXHRcdGlmICghYml0LnN0cmluZykge1xuXHRcdFx0bWVtb1tiaXQubmFtZV0gPSBiaXRcblx0XHR9XG5cdFx0cmV0dXJuIG1lbW9cblx0fSwge30pXG5cblx0cmV0dXJuIE9iamVjdC5rZXlzKHBhcmFtZXRlcnMpLmZpbHRlcihmdW5jdGlvbihwYXJhbSkge1xuXHRcdHJldHVybiAhdG9rZW5IYXNoW3BhcmFtXVxuXHR9KS5yZWR1Y2UoZnVuY3Rpb24obmV3UGFyYW1ldGVycywgcGFyYW0pIHtcblx0XHRuZXdQYXJhbWV0ZXJzW3BhcmFtXSA9IHBhcmFtZXRlcnNbcGFyYW1dXG5cdFx0cmV0dXJuIG5ld1BhcmFtZXRlcnNcblx0fSwge30pXG59XG4iLCIvLyBUaGlzIGZpbGUgdG8gYmUgcmVwbGFjZWQgd2l0aCBhbiBvZmZpY2lhbCBpbXBsZW1lbnRhdGlvbiBtYWludGFpbmVkIGJ5XG4vLyB0aGUgcGFnZS5qcyBjcmV3IGlmIGFuZCB3aGVuIHRoYXQgYmVjb21lcyBhbiBvcHRpb25cblxudmFyIHBhdGhUb1JlZ2V4cCA9IHJlcXVpcmUoJ3BhdGgtdG8tcmVnZXhwLXdpdGgtcmV2ZXJzaWJsZS1rZXlzJylcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwYXRoU3RyaW5nKSB7XG5cdHZhciBwYXJzZVJlc3VsdHMgPSBwYXRoVG9SZWdleHAocGF0aFN0cmluZylcblxuXHQvLyBUaGUgb25seSByZWFzb24gSSdtIHJldHVybmluZyBhIG5ldyBvYmplY3QgaW5zdGVhZCBvZiB0aGUgcmVzdWx0cyBvZiB0aGUgcGF0aFRvUmVnZXhwXG5cdC8vIGZ1bmN0aW9uIGlzIHNvIHRoYXQgaWYgdGhlIG9mZmljaWFsIGltcGxlbWVudGF0aW9uIGVuZHMgdXAgcmV0dXJuaW5nIGFuXG5cdC8vIGFsbFRva2Vucy1zdHlsZSBhcnJheSB2aWEgc29tZSBvdGhlciBtZWNoYW5pc20sIEkgbWF5IGJlIGFibGUgdG8gY2hhbmdlIHRoaXMgZmlsZVxuXHQvLyB3aXRob3V0IGhhdmluZyB0byBjaGFuZ2UgdGhlIHJlc3Qgb2YgdGhlIG1vZHVsZSBpbiBpbmRleC5qc1xuXHRyZXR1cm4ge1xuXHRcdHJlZ2V4OiBwYXJzZVJlc3VsdHMsXG5cdFx0YWxsVG9rZW5zOiBwYXJzZVJlc3VsdHMuYWxsVG9rZW5zXG5cdH1cbn1cbiIsInZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpO1xuXG4vKipcbiAqIEV4cG9zZSBgcGF0aFRvUmVnZXhwYC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBwYXRoVG9SZWdleHA7XG5cbi8qKlxuICogVGhlIG1haW4gcGF0aCBtYXRjaGluZyByZWdleHAgdXRpbGl0eS5cbiAqXG4gKiBAdHlwZSB7UmVnRXhwfVxuICovXG52YXIgUEFUSF9SRUdFWFAgPSBuZXcgUmVnRXhwKFtcbiAgLy8gTWF0Y2ggZXNjYXBlZCBjaGFyYWN0ZXJzIHRoYXQgd291bGQgb3RoZXJ3aXNlIGFwcGVhciBpbiBmdXR1cmUgbWF0Y2hlcy5cbiAgLy8gVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gZXNjYXBlIHNwZWNpYWwgY2hhcmFjdGVycyB0aGF0IHdvbid0IHRyYW5zZm9ybS5cbiAgJyhcXFxcXFxcXC4pJyxcbiAgLy8gTWF0Y2ggRXhwcmVzcy1zdHlsZSBwYXJhbWV0ZXJzIGFuZCB1bi1uYW1lZCBwYXJhbWV0ZXJzIHdpdGggYSBwcmVmaXhcbiAgLy8gYW5kIG9wdGlvbmFsIHN1ZmZpeGVzLiBNYXRjaGVzIGFwcGVhciBhczpcbiAgLy9cbiAgLy8gXCIvOnRlc3QoXFxcXGQrKT9cIiA9PiBbXCIvXCIsIFwidGVzdFwiLCBcIlxcZCtcIiwgdW5kZWZpbmVkLCBcIj9cIl1cbiAgLy8gXCIvcm91dGUoXFxcXGQrKVwiID0+IFt1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCBcIlxcZCtcIiwgdW5kZWZpbmVkXVxuICAnKFtcXFxcLy5dKT8oPzpcXFxcOihcXFxcdyspKD86XFxcXCgoKD86XFxcXFxcXFwufFteKV0pKilcXFxcKSk/fFxcXFwoKCg/OlxcXFxcXFxcLnxbXildKSopXFxcXCkpKFsrKj9dKT8nLFxuICAvLyBNYXRjaCByZWdleHAgc3BlY2lhbCBjaGFyYWN0ZXJzIHRoYXQgYXJlIGFsd2F5cyBlc2NhcGVkLlxuICAnKFsuKyo/PV4hOiR7fSgpW1xcXFxdfFxcXFwvXSknXG5dLmpvaW4oJ3wnKSwgJ2cnKTtcblxuLyoqXG4gKiBFc2NhcGUgdGhlIGNhcHR1cmluZyBncm91cCBieSBlc2NhcGluZyBzcGVjaWFsIGNoYXJhY3RlcnMgYW5kIG1lYW5pbmcuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBncm91cFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBlc2NhcGVHcm91cCAoZ3JvdXApIHtcbiAgcmV0dXJuIGdyb3VwLnJlcGxhY2UoLyhbPSE6JFxcLygpXSkvZywgJ1xcXFwkMScpO1xufVxuXG4vKipcbiAqIEF0dGFjaCB0aGUga2V5cyBhcyBhIHByb3BlcnR5IG9mIHRoZSByZWdleHAuXG4gKlxuICogQHBhcmFtICB7UmVnRXhwfSByZVxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcmV0dXJuIHtSZWdFeHB9XG4gKi9cbmZ1bmN0aW9uIGF0dGFjaEtleXMgKHJlLCBrZXlzLCBhbGxUb2tlbnMpIHtcbiAgcmUua2V5cyA9IGtleXM7XG4gIHJlLmFsbFRva2VucyA9IGFsbFRva2VucztcbiAgcmV0dXJuIHJlO1xufVxuXG4vKipcbiAqIEdldCB0aGUgZmxhZ3MgZm9yIGEgcmVnZXhwIGZyb20gdGhlIG9wdGlvbnMuXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGZsYWdzIChvcHRpb25zKSB7XG4gIHJldHVybiBvcHRpb25zLnNlbnNpdGl2ZSA/ICcnIDogJ2knO1xufVxuXG4vKipcbiAqIFB1bGwgb3V0IGtleXMgZnJvbSBhIHJlZ2V4cC5cbiAqXG4gKiBAcGFyYW0gIHtSZWdFeHB9IHBhdGhcbiAqIEBwYXJhbSAge0FycmF5fSAga2V5c1xuICogQHJldHVybiB7UmVnRXhwfVxuICovXG5mdW5jdGlvbiByZWdleHBUb1JlZ2V4cCAocGF0aCwga2V5cywgYWxsVG9rZW5zKSB7XG4gIC8vIFVzZSBhIG5lZ2F0aXZlIGxvb2thaGVhZCB0byBtYXRjaCBvbmx5IGNhcHR1cmluZyBncm91cHMuXG4gIHZhciBncm91cHMgPSBwYXRoLnNvdXJjZS5tYXRjaCgvXFwoKD8hXFw/KS9nKTtcblxuICBpZiAoZ3JvdXBzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGtleXMucHVzaCh7XG4gICAgICAgIG5hbWU6ICAgICAgaSxcbiAgICAgICAgZGVsaW1pdGVyOiBudWxsLFxuICAgICAgICBvcHRpb25hbDogIGZhbHNlLFxuICAgICAgICByZXBlYXQ6ICAgIGZhbHNlXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYXR0YWNoS2V5cyhwYXRoLCBrZXlzLCBhbGxUb2tlbnMpO1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBhbiBhcnJheSBpbnRvIGEgcmVnZXhwLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgcGF0aFxuICogQHBhcmFtICB7QXJyYXl9ICBrZXlzXG4gKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gYXJyYXlUb1JlZ2V4cCAocGF0aCwga2V5cywgb3B0aW9ucywgYWxsVG9rZW5zKSB7XG4gIHZhciBwYXJ0cyA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgIHBhcnRzLnB1c2gocGF0aFRvUmVnZXhwKHBhdGhbaV0sIGtleXMsIG9wdGlvbnMsIGFsbFRva2Vucykuc291cmNlKTtcbiAgfVxuXG4gIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKCcoPzonICsgcGFydHMuam9pbignfCcpICsgJyknLCBmbGFncyhvcHRpb25zKSk7XG4gIHJldHVybiBhdHRhY2hLZXlzKHJlZ2V4cCwga2V5cywgYWxsVG9rZW5zKTtcbn1cblxuLyoqXG4gKiBSZXBsYWNlIHRoZSBzcGVjaWZpYyB0YWdzIHdpdGggcmVnZXhwIHN0cmluZ3MuXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gIGtleXNcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24gcmVwbGFjZVBhdGggKHBhdGgsIGtleXMsIGFsbFRva2Vucykge1xuICB2YXIgaW5kZXggPSAwO1xuICB2YXIgbGFzdEVuZEluZGV4ID0gMFxuXG4gIGZ1bmN0aW9uIGFkZExhc3RUb2tlbihsYXN0VG9rZW4pIHtcbiAgICBpZiAobGFzdEVuZEluZGV4ID09PSAwICYmIGxhc3RUb2tlblswXSAhPT0gJy8nKSB7XG4gICAgICBsYXN0VG9rZW4gPSAnLycgKyBsYXN0VG9rZW5cbiAgICB9XG4gICAgYWxsVG9rZW5zLnB1c2goe1xuICAgICAgc3RyaW5nOiBsYXN0VG9rZW5cbiAgICB9KTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gcmVwbGFjZSAobWF0Y2gsIGVzY2FwZWQsIHByZWZpeCwga2V5LCBjYXB0dXJlLCBncm91cCwgc3VmZml4LCBlc2NhcGUsIG9mZnNldCkge1xuICAgIGlmIChlc2NhcGVkKSB7XG4gICAgICByZXR1cm4gZXNjYXBlZDtcbiAgICB9XG5cbiAgICBpZiAoZXNjYXBlKSB7XG4gICAgICByZXR1cm4gJ1xcXFwnICsgZXNjYXBlO1xuICAgIH1cblxuICAgIHZhciByZXBlYXQgICA9IHN1ZmZpeCA9PT0gJysnIHx8IHN1ZmZpeCA9PT0gJyonO1xuICAgIHZhciBvcHRpb25hbCA9IHN1ZmZpeCA9PT0gJz8nIHx8IHN1ZmZpeCA9PT0gJyonO1xuXG4gICAgaWYgKG9mZnNldCA+IGxhc3RFbmRJbmRleCkge1xuICAgICAgYWRkTGFzdFRva2VuKHBhdGguc3Vic3RyaW5nKGxhc3RFbmRJbmRleCwgb2Zmc2V0KSk7XG4gICAgfVxuXG4gICAgbGFzdEVuZEluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuXG4gICAgdmFyIG5ld0tleSA9IHtcbiAgICAgIG5hbWU6ICAgICAga2V5IHx8IGluZGV4KyssXG4gICAgICBkZWxpbWl0ZXI6IHByZWZpeCB8fCAnLycsXG4gICAgICBvcHRpb25hbDogIG9wdGlvbmFsLFxuICAgICAgcmVwZWF0OiAgICByZXBlYXRcbiAgICB9XG5cbiAgICBrZXlzLnB1c2gobmV3S2V5KTtcbiAgICBhbGxUb2tlbnMucHVzaChuZXdLZXkpO1xuXG4gICAgcHJlZml4ID0gcHJlZml4ID8gKCdcXFxcJyArIHByZWZpeCkgOiAnJztcbiAgICBjYXB0dXJlID0gZXNjYXBlR3JvdXAoY2FwdHVyZSB8fCBncm91cCB8fCAnW14nICsgKHByZWZpeCB8fCAnXFxcXC8nKSArICddKz8nKTtcblxuICAgIGlmIChyZXBlYXQpIHtcbiAgICAgIGNhcHR1cmUgPSBjYXB0dXJlICsgJyg/OicgKyBwcmVmaXggKyBjYXB0dXJlICsgJykqJztcbiAgICB9XG5cbiAgICBpZiAob3B0aW9uYWwpIHtcbiAgICAgIHJldHVybiAnKD86JyArIHByZWZpeCArICcoJyArIGNhcHR1cmUgKyAnKSk/JztcbiAgICB9XG5cbiAgICAvLyBCYXNpYyBwYXJhbWV0ZXIgc3VwcG9ydC5cbiAgICByZXR1cm4gcHJlZml4ICsgJygnICsgY2FwdHVyZSArICcpJztcbiAgfVxuXG4gIHZhciBuZXdQYXRoID0gcGF0aC5yZXBsYWNlKFBBVEhfUkVHRVhQLCByZXBsYWNlKTtcblxuICBpZiAobGFzdEVuZEluZGV4IDwgcGF0aC5sZW5ndGgpIHtcbiAgICBhZGRMYXN0VG9rZW4ocGF0aC5zdWJzdHJpbmcobGFzdEVuZEluZGV4KSlcbiAgfVxuXG4gIHJldHVybiBuZXdQYXRoO1xufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZ2l2ZW4gcGF0aCBzdHJpbmcsIHJldHVybmluZyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqXG4gKiBBbiBlbXB0eSBhcnJheSBjYW4gYmUgcGFzc2VkIGluIGZvciB0aGUga2V5cywgd2hpY2ggd2lsbCBob2xkIHRoZVxuICogcGxhY2Vob2xkZXIga2V5IGRlc2NyaXB0aW9ucy4gRm9yIGV4YW1wbGUsIHVzaW5nIGAvdXNlci86aWRgLCBga2V5c2Agd2lsbFxuICogY29udGFpbiBgW3sgbmFtZTogJ2lkJywgZGVsaW1pdGVyOiAnLycsIG9wdGlvbmFsOiBmYWxzZSwgcmVwZWF0OiBmYWxzZSB9XWAuXG4gKlxuICogQHBhcmFtICB7KFN0cmluZ3xSZWdFeHB8QXJyYXkpfSBwYXRoXG4gKiBAcGFyYW0gIHtBcnJheX0gICAgICAgICAgICAgICAgIFtrZXlzXVxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgICAgICAgICBbb3B0aW9uc11cbiAqIEByZXR1cm4ge1JlZ0V4cH1cbiAqL1xuZnVuY3Rpb24gcGF0aFRvUmVnZXhwIChwYXRoLCBrZXlzLCBvcHRpb25zLCBhbGxUb2tlbnMpIHtcbiAga2V5cyA9IGtleXMgfHwgW107XG4gIGFsbFRva2VucyA9IGFsbFRva2VucyB8fCBbXTtcblxuICBpZiAoIWlzQXJyYXkoa2V5cykpIHtcbiAgICBvcHRpb25zID0ga2V5cztcbiAgICBrZXlzID0gW107XG4gIH0gZWxzZSBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cblxuICBpZiAocGF0aCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiByZWdleHBUb1JlZ2V4cChwYXRoLCBrZXlzLCBvcHRpb25zLCBhbGxUb2tlbnMpO1xuICB9XG5cbiAgaWYgKGlzQXJyYXkocGF0aCkpIHtcbiAgICByZXR1cm4gYXJyYXlUb1JlZ2V4cChwYXRoLCBrZXlzLCBvcHRpb25zLCBhbGxUb2tlbnMpO1xuICB9XG5cbiAgdmFyIHN0cmljdCA9IG9wdGlvbnMuc3RyaWN0O1xuICB2YXIgZW5kID0gb3B0aW9ucy5lbmQgIT09IGZhbHNlO1xuICB2YXIgcm91dGUgPSByZXBsYWNlUGF0aChwYXRoLCBrZXlzLCBhbGxUb2tlbnMpO1xuICB2YXIgZW5kc1dpdGhTbGFzaCA9IHBhdGguY2hhckF0KHBhdGgubGVuZ3RoIC0gMSkgPT09ICcvJztcblxuICAvLyBJbiBub24tc3RyaWN0IG1vZGUgd2UgYWxsb3cgYSBzbGFzaCBhdCB0aGUgZW5kIG9mIG1hdGNoLiBJZiB0aGUgcGF0aCB0b1xuICAvLyBtYXRjaCBhbHJlYWR5IGVuZHMgd2l0aCBhIHNsYXNoLCB3ZSByZW1vdmUgaXQgZm9yIGNvbnNpc3RlbmN5LiBUaGUgc2xhc2hcbiAgLy8gaXMgdmFsaWQgYXQgdGhlIGVuZCBvZiBhIHBhdGggbWF0Y2gsIG5vdCBpbiB0aGUgbWlkZGxlLiBUaGlzIGlzIGltcG9ydGFudFxuICAvLyBpbiBub24tZW5kaW5nIG1vZGUsIHdoZXJlIFwiL3Rlc3QvXCIgc2hvdWxkbid0IG1hdGNoIFwiL3Rlc3QvL3JvdXRlXCIuXG4gIGlmICghc3RyaWN0KSB7XG4gICAgcm91dGUgPSAoZW5kc1dpdGhTbGFzaCA/IHJvdXRlLnNsaWNlKDAsIC0yKSA6IHJvdXRlKSArICcoPzpcXFxcLyg/PSQpKT8nO1xuICB9XG5cbiAgaWYgKGVuZCkge1xuICAgIHJvdXRlICs9ICckJztcbiAgfSBlbHNlIHtcbiAgICAvLyBJbiBub24tZW5kaW5nIG1vZGUsIHdlIG5lZWQgdGhlIGNhcHR1cmluZyBncm91cHMgdG8gbWF0Y2ggYXMgbXVjaCBhc1xuICAgIC8vIHBvc3NpYmxlIGJ5IHVzaW5nIGEgcG9zaXRpdmUgbG9va2FoZWFkIHRvIHRoZSBlbmQgb3IgbmV4dCBwYXRoIHNlZ21lbnQuXG4gICAgcm91dGUgKz0gc3RyaWN0ICYmIGVuZHNXaXRoU2xhc2ggPyAnJyA6ICcoPz1cXFxcL3wkKSc7XG4gIH1cblxuICByZXR1cm4gYXR0YWNoS2V5cyhuZXcgUmVnRXhwKCdeJyArIHJvdXRlLCBmbGFncyhvcHRpb25zKSksIGtleXMsIGFsbFRva2Vucyk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRlbm9kZWlmeShmbikge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzXG5cdFx0dmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXHRcdFx0YXJncy5wdXNoKGZ1bmN0aW9uKGVyciwgcmVzKSB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRyZWplY3QoZXJyKVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlc29sdmUocmVzKVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXG5cdFx0XHR2YXIgcmVzID0gZm4uYXBwbHkoc2VsZiwgYXJncylcblxuXHRcdFx0dmFyIGlzUHJvbWlzZSA9IHJlc1xuXHRcdFx0XHQmJiAodHlwZW9mIHJlcyA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHJlcyA9PT0gJ2Z1bmN0aW9uJylcblx0XHRcdFx0JiYgdHlwZW9mIHJlcy50aGVuID09PSAnZnVuY3Rpb24nXG5cblx0XHRcdGlmIChpc1Byb21pc2UpIHtcblx0XHRcdFx0cmVzb2x2ZShyZXMpXG5cdFx0XHR9XG5cdFx0fSlcblx0fVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiJdfQ==