'use strict';
function EventEmitter() {}

var proto = EventEmitter.prototype;
function indexOfListener(listeners, listener) {
    var i = listeners.length;
    while (i--) {
        if (listeners[i].listener === listener) {
            return i;
        }
    }

    return -1;
}

function alias(name) {
    return function aliasClosure() {
        return this[name].apply(this, arguments);
    };
}

proto.getListeners = function getListeners(evt) {
    var events = this._getEvents();
    var response;
    var key;
    if (evt instanceof RegExp) {
        response = {};
        for (key in events) {
            if (events.hasOwnProperty(key) && evt.test(key)) {
                response[key] = events[key];
            }
        }
    }
    else {
        response = events[evt] || (events[evt] = []);
    }
    return response;
};

proto.flattenListeners = function flattenListeners(listeners) {
    var flatListeners = [];
    var i;

    for (i = 0; i < listeners.length; i += 1) {
        flatListeners.push(listeners[i].listener);
    }

    return flatListeners;
};
proto.getListenersAsObject = function getListenersAsObject(evt) {
    var listeners = this.getListeners(evt);
    var response;

    if (listeners instanceof Array) {
        response = {};
        response[evt] = listeners;
    }

    return response || listeners;
};

function isValidListener (listener) {
    if (typeof listener === 'function' || listener instanceof RegExp) {
        return true
    } else if (listener && typeof listener === 'object') {
        return isValidListener(listener.listener)
    } else {
        return false
    }
}

proto.addListener = function addListener(evt, listener) {
    if (!isValidListener(listener)) {
        throw new TypeError('listener must be a function');
    }

    var listeners = this.getListenersAsObject(evt);
    var listenerIsWrapped = typeof listener === 'object';
    var key;

    for (key in listeners) {
        if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
            listeners[key].push(listenerIsWrapped ? listener : {
                listener: listener,
                once: false
            });
        }
    }

    return this;
};

proto.on = alias('addListener');

proto.addOnceListener = function addOnceListener(evt, listener) {
    return this.addListener(evt, {
        listener: listener,
        once: true
    });
};

proto.once = alias('addOnceListener');

proto.defineEvent = function defineEvent(evt) {
    this.getListeners(evt);
    return this;
};

proto.defineEvents = function defineEvents(evts) {
    for (var i = 0; i < evts.length; i += 1) {
        this.defineEvent(evts[i]);
    }
    return this;
};


proto.removeListener = function removeListener(evt, listener) {
    var listeners = this.getListenersAsObject(evt);
    var index;
    var key;

    for (key in listeners) {
        if (listeners.hasOwnProperty(key)) {
            index = indexOfListener(listeners[key], listener);

            if (index !== -1) {
                listeners[key].splice(index, 1);
            }
        }
    }

    return this;
};

proto.off = alias('removeListener');

proto.addListeners = function addListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(false, evt, listeners);
};

proto.removeListeners = function removeListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(true, evt, listeners);
};

proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
    var i;
    var value;
    var single = remove ? this.removeListener : this.addListener;
    var multiple = remove ? this.removeListeners : this.addListeners;

    // If evt is an object then pass each of its properties to this method
    if (typeof evt === 'object' && !(evt instanceof RegExp)) {
        for (i in evt) {
            if (evt.hasOwnProperty(i) && (value = evt[i])) {
                // Pass the single listener straight through to the singular method
                if (typeof value === 'function') {
                    single.call(this, i, value);
                }
                else {
                    // Otherwise pass back to the multiple function
                    multiple.call(this, i, value);
                }
            }
        }
    }
    else {
        i = listeners.length;
        while (i--) {
            single.call(this, evt, listeners[i]);
        }
    }

    return this;
};

proto.removeEvent = function removeEvent(evt) {
    var type = typeof evt;
    var events = this._getEvents();
    var key;

    // Remove different things depending on the state of evt
    if (type === 'string') {
        // Remove all listeners for the specified event
        delete events[evt];
    }
    else if (evt instanceof RegExp) {
        // Remove all events matching the regex.
        for (key in events) {
            if (events.hasOwnProperty(key) && evt.test(key)) {
                delete events[key];
            }
        }
    }
    else {
        // Remove all listeners in all events
        delete this._events;
    }

    return this;
};

proto.removeAllListeners = alias('removeEvent');

proto.emitEvent = function emitEvent(evt, args) {
    var listenersMap = this.getListenersAsObject(evt);
    var listeners;
    var listener;
    var i;
    var key;
    var response;

    for (key in listenersMap) {
        if (listenersMap.hasOwnProperty(key)) {
            listeners = listenersMap[key].slice(0);

            for (i = 0; i < listeners.length; i++) {
                // If the listener returns true then it shall be removed from the event
                // The function is executed either with a basic call or an apply if there is an args array
                listener = listeners[i];

                if (listener.once === true) {
                    this.removeListener(evt, listener.listener);
                }

                response = listener.listener.apply(this, args || []);

                if (response === this._getOnceReturnValue()) {
                    this.removeListener(evt, listener.listener);
                }
            }
        }
    }

    return this;
};

/**
 * Alias of emitEvent
 */
proto.trigger = alias('emitEvent');

/**
 * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
 * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
 *
 * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
 * @param {...*} Optional additional arguments to be passed to each listener.
 * @return {Object} Current instance of EventEmitter for chaining.
 */
proto.emit = function emit(evt) {
    var args = Array.prototype.slice.call(arguments, 1);
    return this.emitEvent(evt, args);
};

/**
 * Sets the current value to check against when executing listeners. If a
 * listeners return value matches the one set here then it will be removed
 * after execution. This value defaults to true.
 *
 * @param {*} value The new value to check for when executing listeners.
 * @return {Object} Current instance of EventEmitter for chaining.
 */
proto.setOnceReturnValue = function setOnceReturnValue(value) {
    this._onceReturnValue = value;
    return this;
};

/**
 * Fetches the current value to check against when executing listeners. If
 * the listeners return value matches this one then it should be removed
 * automatically. It will return true by default.
 *
 * @return {*|Boolean} The current value to check for or the default, true.
 * @api private
 */
proto._getOnceReturnValue = function _getOnceReturnValue() {
    if (this.hasOwnProperty('_onceReturnValue')) {
        return this._onceReturnValue;
    }
    else {
        return true;
    }
};

/**
 * Fetches the events object and creates one if required.
 *
 * @return {Object} The events storage object.
 * @api private
 */
proto._getEvents = function _getEvents() {
    return this._events || (this._events = {});
};

