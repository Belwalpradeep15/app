/*
 * FILENAME:    ObjectManager.js
 * AUTHOR:      Karina Simard
 * CREATED ON:  10-02-11
 * 
 * DESCRIPTION:  
 *
 * LAST CHANGE:
 * $Author: sklassen $
 *   $Date: 2011-05-20 15:29:24 -0600 (Fri, 20 May 2011) $
 *    $Rev: 3788 $
 *    $URL: https://repos.fotechsolutions.com/svn/system/panoptes/trunk/modules/common_util/public/javascripts/ObjectManager.js $
 *
 * COPYRIGHT:
 * This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.
 */

/**
 * @fileoverview a generic object manager class 
 */

/** Fotech namespace. */
var fotech = (fotech ? fotech : {});

/** Fotech util namespace. */
fotech.util = (fotech.util ? fotech.util : {});

/** 
 * Object Manager is a base class that fire events off the main window.document 
 * when it is changed.  It will prepend all of its events with the eventPrefix
 * provided so this parameter should be unique.
 * @constructor
 * @param {String} eventPrefix This will be used to prefix the custom events
 */
fotech.util.ObjectManager = function(eventPrefix, options){
    this._eventPrefix = eventPrefix;
    this._hash = new Hash();
    this._lockedIds = new Array();
    this._listenerHash = new Hash();

    options = options || {};
    this.maxSize = options.maxSize || Number.MAX_VALUE;
    this.ageSortFunction = options.ageSortFunction || function(a,b){return a.id - b.id;};
}

/** 
 * _eventString is intended to be a private member that just constructs the
 * namespaced event name
 * @param {String} eventName The general event name (add, remove, etc)
 * @return {String} eventName prepended with this instance's eventPrefix
 */
fotech.util.ObjectManager.prototype._eventString = function(eventName){
    if(eventName.startsWith(this._eventPrefix) || eventName.include(':'))
        return eventName;
    return this._eventPrefix + ":" + eventName;
}

/**
 * wrapper for the .size
 * @return {int} number of objects in the hash
 */
fotech.util.ObjectManager.prototype.size = function(){
    return this._hash.size();
}

/**
 * function to lock an object in this manager so that it cannot be removed
 * @params id the id of the object to lock
 */
fotech.util.ObjectManager.prototype.lock = function(anId){
    this._lockedIds.push(anId);
    this._lockedIds = this._lockedIds.uniq();
}

/**
 * function to unlock an object in this manager so that it can be removed
 * this does nothing if the id does not exist within the list of locked ids
 * @params id this id of the object to unlock
 */
fotech.util.ObjectManager.prototype.unlock = function(anId){
    this._lockedIds = this._lockedIds.without(anId);
}

/**
 * returns whether object is locked
 * @params id the id to check
 * @returns bool true if id exists in lock list
 */
fotech.util.ObjectManager.prototype.isLocked = function(anId){
   return this._lockedIds.include(anId);
}

/**
 * grabs all the values of the hash and returns them as an array, order is not respected
 * @return hash.values()
 */
fotech.util.ObjectManager.prototype.asArray = function(){
    return this._hash.values().findAll(this.passesFilters.bind(this));
}

/**
 * grabs all the values of the hash and returns them as a sorted array based on the sort function passed in
 * @return hash.values()
 */
fotech.util.ObjectManager.prototype.asSortedArray = function(sortFunction){
    return this.asArray().sort(sortFunction);
}

/**
 * wrapper function for set, will overwrite if the key id already exists, will fire update or add as appropriate
 * @param {Object} id The key to reference this object, typically a int id
 * @param {Object} object The object to be stored
 */
fotech.util.ObjectManager.prototype.set = function(id, object){
    var eventToFire = this.contains(id) ? 'update' : 'add';
    this._hash.set(id, object);
    if(this.size() > this.maxSize){
        var kill = this.asSortedArray(this.ageSortFunction).find(function(v){return !this.isLocked(v.id);}.bind(this));
        this._hash.unset(kill.id);
        this.fire(this._eventString('remove'), {'ids':[kill.id]});
    }
        
    //only fire this if it is locked or it unfiltered
    if(this.passesFilters(object))
        this.fire(this._eventString(eventToFire), {'ids':[id]});
}

/**
 * mass add/update from array.  assumes every object in the list has an id attribute
 * importantly, it only fires on 'update' event
 * @param {Array} list List of objects that should contain an id attribute by which to key it
 */
fotech.util.ObjectManager.prototype.merge = function(list){
    var idList = new Array();
    var self = this;
    list.each(function(obj){
                  this.set(obj.id, obj);
                  if(this.passesFilters(obj))
                      idList.push(obj.id);
              }.bind(this));
    this.fire(this._eventString('update'), {'ids':idList});
}

