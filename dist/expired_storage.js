(function(root) {

    "use strict";

    /**
     * ExpiredStorage
     * A class to manage local storage with expiration time (like cookies).
     *
     * @param storage: Optional storage base class to use (must implement the 'localStorage' API). If not defined, 'localStorage' will be used as a default.
     **/
    function ExpiredStorage(storage) {

        // set default storage to localStorage
        storage = storage || (typeof localStorage !== "undefined" ? localStorage : null);

        // sanity check1: make sure we have a valid storage class to use.
        if (!storage) {
            throw new Error("ExpiredStorage: No storage base class provided and 'localStorage' is undefined! Please provide a valid base storage class.");
        }

        // sanity check2: make sure the storage class provide the required API.
        if (!(storage.setItem && storage.getItem && storage.removeItem && storage.clear)) {
            throw new Error("ExpiredStorage: Storage class  don't support one or more of the required API functions: getItem, setItem, removeItem or clear.");
        }

        // set storage class
        this._storage = storage;
    }

    /**
     * Define expired storage prototype.
     */
    ExpiredStorage.prototype = {

        // base storage class to use, must implement the localStorage API.
        _storage: null,

        // prefix to use when storing items timestamp
        _expiration_key_prefix: "__expired_storage_ts__",

        /**
         * Get current timestamp in seconds.
         **/
        getTimestamp: function() {
            return Math.floor(((new Date).getTime()) / 1000);
        },

        /**
         * Set item.
         * @param key: Item key to set (string).
         * @param value: Value to store (string).
         * @param expiration: Expiration time, in seconds. If not provided, will not set expiration time.
         * @param return: Storage.setItem() return code.
         **/
        setItem: function(key, value, expiration) {

            // set item
            var ret = this._storage.setItem(key, value);

            // set expiration timestamp (only if defined)
            if (expiration) {
                this.updateExpiration(key, expiration);
            }

            // return set value return value
            return ret;
        },

        /**
         * Get item.
         * @param key: Item key to get (string).
         * @return: Stored value, or undefined if not set / expired.
         */
        getItem: function(key) {

            // if expired remove item and return null
            if (this.isExpired(key)) {
                this.removeItem(key);
                return null;
            }

            // try to fetch and return item value
            return this._storage.getItem(key);
        },

        /**
        * Get item + metadata such as time left and if expired.
        * Even if item expired, will not remove it.
        * @param key: Item key to get (string).
        * @return: Dictionary with: {value, timeLeft, isExpired}
        */
        peek: function(key) {

            // get value and time left
            var ret = {
                value: this._storage.getItem(key),
                timeLeft: this.getTimeLeft(key),
            };

            // set if expired
            ret.isExpired = ret.timeLeft !== null && ret.timeLeft <= 0;

            // return data
            return ret;
        },

        /**
         * Get item time left to live.
         * @param key: Item key to get (string).
         * @return: Time left to expire (in seconds), or null if don't have expiration date.
         */
        getTimeLeft: function(key) {

            // try to fetch expiration time for key
            var expireTime = parseInt(this._storage.getItem(this._expiration_key_prefix + key));

            // if got expiration time return how much left to live
            if (expireTime && !isNaN(expireTime)) {

                return expireTime - this.getTimestamp();
            }

            // if don't have expiration time return null
            return null;
        },

        /**
         * Return if an item is expired (don't remove it, even if expired).
         * @param key: Item key to check (string).
         * @return: True if expired, False otherwise.
         */
        isExpired: function(key) {

            // get time left for item
            var timeLeft = this.getTimeLeft(key);

            // return if expired
            return timeLeft !== null && timeLeft <= 0;
        },

        /**
         * Update expiration time for an item (note: doesn't validate that the item is set).
         * @param key: Item key to update expiration for (string).
         * @param expiration: New expiration time in seconds to set.
         * @return: Storage.setItem() return code for setting new expiration.
         **/
        updateExpiration: function(key, expiration) {
            return this._storage.setItem(this._expiration_key_prefix + key, this.getTimestamp() + expiration);
        },

        /**
         * Remove an item.
         * @param key: Item key to remove (string).
         * @return: Storage.removeItem() return code.
         */
        removeItem: function(key) {

            // remove the item itself and its expiration time
            var ret = this._storage.removeItem(key);
            this._storage.removeItem(this._expiration_key_prefix + key);

            // return optional return code
            return ret;
        },

        /**
         * Set a json serializable value. This basically calls JSON.stringify on 'val' before setting it.
         * @param key: Item key to set (string).
         * @param value: Value to store (object, will be stringified).
         * @param expiration: Expiration time, in seconds. If not provided, will not set expiration time.
         * @param return: Storage.setItem() return code.
         **/
        setJson: function(key, val, expiration)
        {
            // special case - make sure not undefined, because it would just write "undefined" and crash on reading.
            if (val === undefined) {
                throw new Error("Cannot set undefined value as JSON!");
            }

            // set stringified value
            return this.setItem(key, JSON.stringify(val), expiration);
        },

        /**
         * Get a json serializable value. This basically calls JSON.parse on the returned value.
         * @param key: Item key to get (string).
         * @return: Stored value, or undefined if not set / expired.
         **/
        getJson: function(key)
        {
            // get value
            var val = this.getItem(key);

            // if null, return null
            if (val === null) {
                return null;
            }

            // parse and return value
            return JSON.parse(val);
        },

        /**
         * Get all keys in storage, not including internal keys used to store expiration.
         * @param: includeExpired: if true, will also include expired keys.
         * @return: Array with keys.
         */
        keys: function(includeExpired) {
            // create list to return
            var ret = [];

            // iterate over storage keys to find all non-expiration keys
            var that = this;
            this._iterKeys(function(storageKey) {

                // if its not a timestamp key, skip it
                if (storageKey.indexOf(that._expiration_key_prefix) !== 0) {

                    // add to return list, but only if including expired keys or if not expired yet
                    if (includeExpired || !that.isExpired(storageKey)) {
                        ret.push(storageKey);
                    }
                }
            });

            // return keys
            return ret;
        },

        /**
         * Iterate all keys in storage class.
         * @param callback: Function to call for every key, with a single param: key.
         */
        _iterKeys: function(callback) {

            // first check if storage define a 'keys()' function. if it does, use it
            if (typeof this._storage.keys === "function") {
                var keys = this._storage.keys();
                for (var i = 0; i < keys.length; ++i) {
                    callback(keys[i]);
                }
            }

            // if not supported try to use object.keys
            else if (typeof Object === "function" && Object.keys) {
                var keys = Object.keys(this._storage);
                for (var i = 0; i < keys.length; ++i) {
                    callback(keys[i]);
                }
            }

            // if not supported try to use iteration via length
            else if (this._storage.length !== undefined && typeof this._storage.key === "function") {

                // first build keys array, so this function will be delete-safe (eg if callback remove keys it won't cause problems due to index change)
                var keys = [];
                for (var i = 0, len = this._storage.length; i < len; ++i) {
                    keys.push(this._storage.key(i));
                }
                // now actually iterate keys
                for (var i = 0; i < keys.length; ++i) {
                    callback(keys[i]);
                }
            }

            // if both methods above didn't work, iterate on all keys in storage class hoping for the best..
            else {
                for (var storageKey in this._storage) {
                    callback(storageKey);
                }
            }
        },

        /**
         * Clear the entire storage and all keys in it.
         */
        clear: function() {
            this._storage.clear();
        },

        /**
         * Clear expired keys.
         * If you never call this function, expired keys will remain until you try to get them / reset a new value.
         *
         * @param return: List of removed keys due to expiration.
         */
        clearExpired: function() {

            // return list
            var ret = [];

            // get current timestamp
            var timestamp = this.getTimestamp();

            // iterate over storage keys to find all counters
            var that = this;
            this._iterKeys(function(storageKey) {

                // if its not a timestamp key, skip it
                if (storageKey.indexOf(that._expiration_key_prefix) === 0) {

                    // get item key
                    var itemKey = storageKey.substr(that._expiration_key_prefix.length);

                    // if expired remove it + the item
                    if (that.isExpired(itemKey)) {

                        that.removeItem(itemKey);
                        ret.push(itemKey);
                    }
                }
            });

            // return list with removed keys
            return ret;
        },
    };

    // add some api params
    ExpiredStorage.version = "1.0.2";
    ExpiredStorage.author = "Ronen Ness";
    ExpiredStorage.gitUrl = "https://github.com/RonenNess/ExpiredStorage";

    // AMD support.
    if (typeof define === "function" && define.amd) {
        define(function() {
            "use strict";
            return ExpiredStorage;
        });
    }

    // support in CommonJS with module object
    else if (typeof module === "object" && module.exports) {
        module.exports = ExpiredStorage;
    }

    // support in CommonJS without 'module' object
    else if (typeof exports === "object" && exports) {
        exports = ExpiredStorage;
    }

    // add to root (only if not previously defined)
    else if (root && !root.ExpiredStorage) {
        root.ExpiredStorage = ExpiredStorage;
    }

    // also return the API object
    return ExpiredStorage;

})(this);