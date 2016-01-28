importScripts(
    '../lib/lie/dist/lie.polyfill.min.js'
    );
var databases = {}

function open(name) {
    return Promise.resolve().then(function () {
        if (databases.hasOwnProperty(name)) {
            // reuse the same event to avoid onblocked when deleting
            return databases[name];
        }
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open('os2geo-' + name);
            databases[name] = { name: name, openIndexedDBReq: req };
            req.onblocked = reject;
            req.onerror = reject;
            req.onupgradeneeded = function (e) {
                console.log(e);
                var db = e.target.result;
                var keyPath = '_id';
                if (name === 'cache') {
                    keyPath = 'i';
                }
                db.createObjectStore('data', {
                    keyPath: keyPath
                });
            };
            req.onsuccess = function (e) {
                var db = e.target.result;
                databases[name].db = db;
                resolve(databases[name]);
            };
        });
    });
}


function _cursor(database) {
    return new Promise(function (resolve, reject) {
        var transaction = database.db.transaction(['data'], 'readwrite');
        var objectStore = transaction.objectStore('data');
        var request = objectStore.openCursor();
        var results = [];
        request.onsuccess = function (event) {
            var cursor = event.target.result;

            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        request.onerror = reject;
    });
}

function _get(database, id) {
    return new Promise(function (resolve, reject) {
        var transaction = database.db.transaction(['data'], 'readonly');
        var objectStore = transaction.objectStore('data');
        var request = objectStore.get(id);
        request.onsuccess = function (event) {
            resolve(event.target.result);
        };
        request.onerror = reject;
    });
}

function _delete(database, id) {
    return new Promise(function (resolve, reject) {
        var transaction = database.db.transaction(['data'], 'readwrite');
        var objectStore = transaction.objectStore('data');
        var request = objectStore.delete(id);
        request.onsuccess = function (event) {
            resolve(id);
        };
        request.onerror = function (event) {
            resolve(id);
        };
    });
}

function _add(database, doc) {
    return new Promise(function (resolve, reject) {
        var transaction = database.db.transaction(['data'], 'readwrite');
        var objectStore = transaction.objectStore('data');
        var request = objectStore.add(doc);
        request.onsuccess = function (event) {
            resolve(doc);
        };
        request.onerror = reject;
    });
}

function _put(database, doc) {
    return new Promise(function (resolve, reject) {
        var transaction = database.db.transaction(['data'], 'readwrite');
        var objectStore = transaction.objectStore('data');
        var request = objectStore.put(doc);
        request.onsuccess = function (event) {
            resolve(doc);
        };
        request.onerror = reject;
    });
}

function _count(database, id) {
    return new Promise(function (resolve, reject) {
        var transaction = database.db.transaction(['data'], 'readonly');
        var objectStore = transaction.objectStore('data');
        var request = objectStore.count(id);
        request.onsuccess = function (event) {
            resolve(event.target.result);
        };
        request.onerror = reject;
    });
};

function _sequence(database) {
    return open('databases').then(function (db) {
        return _count(db, database.name).then(function (data) {
            if (data === 0) {
                return _add(db, {
                    _id: database.name,
                    s: '0'
                });
            } else {
                return _get(db, database.name);
            }
        });
    });
};

function _createDB(db, dbs) {
    return Promise.resolve().then(function () {
        for (var key in db.objectStoreNames) {
            var index = dbs.indexOf(db.objectStoreNames[key]);
            if (index !== -1) {
                dbs.splice(index, 1);
            }
        }
        if (dbs.length > 0) {
            return upgrade(dbs, db.version + 1);
        }
        return db
    });
};

self.addEventListener('message', function (e) {
    switch (e.data.action) {
        case 'sequence':
            Promise.resolve().then(function () {
                return open(e.data.db);
            }).then(function (db) {
                return _sequence(db);
            }).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });

            break;
        case 'count':
            Promise.resolve().then(function () {
                return open(e.data.db);
            }).then(function (db) {
                return _count(db, e.data.id);
            }).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });

            break;
        case 'delete':
            Promise.resolve().then(function () {
                return open(e.data.db);
            }).then(function (db) {
                return _delete(db, e.data.id);
            }).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });

            break;
        case 'add':
            Promise.resolve().then(function () {
                return open(e.data.db);
            }).then(function (db) {
                return _add(db, e.data.doc);
            }).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });

            break;
        case 'put':
            Promise.resolve().then(function () {
                return open(e.data.db);
            }).then(function (db) {
                return _put(db, e.data.doc);
            }).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });

            break;
        case 'get':
            Promise.resolve().then(function () {
                return open(e.data.db);
            }).then(function (db) {
                return _get(db, e.data.id);
            }).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });

            break;
        case 'cursor':
            Promise.resolve().then(function () {
                return open(e.data.db);
            }).then(function (db) {
                return _cursor(db);
            }).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });
            break;
        case 'createDB':
            Promise.resolve().then(function () {
                var promises = [];
                for (var i = 0; i < e.data.db.lenght; i++) {
                    promises.push(open(e.data.db[i]));
                }
                return Promise.all(promises);
            }).then(function (data) {
                self.postMessage({});
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });
            break;
    }
});
