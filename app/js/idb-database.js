function Database() {
    this._database = null;
}

Database.prototype._open = function (data) {
    return new Promise(function (resolve, reject) {
        var req = indexedDB.open('os2geo-' + data, 2);
        req.onblocked = reject;
        req.onerror = reject;
        req.onupgradeneeded = function (e) {
            console.log(e);
            var db = e.target.result;
            console.log(db);
            var keyPath = '_id';
            if (data === 'cache') {
                keyPath = 'i';
            }
            if (!db.objectStoreNames.contains('data')) {
                db.createObjectStore('data', {
                    keyPath: keyPath
                });
            }
            if (!db.objectStoreNames.contains('meta')) {
                db.createObjectStore('meta', {
                    keyPath: 'i'
                });
            }
        };
        req.onsuccess = function (e) {
            this._database = e.target.result;
            resolve();
        }.bind(this);
    }.bind(this));
};
Database.prototype._add = function (db, doc) {
    return new Promise(function (resolve, reject) {
        var transaction = this._database.transaction([db], 'readwrite');
        var objectStore = transaction.objectStore(db);
        var request = objectStore.add(doc);
        request.onsuccess = function (event) {
            resolve(doc);
        };
        request.onerror = reject;
    }.bind(this));
};
Database.prototype._put = function (db, doc) {
    return new Promise(function (resolve, reject) {
        var transaction = this._database.transaction([db], 'readwrite');
        var objectStore = transaction.objectStore(db);
        var request = objectStore.put(doc);
        request.onsuccess = function (event) {
            resolve(doc);
        };
        request.onerror = reject;
    }.bind(this));
};
Database.prototype._get = function (db, id) {
    return new Promise(function (resolve, reject) {
        var transaction = this._database.transaction([db], 'readonly');
        var objectStore = transaction.objectStore(db);
        var request = objectStore.get(id);
        request.onsuccess = function (event) {
            resolve(event.target.result);
        };
        request.onerror = reject;
    }.bind(this));
};
Database.prototype._delete = function (db, id) {
    return new Promise(function (resolve, reject) {
        var transaction = this._database.transaction([db], 'readwrite');
        var objectStore = transaction.objectStore(db);
        var request = objectStore.delete(id);
        request.onsuccess = function (event) {
            resolve(id);
        };
        request.onerror = function (event) {
            resolve(id);
        };
    }.bind(this));
};
Database.prototype._count = function (db, id) {
    return new Promise(function (resolve, reject) {
        var transaction = this._database.transaction([db], 'readonly');
        var objectStore = transaction.objectStore(db);
        var request = objectStore.count(id);
        request.onsuccess = function (event) {
            resolve(event.target.result);
        };
        request.onerror = reject;
    }.bind(this));
};
Database.prototype._cursor = function (db) {
    return new Promise(function (resolve, reject) {
        var transaction = this._database.transaction([db], 'readwrite');
        var objectStore = transaction.objectStore(db);
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
    }.bind(this));
};
Database.prototype._sequence = function () {
    return this._count('meta', 's').then(function (data) {
        if (data === 0) {
            return this._add('meta', {
                i: 's',
                s: '0'
            });
        } else {
            return this._get('meta', 's');
        }
    }.bind(this));
};