# Expired Storage

Micro JS lib that provide local & session storage with expiration time.

## How it works

The lib provide a single object that wraps localStorage (or any other class compatible with its API) and set items with additional key to store their expiration time.
When fetching data from storage, the lib will check for expiration and remove expired items.

Here's a quick example of using it:

```js
expiredStorage = new ExpiredStorage();
expiredStorage.setItem("some_key", "some_val", 60);	// <-- will expire after 60 seconds
```

## Install

npm:

```
npm install expired-storage
```

bower:

```
bower install expired-storage
```

or simply take the files from ```dist/``` (either minified or full) and include in any HTML page.


## Usage

Lets see how we use Expired Storage..

### Creating Expired Storage

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

### Basics

Set item with expiration time (in seconds):

```js
// this item will live for 60 seconds, eg one minute.
expiredStorage.setItem("test", "foobar", 60);
```

Or you can set items without expiration time (in which case they will behave just like a normal storage item):

```js
expiredStorage.setItem("no_expire", "this will live forever");
```

Fetch item (if expired, will remove it and return null):

```js
var item = expiredStorage.getItem("test");
```

### Extended API

ExpiredStorage comes with some extra functions to get data:

```js
// get object time to live (in seconds). this will not remove the item, even if expired:
var timeLeft = expiredStorage.getTimeLeft("test");

// check if item is expired:
var isExpired = expiredStorage.isExpired("test");

// get list of keys (if includeExpired is true, will include expired keys that were not yet deleted)
var keys = expiredStorage.keys(includeExpired);

// will return a dictionary with value, time left, and if expired, without removing the item (even if expired).
var data = expiredStorage.peek("test");
```

Plus, you can update item expiration time without changing its content:

```js
// update "test" expiration time to be 100 seconds from current time.
expiredStorage.updateExpiration("test", 100);
```

### Clear Items

Normally expired items will be cleared from storage when you try to fetch them. 
However, if you want initiate cleanup to clear all expired keys, you can use the following:

```js
// remove all expired items and return a list with their keys
var expiredKeys = expiredStorage.clearExpired();
```

Or you can just clear everything, including keys that were not created with Expired Storage:

```js
expiredStorage.clear();
```

### JSON get / set

ExpiredStorage comes with two nice-to-have functions to quickly set and get JSON values:

```js
// write 'someObject' as a JSON stringified text with expiration of 60 seconds
expiredStorage.setJson(key, someObject, 60);

// get value and try to JSON parse it
var someObject = expiredStorage.getJson(key);
```

### Custom Storage

Expired Storage support any storage class that implements the following functions: getItem(), setItem(), removeItem(), clear().

The following example shows how to create a custom storage class that uses dictionary internally, and use it with Expired Storage:

```js
// create a custom storage class for testing
var testStorage = {

	// internal storage
    _storage: {},
	
	// basic API
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
	
	// you can implement keys() function that will be used to retrieve storage keys.
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

// use our custom storage with Expired Storage
expiredStorage = new ExpiredStorage(testStorage);
```

## Troubleshooting

#### "ExpiredStorage: No storage base class provided and 'localStorage' is undefined! Please provide a valid base storage class."

If you're getting this error, its most likely because you create an *ExpiredStorage* without providing a storage class, which means it will try to use ```localStorage``` by default, but ```localStorage``` is missing on the platform your running at.

If its an old browser you might need to provide your own storage class or seek localStorage fallback libs to use.

#### "ExpiredStorage: Storage class  don't support one or more of the required API functions: getItem, setItem, removeItem or clear."

This happens if the custom storage class you provided does not implement one of the following functions:

- setItem
- getItem
- removeItem
- clear

To solve this just implement the missing function.

## License

Expired Storage uses the permissive MIT License.

Cheers.