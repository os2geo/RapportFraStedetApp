/*jshint -W054 */
(function (window, angular, console, L, cordova, PouchDB, tv4, FileReader, turf) {
    'use strict';
    angular.module('starter.controllers', [])

    .controller('loadingCtrl', function ($scope, $ionicSlideBoxDelegate) {
        $scope.slide = function (index) {
            $ionicSlideBoxDelegate.slide(index);
        };

    })

    .controller('organizationsCtrl', function ($scope, $rootScope, $http, couchdb, organizations) {
        if (!PouchDB) {
            $rootScope.organizations = [];
            $http.get(couchdb + $rootScope.appID + '/_design/config/_view/organization').
            success(function (data, status, headers, config) {
                angular.forEach(data.rows, function (row) {
                    $rootScope.organizations.push({
                        "_id": row.id,
                        name: row.key,
                        logo: couchdb + $rootScope.appID + '/' + row.id + '/logo'
                    });
                });
            });
            $http.get(couchdb + $rootScope.appID + '/_design/security').
            success(function (data, status, headers, config) {
                $rootScope.security = data;
            });
        }
    })

    .controller('organizationCtrl', function (configurations, $stateParams, $scope) {
        configurations.init($stateParams.organization);
        $scope.organizationid = $stateParams.organization;
    })

    .controller('opgaverCtrl', function () {

    })

    .controller('indberetningerCtrl', function () {})

    .controller('layersCtrl', function ($scope) {

    })

    .controller('offlinemapsCtrl', function ($scope, $q, $cordovaFileTransfer, $cordovaSQLite, $ionicPopup) {
        $scope.downloadMBTiles = function (baselayer) {

            var fileName = baselayer.mbtile + '.mbtiles';
            if (baselayer.downloaded) {

                var source = "http://a.data.kosgis.dk/tilestream/v2/" + fileName;
                $cordovaFileTransfer.download(source, baselayer.filePath, true).then(function (result) {
                    console.log(result);
                    baselayer.db = $cordovaSQLite.openDB(fileName);
                }, function (err) {
                    baselayer.errorDownload = err;
                }, function (progress) {
                    var p = Math.round(progress.loaded / progress.total * 100);
                    baselayer.progress = p;
                });
            } else {
                if (baselayer.db) {
                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Slet kort',
                        template: 'Er du sikker på at du vil slette kortet?',
                        cancelText: 'Fortryd'
                    });
                    confirmPopup.then(function (res) {
                        if (res) {
                            $cordovaSQLite.deleteDB(fileName).then(function (result) {
                                console.log(result);
                            }, function (err) {
                                console.log(err);
                            });
                        } else {
                            baselayer.downloaded = true;
                        }
                    });
                }
            }
        };
    })





    .controller('menuCtrl', function ($scope, $rootScope, $http) {})

    .controller('mapCtrl', function ($scope, $rootScope, $q, $stateParams, $ionicNavBarDelegate, $timeout, $http, kfticket, couchdb, tilestream, $ionicSlideBoxDelegate, $ionicPopup, $ionicModal, $ionicPopover, $ionicLoading, $cordovaSQLite, $filter, $state, $document, configurationservice) {

        var navbar = $ionicNavBarDelegate._instances[0],
            backView = $rootScope.$viewHistory.backView,
            crosshair,
            polyline,
            polygon,
            lastpos,
            setView = true,
            positonOptions,
            i,
            overlaySearch,
            replicateEvent,
            crosshairIcon = L.icon({
                iconUrl: 'img/crosshair.png',
                iconSize: [100, 100], // size of the icon
                iconAnchor: [50, 50], // point of the icon which will correspond to marker's location
            }),
            gpspos = false,
            userMarker,
            lockPosition = false,
            master = {
                type: 'Feature',
                properties: {},
                geometry: {

                }
            };

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
            $rootScope.animation = 'slide-right-left';
            navbar.back();
        }
        $ionicLoading.show({
            template: '<div class="icon ion-loading-c"></div><div>Henter konfiguration, vent venligst...</div>'
        });
        $ionicLoading.show();
        $scope.onTS = function (event) {
            setView = false;
        };
        $scope.cordova = window.cordova;
        $scope.organizationid = $stateParams.organization;
        $scope.configurationid = $stateParams.configuration;
        $scope.disabled = false;
        $scope.isForm = false;
        $scope.back = function () {
            if ($scope.modal) {
                $scope.modal.remove();
                $scope.modal = null;
            }
            if (typeof (backview) !== 'undefined') {
                $rootScope.$viewHistory.backView = backView;
                navbar.back();
            } else {
                $state.go('organization', {
                    organization: $scope.organizationid
                });
            }
        };
        $scope.$on('$destroy', function () {
            if ($scope.modal) {
                $scope.modal.remove();
                $scope.modal = null;
            }
            if ($scope.popover) {
                $scope.popover.remove();
                $scope.popover = null;
            }
        });
        $scope.selectType = function (layer) {
            if ($scope.modal) {
                $scope.modal.remove();
                $scope.modal = null;
            }
            showEdit(layer);
        };

        function calcDistance(latlng, geometry) {
            var zoom = $scope.map.getZoom();

            if (geometry && latlng) {
                var point = turf.point([latlng.lng, latlng.lat]),
                    nearest,
                    i,
                    features,
                    linestring,
                    buffered;

                switch (geometry.type) {
                case 'Point':
                    nearest = turf.point(geometry.coordinates);
                    break;
                case 'MultiPoint':
                    features = [];
                    for (i = 0; i < geometry.coordinates.length; i++) {
                        features.push(turf.point(geometry.coordinates[i]));
                    }
                    nearest = turf.nearest(point, turf.featurecollection(features));
                    break;
                case 'LineString':
                    nearest = turf.pointOnLine(geometry, point);
                    //nearest = turf.point(geometry.coordinates[0]);
                    break;
                case 'MultiLineString':
                    features = [];
                    for (i = 0; i < geometry.coordinates.length; i++) {
                        linestring = turf.linestring(geometry.coordinates[i]);
                        features.push(turf.pointOnLine(linestring, point));
                    }
                    nearest = turf.nearest(point, turf.featurecollection(features));
                    break;
                case 'MultiPolygon':
                case 'Polygon':
                    buffered = turf.buffer(point, 500, 'meters');
                    nearest = turf.intersect(buffered, geometry);
                    if (nearest) {
                        nearest = turf.nearest(point, turf.explode(nearest));
                    }
                    break;
                    /*case 'MultiPolygon':
                        nearest = turf.point(opgave.geometry.coordinates[0][0]);
                        break;*/
                }
                if (nearest) {
                    return turf.distance(point, nearest);
                }
            }
            return null;
        }

        function opgaverContextMenu(e) {
            /*console.log(e);
            if ($rootScope.widgets.opgaver) {
                var overlay = $rootScope.overlays[$rootScope.widgets.opgaver.layer];
                var layer = overlay.leaflet;
                var feature, distance = Infinity,
                    dist, fet;
                for (var key in layer._layers) {
                    feature = layer._layers[key];
                    dist = calcDistance(e.latlng, feature.feature.geometry)
                    if (dist && dist < distance) {
                        fet = feature;
                        distance = dist;
                    }
                }
                $scope.selectOpgave(fet.feature);
            }*/
            //var bpos = 
            var point = L.point(e.layerPoint.x + 30, e.layerPoint.y + 30);
            var p1 = $scope.map.unproject(e.layerPoint);
            var p2 = $scope.map.unproject(point);
            var pt1 = turf.point([p1.lng, p1.lat]);
            var pt2 = turf.point([p2.lng, p2.lat]);
            var dist = turf.distance(pt1, pt2);
        }

        function reset() {
            $scope.doc = angular.copy(master);
            $scope.valid = angular.copy(master);
        }

        function clearValid(valid) {
            if (Object.prototype.toString.call(valid) === '[object Object]') {
                for (var key in valid) {
                    if (key === '$error') {
                        delete valid.$error;
                    } else {
                        clearValid(valid[key]);
                    }
                }
            }
        }

        function date2string(doc) {
            for (var key in doc) {
                if (Object.prototype.toString.call(doc[key]) === '[object Object]') {
                    date2string(doc[key]);
                } else if (Object.prototype.toString.call(doc[key]) === '[object Date]') {
                    doc[key] = doc[key].toJSON();
                }
            }
        }

        $scope.showOpgaver = function () {
            if ($scope.popover) {
                $scope.popover.remove();
                $scope.popover = null;
            }
            $ionicPopover.fromTemplateUrl('templates/sorterOpgaver.html', {
                scope: $scope,
            }).then(function (popover) {
                $scope.popover = popover;
            });
            $ionicModal.fromTemplateUrl('templates/searchOpgaver.html', {
                scope: $scope,
                backdropClickToClose: false
            }).then(function (modal) {
                if ($scope.modal) {
                    $scope.modal.remove();
                    $scope.modal = null;
                }
                $scope.modal = modal;
                modal.show();
            });
        };



        function locationerror() {
            $timeout(function () {
                $scope.map.locate($scope.map._locateOptions);
            }, 5000);
        }

        function locationfound(pos) {
            var bounds,
                zoom;
            userMarker.setLatLng(pos.latlng);
            if ($rootScope.widgets.position && $rootScope.widgets.position.accuracy) {
                userMarker.setAccuracy(pos.accuracy);
            }
            if ($rootScope.widgets.position && $rootScope.widgets.position.show && !$scope.map.hasLayer(userMarker)) {
                userMarker.addTo($scope.map);
            }
            $scope.myposition = pos;
            if (setView) {
                /*if ($scope.opgave && !gpspos) {
                    var overlay = $rootScope.overlays[$rootScope.widgets.opgaver.layer];
                    var layer = overlay.leaflet;
                    var item = layer._layers[$rootScope.index[overlay.id][$scope.opgave].leaflet];
                    var fc = {
                        "type": "FeatureCollection",
                        "features": [item.feature, {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [pos.longitude, pos.latitude]
                            }
                        }]
                    };
                    var bbox = turf.extent(fc);
                    $scope.map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]]);
                } else {*/
                zoom = $scope.map.getBoundsZoom(pos.bounds);
                $scope.map.setView(pos.latlng, zoom);
                /*$scope.map.setView(pos.latlng, zoom, {
                    animate: true
                });*/
                //}
            }

            if ($rootScope.widgets.tracking && $rootScope.widgets.tracking.checked) {
                if (($rootScope.widgets.tracking.interval && lastpos && (pos.timestamp - lastpos.timestamp > $rootScope.widgets.tracking.interval)) || !$rootScope.widgets.tracking.interval || !lastpos) {


                    lastpos = pos;
                    var doc = {
                        type: "Feature",
                        geometry: {
                            type: 'Point',
                            coordinates: [pos.longitude, pos.latitude]
                        },
                        properties: {
                            timestamp: (new Date(pos.timestamp)).toJSON(),
                            accuracy: pos.accuracy

                        }
                    };
                    if ($scope.opgave) {
                        doc.properties.opgave = $scope.opgave;
                    }
                    if ($rootScope.overlays[$rootScope.widgets.tracking.layer].db) {
                        $rootScope.overlays[$rootScope.widgets.tracking.layer].db.post(doc);
                    } else {
                        $http.post(couchdb + 'db-' + $rootScope.overlays[$rootScope.widgets.tracking.layer].database, doc).success(function (data, status, headers, config) {

                        }).error(function (data, status, headers, config) {
                            console.log(data);
                        });
                    }
                }
            }
        }

        function showSearch() {
            $ionicModal.fromTemplateUrl('templates/search.html', {
                scope: $scope,
                backdropClickToClose: false
            }).then(function (modal) {
                if ($scope.modal) {
                    $scope.modal.remove();
                    $scope.modal = null;
                }
                $scope.modal = modal;
                modal.show();
            });
        }

        function inside(pt, polygon) {
            var polys = polygon.geometry.coordinates;
            //var pt = [point.geometry.coordinates[0], point.geometry.coordinates[1]];
            // normalize to multipolygon
            if (polygon.geometry.type === 'Polygon') polys = [polys];

            var insidePoly = false;
            var i = 0;
            while (i < polys.length && !insidePoly) {
                // check if it is in the outer ring first
                if (inRing(pt, polys[i][0])) {
                    var inHole = false;
                    var k = 1;
                    // check for the point in any of the holes
                    while (k < polys[i].length && !inHole) {
                        if (inRing(pt, polys[i][k])) {
                            inHole = true;
                        }
                        k++;
                    }
                    if (!inHole) insidePoly = true;
                }
                i++;
            }
            return insidePoly;
        }

        function testgeometry(feature) {
            var j, k, point;
            switch ($scope.doc.geometry.type) {
            case 'Point':
                if (!inside($scope.doc.geometry.coordinates, feature)) {
                    return false;
                }
                break;
            case 'LineString':
                for (j = 0; j < $scope.doc.geometry.coordinates.length; j++) {
                    point = $scope.doc.geometry.coordinates[j];
                    if (!inside(point, feature)) {
                        return false;
                    }
                }
                break;
            case 'Polygon':
                for (j = 0; j < $scope.doc.geometry.coordinates.length; j++) {
                    var linestring = $scope.doc.geometry.coordinates[j];
                    for (k = 0; k < linestring.length; k++) {
                        point = linestring[k];
                        if (!inside(point, feature)) {
                            return false;
                        }

                    }
                    break;
                }
            }
            return true;
        }

        // pt is [x,y] and ring is [[x,y], [x,y],..]
        function inRing(pt, ring) {
            var isInside = false;
            for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                var xi = ring[i][0],
                    yi = ring[i][1];
                var xj = ring[j][0],
                    yj = ring[j][1];

                var intersect = ((yi > pt[1]) != (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
                if (intersect) isInside = !isInside;
            }
            return isInside;
        }

        var resolveLocalFileSystemURL = function (directory) {
            var deferred = $q.defer();
            window.resolveLocalFileSystemURL(directory, function (filesystem) {
                    deferred.resolve(filesystem);
                },
                function (err) {
                    deferred.reject(err);

                });
            return deferred.promise;
        };
        var gpslocationfound = function (pos) {
            $scope.map.off('locationfound', gpslocationfound);
            $scope.next();
        };
        var makeFormSchema = function (node, schema) {
            var properties,
                key,
                localnode,
                i;
            for (key in node) {
                localnode = node[key];
                if (key === 'oneOf') {
                    schema.properties = schema.properties || {};
                    for (i = 0; i < localnode.length; i++) {
                        makeFormSchema(localnode[i].properties, schema.properties);
                    }
                } else if (key === 'enum') {
                    schema.enum = schema.enum || [];
                    for (i = 0; i < localnode.length; i++) {
                        if (schema.enum.indexOf(localnode[i]) === -1)
                            schema.enum.push(localnode[i]);
                    }
                } else if (Object.prototype.toString.call(localnode) === '[object Object]') {
                    schema[key] = schema[key] || {};
                    makeFormSchema(localnode, schema[key]);
                } else {
                    schema[key] = localnode;
                }
            }
        };
        $scope.locate = function () {
            $scope.map.stopLocate();
            setView = true;
            $scope.map._locateOptions.watch = $scope.track;
            $scope.map.locate($scope.map._locateOptions);
        };
        $scope.showPosition = function () {
            if ($rootScope.widgets.position.show) {
                $scope.map.stopLocate();
                setView = false;
                $scope.map._locateOptions.watch = $scope.track;
                $scope.map.locate($scope.map._locateOptions);
            } else {
                if ($scope.map.hasLayer(userMarker)) {
                    $scope.map.removeLayer(userMarker);
                }
            }
        };
        var showEdit = function (layer) {
            reset();
            if ($scope.opgave) {
                $scope.doc.properties.opgave = $scope.opgave;
            }
            $scope.layer = layer;
            $scope.data = $rootScope.data[layer];
            $scope.validateschema = $rootScope.validateschemas[layer].schema;
            $scope.overlay = $rootScope.overlays[layer];
            $scope.schema = $rootScope.schemas[layer];

            for (var i = 0; i < $scope.overlay.form.length; i++) {
                var field = $scope.overlay.form[i];
                if (field.id === 'geometry') {
                    $scope.geometries = field.fields;
                    break;
                }
            }

            $ionicModal.fromTemplateUrl('templates/modalDraw.html', {
                scope: $scope,
                backdropClickToClose: false
            }).then(function (modal) {
                if ($scope.modal) {
                    $scope.modal.remove();
                    $scope.modal = null;
                }
                $scope.modal = modal;
                modal.show();
            });
        };
        var showDraw = function () {
            if ($rootScope.widgets.opgaver && !$scope.opgave) {
                var alertPopup = $ionicPopup.alert({
                    title: 'Advarsel',
                    template: 'Du skal først vælge en opgave!'
                });
            } else if ($rootScope.widgets.indberetninger.layers.length > 1) {
                $ionicModal.fromTemplateUrl('templates/modalSelectList.html', {
                    scope: $scope,
                    backdropClickToClose: false
                }).then(function (modal) {
                    if ($scope.modal) {
                        $scope.modal.remove();
                        $scope.modal = null;
                    }
                    $scope.modal = modal;
                    modal.show();
                });
            } else {
                showEdit($rootScope.widgets.indberetninger.layers[0]);
            }
        };
        var removeOverlays = function () {
            for (var key in $rootScope.overlays) {
                var overlay = $rootScope.overlays[key];
                if ($scope.map.hasLayer(overlay.leaflet)) {
                    $scope.map.removeLayer(overlay.leaflet);
                }
            }
            $rootScope.overlays = {};
            if ($scope.map.hasLayer($scope.crosshairLayer)) {
                $scope.map.removeLayer($scope.crosshairLayer);
            }
            if ($scope.map.hasLayer(userMarker)) {
                $scope.map.removeLayer(userMarker);
            }

        };
        var init = function (configuration) {
            if (!$scope.configuration || ($scope.configuration && !configuration) || ($scope.configuration && configuration && $scope.configuration._rev !== configuration._rev)) {
                if ($scope.modal) {
                    $scope.modal.remove();
                    $scope.modal = null;
                }
                if ($scope.popover) {
                    $scope.popover.remove();
                    $scope.popover = null;
                }


                removeOverlays();
                $scope.crosshairLayer = L.layerGroup();
                overlaySearch = L.featureGroup().addTo($scope.map);
                polyline = new L.Draw.PolylineTouch($scope.map);
                polygon = new L.Draw.PolygonTouch($scope.map);
                positonOptions = {};
                if (configuration) {
                    $scope.configuration = configuration;
                }

                if ($scope.configuration.security && $scope.configuration.security.length > 0) {
                    if (!($rootScope.user.name && $scope.configuration.security.indexOf($rootScope.user.name) !== -1)) {
                        $rootScope.showlogin();
                        return;
                    }
                }
                $rootScope.schemas = {};
                $rootScope.validateschemas = {};
                //$rootScope.filterschemas = {};
                $rootScope.index = {};
                $rootScope.data = {};
                $rootScope.straks = {};
                $rootScope.overlays = {};
                $rootScope.widgets = {};
                $scope.indberetningswidgets = [];
                if ($scope.modal) {
                    $scope.modal.remove();
                    $scope.modal = null;
                }
                if ($scope.popover) {
                    $scope.popover.remove();
                    $scope.popover = null;
                }
                for (i = 0; i < $scope.configuration.widgets.length; i++) {
                    var widget = $scope.configuration.widgets[i];
                    $rootScope.widgets[widget.id] = widget;
                    if (widget.id === 'indberetninger') {
                        $scope.indberetningswidgets.push(widget);
                    }
                }
                if ($scope.indberetningswidgets.length > 0) {
                    $scope.indberetning = $scope.indberetningswidgets[0];
                }
                if ($rootScope.widgets.opgaver && !$stateParams.layer && !$stateParams.id) {
                    $scope.showOpgaver();
                }

                $scope.showSearch = function () {
                    showSearch();
                };

                //region Offlinemap

                if (cordova) {
                    var directory;
                    if (cordova.platformId === 'android') {
                        directory = cordova.file.applicationStorageDirectory + 'databases/';
                    } else if (cordova.platformId === 'ios') {
                        directory = cordova.file.documentsDirectory;
                    }
                    angular.forEach($scope.configuration.map.baselayers, function (baselayer) {
                        if (baselayer.type === 'mbtiles') {
                            var fileName = baselayer.mbtile + '.mbtiles';
                            baselayer.filePath = directory + fileName;
                            resolveLocalFileSystemURL(baselayer.filePath).then(function (res) {
                                baselayer.downloaded = true;
                                baselayer.db = $cordovaSQLite.openDB(fileName);
                            }, function (err) {
                                baselayer.downloaded = false;
                            });
                        }
                    });
                } else {
                    angular.forEach($scope.configuration.map.baselayers, function (baselayer) {
                        if (baselayer.type === 'mbtiles') {
                            baselayer.progress = 50;
                        }
                    });
                }
                //endregion
                //region widget opgaver
                var schemaobject = function (input, doc) {
                    if (input && doc) {
                        var path = input.split('/');
                        var item = doc;
                        var key;
                        for (var m = 1; m < path.length; m++) {
                            key = path[m];
                            if (item.properties && item.properties.hasOwnProperty(key)) {
                                item = item.properties[key];
                            }
                        }

                        return item;
                    }
                    return null;
                };
                var objectpath = function (input, doc) {
                    var path = input.split('/');
                    var item = doc;
                    for (var m = 1; m < path.length; m++) {
                        var key = path[m];
                        if (item.hasOwnProperty(key)) {
                            item = item[key];
                        } else {
                            return null;
                        }
                    }
                    return item;
                };

                if ($rootScope.widgets.opgaver) {
                    $scope.selectedSortering = 'distance';
                    $scope.selectSort = function (item) {
                        $scope.selectedSortering = item;
                    };
                    $scope.filterByEnum = function (opgave) {
                        var overlay = $rootScope.overlays[$rootScope.widgets.opgaver.layer];
                        var schema = $rootScope.schemas[$rootScope.widgets.opgaver.layer];
                        for (var i = 0; i < overlay.list.length; i++) {
                            var item = schemaobject(overlay.list[i], schema);
                            var value = objectpath(overlay.list[i], opgave);
                            if (item && item.checked) {
                                if (!item.checked.hasOwnProperty(value) || (item.checked.hasOwnProperty(value) && !item.checked[value])) {
                                    return false;
                                }

                            }
                        }
                        return true;
                    };


                    $scope.selectOpgave = function (doc) {
                        $scope.valid = {};
                        if ($scope.modal) {
                            $scope.modal.remove();
                            $scope.modal = null;
                        }
                        if ($scope.popover) {
                            $scope.popover.remove();
                            $scope.popover = null;
                        }
                        $scope.doc = doc;
                        $scope.layer = $rootScope.widgets.opgaver.layer;
                        $scope.overlay = $rootScope.overlays[$rootScope.widgets.opgaver.layer];
                        $scope.validateschema = $rootScope.validateschemas[$rootScope.widgets.opgaver.layer].schema;
                        $scope.schema = $rootScope.schemas[$rootScope.widgets.opgaver.layer];
                        $scope.opgave = doc._id;
                        var overlay = $scope.overlay.leaflet;
                        if (overlay) {
                            var item = overlay.getLayer($rootScope.index[$scope.overlay.id][doc._id]);
                            overlay.eachLayer(function (layer) {
                                var style = overlay.options.style(layer.feature);
                                layer.setStyle(style);
                            });
                            /*for (var key in overlay._layers) {
                                //layer.resetStyle(layer._layers[key]);
                                var layer = overlay._layers[key];
                                var style = overlay.options.style(layer.feature);
                                layer.setStyle(style);
                            }*/
                            if (item.setStyle) {
                                item.setStyle($scope.overlay.selectionStyle.style);
                            }
                            if (!L.Browser.ie && !L.Browser.opera) {
                                //item.bringToFront();
                            }
                            if (item.getBounds) {
                                $scope.map.fitBounds(item.getBounds());
                            } else {
                                $scope.map.setView(item._latlng, $scope.baselayer.selectZoom || Infinity);
                            }
                        }

                        $scope.showStart = true;
                        $ionicModal.fromTemplateUrl('templates/modalItem.html', {
                            scope: $scope,
                            backdropClickToClose: false
                        }).then(function (modal) {
                            if ($scope.modal) {
                                $scope.modal.remove();
                                $scope.modal = null;
                            }
                            $scope.modal = modal;
                            modal.show();
                        });


                    };


                }

                //endregion
                //region widget adressesøgning

                if ($rootScope.widgets["adressesøgning"]) {
                    var awsConfig = {};
                    if ($rootScope.widgets["adressesøgning"].options) {
                        var awskeyvalue = $rootScope.widgets["adressesøgning"].options.split('=');

                        for (var n = 0; n < awskeyvalue.length;) {
                            awsConfig[awskeyvalue[n]] = awskeyvalue[n + 1];
                            n = n + 2;
                        }
                    }

                    /*$scope.loadMore = function () {
                        $http.get('/more-items').success(function (items) {
                            useItems(items);
                            $scope.$broadcast('scroll.infiniteScrollComplete');
                        });
                    };

                    $scope.$on('$stateChangeSuccess', function () {
                        $scope.loadMore();
                    });*/

                    /*$scope.getItemHeight = function (item, index) {
                        //Make evenly indexed items be 10px taller, for the sake of example
                        return index === 0 ? 54 : 55;
                    };*/


                    var awsOptions = {
                        baseUrl: 'http://dawa.aws.dk',
                        adgangsadresserOnly: true
                    };
                    var caches = [{}, {}, {}, {}];
                    var paths = ['/vejnavne/autocomplete', '/adgangsadresser/autocomplete', '/adresser/autocomplete'];

                    var prevSearch = "",
                        prevResultType = 0,
                        constrainedToAdgangsAdresseId;
                    var awsResponse = function (data) {
                        $scope.search.result = data;
                    };
                    var showAdressInMap = function (item) {
                        if (item.length > 0) {
                            overlaySearch.clearLayers();
                            var point = [item[0].adgangspunkt.koordinater[1], item[0].adgangspunkt.koordinater[0]];
                            var marker = L.marker(point);

                            overlaySearch.addLayer(marker);
                            marker.bindPopup($scope.search.input).openPopup();

                            $timeout(function () {
                                $scope.map.setView(point, $scope.baselayer.selectZoom || Infinity, {
                                    animate: true
                                });
                            }, 500);
                        }
                    };




                    var get = function (path, params, cache, cb) {
                        var stringifiedParams = JSON.stringify(params);
                        if (cache && cache[stringifiedParams]) {
                            return cb(cache[stringifiedParams]);
                        }
                        $http({
                                method: 'JSONP',
                                url: awsOptions.baseUrl + path,
                                params: angular.extend({
                                    callback: 'JSON_CALLBACK'
                                }, params, awsConfig)
                            })
                            .then(function (res) {
                                if (cache) {
                                    cache[stringifiedParams] = res.data;
                                }
                                cb(res.data);
                            });
                    };
                    // perform an autocomplete GET request to DAWA.
                    // If there is at most one result, continue to next type.
                    // We autocomplete through vejnavne, adgangsadresser and adresser.
                    var invokeSource = function (typeIdx, q, cb) {
                        var maxTypeIdx = awsOptions.adgangsadresserOnly ? 1 : 2;
                        var params = {
                            q: q
                        };
                        if (constrainedToAdgangsAdresseId) {
                            params = {
                                adgangsadresseid: constrainedToAdgangsAdresseId
                            };
                            typeIdx = 2;

                            // the constraint to search for adresser for a specific adgangsadresse is a one-off, so reset it
                            constrainedToAdgangsAdresseId = undefined;
                        }

                        get(paths[typeIdx], params, caches[typeIdx], function (data) {
                            if (data.length <= 1 && typeIdx < maxTypeIdx) {
                                invokeSource(typeIdx + 1, q, cb);
                            } else {
                                prevResultType = typeIdx;
                                prevSearch = q;
                                cb(data);
                            }
                        });
                    };
                    $scope.selectAddr = function (item) {

                        if (item.vejnavn) {
                            $scope.search.input = (item.tekst + ' ');
                            invokeSource(1, $scope.search.input, awsResponse);
                        } else if (item.adgangsadresse) {
                            if (awsOptions.adgangsadresserOnly) {
                                $scope.search.input = item.tekst;
                                get('/adgangsadresser', {
                                    id: item.adgangsadresse.id
                                }, caches[3], showAdressInMap);
                                return;
                            }
                            var adgAdr = item.adgangsadresse;
                            // We need to check if there is more than one
                            // adresse associated with the adgangsadresse.
                            get(
                                '/adresser/autocomplete', {
                                    adgangsadresseid: adgAdr.id
                                }, null,
                                function (data) {
                                    if (data.length > 1) {
                                        // We'll prepare a text query and let the user enter more details (etage/dør)
                                        // before triggering a new search

                                        // We'll try to help the user by setting the caret at the appropriate position for
                                        // entering etage and dør
                                        var textBefore = adgAdr.vejnavn + ' ' + adgAdr.husnr + ', ';
                                        var textAfter = ' ';
                                        if (adgAdr.supplerendebynavn) {
                                            textAfter += ', ' + adgAdr.supplerendebynavn;
                                        }
                                        if (adgAdr.postnr) {
                                            textAfter += ', ' + adgAdr.postnr;
                                        }
                                        if (adgAdr.postnrnavn) {
                                            textAfter += ' ' + adgAdr.postnrnavn;
                                        }
                                        $scope.search.input = textBefore + textAfter;
                                        //var element = $document.find("#awsInput");
                                        var element = document.getElementById("awsInput");
                                        element.focus();
                                        element.selectionStart = element.selectionEnd = textBefore.length;

                                        // in addition to constructing a prebuilt query for the user to enter etage and dør,
                                        // we let the autocomplete widget perform a one-off query for adresser matching the
                                        // selected adgangsadresse
                                        constrainedToAdgangsAdresseId = adgAdr.id;
                                        invokeSource(2, $scope.search.input, awsResponse);

                                    } else if (data.length === 1) {
                                        $scope.search.input = data[0].tekst;
                                        get('/adgangsadresser', {
                                            id: adgAdr.id
                                        }, caches[3], showAdressInMap);
                                    }
                                });
                        } else {
                            $scope.search.input = item.tekst;
                            get('/adresser', {
                                id: item.adresse.id
                            }, caches[3], showAdressInMap);
                        }
                    };

                    $scope.search = {
                        isopen: false,
                        input: "",
                        result: []
                    };

                    var url = 'http://dawa.aws.dk/vejnavne/autocomplete?';
                    if ($rootScope.widgets["adressesøgning"].options) {
                        url += $rootScope.widgets["adressesøgning"].options + '&';
                    }
                    url += 'q=';
                    $scope.keyup = function ($event) {
                        $scope.search.lastKey = $event.keyCode;
                        //$event.preventDefault();
                        var item, i;
                        if ($event.keyCode === 40) {
                            //down
                            if ($scope.search.result.length > 0) {
                                if ($scope.selected) {
                                    var fundet = false;
                                    for (i = 0; i < $scope.search.result.length; i++) {
                                        item = $scope.search.result[i];
                                        if (item === $scope.selected) {
                                            fundet = true;
                                            if (i < $scope.search.result.length - 1) {
                                                $scope.selected = $scope.search.result[i + 1];
                                                $scope.search.input = $scope.selected.tekst;
                                            }
                                            break;
                                        }
                                    }
                                    if (!fundet) {
                                        $scope.selected = $scope.search.result[0];
                                    }
                                } else {
                                    $scope.selected = $scope.search.result[0];
                                }
                            }
                        } else if ($event.keyCode === 38) {
                            /*$event.preventDefault();
                            $event.stopPropagation();
                            $event.stopImmediatePropagation();
                            */
                            //up
                            if ($scope.search.result.length > 0) {
                                if ($scope.selected) {
                                    for (i = 0; i < $scope.search.result.length; i++) {
                                        item = $scope.search.result[i];
                                        if (item === $scope.selected) {

                                            if (i > 0) {
                                                $scope.selected = $scope.search.result[i - 1];
                                                $scope.search.input = $scope.selected.tekst;
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        } else {
                            if ($scope.search.input.length > 1) {
                                var q = $scope.search.input;

                                // we start over searching in vejnavne (index 0) if the current query is not a prefix of
                                // the previous one.
                                var sourceTypeIdx = q.indexOf(prevSearch) !== 0 ? 0 : prevResultType;

                                invokeSource(sourceTypeIdx, q, awsResponse);
                                //search();
                            }
                        }
                    };
                    $scope.keydown = function ($event) {
                        if ($event.keyCode === 13) {
                            $event.preventDefault();
                            $scope.selectAddr($scope.selected);
                            $scope.search.lastKey = $event.keyCode;
                        }
                    };
                    var search = function () {
                        if ($scope.search.vejnavn && $scope.search.input.slice(0, $scope.search.vejnavn.length) == $scope.search.vejnavn) {
                            url = 'http://dawa.aws.dk/adresser/autocomplete?';
                            if ($rootScope.widgets["adressesøgning"].options) {
                                url += $rootScope.widgets["adressesøgning"].options + '&';
                            }
                            url += 'vejnavn=' + $scope.search.vejnavn + '&q=';
                        } else {
                            url = 'http://dawa.aws.dk/vejnavne/autocomplete?';
                            if ($rootScope.widgets["adressesøgning"].options) {
                                url += $rootScope.widgets["adressesøgning"].options + '&';
                            }
                            url += 'q=';
                        }
                        $http.jsonp(url + $scope.search.input + '&callback=JSON_CALLBACK')
                            .then(function (res) {
                                $scope.selected = null;
                                if (res.data.length === 1 && $scope.search.lastKey !== 8 && $scope.search.lastKey !== 46) {
                                    $scope.search.isopen = false;
                                    var item = res.data[0];
                                    if (item.vejnavn) {
                                        $scope.search.vejnavn = item.tekst;
                                        $scope.selectAddr({
                                            name: item.tekst,
                                            type: "vejnavn"
                                        });
                                    } else if (item.adresse) {
                                        $scope.selectAddr({
                                            name: item.tekst,
                                            type: "adresse",
                                            id: item.adresse.id
                                        });
                                    }

                                } else {
                                    $scope.search.result = [];
                                    angular.forEach(res.data, function (item) {
                                        if (item.vejnavn) {
                                            $scope.search.result.push({
                                                name: item.tekst,
                                                type: "vejnavn"
                                            });
                                        } else if (item.adresse) {
                                            $scope.search.result.push({
                                                name: item.tekst,
                                                type: "adresse",
                                                id: item.adresse.id
                                            });
                                        }
                                    });
                                    $scope.search.isopen = res.data.length > 0;
                                }
                            });
                    };
                    /*$scope.selectAddr = function (item) {
                        if (item.type === "vejnavn") {
                            $scope.search.input = item.name;
                            $scope.search.vejnavn = item.name;
                            search();
                        } else {
                            $scope.modal.remove();
                            $http.jsonp('http://dawa.aws.dk/adresser/' + item.id + '?callback=JSON_CALLBACK')
                                .then(function (res) {
                                    $scope.search.input = item.name;
                                    $scope.geo = res;
                                    overlaySearch.clearLayers();
                                    var marker = L.marker([res.data.adgangsadresse.adgangspunkt.koordinater[1], res.data.adgangsadresse.adgangspunkt.koordinater[0]]);

                                    overlaySearch.addLayer(marker);
                                    marker.bindPopup(res.data.adressebetegnelse).openPopup();
                                    $scope.map.setView([res.data.adgangsadresse.adgangspunkt.koordinater[1], res.data.adgangsadresse.adgangspunkt.koordinater[0]], $scope.baselayer.selectZoom || Infinity, {
                                        animate: true
                                    });
                                    $timeout(function () {
                                        $scope.map.setView([res.data.adgangsadresse.adgangspunkt.koordinater[1], res.data.adgangsadresse.adgangspunkt.koordinater[0]], $scope.baselayer.selectZoom || Infinity, {
                                            animate: true
                                        });
                                    }, 500);
                                    
                                });
                        }
                    };*/
                }
                //endregion

                //region widget indberetninger
                if ($rootScope.widgets.indberetninger) {
                    $scope.edit = function () {
                        showDraw();
                    };
                    var mapMove = function (e) {
                        crosshair.setLatLng(e.target.getCenter());
                    };
                    var mapMoveend = function (e) {
                        var latlng = e.target.getCenter();
                        $scope.doc.geometry = {
                            type: 'Point',
                            coordinates: [latlng.lng, latlng.lat]
                        };
                        if ($scope.opgave) {
                            $scope.doc.properties = $scope.doc.properties || {};
                            $scope.doc.properties.opgave = $scope.opgave;
                        }
                        //$scope.validateGeometry();
                    };
                    var mapDrawCreated = function (e) {

                        $scope.crosshairLayer.addLayer(e.layer);
                        $scope.doc.geometry = (e.layer.toGeoJSON()).geometry;
                        polygon.disable();
                        polyline.disable();

                    };

                    $scope.draw = function (type) {
                        var latlng;
                        $scope.geometryValidated = false;
                        $scope.map.off('move', mapMove);
                        $scope.map.off('moveend', mapMoveend);
                        $scope.map.off('draw:created', mapDrawCreated);
                        if ($scope.modal) {
                            $scope.modal.remove();
                            $scope.modal = null;
                        }
                        $scope.crosshairLayer.clearLayers();
                        polyline.disable();
                        polygon.disable();
                        gpspos = false;
                        switch (type) {
                        case 'GPS':
                            gpspos = true;
                            latlng = $scope.map.getCenter();
                            crosshair = new L.marker(latlng, {
                                icon: crosshairIcon,
                                clickable: false
                            });
                            crosshair.addTo($scope.crosshairLayer);
                            $scope.doc.geometry = {
                                type: 'Point',
                                coordinates: [latlng.lng, latlng.lat]
                            };
                            $scope.map.on('move', mapMove);
                            $scope.map.on('moveend', mapMoveend);
                            //$scope.locate();
                            $scope.map.stopLocate();
                            $scope.map.on('locationfound', gpslocationfound);
                            setView = true;
                            $scope.map._locateOptions.watch = $scope.track;
                            $scope.map.locate($scope.map._locateOptions);
                            break;
                        case 'Point':
                            latlng = $scope.map.getCenter();
                            crosshair = new L.marker(latlng, {
                                icon: crosshairIcon,
                                clickable: false
                            });
                            crosshair.addTo($scope.crosshairLayer);
                            $scope.doc.geometry = {
                                type: 'Point',
                                coordinates: [latlng.lng, latlng.lat]
                            };
                            $scope.map.on('move', mapMove);
                            $scope.map.on('moveend', mapMoveend);
                            //$scope.geometryValidated = testgeometry();
                            break;
                        case 'LineString':
                            polyline.enable();
                            $scope.map.on('draw:created', mapDrawCreated);
                            break;
                        case 'Polygon':
                            polygon.enable();
                            $scope.map.on('draw:created', mapDrawCreated);
                            break;
                        }
                    };
                    $scope.next = function () {
                        var tilladt, forbudt = [],
                            description = "",
                            key, l;
                        if (polygon._enabled) {
                            polygon._finishShape();
                        }
                        if (polyline._enabled) {
                            polyline._finishShape();
                        }
                        if ($scope.doc.geometry.type) {
                            if ($rootScope.straks.hasOwnProperty($rootScope.overlays[$scope.layer].database)) {
                                $scope.straks = $rootScope.straks[$rootScope.overlays[$scope.layer].database];
                            }
                            if ($scope.straks) {
                                for (key in $scope.straks) {
                                    var item = $scope.straks[key];
                                    for (l = 0; l < item.geojson.features.length; l += 1) {
                                        var feature = item.geojson.features[l];
                                        if (testgeometry(feature)) {
                                            if (item.inside) {
                                                tilladt = null;
                                            } else {
                                                forbudt.push(item.description);
                                            }
                                            break;
                                        } else if (item.inside) {
                                            tilladt = item.description || "Placering ikke tilladt";

                                        }
                                    }
                                }
                            }
                        } else {
                            tilladt = "Angiv først en placering i kortet";
                        }
                        if (tilladt || forbudt.length > 0) {
                            if (tilladt) {
                                description = tilladt;
                            }
                            for (l = 0; l < forbudt.length; l += 1) {
                                description += forbudt[l];
                            }
                            var alertPopup = $ionicPopup.alert({
                                title: 'Advarsel',
                                template: description
                            });
                            alertPopup.then(function (res) {
                                //console.log('Thank you for not eating my delicious ice cream cone');
                            });
                        } else {
                            $scope.showStart = false;
                            $ionicModal.fromTemplateUrl('templates/modalItem.html', {
                                scope: $scope,
                                backdropClickToClose: false
                            }).then(function (modal) {
                                if ($scope.modal) {
                                    $scope.modal.remove();
                                    $scope.modal = null;
                                }
                                $scope.modal = modal;
                                modal.show();
                            });
                        }
                    };
                    var tv4error = function (error) {
                        $scope.errormessage.push(error.message);
                        var path = error.dataPath.split('/'),
                            i;
                        if (error.params && error.params.key) {
                            path.push(error.params.key);
                        }
                        var item = $scope.valid;
                        for (i = 1; i < path.length; i++) {
                            var key = path[i];
                            if (item.hasOwnProperty(key)) {
                                item = item[key];
                            }
                        }
                        item.$error = error;
                        if (error.subErrors) {
                            for (i = 0; i < error.subErrors.length; i++) {
                                tv4error(error.subErrors[i]);
                            }
                        }

                    };
                    $scope.startOpgave = function () {
                        if ($rootScope.widgets.tracking) {
                            $rootScope.widgets.tracking.checked = true;
                            $scope.tracking();
                        }
                        $scope.submit();
                    };
                    $scope.submit = function () {
                        clearValid($scope.valid);
                        var localdoc = angular.copy($scope.doc);
                        if (localdoc.hasOwnProperty('distance')) {
                            delete localdoc.distance;
                        }
                        date2string(localdoc);
                        $scope.errormessage = [];
                        tv4.language('da-DK');
                        if (tv4.validate(localdoc, $scope.validateschema)) {
                            $ionicPopup.confirm({
                                title: 'Send indberetning',
                                template: 'Er du sikker på at du vil sende indberetningen?',
                                cancelText: 'Fortryd'
                            }).then(function (res) {
                                if (res) {
                                    $ionicLoading.show({
                                        template: '<div class="icon ion-loading-c"></div><div>Gemmer, vent venligst...</div>'
                                    });
                                    $ionicLoading.show();
                                    if (PouchDB) {
                                        $scope.overlay.db.post(localdoc, function (err, response) {
                                            $ionicLoading.hide();
                                            if ($scope.modal) {
                                                $scope.modal.remove();
                                                $scope.modal = null;
                                            }
                                            reset();
                                            $scope.crosshairLayer.clearLayers();
                                            if ($rootScope.widgets.indberetninger.showReceipt) {
                                                $ionicModal.fromTemplateUrl('templates/modalReceipt.html', {
                                                    scope: $scope,
                                                    backdropClickToClose: false
                                                }).then(function (modal) {
                                                    if ($scope.modal) {
                                                        $scope.modal.remove();
                                                        $scope.modal = null;
                                                    }
                                                    $scope.modal = modal;
                                                    modal.show();
                                                });
                                            }
                                        });
                                    } else {
                                        $http.post(couchdb + 'db-' + $scope.overlay.database, localdoc).success(function (data, status, headers, config) {
                                            $ionicLoading.hide();
                                            if ($scope.modal) {
                                                $scope.modal.remove();
                                                $scope.modal = null;
                                            }
                                            reset();
                                            $scope.crosshairLayer.clearLayers();
                                            localdoc._rev = data.rev;
                                            localdoc._id = data.id;
                                            createDoc(localdoc, $scope.overlay);
                                            if ($rootScope.widgets.indberetninger.showReceipt) {
                                                $ionicModal.fromTemplateUrl('templates/modalReceipt.html', {
                                                    scope: $scope,
                                                    backdropClickToClose: false
                                                }).then(function (modal) {
                                                    if ($scope.modal) {
                                                        $scope.modal.remove();
                                                        $scope.modal = null;
                                                    }
                                                    $scope.modal = modal;
                                                    modal.show();
                                                });
                                            }
                                        }).error(function (data, status, headers, config) {
                                            var alertPopup = $ionicPopup.alert({
                                                title: 'Fejl',
                                                template: data
                                            });
                                            alertPopup.then(function (res) {

                                            });
                                        });
                                    }
                                }
                            });
                        } else {
                            tv4error(tv4.error);
                            $scope.error = tv4.error;
                            var alertPopup = $ionicPopup.alert({
                                title: 'Fejl',
                                templateUrl: 'templates/error.html',
                                scope: $scope
                            });
                            alertPopup.then(function (res) {

                            });
                        }
                    };
                }
                //endregion

                //region widget position

                if ($rootScope.widgets.position) {
                    positonOptions = {};
                    if ($rootScope.widgets.position.pulsing) {
                        positonOptions.pulsing = true;
                    }
                    if ($rootScope.widgets.position.smallIcon) {
                        positonOptions.smallIcon = true;
                    }
                    userMarker = L.userMarker([0, 0], positonOptions);
                }

                if ($rootScope.widgets.position && !$scope.track) {
                    if ($rootScope.widgets.position.enableHighAccuracy) {
                        $scope.map._locateOptions.enableHighAccuracy = true;
                    } else {
                        $scope.map._locateOptions.enableHighAccuracy = false;
                    }
                    if ($rootScope.widgets.position.watch) {
                        $scope.map._locateOptions.watch = true;
                    } else {
                        $scope.map._locateOptions.watch = false;
                    }
                    $scope.track = $scope.map._locateOptions.watch;

                    if ($rootScope.widgets.position.start && !$stateParams.layer && !$stateParams.id) {
                        $scope.locate();
                    } else if ($rootScope.widgets.position.show) {
                        $scope.showPosition();
                    }
                }

                //endregion
                var createMap = function (layer) {
                    if (layer.maxZoom) {
                        $scope.map.options.maxZoom = layer.maxZoom;
                    } else {
                        $scope.map.options.maxZoom = 18;
                    }
                    if (layer.minZoom) {
                        $scope.map.options.minZoom = layer.minZoom;
                    } else {
                        $scope.map.options.minZoom = 0;
                    }
                    if (layer.epsg === "25832") {
                        var resolutions = [1638.4, 819.2, 409.6, 204.8, 102.4, 51.2, 25.6, 12.8, 6.4, 3.2, 1.6, 0.8, 0.4, 0.2, 0.1];
                        var res2 = [];
                        if (layer.maxZoom) {
                            for (var i = 0; i <= layer.maxZoom; i++) {
                                res2.push(resolutions[i]);
                            }
                        } else {
                            res2 = resolutions;
                        }
                        $scope.map.options.crs = new L.Proj.CRS.TMS('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs', [120000, 5900000, 1000000, 6500000], {
                            resolutions: res2
                        });
                    } else {
                        $scope.map.options.crs = L.CRS.EPSG3857;
                    }
                };

                var replicateFrom = function (value) {
                    if (value.replicationFrom) {
                        value.replicationFrom.cancel();
                        value.replicationFrom = null;
                    }
                    var options = {};
                    if (value.replicateFrom) {
                        options.live = true;
                        options.retry = true;
                    } else {
                        options.doc_ids = ['_design/schema', '_design/straks'];
                    }
                    value.replicationFrom = value.db.replicate.from(couchdb + 'db-' + value.database, options);
                    //.on('uptodate', function (info) {}).on('error', function (err) {}).on('complete', function (info) {}).on('change', function (info) {});
                };

                var replicateTo = function (value) {
                    if (value.replicationTo) {
                        value.replicationTo.cancel();
                        value.replicationTo = null;
                    }
                    value.replicationTo = value.db.replicate.to(couchdb + 'db-' + value.database, {
                        live: true,
                        retry: true
                    });
                    //.on('uptodate', function (info) {}).on('error', function (err) {}).on('complete', function (info) {}).on('change', function (info) {});
                };
                var layerClicked = function (value) {
                    return function (e) {
                        if ($rootScope.widgets.opgaver && $rootScope.widgets.opgaver.layer === value.id) {
                            $scope.selectOpgave(e.target.feature);
                        } else if ($rootScope.overlays[value.id].replicateFrom && $rootScope.overlays[value.id].replicateTo) { //if ($rootScope.widgets.indberetninger && $rootScope.widgets.indberetninger.layers.indexOf(value.id) !== -1) {
                            $rootScope.$emit('selectLayer', e.target.feature, value.id, false);
                        }
                    };
                };

                var createStraks = function (doc, value) {
                    var straks = JSON.parse(doc.lib.straks.substring(15)),
                        options,
                        layer;
                    $rootScope.straks[value.database] = $rootScope.straks[value.database] || {};
                    angular.extend($rootScope.straks[value.database], straks);
                    for (var key in $rootScope.overlays) {
                        var overlay = $rootScope.overlays[key];
                        if (overlay.leaflet && overlay.straks && $rootScope.straks[value.database].hasOwnProperty(overlay.straks)) {
                            options = overlay.leaflet.options;
                            overlay.leaflet.clearLayers();
                            var item = $rootScope.straks[value.database][overlay.straks].geojson;
                            for (var j = 0; j < item.features.length; j++) {
                                var geojson = item.features[j];
                                layer = L.GeoJSON.geometryToLayer(geojson, options.pointToLayer);
                                layer.feature = L.GeoJSON.asFeature(geojson);
                                layer.on('click', (layerClicked(value)));
                                layer.defaultOptions = layer.options;
                                //overlay.leaflet.resetStyle(layer);
                                var style = options.style(layer.feature);
                                layer.setStyle(style);

                                if (options.onEachFeature) {
                                    options.onEachFeature(geojson, layer);
                                }
                                overlay.leaflet.addLayer(layer);
                            }
                        }
                    }
                };
                var createSchema = function (doc, value) {
                    $rootScope.validateschemas[value.id] = doc;
                    var schema = {};
                    makeFormSchema(doc.schema, schema);
                    $rootScope.schemas[value.id] = schema;
                    $rootScope.$emit("schema", value.id);
                    if ($scope.layer && $scope.layer === value.id) {
                        $scope.schema = schema;
                        $scope.validateschema = doc.schema;
                    }
                };
                var createDoc = function (doc, value) {
                    if (doc._id) {
                        if (doc._id === "_design/schema") {
                            if ($rootScope.validateschemas.hasOwnProperty(value.id)) {
                                if ($rootScope.validateschemas[value.id]._rev === doc._rev) {
                                    return;
                                }
                            }
                            createSchema(doc, value);
                            if (!$rootScope.widgets.opgaver && $rootScope.widgets.indberetninger && $rootScope.widgets.indberetninger.start && $rootScope.widgets.indberetninger.layers && $rootScope.widgets.indberetninger.layers.length > 0 && !$stateParams.layer && !$stateParams.id) {
                                showDraw();
                                //$rootScope.$emit('schema', value.id);
                            }
                        } else if (doc._id === "_design/straks") {
                            createStraks(doc, value);
                        } else if (doc._id.substring(0, 7) !== "_design") {
                            if (($rootScope.widgets.opgaver && $rootScope.widgets.opgaver.layer === value.id && doc.properties && doc.properties.user && $rootScope.user.name && $rootScope.user.name === doc.properties.user) || !$rootScope.widgets.opgaver || !($rootScope.widgets.opgaver && $rootScope.widgets.opgaver.layer === value.id)) {


                                var options = value.leaflet.options;
                                var layer = L.GeoJSON.geometryToLayer(doc, options.pointToLayer);
                                layer.feature = L.GeoJSON.asFeature(doc);
                                if (($rootScope.widgets.indberetninger && $rootScope.widgets.indberetninger.layers.indexOf(value.id) !== -1) || ($rootScope.widgets.opgaver && $rootScope.widgets.opgaver.layer === value.id)) {
                                    layer.on('click', (layerClicked(value)));
                                }
                                //layer.defaultOptions = layer.options;
                                
                                if (layer.setStyle) {
                                    var style = options.style(layer.feature);
                                    layer.setStyle(style);
                                } 
                                //value.leaflet.resetStyle(layer);
                                if (options.onEachFeature) {
                                    options.onEachFeature(doc, layer);
                                }
                                value.leaflet.addLayer(layer);
                                if ($rootScope.widgets.opgaver && $rootScope.widgets.opgaver.layer === value.id && $scope.opave == doc._id) {
                                    layer.setStyle(value.selectionStyle.style);
                                }
                                $rootScope.index[value.id] = $rootScope.index[value.id] || {};
                                $rootScope.data[value.id] = $rootScope.data[value.id] || [];
                                $rootScope.index[value.id][doc._id] = layer._leaflet_id;
                                $rootScope.data[value.id].push(doc);
                                if ($stateParams.layer && $stateParams.id && $stateParams.layer === value.id && $stateParams.id === doc._id) {
                                    if ($rootScope.widgets.opgaver && $rootScope.widgets.opgaver.layer === value.id) {
                                        $scope.selectOpgave(doc);
                                    } else if (value.replicateFrom && value.replicateTo) {
                                        $rootScope.$emit('selectLayer', doc, value.id, $scope, true);
                                    } else {
                                        layer.openPopup();
                                    }
                                }
                            }
                        }
                    }
                };



                var removeDoc = function (id, value) {
                    if ($rootScope.data.hasOwnProperty(value.id)) {
                        var index = binarySearch($rootScope.data[value.id], id);
                        var doc = $rootScope.data[value.id][index];
                        if (doc && doc._id === id) {
                            $rootScope.data[value.id].splice(index, 1);
                            value.leaflet.removeLayer($rootScope.index[value.id][id]);
                            delete $rootScope.index[value.id][id];
                        }
                    }
                };
                var updateDoc = function (doc, value) {
                    removeDoc(doc._id, value);
                    createDoc(doc, value);
                };

                var dbChanges = function (value) {
                    if (value.changes) {
                        value.changes.cancel();
                        value.changes = null;
                    }
                    value.changes = value.db.changes({
                        since: 'now',
                        live: true,
                        include_docs: true
                    }).on('change', function (change) {
                        $timeout(function () {
                            if (change.deleted) {
                                removeDoc(change.id, value);
                            } else {
                                updateDoc(change.doc, value);
                            }


                        });
                    });


                    /* .on('create', function (change) {
                        $timeout(function () {
                            createDoc(change.doc, value);
                        });
                    }).on('delete', function (change) {
                        $timeout(function () {
                            removeDoc(change.id, value);
                        });
                    }).on('update', function (change) {
                        $timeout(function () {
                            updateDoc(change.doc, value);
                        });
                    });*/
                    dbReplicate(value);
                };
                var dbReplicate = function (value) {
                    if (value.replicateTo) {
                        replicateTo(value);
                    }
                    replicateFrom(value);

                };
                var createLayer = function (value) {
                    var deferred = $q.defer();
                    $timeout(function () {
                        var jsonTransformed = {};
                        var dboptions = {};
                        if (value.options) {
                            jsonTransformed = JSON.parse(value.options, function (key, value) {
                                if (value && (typeof value === 'string') && value.indexOf("function") === 0) {
                                    var jsFunc = new Function('return ' + value)();
                                    return jsFunc;
                                }
                                return value;
                            });
                        }
                        if (typeof (value.minZoom) !== 'undefined' && value.minZoom !== null) {
                            jsonTransformed.minZoom = value.minZoom;
                        }
                        if (typeof (value.maxZoom) !== 'undefined' && value.maxZoom !== null) {
                            jsonTransformed.maxZoom = value.maxZoom;
                        }
                        if (typeof (value.disableClusteringAtZoom) !== 'undefined' && value.disableClusteringAtZoom !== null) {
                            jsonTransformed.disableClusteringAtZoom = value.disableClusteringAtZoom;
                        }
                        if (value.attribution) {
                            jsonTransformed.attribution = value.attribution;
                        }
                        if (value.type === 'xyz' && value.url && value.url !== "") {
                            if (value.ticket) {
                                kfticket.getTicket().then(function (ticket) {
                                    jsonTransformed.ticket = ticket;
                                    value.leaflet = L.tileLayer(value.url, jsonTransformed);
                                    deferred.resolve(value);
                                });
                            } else {
                                value.leaflet = L.tileLayer(value.url, jsonTransformed);
                                deferred.resolve(value);
                            }
                        } else if (value.type === 'wms') {
                            jsonTransformed = angular.extend(jsonTransformed, value.wms);
                            if (value.ticket) {
                                kfticket.getTicket().then(function (ticket) {
                                    jsonTransformed.ticket = ticket;
                                    value.leaflet = L.tileLayer.wms(value.url, jsonTransformed);
                                    deferred.resolve(value);
                                });
                            } else {
                                value.leaflet = L.tileLayer.wms(value.url, jsonTransformed);
                                deferred.resolve(value);
                            }
                        } else if (value.type === 'geojson' || value.type === 'database' || value.type === 'straks') {
                            var theme = {};
                            if (value.styles) {
                                for (var i = 0; i < value.styles.length; i++) {
                                    var style = value.styles[i];
                                    theme[style.id] = style;
                                }
                            }
                            if (value.style) {
                                jsonTransformed.style = JSON.parse(value.style, function (key, value) {
                                    if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                                        var jsFunc = new Function("theme", 'return ' + value)(theme);
                                        return jsFunc;
                                    }
                                    return value;
                                });
                            }
                            if (value.onEachFeature) {
                                jsonTransformed.onEachFeature = JSON.parse(value.onEachFeature, function (key, value) {
                                    if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                                        var jsFunc = new Function('return ' + value)();
                                        return jsFunc;
                                    }
                                    return value;
                                });
                            }
                            if (value.pointToLayer) {
                                jsonTransformed.pointToLayer = JSON.parse(value.pointToLayer, function (key, value) {
                                    if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                                        var jsFunc = new Function("theme", "L", 'return ' + value)(theme, L);
                                        return jsFunc;
                                    }
                                    return value;
                                });
                            }
                            if (value.type === 'database') {



                                if (value.markercluster) {
                                    value.leaflet = new L.MarkerClusterGroup(jsonTransformed);
                                } else {
                                    value.leaflet = L.geoJson(null, jsonTransformed);
                                }


                                if (PouchDB && (value.replicateTo || value.replicateFrom)) {

                                    if (window.cordova) {
                                        dboptions.adapter = 'websql';
                                    }
                                    var doChanges = true;
                                    if (value.db) {
                                        doChanges = false;
                                    } else {
                                        //value.db = new PouchDB('db-' + value.database, dboptions);
                                        //brug lag id i stedet for database id, hvis flere lag bruger samme database.
                                        value.db = new PouchDB('db-' + value.id, dboptions);
                                    }
                                    if (!value.replicateFrom && !value.offlineOnly) {
                                        $http.get(couchdb + 'db-' + value.database + '/_design/views/_view/data?include_docs=true').
                                        success(function (data, status, headers, config) {

                                            angular.forEach(data.rows, function (row) {
                                                updateDoc(row.doc, value);
                                            });
                                        }).
                                        error(function (data, status, headers, config) {});
                                    }
                                    value.db.get('_design/schema').then(function (doc) {
                                        updateDoc(doc, value);
                                        value.db.allDocs({
                                            include_docs: true
                                        }, function (err, res) {
                                            $timeout(function () {

                                                if (!err) {
                                                    for (var i = 0; i < res.rows.length; i++) {
                                                        var doc = res.rows[i].doc;
                                                        updateDoc(doc, value);
                                                    }

                                                }
                                                if (doChanges) {
                                                    dbChanges(value);
                                                }
                                                deferred.resolve(value);
                                            });
                                        });
                                    }).catch(function (err) {
                                        $http.get(couchdb + 'db-' + value.database + '/_design/schema').
                                        success(function (data, status, headers, config) {
                                            updateDoc(data, value);
                                            value.db.allDocs({
                                                include_docs: true
                                            }, function (err, res) {
                                                $timeout(function () {

                                                    if (!err) {
                                                        for (var i = 0; i < res.rows.length; i++) {
                                                            var doc = res.rows[i].doc;
                                                            updateDoc(doc, value);
                                                        }

                                                    }
                                                    if (doChanges) {
                                                        dbChanges(value);
                                                    }
                                                    deferred.resolve(value);
                                                });
                                            });
                                        });
                                    });
                                    value.db.get('_design/straks').then(function (doc) {
                                        updateDoc(doc, value);
                                    }).catch(function (err) {
                                        $http.get(couchdb + 'db-' + value.database + '/_design/straks').
                                        success(function (data, status, headers, config) {
                                            updateDoc(data, value);
                                        });
                                    });
                                } else {
                                    deferred.resolve(value);

                                    if (($rootScope.widgets.indberetninger && $rootScope.widgets.indberetninger.layers.indexOf(value.id) !== -1) || ($rootScope.widgets.opgaver && $rootScope.widgets.opgaver.layer === value.id)) {
                                        $http.get(couchdb + 'db-' + value.database + '/_design/schema').
                                        success(function (data, status, headers, config) {
                                            createDoc(data, value);
                                            if (!value.offlineOnly) {
                                                //if (!value.replicateTo || value.replicateFrom) {
                                                $http.get(couchdb + 'db-' + value.database + '/_design/views/_view/data?include_docs=true').
                                                success(function (data, status, headers, config) {

                                                    angular.forEach(data.rows, function (row) {
                                                        createDoc(row.doc, value);
                                                    });

                                                }).
                                                error(function (data, status, headers, config) {

                                                });
                                            }
                                        }).
                                        error(function (data, status, headers, config) {});
                                    } else {
                                        if (!value.offlineOnly) {
                                            //if (!value.replicateTo || value.replicateFrom) {
                                            $http.get(couchdb + 'db-' + value.database + '/_design/views/_view/data?include_docs=true').
                                            success(function (data, status, headers, config) {

                                                angular.forEach(data.rows, function (row) {
                                                    createDoc(row.doc, value);
                                                });

                                            }).
                                            error(function (data, status, headers, config) {

                                            });
                                        }
                                    }
                                    if ($rootScope.widgets.indberetninger && $rootScope.widgets.indberetninger.layers.indexOf(value.id) !== -1) {
                                        $http.get(couchdb + 'db-' + value.database + '/_design/straks').
                                        success(function (data, status, headers, config) {
                                            createDoc(data, value);
                                        }).
                                        error(function (data, status, headers, config) {});
                                    }
                                }
                            } else if (value.type === 'straks' && value.straks) {
                                if ($rootScope.straks.hasOwnProperty(value.database) && $rootScope.straks[value.database].hasOwnProperty(value.straks)) {
                                    value.leaflet = L.geoJson($rootScope.straks[value.database][value.straks].geojson, jsonTransformed);
                                } else {
                                    value.leaflet = L.geoJson(null, jsonTransformed);
                                }
                                deferred.resolve(value);
                            } else if (value.type === 'geojson') {
                                configurationservice.getAttachment(value.id + '.geojson').then(function (data) {
                                    var geoJsonLayer = L.geoJson(data, jsonTransformed);

                                    if (value.markercluster) {
                                        value.leaflet = new L.MarkerClusterGroup();
                                        value.leaflet.addLayer(geoJsonLayer);
                                    } else {
                                        value.leaflet = geoJsonLayer;
                                    }

                                    deferred.resolve(value);
                                }, function (data) {
                                    deferred.reject(data);
                                });
                            }
                        } else if (value.type === 'mbtiles' && value.mbtile && value.bounds) {
                            if (typeof (value.minZoom) !== 'undefined') {
                                jsonTransformed.minZoom = value.minZoom;
                            }
                            if (typeof (value.maxZoom) !== 'undefined') {
                                jsonTransformed.maxZoom = value.maxZoom;
                            }
                            if (cordova) {
                                var directory;
                                if (cordova.platformId === 'android') {
                                    directory = cordova.file.applicationStorageDirectory + 'databases/';
                                } else if (cordova.platformId === 'ios') {
                                    directory = cordova.file.documentsDirectory || "";
                                }
                                var fileName = value.mbtile + '.mbtiles';
                                var filePath = directory + fileName;
                                resolveLocalFileSystemURL(filePath).then(function (res) {
                                    value.downloaded = true;
                                    value.db = $cordovaSQLite.openDB(fileName);
                                    jsonTransformed.tms = true;
                                    value.leaflet = new L.TileLayer.Functional(function (view) {
                                        var deferred = $q.defer();
                                        var id = view.zoom + "-" + view.tile.column + "-" + view.tile.row;
                                        var query = "SELECT tile_data FROM tiles WHERE zoom_level=" + view.zoom + " AND tile_column=" + view.tile.column + " AND tile_row=" + view.tile.row;
                                        $cordovaSQLite.execute(value.db, query, []).then(function (res) {
                                            console.log("success query");
                                            if (res && res.rows && res.rows.length === 1) {
                                                deferred.resolve('data:image/jpeg;base64,' + res.rows.item(0).tile_data);
                                            } else {
                                                deferred.reject(res);
                                            }

                                        }, function (err) {
                                            console.log("error query");
                                            deferred.reject(err);
                                        });
                                        return deferred.promise;
                                    }, jsonTransformed);
                                    deferred.resolve(value);
                                }, function (err) {
                                    value.leaflet = L.tileLayer(tilestream + value.mbtile + '/{z}/{x}/{y}.' + value.format, jsonTransformed);
                                    deferred.resolve(value);
                                });
                            } else {
                                value.leaflet = L.tileLayer(tilestream + value.mbtile + '/{z}/{x}/{y}.' + value.format, jsonTransformed);
                                deferred.resolve(value);
                            }
                        }
                    });
                    return deferred.promise;
                };
                var addLayer = function (layer) {
                    if (layer.selected) {
                        if ($scope.map.hasLayer(layer.leaflet)) {
                            $scope.map.removeLayer(layer.leaflet);
                        }
                        $scope.map.addLayer(layer.leaflet);
                        if (layer.leaflet.setZIndex) {
                            layer.leaflet.setZIndex(layer.index);
                        }
                    }
                };

                var createOverlays = function () {
                    var i = 0;
                    for (; i < $scope.configuration.map.overlays.length; i++) {
                        var overlay = $scope.configuration.map.overlays[i];
                        overlay.index = i + 1;
                        $rootScope.overlays[overlay.id] = overlay;
                        createLayer(overlay).then(addLayer);
                    }
                    $scope.map.addLayer($scope.crosshairLayer);
                    if ($scope.crosshairLayer.setZIndex) {
                        $scope.crosshairLayer.setZIndex(i + 1);
                    }

                };

                $scope.overlayChange = function (overlay) {
                    if ($scope.map.hasLayer(overlay.leaflet)) {
                        $scope.map.removeLayer(overlay.leaflet);
                    }
                    addLayer(overlay);
                };

                $scope.baselayerChange = function (layer) {
                    if (layer !== $scope.baselayer) {
                        createLayer(layer).then(function (layer) {
                            var bounds = $scope.map.getBounds();
                            createMap(layer);
                            if ($scope.map.hasLayer($scope.baselayer.leaflet)) {
                                $scope.map.removeLayer($scope.baselayer.leaflet);
                            }
                            var redoOverlays = layer.epsg !== $scope.baselayer.epsg;
                            //var hasUserMarker = $scope.map.hasLayer(userMarker);
                            if (redoOverlays) {
                                $scope.map.fitBounds(bounds);
                                //removeOverlays();
                            }
                            $scope.map.addLayer(layer.leaflet);
                            if (layer.leaflet.setZIndex) {
                                layer.leaflet.setZIndex(0);
                            }
                            $scope.baselayer = layer;
                            /*if (redoOverlays) {
                                createOverlays();
                                if (hasUserMarker) {
                                    $scope.map.addLayer(userMarker);
                                }
                            }*/
                        });
                    }
                };
                for (i = 0; i < $scope.configuration.map.baselayers.length; i++) {
                    var baselayer = $scope.configuration.map.baselayers[i];
                    if (baselayer.selected) {
                        $scope.baselayer = baselayer;
                        $scope.selectedBaselayer = i;
                        break;
                    }
                }
                if ($scope.baselayer) {
                    createMap($scope.baselayer);
                    createLayer($scope.baselayer).then(function (layer) {

                        $scope.map.addLayer(layer.leaflet);
                        if (layer.leaflet.setZIndex) {
                            layer.leaflet.setZIndex(0);
                        }
                        $scope.map.fitBounds(layer.bounds);
                        createOverlays();
                        reset();
                    });
                }
            }
        };
        $scope.mapCreated = function (mapvar) {
            $scope.map = mapvar;
            $scope.map._locateOptions = {};
            if ($rootScope.configuration.hasOwnProperty($stateParams.configuration)) {
                init($rootScope.configuration[$stateParams.configuration]);
            }
            $rootScope.$on('login', function () {
                init();
            });
            $rootScope.$on('configurationUpdate', function (e) {
                $ionicLoading.hide();
                init($rootScope.configuration[$stateParams.configuration]);
            });
            configurationservice.init($stateParams.configuration);

            //region Tracking
            $scope.tracking = function () {
                $scope.track = !$scope.track;
                if (!$scope.track) {
                    $scope.map.stopLocate();
                } else {
                    $scope.map._locateOptions.watch = true;
                    setView = true;
                    if ($rootScope.widgets.opgaver) {
                        if ($scope.opgave) {
                            $scope.map.locate($scope.map._locateOptions);
                        } else {
                            var alertPopup = $ionicPopup.alert({
                                title: 'Advarsel',
                                template: 'Du skal først vælge en opgave!'
                            });
                        }
                    } else {
                        $scope.map.locate($scope.map._locateOptions);
                    }
                }
            };
            $scope.map.off('locationfound', locationfound);
            $scope.map.on('locationfound', locationfound);
            $scope.map.off('locationerror', locationerror);
            $scope.map.on('locationerror', locationerror);
            //endregion


        };

        //var opgaverListFields = [];

    });
})(this, this.angular, this.console, this.L, this.cordova, this.PouchDB, this.tv4, this.FileReader, this.turf);