/**
 * wrapper function for set, will overwrite if the key id already exists
 * @param {Object} id The key to reference this object, typically a int id
 * @param {Object} object The object to be stored
 */
fotech.util.ObjectManager.prototype.add = function(id, object){
    this.set(id, object);
}

/**
 * wrapper function for get, will return the object keyed by the given id
 * @param {Object} id The key that reference the object of interest
 * @returns {Object} The object if it exists, otherwise null
 */
fotech.util.ObjectManager.prototype.get = function(id){
    var obj = this._hash.get(id);
    if(this.passesFilters(obj))
        return obj;
    return null;
}

/**
 * Convenience method to wrap the findAll hash method.
 * @param {String} attributeName The name of the attribute of the object to be matched against
 * @param {Object} value The value that the object's attribute should match
 * @return {Array} A list of objects who's specified attribute matches the given value
 */
fotech.util.ObjectManager.prototype.getAllByAttribute = function(attributeName, value){
    return this._hash.values().findAll( function(o){ 
        return this.passesFilters(o) && o[attributeName] == value; 
    }, this);
}

/**
 * Convenience method to check if something exists in the manager, it will attempt
 * to match whatever is passed to it to both the keys and the values (i.e. either an id
 * or an object can be queried)
 * @param {Object} id_or_object This param will be compared to the keys and values
 * @return {Boolean} true if the param matches either a key or a value (using the == operator)
 */
fotech.util.ObjectManager.prototype.exists = function(id_or_object){
    return this._hash.keys().include(id_or_object) || this._hash.values().include(id_or_object);
}

/**
 * Convenience method to check if the hash includes a particular key
 * @param {Object} id The key to check for
 * @return {Boolean} will return true a key matches the given param (using the == operator)
 */
fotech.util.ObjectManager.prototype.contains = function(id){
    return this._hash.keys().include(id);
}

/**
 * wrapper function for set, will overwrite if the key id already exists, will fire update rather than add
 * @param {Object} id The key to reference this object, typically a int id
 * @param {Object} object The object to be stored
 */
fotech.util.ObjectManager.prototype.updateObject = function(id, object){
    this.set(id, object);
}

/**
 * Method to update an attribute of a given object in the hash.  This will trigger
 * a prefixed ':update' event on the rootOpener's document. If the hash does not
 * contain the key given, nothing will happen
 * @param {Object} id This is the key to reference the object
 * @param {String} attributeName The name of the attribute to be updated
 * @param {Object} value The value that the object's attribute will be updated to
 */
fotech.util.ObjectManager.prototype.update = function(id, attributeName, value){
    if(this._hash.get(id) == null)
        return;
    this._hash.get(id)[attributeName] = value;
    this.fire(this._eventString('update'), {'id':id, 'attribute':attributeName, 'value':value, 'ids':[id]});
}

/**
 * Wrapper method for hash.unset(key).  This will trigger a prefixed ':remove' event
 * on the rootOpener's document
 * @param {Object} id The key of the object to be removed
 */
fotech.util.ObjectManager.prototype.remove = function(id){
    if (this._hash.keys().include(id) && !this.isLocked(id)) {
        var ev = this.get(id);
        this._hash.unset(id);
        this.fire(this._eventString('remove'), {'id':id, 'ids':[id], ev: ev });
    }
}

/**
 * Method to remove all objects who's attribute matches a given value.  Handy for
 * situations like:  remove all the elements who's trackUUID == value.
 * This will trigger a prefixed ":removeMultiple" on the rootOpener's document
 * @param {String} attributeName The attributeName of interest
 * @param {Object} value The value to compare the object's attribute must match (using the == operator)
 */
fotech.util.ObjectManager.prototype.removeAllByAttribute = function(attributeName, value, fireEvent){
    var deletes = this._hash.values().findAll( function(obj){ return obj[attributeName] == value && !this.isLocked(obj.id); }.bind(this));
    var self = this;
    deletes.each( function(obj){ self._hash.unset(obj.id); }, this);
    if(fireEvent == null || fireEvent == true)
        this.fire(this._eventString('removeMultiple'), {'ids':deletes.pluck('id')});
}

/**
 * Method to remove all objects in this manager.  
 * This will trigger a prefixed ":removeMultiple" on the rootOpener's document
 * IMPORTANT: This method does not respect the locked list
 */
fotech.util.ObjectManager.prototype.clear = function(){
    if (this._hash.size() > 0) {
        var self = this;
        var deletes = this._hash.values();
        this._hash.keys().each( function(key){self._hash.unset(key);});
        this._lockedIds = new Array();
        this.fire(this._eventString('removeMultiple'), {'ids':deletes.pluck('id')});
    }
}

/**
 * Method that will clear items based on method passed in, this will trigger a removeMultiple event
 * @params method that should return true or false for each object, those that return true will be cleared(unless they are locked
 */
