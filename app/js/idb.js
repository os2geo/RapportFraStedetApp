function IdbWorker(idb) {
	this._idb = idb;
	this.db = new Database();
}
IdbWorker.prototype.done = function (data) {
	if (data && data.error) {
		this._idb._task.reject(data.error);
	} else {
		this._idb._task.resolve(data);
	}
	this._idb._task = null;
	if (this._idb._queue.length > 0) {
		this._idb._task = this._idb._queue.shift();
		this._idb._worker.postMessage(this._idb._task.message);
	}
};
IdbWorker.prototype.postMessage = function (message) {
	var self = this;
	switch (message.action) {
        case 'open':
            self.db._open(message.db).then(function () {
                self.done(message);
            }).catch(function (e) {
                console.error('worker error', e);
                self.done({
                    error: e.message
                });
            });
            break;
        case 'sequence':
            self.db._sequence().then(function (data) {
                self.done(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.done({
                    error: e.message
                });
            });
            break;
        case 'delete':
            self.db._delete(message.db, message.id).then(function (data) {
                self.done(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.done({
                    error: e.message
                });
            });
            break;
        case 'add':
            self.db._add(message.db, message.doc).then(function (data) {
                self.done(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.done({
                    error: e.message
                });
            });
            break;
        case 'put':
            self.db._put(message.db, message.doc).then(function (data) {
                self.done(data);
            }).catch(function (e) {
                console.error('worker error', e);
                /*self.done({
                    error: e.message
                });*/
                self.done(message.doc);
            });
            break;
        case 'get':
            self.db._get(message.db, message.id).then(function (data) {
                self.done(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.done({
                    error: e.message
                });
            });
            break;
        case 'cursor':
            self.db._cursor(message.db).then(function (data) {
                self.done(data);
            }).catch(function (e) {
                console.error('worker error', e);
                self.done({
                    error: e.message
                });
            });
            break;
    }
};
function IDB(db) {
	this._queue = [];
	this._task = null;
	if (navigator.userAgent.indexOf('Chrome') !== -1) {
		this._worker = new Worker('js/idb-worker.js');
		this._worker.addEventListener('message', function (e) {
			if (e.data && e.data.error) {
				this._task.reject(e.data.error);
			} else {
				this._task.resolve(e.data);
			}
			this._task = null;
			if (this._queue.length > 0) {
				this._task = this._queue.shift();
				this._worker.postMessage(this._task.message);
			}
		}.bind(this));
		this._worker.addEventListener('error', function (e) {
			this._task.reject(e);
			this._task = null;
			if (this._queue.length > 0) {
				this._task = this._queue.shift();
				this._worker.postMessage(this._task.message);
			}
		}.bind(this));
	} else {
		this._worker = new IdbWorker(this);
	}
	this.open(db);
}
IDB.prototype.close = function () {
	if (navigator.userAgent.indexOf('Chrome') !== -1) {
		this._worker.terminate();
	}
};
IDB.prototype.open = function (name) {
	return this._workerPromise({
		action: 'open',
		db: name
	});
};
IDB.prototype.add = function (db, doc) {
	return this._workerPromise({
		action: 'add',
		db: db,
		doc: doc
	});
};
IDB.prototype.put = function (db, doc) {
	return this._workerPromise({
		action: 'put',
		db: db,
		doc: doc
	});
};
IDB.prototype.delete = function (db, id) {
	return this._workerPromise({
		action: 'delete',
		db: db,
		id: id
	});
};
IDB.prototype.get = function (db, id) {
	return this._workerPromise({
		action: 'get',
		db: db,
		id: id
	});
};
IDB.prototype.sequence = function () {
	return this._workerPromise({
		action: 'sequence'
	});
};
IDB.prototype.cursor = function (db) {
	return this._workerPromise({
		action: 'cursor',
		db: db
	});
};
IDB.prototype.terminate = function () {
	if (navigator.userAgent.indexOf('Chrome') !== -1) {
		this._worker.terminate();
	}
};
IDB.prototype.testBlobToBase64 = function (doc) {
	return Promise.resolve().then(function () {

		if (doc.hasOwnProperty('l')) {
			doc.l = new Blob([doc.l], {
				type: doc.t
			});
			if (navigator.userAgent.indexOf('Chrome') === -1) {
				return blobUtil.blobToBase64String(doc.l).then(function (base64string) {
					doc.l = base64string;
					return doc;
				});
			}
		}
		return doc
	});
};
IDB.prototype.testBase64ToBlob = function (doc) {
	return Promise.resolve().then(function () {
		if (doc.hasOwnProperty('l')) {
			if (navigator.userAgent.indexOf('Chrome') !== -1) {
				doc.l = URL.createObjectURL(doc.l);
			} else {
				return blobUtil.base64StringToBlob(doc.l, doc.t).then(function (blob) {
					doc.l = URL.createObjectURL(blob);
					return doc;
				});
			}
		}
		return doc
	});
}
IDB.prototype._workerPromise = function (message) {
	return new Promise(function (resolve, reject) {
		var task = {
			reject: reject,
			resolve: resolve,
			message: message
		};
		if (this._task) {
			this._queue.push(task);
		} else {
			this._task = task;
			this._worker.postMessage(message)
		}
	}.bind(this));
};
