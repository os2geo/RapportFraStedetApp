(function (window, angular, console, PouchDB, L, URL) {
    'use strict';

    angular.module('starter.services', [])

    .factory('jsonpInterceptor', ['$timeout', '$window',
        function ($timeout, $window) {
            return {
                'request': function (config) {
                    if (config.method === 'JSONP') {
                        var callbackId = angular.callbacks.counter.toString(36);
                        config.callbackName = 'angular_callbacks_' + callbackId;
                        config.params.callback = config.callbackName;
                        //config.url = config.url.replace('JSON_CALLBACK', config.callbackName);

                        $timeout(function () {
                            $window[config.callbackName] = angular.callbacks['_' + callbackId];
                        }, 0, false);
                    }

                    return config;
                },

                'response': function (response) {
                    var config = response.config;
                    if (config.method === 'JSONP') {
                        delete $window[config.callbackName]; // cleanup
                    }

                    return response;
                },

                'responseError': function (rejection) {
                    var config = rejection.config;
                    if (config.method === 'JSONP') {
                        delete $window[config.callbackName]; // cleanup
                    }

                    return rejection;
                }
            };
        }
    ])

    .factory('couchdb', function ($location) {
        if ($location.$$host === 'localhost') {
            return 'http://localhost:4000/couchdb/';
            //return 'http://geo.os2geo.dk/couchdb/';
        }
        return 'http://' + $location.$$host + '/couchdb/';
    })

    .factory('tilestream', function ($location) {
        if ($location.$$host === 'localhost') {
            return 'http://localhost:8888/v2/';
        }
        return 'http://{s}.' + $location.$$host + '/tilestream/v2/';
    })

    .factory('auth', function ($q, $rootScope, $http, $timeout, couchdb, $ionicModal) {
        var $scope = $rootScope.$new();
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
        $rootScope.showlogin = function () {
            if ($rootScope.user.name) {
                $http.delete(couchdb + '_session').
                success(function (data, status, headers, config) {
                    $rootScope.user = {};
                }).
                error(function (data, status, headers, config) {

                });

            } else {
                if ($scope.modalLogin) {
                    $scope.modalLogin.remove();
                }
                $ionicModal.fromTemplateUrl('templates/modalLogin.html', {
                    scope: $scope
                }).then(function (modal) {
                    $scope.modalLogin = modal;
                    modal.show();
                });
            }
        };
        $http.get(couchdb + '_session').
        success(function (data, status, headers, config) {

            $rootScope.user = data.userCtx;

        }).
        error(function (data, status, headers, config) {
            $scope.loginError = data;
        });
        return {
            session: function () {
                var deferred = $q.defer();

                $http.get(couchdb + '_session').
                success(function (data, status, headers, config) {
                    if (data && data.userCtx) {
                        deferred.resolve(data.userCtx);
                    } else {
                        deferred.reject();
                    }
                }).error(function (data, status, headers, config) {
                    deferred.reject(data);
                });

                return deferred.promise;
            },
            login: function (login) {
                var deferred = $q.defer();

                return deferred.promise;
            },
            logout: function () {
                var deferred = $q.defer();

                return deferred.promise;
            }
        };
    })

    .factory('kfticket',
            /*
             function ($q, $http, $rootScope, $browser) {
                return {
                    getTicket: function () {
                        var deferred = $q.defer();
                        var cookies = $browser.cookies();
                        if (cookies.kfticket) {
                            window.setTimeout(function () {
                                deferred.resolve(cookies.kfticket);
                            }, 0);
                        } else {
                            $http.get("/api/kfticket").
                            success(function (data, status, headers, config) {
                                cookies = $browser.cookies();
                                deferred.resolve(cookies.kfticket);
                            }).
                            error(function (data, status, headers, config) {
                                deferred.reject();
                            });
                        }
                        return deferred.promise;
                    }
                };
            }*/
            function ($q, $http, $timeout, $location) {
                var ticket;
                var time = 0;
                return {
                    getTicket: function () {
                        var deferred = $q.defer();
                        if (Date.now() - time < 86400000) {
                            $timeout(function () {
                                deferred.resolve(ticket);
                            });
                        } else {
                            var url = "";
                            if ($location.$$host === 'localhost') {
                                url = 'http://localhost:4000';
                            }
                            $http.get(url + "/api/kfticket").
                            success(function (data, status, headers, config) {
                                time = Date.now();
                                ticket = data;
                                deferred.resolve(ticket);
                            }).
                            error(function (data, status, headers, config) {
                                deferred.reject();
                            });
                        }
                        return deferred.promise;
                    }
                };
            }
        )
        .factory('organizations', function ($q, $rootScope, $sce, $timeout, $location, couchdb) {
            function binarySearch(arr, docId) {
                var low = 0,
                    high = arr.length,
                    mid;
                while (low < high) {
                    mid = (low + high) >>> 1; // faster version of Math.floor((low + high) / 2)
                    arr[mid]._id < docId ? low = mid + 1 : high = mid;
                }
                return low;
            }

            function onDeleted(id) {
                var index = binarySearch($rootScope.organizations, id);
                var doc = $rootScope.organizations[index];
                if (doc && doc._id === id) {
                    $rootScope.organizations.splice(index, 1);
                }
            }


            function organizationUpdatedOrInserted(newDoc) {
                if (newDoc._id !== '_design/security') {
                    var index = binarySearch($rootScope.organizations, newDoc._id);
                    var doc = $rootScope.organizations[index];
                    if (newDoc._attachments && newDoc._attachments.logo) {
                        dbOrganizations.getAttachment(newDoc._id, 'logo').then(function (res) {
                            $timeout(function () {
                                var fileURL = URL.createObjectURL(res);
                                newDoc.logo = $sce.trustAsResourceUrl(fileURL);
                            });
                        });
                    }
                    if (doc && doc._id === newDoc._id) { // update
                        $rootScope.organizations[index] = newDoc;
                    } else { // insert
                        $rootScope.organizations.splice(index, 0, newDoc);
                    }
                }
            }

            function organizationsReplicate() {
                if (replication) {
                    replication.cancel();
                    replication = null;
                }
                replication = dbOrganizations.replicate.from(couchdb + $rootScope.appID, {
                    live: true,
                    retry: true,
                    doc_ids: $rootScope.security.organizations
                });
            }

            function organizationsChanges() {
                dbOrganizations.changes({
                    live: true,
                    since: 'now',
                    include_docs: true
                }).on('change', function (change) {
                    $timeout(function () {
                        if (change.deleted) {
                            // change.id holds the deleted id
                            onDeleted(change.id);
                        } else { // updated/inserted
                            // change.doc holds the new doc
                            organizationUpdatedOrInserted(change.doc);
                        }
                    });
                    //renderDocsSomehow();
                }).on('error', function (err) {
                        console.log('error');
                    } //console.log.bind(console)
                );
            }

            function securityReplicate() {
                dbSecurity.replicate.from(couchdb + $rootScope.appID, {
                    live: true,
                    retry: true,
                    doc_ids: ['_design/security']
                });
            }

            function fetchInitialDocs() {
                return dbOrganizations.allDocs({
                    include_docs: true,
                }).then(function (res) {
                    $timeout(function () {
                        $rootScope.organizations = [];
                        for (var i = 0; i < res.rows.length; i++) {
                            var doc = res.rows[i].doc;
                            organizationUpdatedOrInserted(doc);
                        }
                    });
                });
            }
            var dbOrganizations,
                dbSecurity,
                replication,
                options = {};
            if (window.cordova) {
                options.adapter = 'websql';
            }
            if (PouchDB) {
                dbOrganizations = new PouchDB($rootScope.appID + '-organizations', options);
                dbSecurity = new PouchDB($rootScope.appID + '-security', options);
                fetchInitialDocs().then(function () {
                    organizationsChanges();
                    dbSecurity.get('_design/security', function (err, doc) {
                        $timeout(function () {
                            if (!err) {
                                $rootScope.security = doc;
                                organizationsReplicate();
                            }
                            dbSecurity.changes({
                                live: true,
                                since: 'now',
                                include_docs: true
                            }).on('change', function (change) {
                                $timeout(function () {
                                    if (change.deleted) {
                                        // change.id holds the deleted id
                                        //onDeleted(change.id);
                                    } else { // updated/inserted
                                        // change.doc holds the new doc
                                        $rootScope.security = change.doc;
                                        organizationsReplicate();
                                    }
                                });
                                //renderDocsSomehow();
                            }).on('error', function (err) {
                                    console.log('error');
                                } //console.log.bind(console)
                            );
                            securityReplicate();
                        });
                    });
                });
            }

            return {};

        })

    .factory('configurations', function ($rootScope, $sce, $timeout, $http, couchdb) {
        function binarySearch(arr, docId) {
            var low = 0,
                high = arr.length,
                mid;
            while (low < high) {
                mid = (low + high) >>> 1; // faster version of Math.floor((low + high) / 2)
                arr[mid]._id < docId ? low = mid + 1 : high = mid;
            }
            return low;
        }

        function onDeleted(id) {
            var index = binarySearch($rootScope.configurations[organization], id);
            var doc = $rootScope.configurations[organization][index];
            if (doc && doc._id === id) {
                $rootScope.configurations[organization].splice(index, 1);
            }
        }


        function onUpdatedOrInserted(newDoc) {
            if (newDoc._id !== '_design/security') {
                var index = binarySearch($rootScope.configurations[organization], newDoc._id);
                var doc = $rootScope.configurations[organization][index];
                if (newDoc._attachments && newDoc._attachments.logo) {
                    if (PouchDB) {
                        memdb.getAttachment(newDoc._id, 'logo').then(function (res) {
                            $timeout(function () {
                                var fileURL = URL.createObjectURL(res);
                                newDoc.logo = $sce.trustAsResourceUrl(fileURL);
                            });
                        });
                    } else {
                        newDoc.logo = couchdb + $rootScope.appID + '-' + organization + '/' + newDoc._id + '/logo';
                    }
                }
                if (doc && doc._id === newDoc._id) { // update
                    $rootScope.configurations[organization][index] = newDoc;
                } else { // insert
                    $rootScope.configurations[organization].splice(index, 0, newDoc);
                }
            }
        }

        function reactToChanges() {
            changes = memdb.changes({
                live: true,
                since: 'now',
                include_docs: true
            }).on('change', function (change) {
                $timeout(function () {
                    if (change.id !== '_design/security') {
                        if (change.deleted) {
                            // change.id holds the deleted id
                            onDeleted(change.id);
                        } else { // updated/inserted
                            // change.doc holds the new doc
                            onUpdatedOrInserted(change.doc);
                        }
                    }
                });
            });
            replicatemem = memdb.replicate.from(db, {
                live: true
            });
            replicate = db.replicate.from(couchdb + $rootScope.appID + '-' + organization, {
                live: true,
                retry: true
            });
        }

        function fetchInitialDocs() {
            return memdb.allDocs({
                include_docs: true,
            }).then(function (res) {
                $timeout(function () {
                    for (var i = 0; i < res.rows.length; i++) {
                        var doc = res.rows[i].doc;
                        onUpdatedOrInserted(doc);
                    }
                });
            }).catch(function (err) {
                console.log(err);
            });
        }

        var options = {},
            db,
            memdb,
            replicate,
            replicatemem,
            organization,
            changes;
        if (window.cordova) {
            options.adapter = 'websql';
        }
        $rootScope.configurations = {};
        return {
            init: function (id) {
                $rootScope.configurations[id] = $rootScope.configurations[id] || [];
                if (PouchDB) {
                    if (replicate) {
                        replicate.cancel();
                        replicate = null;
                    }
                    if (replicatemem) {
                        replicatemem.cancel();
                        replicate = null;
                    }
                    if (changes) {
                        changes.cancel();
                        changes = null;
                    }
                    organization = id;
                    memdb = new PouchDB($rootScope.appID + '-' + organization, {
                        adapter: 'memory'
                    });
                    db = new PouchDB($rootScope.appID + '-' + organization, options);
                    fetchInitialDocs().then(reactToChanges).catch(console.log.bind(console));
                } else {
                    organization = id;
                    $http.get(couchdb + $rootScope.appID + '-' + id + '/_all_docs?include_docs=true').
                    success(function (data, status, headers, config) {
                        angular.forEach(data.rows, function (row) {
                            onUpdatedOrInserted(row.doc);
                        });
                    });
                }
            }
        };
    })

    .factory('configurationservice', function ($q, $rootScope, $sce, $timeout, $http, couchdb) {


        function reactToChanges() {
            db.changes({
                live: true,
                since: 'now',
                include_docs: true
            }).on('change', function (change) {
                $timeout(function () {
                    if (change.id !== '_design/security') {
                        if (change.deleted) {
                            // change.id holds the deleted id
                            //onDeleted(change.id);
                        } else { // updated/inserted
                            // change.doc holds the new doc
                            if ($rootScope.configuration[configuration].map) {
                                var layer,
                                    i;
                                for (i = 0; i < $rootScope.configuration[configuration].map.overlays; i++) {
                                    layer = $rootScope.configuration[configuration].map.overlays[i];
                                    if (layer.replicationTo) {
                                        layer.replicationTo.cancel();
                                        layer.replicationTo = null;
                                    }
                                    if (layer.replicationFrom) {
                                        layer.replicationFrom.cancel();
                                        layer.replicationFrom = null;
                                    }
                                    if (layer.changes) {
                                        layer.changes.cancel();
                                        layer.changes = null;
                                    }

                                }
                                for (i = 0; i < $rootScope.configuration[configuration].map.baselayers; i++) {
                                    layer = $rootScope.configuration[configuration].map.baselayers[i];
                                    if (layer.replicationTo) {
                                        layer.replicationTo.cancel();
                                        layer.replicationTo = null;
                                    }
                                    if (layer.replicationFrom) {
                                        layer.replicationFrom.cancel();
                                        layer.replicationFrom = null;
                                    }
                                    if (layer.changes) {
                                        layer.changes.cancel();
                                        layer.changes = null;
                                    }

                                }
                            }
                            $rootScope.configuration[configuration] = change.doc;
                            $rootScope.$emit('configurationUpdate');
                        }
                    }
                });
            });
            replicate = db.replicate.from(couchdb + $rootScope.appID, {
                live: true,
                retry: true,
                doc_ids: [configuration]
            });
        }

        var options = {},
            db,
            replicate,
            changes,
            configuration;
        if (window.cordova) {
            options.adapter = 'websql';
        }
        $rootScope.configuration = {};
        return {
            getAttachment: function (name) {
                var deferred = $q.defer();
                if (db) {
                    db.getAttachment(configuration, name).then(function (data) {
                        $timeout(function () {
                            var fileReader = new window.FileReader();
                            fileReader.readAsText(data);
                            fileReader.onload = function (e) {
                                deferred.resolve(JSON.parse(this.result));
                            };
                        });
                    }, function (data) {
                        deferred.reject(data);
                    });
                } else {
                    $http.get(couchdb + $rootScope.appID + '/' + configuration + '/' + name).
                    success(function (data, status, headers, config) {
                        deferred.resolve(data);
                    }).
                    error(function (data, status, headers, config) {
                        deferred.reject(data);
                    });
                }
                return deferred.promise;
            },
            init: function (id) {
                $rootScope.configuration[id] = $rootScope.configuration[id] || {};

                if (PouchDB) {
                    if ($rootScope.configuration[id].map) {
                        var layer,
                            i;
                        for (i = 0; i < $rootScope.configuration[id].map.overlays; i++) {
                            layer = $rootScope.configuration[id].map.overlays[i];
                            if (layer.replicationTo) {
                                layer.replicationTo.cancel();
                                layer.replicationTo = null;
                            }
                            if (layer.replicationFrom) {
                                layer.replicationFrom.cancel();
                                layer.replicationFrom = null;
                            }
                            if (layer.changes) {
                                layer.changes.cancel();
                                layer.changes = null;
                            }

                        }
                        for (i = 0; i < $rootScope.configuration[id].map.baselayers; i++) {
                            layer = $rootScope.configuration[id].map.baselayers[i];
                            if (layer.replicationTo) {
                                layer.replicationTo.cancel();
                                layer.replicationTo = null;
                            }
                            if (layer.replicationFrom) {
                                layer.replicationFrom.cancel();
                                layer.replicationFrom = null;
                            }
                            if (layer.changes) {
                                layer.changes.cancel();
                                layer.changes = null;
                            }

                        }
                        if (replicate) {
                            replicate.cancel();
                            replicate = null;
                        }
                        if (changes) {
                            changes.cancel();
                            changes = null;
                        }
                    }
                    configuration = id;
                    db = new PouchDB('db-' + id, options);
                    db.get(id, function (err, doc) {
                        $timeout(function () {
                            if (!err) {
                                $rootScope.configuration[id] = doc;
                                $rootScope.$emit('configurationUpdate');
                            }
                            reactToChanges();
                        });
                    });
                } else {
                    configuration = id;
                    $http.get(couchdb + $rootScope.appID + '/' + id).
                    success(function (doc, status, headers, config) {
                        if (doc) {
                            $rootScope.configuration[id] = doc;
                            $rootScope.$emit('configurationUpdate');
                        }
                    });

                }

            }
        };
    });

})(this, this.angular, this.console, this.PouchDB, this.L, this.URL);