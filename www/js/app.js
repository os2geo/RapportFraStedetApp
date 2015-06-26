/*function handleOpenURL(url) {
    console.log(url);
    alert(url);
    //location.href = "http://data.kosgis.dk/couchdb/app-d2121ee08caf832b73a160f9ea022ad9/_design/sagsbehandler/v1/" + cordova.platformId + "/index.html#/" + url.substring(12);
}*/

// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
(function (window, angular, console, L, cordova, PouchDB, tv4) {
    'use strict';

    angular.module('starter', [
    'ionic',
    'ngCordova',
    'starter.controllers',
    'starter.directives',
    'starter.services',
    'starter.filters',
    'ab-base64'
])

    .run(function ($ionicPlatform, $rootScope, $location, auth) {
        var urls = $location.$$absUrl.split('/');
        for (var i = 0; i < urls.length; i++) {
            var urlapp = urls[i];
            if (urlapp.indexOf('app-') !== -1) {
                $rootScope.appID = urlapp;
                break;
            } else if (urlapp.indexOf('localhost') !== -1) {
                $rootScope.appID = "app-3495ccf8aafcb1541a0ef7cc2d01178e";
                //$rootScope.appID = "app-d2121ee08caf832b73a160f9ea022ad9";
                break;
            } else {
                $rootScope.appID = "app-d2121ee08caf832b73a160f9ea022ad9";
            }
        }
        if (PouchDB) {
            //ret pouchdb skal altid lave post med keys linie 1500 og rem ud efter
            //method = 'POST';
            //body = JSON.stringify({keys: opts.keys});
            //PouchDB.debug.enable('*');
        }
        $ionicPlatform.ready(function () {
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
    })

    .config(function ($stateProvider, $urlRouterProvider, $compileProvider, $httpProvider) {
        $httpProvider.interceptors.push('jsonpInterceptor');
        //$compileProvider.imgSrcSanitizationWhitelist(/^\s*(data):/);

        $stateProvider

            .state('organizations', {
            url: "/organizations",
            templateUrl: "templates/organizations.html",
            controller: 'organizationsCtrl'

        })

        .state('organization', {
            url: "/organizations/:organization",
            templateUrl: "templates/organization.html",
            controller: 'organizationCtrl'

        })

        .state('loading', {
            url: "/loading",
            templateUrl: "templates/loading.html",
            controller: "loadingCtrl"
        })

        .state('map', {
            url: "/organizations/:organization/:configuration?layer&id",
            //url: "/organizations/:organization/:configuration",
            templateUrl: "templates/map.html",
            controller: 'mapCtrl'
        })

        .state('map.menu', {
            url: "/menu",
            controller: 'menuCtrl',
            templateUrl: "templates/menu.html"

        })

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
        });
        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/loading');
    });
})(this, this.angular, this.console, this.L, this.cordova, this.PouchDB, this.tv4);