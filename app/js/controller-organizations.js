/*jshint -W054 */
(function (window, angular, console, URL, Blob, blobUtil, Promise) {
    'use strict';
    angular.module('starter.controllers').controller('organizationsCtrl', function ($scope, $rootScope, $http, socket, $q, databases) {
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
            var index = binarySearch($scope.rows, id),
                doc = $scope.rows[index];
            if (doc && doc._id === id) {
                $scope.organizations.splice(index, 1);
            }
            //$scope.$apply();
        }



        function onUpdatedOrInserted(newDoc) {
            var index = binarySearch($scope.rows, newDoc._id);
            var doc = $scope.rows[index];
            if (doc && doc._id === newDoc._id) { // update
                $scope.rows[index] = newDoc;
            } else { // insert
                $scope.rows.splice(index, 0, newDoc);
            }
        }

        $scope.rows = [];

        var onOrganization = function (doc) {
            if (doc.hasOwnProperty('d')) {
                $q.when(idb.delete('data', doc._id)).then(function () {
                    onDeleted(doc._id);
                }).catch(function (err) {
                    console.log(err);
                });
            } else {
                $q.when(idb.testBlobToBase64(doc)).then(function (doc) {
                    return $q.when(idb.put('data', doc));
                }).then(function (doc) {
                    return $q.when(idb.testBase64ToBlob(doc));
                }).then(function (doc) {
                    onUpdatedOrInserted(doc);
                    return idb.put('meta', {
                        i: 's',
                        s: doc.s
                    });
                }).catch(function (err) {
                    console.log(err);
                });
            }
        };
        

        socket.on('organization', onOrganization);
        var idb = databases.get('organizations');
        $scope.$on("$destroy", function () {
            socket.off('organization', onOrganization);
            idb.close();
        });
        $rootScope.showSelectOrganization = false;
        $rootScope.showSelectTheme = false;
        
        /*idb.sequence().then(function (sequence) {
            return $q.when(idb.cursor('data')).then(function (result) {
                console.log(result);
                var i, doc;
                for (i = 0; i < result.length; i++) {
                    doc = result[i];
                    onUpdatedOrInserted(doc);
                }
                socket.emit('organization-all', {
                    s: sequence.s
                });
            });
        }).catch(function(err){
            console.log(err);
        })*/


        var seq;
        $q.when(idb.sequence()).then(function (sequence) {
            seq = sequence;
            return $q.when(idb.cursor('data'));
        }).then(function (result) {
            var promises = [];
            for (var i = 0; i < result.length; i++) {
                var doc = result[i];

                var promise = $q.when(idb.testBase64ToBlob(doc));
                promises.push(promise);
            }
            return $q.all(promises);
        }).then(function (res) {
            for (var i = 0; i < res.length; i++) {
                onUpdatedOrInserted(res[i]);
            }
            socket.emit('organization-all', {
                s: seq.s
            });
        }).catch(function (err) {
            console.log(err);
            socket.emit('organization-all', {
                s: 0
            });
        });
    });
} (this, this.angular, this.console, this.URL, this.Blob, this.blobUtil, this.Promise));
