(function (window, angular, console, PouchDB, L, URL, Promise, blobUtil, io) {
    'use strict';

    angular.module('starter.services', [])

        .factory('tilestream', function ($location) {
            /*if ($location.$$host === 'localhost') {
                return 'http://localhost:8888/v2/';
            }
            return 'http://{s}.' + $location.$$host + '/tilestream/v2/';*/
            //return 'http://{s}.geo.os2geo.dk/tilestream/v2/';
            return 'https://geo.os2geo.dk/tilestream/v2/';
        })
        .factory('databases', function () {
            var databases = {};
            return {
                get: function (name) {
                    if (databases.hasOwnProperty(name)) {
                        return databases[name];
                    } else {
                        var idb = new IDB(name);
                        databases[name] = idb;
                        return idb;
                    }
                },
                list: function () {
                    var items = [];
                    for (var key in databases) {
                        items.push(key);
                    }
                    return items;
                },
                terminate: function (name) {
                    if (databases.hasOwnProperty(name)) {
                        var db = databases[name];
                        db.terminate();
                        delete databases[name];
                    }
                }
            }
        })
        .factory('bgl', function ($rootScope) {
            var id = null;
            var success = function (location) {
                if (location.coords) {
                    location = location.coords;
                }
                console.log('[js] GeoLocation callback:  ' + location.latitude + ',' + location.longitude);
                $rootScope.$emit('locationfound', location);

            };
            var successPlugin = function (location) {
                if (location.coords) {
                    location = location.coords;
                }
                console.log('[js] BackgroundGeoLocation callback:  ' + location.latitude + ',' + location.longitude);
                $rootScope.$emit('locationfound', location);

            };
            var error = function (err) {
                console.log('BackgroundGeoLocation error');
                $rootScope.$emit('locationerror', err);
            };
            var successIsLocationEnabled = function (enabled) {
                console.log('isLocationEnabled', enabled);
                if (!enabled) {
                    var showSettings = window.confirm("GPS'en er ikke tændt. Vil du åbne indstillingerne for at tænde GPS'en?");
                    if (showSettings === true) {
                        backgroundGeoLocation.showLocationSettings();
                    }
                }
            };
            var errorIsLocationEnabled = function (err) {
                console.log('isLocationEnabled error');
            };
            var errorWatchLocationMode = function (err) {
                console.log('watchLocationMode error');
            };
            return {
                init: function () {

                    if (window.cordova) {

                        backgroundGeoLocation.configure(successPlugin, error, {
                            desiredAccuracy: 0,
                            stationaryRadius: 0,
                            distanceFilter: 0,
                            activityType: 'AutomotiveNavigation',
                            debug: true, // <-- enable this hear sounds for background-geolocation life-cycle. 
                            stopOnTerminate: true, // <-- enable this to clear background location settings when the app terminates
                            /*locationService:*/
                            fastestInterval: 5000
                        });
                        backgroundGeoLocation.isLocationEnabled(successIsLocationEnabled, errorIsLocationEnabled);
                        backgroundGeoLocation.watchLocationMode(successIsLocationEnabled, errorWatchLocationMode);
                        navigator.geolocation.getCurrentPosition(success);
                    }
                },
                locate: function () {
                    if (!window.cordova) {
                        backgroundGeoLocation.start();
                        backgroundGeoLocation.isLocationEnabled(successIsLocationEnabled, errorIsLocationEnabled);
                    } else {
                        id = navigator.geolocation.watchPosition(success, error);
                    }
                },
                stopLocate: function () {
                    if (!window.cordova) {
                        backgroundGeoLocation.stop();
                    } else if (id) {
                        navigator.geolocation.clearWatch(id);
                        id = null;
                    }
                },
                showLocationSettings: function () {
                    if (window.cordova) {
                        backgroundGeoLocation.showLocationSettings();
                    }
                }
            }
        })
        .factory('socket', function ($localStorage, $rootScope, $ionicModal, $timeout, databases, $ionicSideMenuDelegate, $ionicPopup) {
            var socket;
            var $scope = $rootScope.$new();
            
            //var url = 'http://localhost:9000';
            //var url = 'https://geo.os2geo.dk';
            var url = 'https://geo.os2geo.dk';
            if (!window.cordova) {
                var parts = window.location.hostname.split('.');
                if (parts[0] === 'test' || parts.length === 1) {
                    url = 'https://test.geo.os2geo.dk';
                }
            }
            var authenticate = function () {
                if ($localStorage.hasOwnProperty('os2geo:jwt')) {
                    var profile = $localStorage['os2geo:jwt'].profile;
                    if (Date.now() / 1000 > profile.exp) {
                        delete $rootScope.user;
                        delete $localStorage['os2geo:jwt'];
                    } else {
                        $rootScope.user = profile;
                        socket.emit('authenticate', {
                            t: $localStorage['os2geo:jwt'].token
                        });
                    }

                }
            }
            var unauthenticate = function () {
                socket.emit('unauthenticate');
            };
            var join = function () {
                socket.emit('join', databases.list());

            };

            var queue = databases.get('queue');
            socket = io.connect(url);
            socket.on('connect', function (data) {
                console.log('connect');
                authenticate();
                join();
            });
            socket.on('disconnect', function (e) {
                console.log('disconnect', e);
            });
            socket.on('reconnect', function (e) {
                console.log('reconnect', e);
            });
            socket.on('queue', function (id) {
                queue.delete('data', id).then(function () {
                    console.log('delete', id);
                }).catch(function (err) {
                    console.log('error delete', id);
                });
            });

            socket.on('authenticated', function (data) {
                console.log('authenticated', data);
                if ($scope.hasOwnProperty('modalLogin')) {
                    $scope.modalLogin.remove();
                }
                $rootScope.user = data.profile;
                $localStorage['os2geo:jwt'] = data;
                $rootScope.$emit('authenticated', data);
            });
            socket.on('unauthenticated', function (data) {
                console.log('unauthenticated', data);
                $timeout(function () {
                    if ($localStorage.hasOwnProperty('os2geo:jwt')) {
                        delete $localStorage['os2geo:jwt'];
                    }
                    if ($rootScope.hasOwnProperty('user')) {
                        delete $rootScope.user;
                    }
                    $rootScope.$emit('unauthenticated', data);

                    $rootScope.loginError = data;

                }, 0);
            });
            authenticate();

            $rootScope.showlogin = function () {
                $ionicSideMenuDelegate.toggleRight();
                $rootScope.loginError = null;
                if ($rootScope.user) {
                    unauthenticate();
                } else {
                    $ionicModal.fromTemplateUrl('templates/modal-login.html', {
                        scope: $scope,
                        backdropClickToClose: false
                    }).then(function (modal) {
                        $scope.modalLogin = modal;
                        modal.show();
                    });
                }
            };
            $rootScope.doLogin = function (name, password) {
                socket.emit('authenticate', {
                    n: name,
                    p: password
                });
            };
            $rootScope.forgot = function (name) {
                if (name) {
                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Glemt password',
                        template: 'Vil du nulstille dit password?<br>Der sendes en email med link til at lave nyt password.'
                    });
                    confirmPopup.then(function (res) {
                        if (res) {
                            socket.emit('forgot', name);
                            socket.once('forgot', function (data) {
                                $rootScope.loginError = data;
                                $rootScope.$apply();
                            });
                        } else {
                            console.log('You are not sure');
                        }
                    });
                } else {
                    $rootScope.loginError = 'Indtast gyldig email som brugernavn.';
                }
            };
            return {

                off: function (event, callback) {
                    socket.off(event, callback);
                },
                on: function (name, callback) {
                    return socket.on(name, callback);
                },
                once: function (name, callback) {
                    return socket.once(name, callback);
                },
                emit: function (name, value) {
                    return socket.emit(name, value);
                },
                connect: function (url, options) {
                    socket = io.connect(url, options);
                },
                listeners: function (arg) {
                    return socket.listeners(arg);
                }
            }

            //return io.connect('http://192.168.1.6:9000');

        })

        .factory('auth', function ($q, $rootScope, $http, $timeout, socket, $ionicModal, $localStorage) {
            socket.on('authenticated', function (data) {
                console.log(data);
            });

            $rootScope.user = {};
            $rootScope.loginData = {};
            $scope.doLogin = function (name, password) {
                $scope.loginError = null;
                $http.post(couchdb + '_session', {
                    name: name,
                    password: password
                }).
                    success(function (data, status, headers, config) {
                        if (status !== 200) {
                            $scope.loginError = data || "Fejl";
                        } else {
                            $rootScope.user = data;
                            $scope.modalLogin.remove();
                            $rootScope.$emit('login');
                        }
                    }).
                    error(function (data, status, headers, config) {
                        $scope.loginError = data;
                    });
            };


            return {

                login: function (name, password) {
                    var deferred = $q.defer();

                    return deferred.promise;
                },
                logout: function () {
                    var deferred = $q.defer();

                    return deferred.promise;
                }
            };
        })

        .factory('idb', function () {
            var isChrome = navigator.userAgent.indexOf('Chrome') !== -1;
            var ready = true;
            var worker, workerPromise;
            var databases = {}

            var open = function (name) {
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
            };

            var _cursor = function (database) {
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
            };

            var _get = function (database, id) {
                return new Promise(function (resolve, reject) {
                    var transaction = database.db.transaction(['data'], 'readonly');
                    var objectStore = transaction.objectStore('data');
                    var request = objectStore.get(id);
                    request.onsuccess = function (event) {
                        resolve(event.target.result);
                    };
                    request.onerror = reject;
                });
            };

            var _delete = function (database, id) {
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
            };

            var _add = function (database, doc) {
                return new Promise(function (resolve, reject) {
                    var transaction = database.db.transaction(['data'], 'readwrite');
                    var objectStore = transaction.objectStore('data');
                    var request = objectStore.add(doc);
                    request.onsuccess = function (event) {
                        resolve(doc);
                    };
                    request.onerror = reject;
                });
            };

            var _put = function (database, doc) {
                return new Promise(function (resolve, reject) {
                    var transaction = database.db.transaction(['data'], 'readwrite');
                    var objectStore = transaction.objectStore('data');
                    var request = objectStore.put(doc);
                    request.onsuccess = function (event) {
                        resolve(doc);
                    };
                    request.onerror = reject;
                });
            };

            var _count = function (database, id) {
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

            var _sequence = function (database) {
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

            if (isChrome) {
                worker = new Worker('js/worker.js');
                workerPromise = function (message) {
                    return new Promise(function (resolve, reject) {

                        function cleanup() {
                            worker.removeEventListener('message', onSuccess);
                            worker.removeEventListener('error', onError);
                            ready = true;
                        }

                        function onSuccess(e) {
                            cleanup();
                            if (e.data && e.data.error) {
                                reject(e.data.error);
                            } else {
                                resolve(e.data);
                            }
                        }

                        function onError(e) {
                            ready = true;
                            //cleanup();
                            //reject(e);
                            setTimeout(function () {
                                resolve(workerPromise(message));
                            }, 100);
                        }
                        if (ready) {
                            ready = false;
                            worker.addEventListener('message', onSuccess);
                            worker.addEventListener('error', onError);
                            worker.postMessage(message);
                        } else {
                            setTimeout(function () {
                                console.log('timeout');
                                resolve(workerPromise(message));
                            }, 100);
                        }
                    });
                }

            } else {
                worker = function (data) {
                    switch (data.action) {
                        case 'sequence':
                            return Promise.resolve().then(function () {
                                return open(data.db);
                            }).then(function (db) {
                                return _sequence(db);
                            });
                            break;
                        case 'count':
                            return Promise.resolve().then(function () {
                                return open(data.db);
                            }).then(function (db) {
                                return _count(db, data.id);
                            });
                            break;
                        case 'delete':
                            return Promise.resolve().then(function () {
                                return open(data.db);
                            }).then(function (db) {
                                return _count(db, data.id).then(function (count) {
                                    if (count > 0) {
                                        return _delete(db, data.id);
                                    }
                                    return data.id
                                });
                            });
                            break;
                        case 'add':
                            return Promise.resolve().then(function () {
                                return open(data.db);
                            }).then(function (db) {
                                return _add(db, data.doc);
                            });;
                            break;
                        case 'put':
                            return Promise.resolve().then(function () {
                                return open(data.db);
                            }).then(function (db) {
                                return _put(db, data.doc);
                            });
                            break;
                        case 'get':
                            return Promise.resolve().then(function () {
                                return open(data.db);
                            }).then(function (db) {
                                return _get(db, data.id);
                            });
                            break;
                        case 'cursor':
                            return Promise.resolve().then(function () {
                                return open(data.db);
                            }).then(function (db) {
                                return _cursor(db, data.db);
                            });
                            break;
                        case 'createDB':
                            var promises = [];
                            for (var i = 0; i < data.db.lenght; i++) {
                                promises.push(open(data.db[i]));
                            }
                            return Promise.all(promises);
                            break;
                    }
                };

                workerPromise = function (message) {
                    //console.log(message);
                    return new Promise(function (resolve, reject) {


                        if (ready) {
                            ready = false;
                            worker(message).then(function (data) {
                                ready = true;
                                resolve(data);
                            }).catch(function (err) {
                                ready = true;
                                console.log(err);
                                setTimeout(function () {
                                    resolve(workerPromise(message));
                                }, 100);
                            });
                        } else {
                            setTimeout(function () {
                                resolve(workerPromise(message));
                            }, 100);
                        }
                    });
                }
            }
            return {
                sequence: function (db) {
                    return workerPromise({
                        action: 'sequence',
                        db: db
                    });
                },
                count: function (db, id) {
                    return workerPromise({
                        action: 'count',
                        db: db,
                        id: id
                    });
                },
                put: function (db, doc) {
                    return workerPromise({
                        action: 'put',
                        db: db,
                        doc: doc
                    });
                },
                add: function (db, doc) {
                    return workerPromise({
                        action: 'add',
                        db: db,
                        doc: doc
                    });
                },
                delete: function (db, id) {
                    return workerPromise({
                        action: 'delete',
                        db: db,
                        id: id
                    });
                },
                get: function (db, id) {
                    return workerPromise({
                        action: 'get',
                        db: db,
                        id: id
                    });
                },
                cursor: function (db) {
                    return workerPromise({
                        action: 'cursor',
                        db: db
                    });
                },
                createDB: function (db) {
                    return workerPromise({
                        action: 'createDB',
                        db: db
                    });
                },
                testBlobToBase64: function (doc) {
                    return Promise.resolve().then(function () {

                        if (doc.hasOwnProperty('l')) {
                            doc.l = new Blob([doc.l], {
                                type: doc.t
                            });
                            if (!isChrome) {
                                return blobUtil.blobToBase64String(doc.l).then(function (base64string) {
                                    doc.l = base64string;
                                    return doc;
                                });
                            }
                        }
                        return doc
                    });
                },
                testBase64ToBlob: function (doc) {
                    return Promise.resolve().then(function () {
                        if (doc.hasOwnProperty('l')) {
                            if (isChrome) {
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
            }
        });



} (this, this.angular, this.console, this.PouchDB, this.L, this.URL, this.Promise, this.blobUtil, this.io));