fotech.util.ObjectManager.prototype.clearBy = function(clearMethod){
    var deletes = this._hash.values().findAll(function(value){ return clearMethod(value) && !this.isLocked(value.id);}.bind(this));
    deletes.each( function(value){ this._hash.unset(value.id); }.bind(this));
    this.fire(this._eventString('removeMultiple'), {ids: deletes.pluck('id')});
}

/**
 * Method meant to mimic the .fire method on dom objects.  It will look like we are firing off this object
 * manager when infact we are firing events off of the document
 */
fotech.util.ObjectManager.prototype.fire = function(eventString, memo){
    var ev = FotechCore.CustomEvent( eventString, {} );
    ev.memo = memo;
    ev.eventName = eventString;
    FotechCore.dispatchEvent( fotech.gui.rootOpener().document, ev, memo );
}

/**
 * Method meant to mimic the the .observe method on dom objects. It will look
 * like we are observing this object manager when infact we are firing events off
 * of and listening to the root opener document
 * @param eventString {String} The event to listen to. Can optionally be prepended by the
 *                              event prefix specified when creating this object manager.
 *                              if there is no prefix, it will automatically be added
 * @param callback {Function} The method that will be invoked. This function wraps it 
 *                              such that if the function throws an error it will be removed.
 */
fotech.util.ObjectManager.prototype.observe = function(eventString, callback){
    //figure out the eventString
    var eventStr = eventString.startsWith(this._eventPrefix) ? eventString : this._eventPrefix + ":" + eventString
    var wrappedCallback = function(ev){
        try{
            callback.apply(null, Array.prototype.slice.call(arguments));
        } catch (ex){
            //Exception hit, write it to console and remove this callback
            if(console){
                var exceptionMessage = ex.message === undefined ? ex : ex.name + " ("  + ex.message + ")";
                console.log("This listener for " + eventStr + " will be removed.  Exception: " + exceptionMessage, ex);
            }
            fotech.gui.rootOpener().document.removeEventListener( eventStr, arguments.callee );
        }
    }
    this.__addListener(eventStr, callback, wrappedCallback);
}

fotech.util.ObjectManager.prototype.__addListener = function(eventString, callback, wrappedCallback){
    if(this._listenerHash.get(eventString) == null)
        this._listenerHash.set(eventString, new Array());
    this._listenerHash.get(eventString).push([callback, wrappedCallback]);
    fotech.gui.rootOpener().document.addEventListener( eventString, wrappedCallback );
}

fotech.util.ObjectManager.prototype.__removeListener = function(eventString, callback){
    var self = this;
    this._listenerHash.each(function(pair){
                            var aEventString = pair[0];
                            var listenerList = pair[1].reverse();

                            if(typeof(eventString) == 'string' && aEventString != eventString)
                                return;

                            var i = 0;
                            listenerList.each(function(callbackPair){
                                              var aCallback = callbackPair[0];
                                              var aWrappedCallback = callbackPair[1];

                                              if(typeof(callback) == 'function' && aCallback != callback)
                                                return;

                                              fotech.gui.rootOpener().document.removeEventListener( aEventString, aWrappedCallback );
                                              var index = listenerList.length - 1 - i;
                                              var slice = this._listenerHash.get(aEventString).filter( function(item,id){ return id != index } );
                                              self._listenerHash.set(aEventString, slice);
                                              i++;
                                              }, self);
                            }, this);
}


/**
 * Method meant to mimic the stop observing prototype method
 * @param eventString {String} Optional. The event string to stop observing, if not provided all events will be removed
 * @param callback {Function} Optional.  The exact callback to unwire, if not provided all events attached to the eventString will be removed
 */
fotech.util.ObjectManager.prototype.stopObserving = function(eventString, callback){
    //figure out the eventString
    var eventStr = eventString.startsWith(this._eventPrefix) ? eventString : this._eventPrefix + ":" + eventString
    this.__removeListener(eventStr, callback);
}

/**
 * Set a filter function using this method.  It will trigger an event to let everything know that 
 * filtering has changed and they might want to get their objects again if they care
 * Setting a filter will only restrict what can be retrieved from this object manager, not what 
 * can be added and stored.
 */
fotech.util.ObjectManager.prototype.setFilterFunction = function(fn){
    this.filterFunction = fn;
    this.fire(this._eventString('filtering'));
}

fotech.util.ObjectManager.prototype.removeFilter = function(){
    this.filterFunction = null;
    this.fire(this._eventString('filtering'));
}

fotech.util.ObjectManager.prototype.passesFilters = function(obj){
    if(this.filterFunction == null || this.isLocked(obj.id))
        return true;

    return this.filterFunction(obj);
}

fotech.util.ObjectManager.prototype.isFiltering = function(){
    return this.filterFunction != null;
}
