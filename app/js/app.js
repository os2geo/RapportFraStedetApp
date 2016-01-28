function handleOpenURL(url) {
    setTimeout(function () {
        var newurl = "index.html#/" + url.substring(6);
        if (newurl.charAt(newurl.length - 1) === '/') {
            newurl = newurl.substring(0, newurl.length - 1);
        }
        console.log("received url: " + url);
        console.log("new url: " + newurl);
        location.href = newurl;
    }, 0);
}

// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
(function (window, angular, console, L, cordova, tv4) {
    'use strict';
    angular.module('templates', []);
    angular.module('starter.controllers', []);
    angular.module('starter', [
        'ionic',
        'ngIOS9UIWebViewPatch',
        'ngCordova',
        'starter.controllers',
        'starter.directives',
        'starter.services',
        'starter.filters',
        'templates',
        'ngStorage'/*,
        'ngSanitize'*/
    ])

        .run(function ($ionicPlatform, $rootScope, $ionicPopup, databases, $state, socket, $http, $location, $ionicSideMenuDelegate, $ionicViewSwitcher, $ionicHistory, $localStorage) {
            $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
                if (typeof ga !== 'undefined') {
                    ga('send', 'pageview', { page: $location.path() });
                    //ga('send', 'screenview', {screenName: $location.path()});
                }
                $rootScope.showSelectOrganization = false;
                $rootScope.showSelectTheme = false;
                if (toState.name === 'menu.organization' || toState.name === 'menu.map') {
                    $rootScope.showSelectOrganization = true;
                }
                if (toState.name === 'menu.map') {
                    $rootScope.showSelectTheme = true;
                }
            });
            $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
                $rootScope.fromParams = fromParams;
                $rootScope.fromState = fromState;
                $rootScope.toParams = toParams;
                $rootScope.toState = toState;
                $state.go('login');
            });
            $rootScope.navOrganizations = function () {
                $ionicSideMenuDelegate.toggleRight(false);
                $ionicViewSwitcher.nextDirection('back');
                $ionicHistory.nextViewOptions({
                    historyRoot: true,
                    disableBack: true
                });
                $state.go('menu.organizations');
            };
            

            $http.get('chcp.json').then(function (res) {
                $rootScope.chcp = res.data;
                console.log(res.data);
            }).catch(function (err) {
                console.log(err);
            })
            /*navigator.geolocation.getCurrentPosition(function (pos) {
                console.log(pos);
            }, function (err) {
                console.log(err);
            }, {
                    enableHighAccuracy: true,
                    timeout: 60000,
                    maximumAge: 0
                });*/
            var queue = databases.get('queue');

            queue.cursor('data').then(function (result) {
                //console.log('queue', result);
                for (var i = 0; i < result.length; i++) {
                    var doc = result[i];
                    socket.emit('queue', doc);
                    console.log('emit queue', doc);
                }
            });

            var cache = databases.get('cache');
            L.TileLayer.addInitHook(function () {
                this._db = cache;
            });
            L.Icon.addInitHook(function () {
                this._db = cache;
            });
            var userWentToStoreCallback = function () {
                console.log('userWentToStoreCallback');
            };

            var userDeclinedRedirectCallback = function () {
                console.log('userDeclinedRedirectCallback');
                // User didn't want to leave the app.
                // Maybe he will update later.
            };
            var installationCallback = function (e) {
                console.log('installationCallback', e);
                var error = e.details.error;
                if (error) {
                    console.log('Error with code: ' + error.code);
                    console.log('Description: ' + error.description);
                }

            };
            var chcp_updateIsReadyToInstall = function (e) {
                console.log('chcp_updateIsReadyToInstall', e);
                chcp.installUpdate(installationCallback);
            };
            var chcp_updateLoadFailed = function (e) {
                var error = e.detail.error;
                if (error && error.code == -2) {
                    console.log('Native side update required');
                    var dialogMessage = 'Der er en ny version tilgængelig. Opdater venligst.';
                    chcp.requestApplicationUpdate(dialogMessage, userWentToStoreCallback, userDeclinedRedirectCallback);
                }
                console.log('chcp_updateLoadFailed', e);
            };
            var chcp_nothingToUpdate = function (e) {
                console.log('chcp_nothingToUpdate', e);
            };
            var chcp_updateInstalled = function (e) {
                console.log('chcp_updateInstalled', e);
            };
            var chcp_updateInstallFailed = function (e) {
                console.log('chcp_updateInstallFailed', e);
            };
            var chcp_nothingToInstall = function (e) {
                console.log('chcp_nothingToInstall', e);
            };
            var chcp_assetsInstalledOnExternalStorage = function (e) {
                console.log('chcp_assetsInstalledOnExternalStorage', e);
            };
            var chcp_assetsInstallationError = function (e) {
                console.log('chcp_assetsInstallationError', e);
            };
            if (window.cordova) {
                document.addEventListener('chcp_updateIsReadyToInstall', chcp_updateIsReadyToInstall, false);
                document.addEventListener('chcp_updateLoadFailed', chcp_updateLoadFailed, false);
                document.addEventListener('chcp_nothingToUpdate', chcp_nothingToUpdate, false);
                document.addEventListener('chcp_updateInstalled', chcp_updateInstalled, false);
                document.addEventListener('chcp_updateInstallFailed', chcp_updateInstallFailed, false);
                document.addEventListener('chcp_nothingToInstall', chcp_nothingToInstall, false);
                document.addEventListener('chcp_assetsInstalledOnExternalStorage', chcp_assetsInstalledOnExternalStorage, false);
                document.addEventListener('chcp_assetsInstallationError', chcp_assetsInstallationError, false);
            } else {
                /*var alt = "https://geo.os2geo.dk/couchdb/app-d2121ee08caf832b73a160f9ea022ad9/_design/web-1/index.html" + location.hash;
                if (ionic.Platform.isAndroid()) {
                    alt = "https://play.google.com/store/apps/details?id=dk.addin.RapportFraStedet";
                } else if (ionic.Platform.isIOS()) {
                    alt = "https://itunes.apple.com/app/id613008898";
                }*/
                var url = location.hash;
                if (url.length > 1) {
                    url = url.substring(2);
                }
                var custom = "rfs://" + url;
                if (ionic.Platform.isAndroid()) {
                    custom = "intent://" + url + "#Intent;scheme=rfs;package=dk.addin.RapportFraStedet;end";
                }
                $rootScope.link = custom;// $sce.trustAsUrl(custom);
                if (ionic.Platform.isIOS() || ionic.Platform.isAndroid()) {
                    $ionicPopup.alert({
                        title: 'Åben app',
                        templateUrl: 'templates/popup-app.html',
                        okText: 'Annuller'
                    });
                }

            }

            $ionicPlatform.ready(function () {

                console.log('ionic ready');
                if (window.analytics) {
                    window.analytics.startTrackerWithId('UA-24623853-2');
                }
                if (window.cordova) {
                    
                    
                    

                    /*var options = {
                        'auto-download': true,
                        'auto-install': true
                    };

                    chcp.configure(options, configureCallback);
                    chcp.fetchUpdate(updateCallback);*/



                    cordova.plugins.notification.local.on("click", function (notification) {
                        var options = JSON.parse(notification.data);
                        $state.go('map', options);
                    });

                }
                // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                // for form inputs)
                if (window.cordova && window.cordova.plugins.Keyboard) {
                    cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
                    cordova.plugins.Keyboard.disableScroll(true);
                }
                if (window.StatusBar) {
                    // org.apache.cordova.statusbar required
                    window.StatusBar.styleDefault();
                }
                $rootScope.ok = true;
                $rootScope.$apply();
            });
            /*idb.cursor('queue').then(function (result) {
                console.log(result);
            })*/
            
            
        })

        .config(function ($stateProvider, $urlRouterProvider, $compileProvider, $httpProvider, $ionicConfigProvider) {
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|intent|rfs|tel|ftp|mailto|file|ghttps?|ms-appx|x-wmapp0):/);
            $ionicConfigProvider.views.forwardCache(true);
            $stateProvider

            //ionic.bundle.js
            /*function isAbstractTag(ele) {
                //return ele && ele.length && /ion-side-menus|ion-tabs/i.test(ele[0].tagName);
                return ele && ele.length && /ion-tabs/i.test(ele[0].tagName);
              }*/

                .state('menu', {
                    url: '/menu',
                    abstract: true,
                    templateUrl: 'templates/menu.html',
                    controller: 'menuCtrl'
                })
                .state('menu.organizations', {
                    url: '/organizations',
                    views: {
                        'menuContent': {
                            templateUrl: "templates/organizations.html",
                            controller: 'organizationsCtrl'
                        }
                    }
                })
                .state('menu.organization', {
                    url: "/organizations/:organization",
                    views: {
                        'menuContent': {
                            templateUrl: "templates/organization.html",
                            controller: 'organizationCtrl'
                        }
                    }
                })

                .state('intro', {
                    url: "/intro",
                    templateUrl: "templates/intro.html",
                    controller: 'introCtrl'
                })

                .state('login', {
                    cache: false,
                    url: "/login",
                    templateUrl: "templates/login.html",
                    controller: 'loginCtrl',
                })

                .state('menu.map', {
                    cache: false,
                    url: "/organizations/:organization/:configuration?layer:id",
                    views: {
                        'menuContent': {
                            controller: 'mapCtrl',
                            templateUrl: "templates/map.html",
                            resolve: {
                                doc: function (databases, socket, $stateParams, $q, $rootScope) {
                                    var db = databases.get('configurations');
                                    var deferred = $q.defer();
                                    var update = function (go) {
                                        socket.once('configuration', function (doc) {
                                            if (doc.hasOwnProperty('deleted')) {
                                                db.delete('data', doc._id);
                                            } else {
                                                db.put('data', doc).then(function () {
                                                    if (go) {
                                                        if (doc.hasOwnProperty('security') && doc.security.length > 0 && (!$rootScope.hasOwnProperty('user') || ($rootScope.hasOwnProperty('user') && doc.security.indexOf($rootScope.user.name) === -1))) {
                                                            deferred.reject();
                                                        } else {
                                                            deferred.resolve(doc);
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                        socket.emit('configuration-rev', {
                                            i: $stateParams.configuration,
                                            r: ''
                                        });
                                    }
                                    db.get('data', $stateParams.configuration).then(function (configuration) {
                                        if (configuration) {
                                            if (configuration.hasOwnProperty('security') && configuration.security.length > 0 && (!$rootScope.hasOwnProperty('user') || ($rootScope.hasOwnProperty('user') && configuration.security.indexOf($rootScope.user.name) === -1))) {
                                                deferred.reject();
                                                update(false);
                                            } else {
                                                deferred.resolve(configuration);
                                            }

                                        } else {
                                            update(true);
                                        }

                                    }).catch(function (err) {
                                        console.log(err);
                                        //deferred.reject();
                                        update(true);
                                    });
                                    return deferred.promise;
                                }
                            }
                        }
                    }
                })

            /*.state('menu.map', {
                url: "/kort?layer&id",
                views: {
                    'menuContent': {
                        controller: 'mapCtrl',
                        templateUrl: 'map/index.html'
                    }
                }
            })
     
            .state('menu.list', {
                url: "/list/:dbname/:layer/",
                views: {
                    'menuContent': {
                        controller: 'listCtrl',
                        templateUrl: 'list/index.html'
                    }
                }
            })
     
            .state('menu.item', {
                url: "/item/:dbname/:layer/:id",
                views: {
                    'menuContent': {
                        controller: 'itemCtrl',
                        templateUrl: 'item/index.html'
                    }
                }
            })
     
            .state('menu.layers', {
                url: "/layers/:organization/:configuration",
                views: {
                    'menuContent': {
                        controller: 'layersCtrl',
                        templateUrl: 'layers/index.html'
                    }
                }
            });*/

            /*
                    .state('map.category', {
                        url: "/category/{path:.*}",
                        controller: 'categoryCtrl',
                        templateUrl: "templates/category.html"
                    })
     
                    .state('map.layers', {
                        url: "/layers",
                        templateUrl: "templates/layers.html",
                        controller: 'layersCtrl'
                    })
     
                    .state('map.offlinemaps', {
                        url: "/offlinemaps",
                        templateUrl: "templates/offlinemaps.html",
                        controller: 'offlinemapsCtrl'
                    });*/
            // if none of the above states are matched, use this as the fallback
            var skipintro = window.localStorage.getItem('ngStorage-os2geo:intro');
            if (!skipintro) {
                $urlRouterProvider.otherwise('/intro');   
            } else {
                $urlRouterProvider.otherwise('/menu/organizations');    
            }
            
        });
})(this, this.angular, this.console, this.L, this.cordova, this.tv4);
