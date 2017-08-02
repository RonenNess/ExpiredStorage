# Expired Storage

Micro JS lib that provide local & session storage with expiration time.

## How it works

The lib provide a single object that wraps localStorage (or any other class compatible with its API) and set items with additional key to store their expiration time.
When fetching data from storage, the lib will check for expiration and remove the item if needed.

## Key Features

- Provide expiration time to localStorage or any class with similar API.
- "Lazy" cleaning (eg. expired items removed only when you access them) or active cleanup of expired items by-demand.
- Items written with the lib can still be accessed freely with the basic localStorage. Similarly, you can access items not created via the lib.
- Test for items expiration, time left, or update expiration time for exiting keys.
- You can set items without expiration that will behave normally.

Basically you can replace your localStorage class with ExpiredStorage and use it normally. 
Whenever you need items with expiration, simply provide a valid expiration time param.

## Usage

Lets see how we use Expired Storage..

#### Creating Expired Storage

Create ExpiredStorage using the localStorage (default):

```js
expiredStorage = new ExpiredStorage();
``` 

Or create with different type of storage ('storage' must implement the following: setItem, getItem, removeItem, clear):

```js
// create from custom storage class
// note: in addition to the basic api functions the storage should also be iterable, meaning you can do `for (key in storage)`.
// if that's not possible, please provide a 'keys()' function that will return a list of key names in your storage class.
expiredStorage = new ExpiredStorage(storage);
```

#### Basics

Set item with expiration time (in seconds):

```js
// this item will live for 60 seconds, eg one minute.
expiredStorage.setItem("test", "foobar", 60);
```

Set item without expiration time (will behave just like a normal storage item):

```js
expiredStorage.setItem("no_expire", "this will live forever");
```

Fetch item (if expired, will remove it and return null):

```js
var item = expiredStorage.getItem("test");
```

#### Extended API

Check if item expired, or how long it has left:

```js
// get object time to live (in seconds). this will not remove the item, even if expired:
var timeLeft = expiredStorage.getTimeLeft("test");

// check if item is expired:
var isExpired = expiredStorage.isExpired("test");
```

Update item expiration time (without changing its value):

```js
// update "test" expiration time to be 100 seconds from current time.
expiredStorage.updateExpiration("test", 100);
```

#### Clear Items

Actively clear all expired items:

```js
// remove all expired items and return a list with their keys
var expiredKeys = expiredStorage.clearExpired();
```

Or clear all keys from storage (including keys not created with Expired Storage):

```js
expiredStorage.clear();
```

#### Custom Storage

You don't have to use localStorage / sessionStorage with ExpiredStorage.
The following example shows how to create a custom storage class that uses dictionary internally, and use it with Expired Storage:

```js
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

// use that storage with Expired Storage
expiredStorage = new ExpiredStorage(testStorage);
```

## License

Expired Storage uses the permissive MIT License.

Cheers.