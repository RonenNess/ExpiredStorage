// sanity check before starting tests
if (typeof localStorage === "undefined") {
    alert("Warning! 'localStorage' is undefined, therefore tests cannot run. \n\nThis is either because the browser is too old, or it is Internet Explorer running from filesystem without a domain (a known issue with IE, but would work when served with domain).")
}

// to be able to test properly without having to wait a long time for expiration etc, we override the function to get
// timsetamp with something to return a const value we control
ExpiredStorage.prototype.getTimestamp = function() {return window._timestamp;}

// this is the timestamp value we control for tests
window._timestamp = 0;

// creating expired storage with different objects
QUnit.test( "Creation", function( assert ) {

    // create expired storage with different params, make sure don't throw any exceptions
    expired = new ExpiredStorage();
    expired = new ExpiredStorage(sessionStorage);
    expired = new ExpiredStorage({
        getItem: function() {},
        setItem: function() {},
        removeItem: function() {},
        clear: function() {},
    });
    assert.ok(true, "Successfully create ExpiredStorage with different params.");

    // validate timestamp override
    assert.equal(expired.getTimestamp(), window._timestamp, "Make sure the timestamp override works.");

    // create with invalid storage class, make sure throw exception
    assert.throws(function() {
        expired = new ExpiredStorage({});
    }, "Make sure creating the ExpiredStorage with invalid object fails.")
});


// create a custom storage class for testing
var testStorage = {

    _storage: {},
    getItem: function(key) {
        return this._storage[key];
    },
    setItem: function(key, val) {
        this._storage[key] = val;
    },
    removeItem: function(key) {
        delete this._storage[key];
    },
    clear: function() {
        this._storage = {};
    },
    keys: function() {
        var ret = [];
        for (var key in this._storage) {
            if (this._storage.hasOwnProperty(key)) {
                ret.push(key);
            }
        }
        return ret;
    }
};


// test all the following tests 3 times: with local storage, with session storage, and with a custom storage class
var storageTypes = {"localStorage": localStorage, "sessionStorage": sessionStorage, "customStorage": testStorage};
for (var storageTypeKey in storageTypes) {

    // get tests prefix and storage to use
    var testsPrefix = "ExpiredStorage[" + storageTypeKey + "]: ";
    var storageType = storageTypes[storageTypeKey];

    // wrap testsPrefix and getStorage so we won't lose it
    (function(testsPrefix, storageType){

        // create function to create storage using the current type
        var getStorage = function() {
            return new ExpiredStorage(storageType);
        }

        // stuff to run before every new test
        var initTest = function() {

            // clear storage before starting tests
            storageType.clear();

            // zero timestamp
            window._timestamp = 0;
        };

        // basic storage api without expiration (get, set, clear, remove, isExpired, getTimeLeft..)
        QUnit.test( testsPrefix + "Basic set, get, clear and remove", function( assert ) {

            // create expired storage
            initTest();
            expired = getStorage();

            // test basic set, get and remove items
            expired.setItem("test", "foo");
            assert.equal(expired.getItem("test"), "foo", "Make sure basic setItem and getItem works.");
            expired.removeItem("test");
            assert.equal(expired.getItem("test"), null, "Make sure basic removeItem works.");

            // make sure get keys works
            expired.setItem("test1", "foo");
            expired.setItem("test2", "bar");
            assert.deepEqual(expired.keys().sort(), ["test1", "test2"].sort(), "Make sure getting keys works.");
            expired.clear();
            assert.deepEqual(expired.keys(), [], "Make sure getting keys after clear works.");

            // check clear
            expired.setItem("test1", "foo");
            expired.setItem("test2", "bar");
            expired.clear();
            assert.equal(expired.getItem("test1"), null, "Make sure clear items works.");
            assert.equal(expired.keys().length, 0, "Make sure clear items works.");

            // create another object without expiration and check isExpired and TimeLeft
            expired.setItem("__noex", "bar");
            assert.equal(expired.getItem("__noex"), "bar", "Make sure successfully got an item without expiration time.");
            assert.equal(expired.getTimeLeft("__noex"), null, "Test getTimeLeft on item without expiration time.");
            assert.equal(expired.isExpired("__noex"), false, "Test isExpired on item without expiration time.");

            // clear
            expired.clear();
            assert.equal(expired.keys().length, 0, "Make sure clear items works.");
        });


        // basic storage api with expiration time (get, set, clear, remove, isExpired, getTimeLeft..)
        QUnit.test( testsPrefix + "Basic API on items with expiration", function( assert ) {

            // create expired storage
            initTest();
            expired = getStorage();

            // create item with expiration
            expired.setItem("test", "foo", 10);
            assert.equal(expired.getItem("test"), "foo", "Make sure successfully got an item with not-yet expired time.");
            assert.equal(expired.getTimeLeft("test"), 10, "Test getTimeLeft on item with expiration time.");
            assert.equal(expired.isExpired("test"), false, "Test isExpired on item with expiration time.");
            assert.deepEqual(expired.keys(), ["test"], "Make sure keys contain new key with expiration time.");

            // now make the first item, the one with expiration, expired
            window._timestamp = 15;
            assert.equal(expired.getTimeLeft("test"), -5, "Test getTimeLeft on item with expiration time that is expired.");
            assert.equal(expired.isExpired("test"), true, "Test isExpired on item with expiration time that is expired.");
            assert.equal(expired.getItem("test"), null, "Make sure got null on expired item.");
            assert.equal(expired._storage.getItem("test"), null, "Make sure really deleted the expired item from storage.");
            assert.deepEqual(expired.keys(), [], "Make sure deleted expired item not returned with keys.");
        });


        // test clearExpired function to actively clear expired items
        QUnit.test( testsPrefix + "Clear expired", function( assert ) {

            // create expired storage
            initTest();
            expired = getStorage();

            // zero timestamp and create several items
            window._timestamp = 0;
            expired.setItem("test", "foo", 10);
            expired.setItem("test2", "bar", 15);
            expired.setItem("stay", "woo", 25);
            expired.setItem("stay2", "woo2");
            assert.deepEqual(expired.keys().sort(), ["test", "test2", "stay", "stay2"].sort(), "Make sure created items was successful.");

            // make some of the items expire and check cleanup
            window._timestamp = 19;
            assert.deepEqual(expired.keys(true).sort(), ["test", "test2", "stay", "stay2"].sort(), "Make sure all items still exists *before* calling cleanup.");
            assert.deepEqual(expired.keys(false).sort(), ["stay", "stay2"].sort(), "Make sure keys() don't return expired items when not asked to.");
            var cleared = expired.clearExpired();
            assert.deepEqual(cleared.sort(), ["test", "test2"].sort(), "Make sure clearExpired properly returned the removed keys.");
            assert.deepEqual(expired.keys(true).sort(), ["stay", "stay2"].sort(), "Make sure all expired items were cleared after calling clearExpired.");
        });

    })(testsPrefix, storageType);

}