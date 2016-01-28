importScripts('../lib/lie/dist/lie.polyfill.min.js','idb-database.js');
var db = new Database();

self.addEventListener('message', function (e) {
    switch (e.data.action) {
        case 'open':
            db._open(e.data.db).then(function () {
                self.postMessage(e.data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });
            break;
        case 'sequence':
            db._sequence().then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });
            break;
        case 'delete':
            db._delete(e.data.db, e.data.id).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });
            break;
        case 'add':
            db._add(e.data.db, e.data.doc).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });
            break;
        case 'put':
            db._put(e.data.db, e.data.doc).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });
            break;
        case 'get':
            db._get(e.data.db,e.data.id).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });
            break;
        case 'cursor':
            db._cursor(e.data.db).then(function (data) {
                self.postMessage(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.postMessage({
                    error: e.message
                });
            });
            break;
    }
});