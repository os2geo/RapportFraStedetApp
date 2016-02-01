/*jshint -W054 */
function popupEdit(overlay, id) {
    var ele = document.getElementById('kort');
    var scope = angular.element(ele).scope();
    scope.editItem(overlay, id);
}

function popupDelete(overlay, id) {
    var ele = document.getElementById('kort');
    var scope = angular.element(ele).scope();
    scope.showDelete(overlay, id);
}
function popupImage(database, id, field) {
    if (window.cordova) {
        cordova.InAppBrowser.open('https://geo.os2geo.dk/couchdb/db-' + database + '/' + id + '/' + field.substring(17), '_blank', 'location=yes');
    } else {
        window.open('https://geo.os2geo.dk/couchdb/db-' + database + '/' + id + '/' + field.substring(17), '_blank');
    }
}
function popupLink(url) {
    if (window.cordova) {
        cordova.InAppBrowser.open(url, '_blank', 'location=yes');
    } else {
        window.open(url, '_blank');
    }
}
(function (window, angular, console, URL, Blob, L, turf, tv4, uuid) {
    'use strict';

    angular.module('starter.controllers').controller('mapCtrl', function ($ionicActionSheet, $ionicHistory, $ionicViewSwitcher, $ionicSideMenuDelegate, $stateParams, $state, $scope, $rootScope, socket, databases, $q, $timeout, $ionicLoading, $ionicModal, $ionicPopover, $ionicPopup, tilestream, $http) {

        var alertPopup;
        var queue = databases.get('queue');
        $scope.status = {};
        $scope.$on('$ionicView.loaded', function (viewInfo, state) {
            $ionicSideMenuDelegate.canDragContent(false);
            viewInfo.stopPropagation();
            create();
        });
        var _modals = {}; //listevisning af overlays
        $scope.dbstatus = false;

        $scope.$on('$ionicView.enter', function (viewInfo, state) {
            viewInfo.stopPropagation();
            if (_map) {
                update();
            } else {
                //create();
            }

        });
        $scope.stateParams = $stateParams;
        $rootScope.overlays = {};
        $scope.listSchemas = {}; //kolonneoverskrifter
        $scope.listFilters = {}; //filter i lister
        $scope.formSchemas = {}; //formularskema simplificeret ift oneof

        /*$ionicLoading.show({
            template: '<div class="icon ion-loading-c"></div><div>Henter konfiguration, vent venligst...</div>'
        });*/

        /************
         * Menu
         ************/
        $rootScope.widgets = {}; //index til widgets
        $rootScope.showSelectOrganization = true;
        $rootScope.showSelectTheme = true;

        $rootScope.navOrganization = function () {
            $ionicSideMenuDelegate.toggleRight(false);
            $ionicViewSwitcher.nextDirection('back');
            $ionicHistory.nextViewOptions({
                historyRoot: true,
                disableBack: true
            });
            $state.go('menu.organization', {
                organization: $stateParams.organization
            });
        };


        $rootScope.showSearch = function (widget) {
            $ionicSideMenuDelegate.toggleRight();
            $scope.widget = widget;
            widget.active = true;
            if (_modals.hasOwnProperty(widget.id)) {
                _modals[widget.id].show();
            } else {
                $ionicModal.fromTemplateUrl('templates/modal-search.html', {
                    scope: $scope,
                    backdropClickToClose: false
                }).then(function (modal) {

                    _modals[widget.id] = modal;
                    modal.show();
                });
            }
        };
        $scope.close = function (name) {
            if (_modals.hasOwnProperty(name)) {
                _modals[name].hide();
            }
            if ($scope.widget && $scope.widget.active) {
                $scope.widget.active = false;
            }
        };

        $scope.slideNext = function (slider) {
            slider.slideNext();
        }
        var cacheGeometry;

        var tileLayer;
        var offlineProgress = function (data) {
            $scope.go.progress = Math.round(100 * (1 - data.remainingLength / data.queueLength));
            $scope.go.errors += data.errors;
            $scope.$apply();
        };
        var offlineProgressEnd = function (data) {
            $scope.go.stop = false;
            $scope.go.errors += data.errors;
            $scope.$apply();
        };
        $scope.startCache = function () {
            $scope.go.total = 0;
            $scope.go.size = 25000;
            var max = parseInt($scope.go.maxZoom);
            var geojson = cacheGeometry.toGeoJSON();
            for (var i = 0; i <= max; i++) {
                var tiles = $scope.baselayer.leaflet.getTiles(geojson.geometry, {
                    min_zoom: i,
                    max_zoom: i
                });
                offlineZooms[i] = tiles;
                $scope.go.total += tiles.length;
            }
            if (!alertPopup) {
                alertPopup = $ionicPopup.show({
                    title: 'Download kort',
                    scope: $scope,
                    templateUrl: 'templates/alert-offline.html',
                    buttons: [
                        { text: 'Fortryd' },
                        {
                            text: '<b>OK</b>',
                            type: 'button-positive',
                            onTap: function (e) {
                                return true;
                            }
                        }
                    ]
                }).then(function (res) {
                    alertPopup = null;
                    if (res) {
                        $scope.go.stop = true;
                        $scope.baselayer.leaflet.on('seedprogress', offlineProgress);
                        $scope.baselayer.leaflet.on('seedend', offlineProgressEnd);
                        $scope.baselayer.leaflet.seedTiles(offlineZooms);
                    }
                })
            }
        };
        $scope.stopCache = function () {

            $scope.go.stop = false;
            $scope.baselayer.leaflet.off('seedprogress', offlineProgress);
            $scope.baselayer.leaflet.off('seedend', offlineProgressEnd);
            $scope.baselayer.leaflet._stop();
        };
        $rootScope.showOffline = function (widget) {
            $ionicSideMenuDelegate.toggleRight();
            $scope.widget = widget;
            widget.active = true;
            if (_modals.hasOwnProperty(widget.id)) {
                _modals[widget.id].show();
                _mapOffline.invalidateSize();
            } else {
                $ionicModal.fromTemplateUrl('templates/modal-offline.html', {
                    scope: $scope,
                    backdropClickToClose: false
                }).then(function (modal) {
                    _modals[widget.id] = modal;
                    modal.show();
                    if (!_mapOffline) {
                        _mapOffline = new L.Map('mapOffline', {
                            zoomControl: true,
                            attributionControl: false,
                            editable: true,
                            zoomDisplayControl: true
                        });

                        L.EditControl = L.Control.extend({

                            options: {
                                position: 'topleft',
                                callback: null,
                                kind: '',
                                html: ''
                            },

                            onAdd: function (map) {
                                var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
                                    link = L.DomUtil.create('a', '', container);

                                link.href = '#';
                                link.title = this.options.kind;
                                link.innerHTML = this.options.html;
                                L.DomEvent.on(link, 'click', L.DomEvent.stop)
                                    .on(link, 'click', function () {
                                        window.LAYER = this.options.callback.call(map.editTools);
                                    }, this);

                                return container;
                            }

                        });


                        L.NewRectangleControl = L.EditControl.extend({

                            options: {
                                position: 'topleft',
                                callback: function () {
                                    _mapOffline.removeLayer(cacheGeometry);
                                    showTileArea();
                                },
                                kind: 'Reset',
                                html: 'R'
                            }

                        });

                        L.NewTileControl = L.EditControl.extend({

                            options: {
                                position: 'topleft',
                                callback: function () {
                                    //this.map.editTools.startRectangle();
                                    if (tileLayer) {
                                        _mapOffline.removeLayer(tileLayer);
                                        tileLayer = null;
                                    } else {
                                        showTiles();
                                    }

                                },
                                kind: 'Vis tiles',
                                html: 'T'
                            }

                        });

                        _mapOffline.addControl(new L.NewRectangleControl());
                        _mapOffline.addControl(new L.NewTileControl());


                        if ($scope.baselayer.maxZoom) {
                            _mapOffline.options.maxZoom = $scope.baselayer.maxZoom;
                        } else {
                            _mapOffline.options.maxZoom = 18;
                        }
                        if ($scope.baselayer.minZoom) {
                            _mapOffline.options.minZoom = $scope.baselayer.minZoom;

                        } else {
                            _mapOffline.options.minZoom = 0;
                        }
                        if ($scope.baselayer.epsg === "25832") {
                            _mapOffline.options.crs = epsg25832
                        } else {
                            _mapOffline.options.crs = L.CRS.EPSG3857;
                        }
                        $scope.go = {
                            minZoom: _mapOffline.options.minZoom,
                            maxZoom: 0
                        };
                        createLayer($scope.baselayer).then(function (leaflet) {
                            _mapOfflineBaselayer = leaflet;
                            _mapOffline.addLayer(leaflet);
                        });
                        _mapOffline.fitBounds($scope.baselayer.bounds);
                        showTileArea();
                        //var polygon = new L.Draw.PolygonTouch(_mapOffline);
                        //polygon.enable();
                        _mapOffline.on('draw:created', function (e) {
                            cacheGeometry = (e.layer.toGeoJSON()).geometry;
                            //var layer = L.geoJson(straks[overlay.straks].geojson, overlay.leaflet.options);
                            _mapOffline.addLayer(e.layer);
                            //polygon.disable();
                        });
                        //_mapOffline.invalidateSize();
                    }
                });
            }
        }
        var offlineZooms = {};
        $scope.offlineNext = function (slider) {
            slider.slideNext();
            offlineZooms = {};
            $scope.go.total = 0;
            $scope.go.size = 25000;
            var max = parseInt($scope.go.maxZoom);
            var geojson = cacheGeometry.toGeoJSON();
            for (var i = 0; i <= max; i++) {
                var tiles = $scope.baselayer.leaflet.getTiles(geojson.geometry, {
                    min_zoom: i,
                    max_zoom: i
                });
                offlineZooms[i] = tiles;
                $scope.go.total += tiles.length;
            }
        };

        var showTileArea = function () {
            var cc = _mapOffline.project(_mapOffline.getCenter());
            var dd = _mapOffline.getSize().divideBy(4);
            var a = cc.subtract(dd);
            var b = cc.add(dd);
            var c = L.point(a.x, b.y);
            var d = L.point(b.x, a.y);
            var sw = _mapOffline.unproject(a);
            var nw = _mapOffline.unproject(c);
            var ne = _mapOffline.unproject(b);
            var se = _mapOffline.unproject(d);
            cacheGeometry = L.polygon([sw, nw, ne, se, sw], { color: '#F00' }).addTo(_mapOffline);
            cacheGeometry.enableEdit();
        };
        var showTiles = function () {
            var geojson = cacheGeometry.toGeoJSON();
            var c = $scope.baselayer.leaflet.geojson(geojson.geometry, {
                min_zoom: 0,
                max_zoom: parseInt($scope.go.maxZoom)
            });
            tileLayer = L.geoJson(c, {
                onEachFeature: function (feature, layer) {
                    layer.bindPopup("<p>x: " + feature.properties.x + "</p><p>y: " + feature.properties.y + "</p><p>z: " + feature.properties.z + "</p>");
                }
            });
            _mapOffline.addLayer(tileLayer);
        };
        $rootScope.showLayers = function (widget) {
            $ionicSideMenuDelegate.toggleRight();
            $scope.widget = widget;
            widget.active = true;
            if (_modals.hasOwnProperty(widget.id)) {
                _modals[widget.id].show();
            } else {

                $ionicModal.fromTemplateUrl('templates/modal-layers.html', {
                    scope: $scope,
                    backdropClickToClose: false
                }).then(function (modal) {


                    _modals[widget.id] = modal;
                    modal.show();
                });
            }
        };
        $scope.listOpen = false;
        $rootScope.showList = function (layer) {
            $ionicSideMenuDelegate.toggleRight();
            $scope.listOpen = true;
            $scope.widget = $rootScope.overlays[layer];
            $scope.widget.active = true;

            if (_modals.hasOwnProperty(layer)) {
                _modals[layer].show();
            } else {
                var scope = $scope.$new();
                scope.data = $scope.index['db-' + $scope.widget.database][layer];
                scope.data.id = layer;
                scope.data.searchInput = '';
                scope.data.searchChange = function () {
                    scope.data.searchInput = this.searchInput;
                    filterItems(scope.data);
                };
                scope.data.canLoadMoreList = true;
                scope.data.loadMoreList = function () {
                    console.log('loadmorelist');
                    scope.data.pagination += 10;
                    if (scope.data.rows.length > scope.data.pagination) {
                        var items = scope.data.rows.slice(scope.data.pagination, scope.data.pagination + 10);
                        /*for (var i = 0; i < items.length; i++) {
                            scope.data.pag_rows.push(items[i]);
                        }*/
                        scope.data.pag_rows = scope.data.pag_rows.concat(items);
                    }
                    if (scope.data.rows.length > scope.data.pagination) {
                        scope.data.canLoadMoreList = true;
                    } else {
                        scope.data.canLoadMoreList = false;
                    }
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                };
                scope.data.selectedSortering = 'distance';
                scope.data.selectSort = function (item) {
                    scope.data.selectedSortering = item;
                    filterItems(scope.data);
                };
                scope.data.ascending = true;
                scope.data.sort = function () {
                    scope.data.ascending = !scope.data.ascending;
                    filterItems(scope.data);
                };
                scope.data.filterChange = function (field) {
                    filterItems(scope.data);
                };

                filterItems(scope.data);
                $ionicPopover.fromTemplateUrl('templates/popover-list.html', {
                    scope: scope,
                }).then(function (popover) {
                    scope.popover = popover;
                });
                $ionicModal.fromTemplateUrl('templates/modal-list.html', {
                    scope: scope,
                    backdropClickToClose: false
                }).then(function (modal) {
                    _modals[layer] = modal;
                    /*scope.close = function () {
                        $scope.listLayer.active = false;
                        modal.hide();
                        //$scope.popover.remove()
                    };*/
                    modal.show();
                });
            }
        };
        $scope.openFileDialog = function (id) {
            if (window.cordova) {
                //ionic-angular line 198
                //element.remove();
                var hideSheet = $ionicActionSheet.show({
                    titleText: 'Vælg foto',
                    buttons: [
                        {
                            text: 'Kamera'
                        },
                        {
                            text: 'Album'
                        },
                    ],

                    cancelText: 'Annuller',
                    cancel: function () {
                        console.log('CANCELLED');
                    },
                    buttonClicked: function (index) {
                        //hideSheet();
                        var options = {
                            quality: 50,
                            destinationType: navigator.camera.DestinationType.DATA_URL,
                            sourceType: navigator.camera.PictureSourceType.CAMERA,
                            correctOrientation: true
                        };
                        if (index === 1) {
                            options.sourceType = navigator.camera.PictureSourceType.PHOTOLIBRARY;

                        }

                        function onSuccess(imageData) {
                            //var data = "data:image/jpeg;base64," + imageData;
                            blobUtil.base64StringToBlob(imageData, 'image/jpeg').then(function (blob) {
                                $scope.doc._attachments[id] = {
                                    'content_type': blob.type,
                                    data: blob
                                };
                                $scope.files[id] = {
                                    src: URL.createObjectURL(blob)
                                };
                                $scope.$apply();

                            }).catch(function (err) {
                                console.log(err);
                            });

                        }
                        function onFail(message) {
                            $ionicPopup.alert({
                                title: 'Fejl',
                                template: message
                            });
                        }
                        navigator.camera.getPicture(onSuccess, onFail, options);
                        return true;
                    }
                });
            } else {
                var file = window.document.getElementById(id);
                angular.element(file).one('change', function (event) {
                    var file = event.target.files[0];
                    $scope.files[id] = {
                        name: file.name
                    };
                    var fileReader = new window.FileReader();
                    fileReader.onload = function (e) {
                        var blob = new Blob([e.target.result], {
                            type: file.type
                        });
                        $scope.doc._attachments[id] = {
                            'content_type': blob.type,
                            data: blob
                        };
                        $scope.files[id].src = URL.createObjectURL(blob);
                        $scope.$apply();
                    };
                    fileReader.readAsArrayBuffer(file);
                });
                ionic.trigger('click', {
                    target: file
                });
            }
        };
        var editFeature;

        $scope.editItem = function (layer, id) {
            if (editFeature && editFeature.editor) {
                editFeature.editor.disable();

            }
            _map.editTools.featuresLayer.clearLayers();
            reset();
            $scope.layer = layer;
            $scope.overlay = $rootScope.overlays[layer];
            var item = $scope.index['db-' + $scope.overlay.database][layer].data[id];
            if (item instanceof L.FeatureGroup) {
                for (var feature in item._layers) {
                    item = item._layers[feature];
                    break;
                }
            }
            editFeature = null;
            $scope.doc = item.feature;
            $scope.fields = [];
            $scope.files = [];
            for (var i = 0; i < $scope.overlay.form.length; i++) {
                var field = $scope.overlay.form[i];
                if (field.id === 'properties') {
                    for (var j = 0; j < field.fields.length; j++) {

                        var field2 = field.fields[j];
                        var key = field2.id;
                        var prop = $scope.formSchemas['db-' + $scope.overlay.database].properties.properties.properties[key];
                        var required = ($scope.formSchemas['db-' + $scope.overlay.database].properties.properties.required && $scope.formSchemas['db-' + $scope.overlay.database].properties.properties.required.indexOf(key) !== -1);
                        $scope.fields.push({
                            field: field2,
                            key: key,
                            prop: prop,
                            title: prop.title || key,
                            required: required
                        });
                        if (prop.format && prop.format === 'date-time') {
                            $scope.doc.properties[key] = new Date($scope.doc.properties[key]);
                        }
                    }
                    break;
                } else if (field.id === '_attachments') {
                    for (var k = 0; k < field.fields.length; k++) {
                        var field3 = field.fields[k];
                        var key2 = field3.id;
                        var prop2 = $scope.formSchemas['db-' + $scope.overlay.database].properties._attachments.properties[key2];
                        var required2 = ($scope.formSchemas['db-' + $scope.overlay.database].properties._attachments.required && $scope.formSchemas['db-' + $scope.overlay.database].properties._attachments.required.indexOf(key2) !== -1);
                        $scope.fields.push({
                            field: field3,
                            key: key2,
                            prop: prop2,
                            title: prop2.title || key2,
                            required: required2
                        });

                        $scope.files[key2] = {};
                        if ($scope.doc._attachments && $scope.doc._attachments.hasOwnProperty(key2)) {
                            if ($scope.doc._attachments[key2].data) {
                                $scope.files[key2].src = $scope.doc._attachments['tn_' + key2].data; //URL.createObjectURL($scope.doc[field.id].data);
                            } else {
                                $scope.files[key2].src = 'https://geo.os2geo.dk/db-' + $scope.overlay.database + '/' + id + '/tn_' + key2;
                            }
                        }

                    }

                }
            }


            if ($scope.overlay.allowEditGeometry) {
                var template = '';
                item.closePopup()
                if (item instanceof L.Circle || item instanceof L.CircleMarker) {
                    editFeature = L.marker(item.getLatLng());
                    editFeature.addTo(_map.editTools.featuresLayer);
                } else {
                    editFeature = item;
                }
                if (editFeature instanceof L.Marker) {
                    template = 'Træk punktet til den nye placering og tryk på næste (pilen nederst til højre)';
                } else {
                    template = 'Rediger geometri og tryk på næste (pilen nederst til højre)';
                }
                editFeature.enableEdit();
                if (!alertPopup) {
                    alertPopup = $ionicPopup.alert({
                        title: 'Ret geometri',
                        template: template
                    }).then(function (res) {
                        alertPopup = null;

                    })
                }

            } else {
                editFeature = item;
                $scope.next();
            }


            //item.enableEdit();
            //item.closePopup();
            
            
            /*if (_modals.hasOwnProperty('modal-item')) {
                _modals['modal-item'].show();
            } else {
                $ionicModal.fromTemplateUrl('templates/modal-item.html', {
                    scope: $scope,
                    backdropClickToClose: false
                }).then(function (modal) {

                    _modals['modal-item'] = modal;
                    modal.show();
                });
            }*/
        };
        $scope.clickEdit = function ($event, layer, id) {
            $event.stopPropagation();
            $scope.close($scope.widget.id);
            $scope.editItem(layer, id);
        };
        $scope.clickDelete = function ($event, layer, id) {
            $event.stopPropagation();
            $scope.showDelete(layer, id);
        };
        $scope.showDelete = function (layer, id) {
            if (!alertPopup) {
                alertPopup = $ionicPopup.confirm({
                    title: 'Slet indberetning',
                    template: 'Er du sikker på at du vil slette indberetningen?',
                    cancelText: 'Fortryd'
                }).then(function (res) {
                    alertPopup = null;
                    if (res) {
                        var overlay = $rootScope.overlays[layer];
                        var queueDoc = {
                            _id: id,
                            db: overlay.database,
                            d: true
                        };
                        var dbname = 'db-' + overlay.database;

                        var idb = databases.get(dbname);
                        idb.delete('data', id).then(function () {
                            return queue.put('data', queueDoc);
                        }).then(function (queueDoc) {
                            onDeleted(dbname, id);
                            filterItems($scope.index[dbname][layer]);
                            socket.emit('queue', queueDoc);
                        }).catch(function (err) {
                            console.log(err);
                        });
                    }
                })
            }
        };
        $scope.showDraw = function () {
            if ($rootScope.widgets.opgaver && !$scope.opgave) {
                if (!alertPopup) {
                    alertPopup = $ionicPopup.alert({
                        title: 'Advarsel',
                        template: 'Du skal først vælge en opgave!'
                    }).then(function () {
                        alertPopup = null;
                    });
                }
            } else if ($rootScope.widgets.indberetninger.layers.length > 1) {
                $scope.widget = $rootScope.widgets.indberetninger;
                if (_modals.hasOwnProperty($scope.widget.id)) {
                    _modals[$scope.widget.id].show();
                } else {
                    $ionicModal.fromTemplateUrl('templates/modal-select-list.html', {
                        scope: $scope,
                        backdropClickToClose: false
                    }).then(function (modal) {
                        _modals[$scope.widget.id] = modal;
                        modal.show();
                    });
                }
            } else {
                $scope.showEdit($rootScope.widgets.indberetninger.layers[0]);
            }
        };
        /*********
         * Edit
         *********/
        var crosshairIcon = L.icon({
            iconUrl: 'img/crosshair.png',
            iconSize: [100, 100], // size of the icon
            iconAnchor: [50, 50], // point of the icon which will correspond to marker's location
        });
        var crosshair;
        //var _crosshairLayer = L.layerGroup();
        var polyline, polygon; //Tegn
        var master = {
            type: 'Feature',
            properties: {},
            geometry: {}
        };
        var reset = function () {
            $scope.doc = angular.copy(master);
            $scope.valid = angular.copy(master);
        };
        var clearValid = function (valid) {
            if (Object.prototype.toString.call(valid) === '[object Object]') {
                for (var key in valid) {
                    if (key === '$error') {
                        delete valid.$error;
                    } else {
                        clearValid(valid[key]);
                    }
                }
            }
        };

        var date2string = function (doc) {
            for (var key in doc) {
                if (Object.prototype.toString.call(doc[key]) === '[object Object]' && !(doc[key] instanceof Blob)) {
                    date2string(doc[key]);
                } else if (Object.prototype.toString.call(doc[key]) === '[object Date]') {
                    doc[key] = doc[key].toJSON();
                }
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
        var initEdit = function () {
            //polyline = new L.Draw.PolylineTouch(_map);
            //polygon = new L.Draw.PolygonTouch(_map);
            //_crosshairLayer.addTo(_map);
            if ($rootScope.widgets.indberetninger.start && !$stateParams.layer && !$stateParams.id) {
                $scope.showDraw();
            }
        };
        $scope.showEdit = function (layer) {
            $scope.layer = layer;
            var overlay = $rootScope.overlays[layer];
            for (var i = 0; i < overlay.form.length; i++) {
                var field = overlay.form[i];
                if (field.id === 'geometry') {
                    $scope.geometries = field.fields;
                    break;
                }
            }
            $scope.close('indberetninger');
            if (_modals.hasOwnProperty('edit')) {
                _modals['edit'].show();
            } else {
                //reset();
                if ($scope.opgave) {
                    $scope.doc.properties.opgave = $scope.opgave;
                }
                
                //$scope.data = $rootScope.data[layer];
                //$scope.validateschema = $rootScope.validateschemas[layer].schema;
                //$scope.overlay = $rootScope.overlays[layer];
                //$scope.schema = $rootScope.schemas[layer];
                

                $ionicModal.fromTemplateUrl('templates/modal-draw.html', {
                    scope: $scope,
                    backdropClickToClose: false
                }).then(function (modal) {
                    _modals['edit'] = modal;
                    modal.show();
                });
            }
        };
        var mapMove = function (e) {
            crosshair.setLatLng(e.target.getCenter());
        };
        /*var mapMoveend = function (e) {
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
        };*/
        

        /*var mapDrawCreated = function (e) {

            _crosshairLayer.addLayer(e.layer);
            $scope.doc.geometry = (e.layer.toGeoJSON()).geometry;
            polygon.disable();
            polyline.disable();

        };*/
        var setView = function () {
            if (_myposition) {
                var zoom = _map.getBoundsZoom(_myposition.bounds);
                _map.setView(_myposition.latlng, zoom);
            }
        };
        $scope.draw = function (type) {
            $scope.fields = [];
            $scope.files = {};
            reset();

            var overlay = $rootScope.overlays[$scope.layer];
            var formSchema = $scope.formSchemas['db-' + overlay.database]
            for (var i = 0; i < overlay.form.length; i++) {
                var field = overlay.form[i];
                if (field.id === '_attachments' || field.id === 'properties') {
                    $scope.doc[field.id] = {};
                    for (var j = 0; j < field.fields.length; j++) {
                        var field2 = field.fields[j];
                        var key = field2.id;
                        var prop = formSchema.properties[field.id].properties[key];
                        var required = (formSchema.properties[field.id].required && formSchema.properties[field.id].required.indexOf(key) !== -1);
                        $scope.fields.push({
                            field: field2,
                            key: key,
                            prop: prop,
                            title: prop.title || key,
                            required: required
                        });
                    }
                }
            }
            for (var key in formSchema.properties.properties.properties) {
                var prop = formSchema.properties.properties.properties[key];
                if (typeof prop.format !== 'undefined' && prop.format === 'date-time') {
                    $scope.doc.properties[key] = new Date();
                } else if (typeof prop.default !== 'undefined') {
                    $scope.doc.properties[key] = prop.default;
                }
            }



            var latlng;
            $scope.geometryValidated = false;
            _map.off('move', mapMove);
            //_map.off('moveend', mapMoveend);
            //_map.off('editable:drawing:end', mapDrawingCommit);
            //_map.off('draw:created', mapDrawCreated);
            _modals['edit'].hide();
            //_crosshairLayer.clearLayers();
            if (editFeature) {
                editFeature.editor.disable();
            }
            editFeature = null;
            _map.editTools.featuresLayer.clearLayers();
            //polyline.disable();
            //polygon.disable();
            switch (type) {
                case 'GPS':
                    latlng = _map.getCenter();
                    crosshair = L.marker(latlng, {
                        icon: crosshairIcon,
                        clickable: false
                    });
                    //crosshair.addTo(_crosshairLayer);
                    crosshair.addTo(_map.editTools.featuresLayer);
                    /*$scope.doc.geometry = {
                        type: 'Point',
                        coordinates: [latlng.lng, latlng.lat]
                    };*/
                    _map.on('move', mapMove);
                    //_map.on('moveend', mapMoveend);
                    $scope.locate();
                    break;
                case 'Point':
                    latlng = _map.getCenter();
                    crosshair = L.marker(latlng, {
                        icon: crosshairIcon,
                        clickable: false
                    });
                    //crosshair.addTo(_crosshairLayer);
                    crosshair.addTo(_map.editTools.featuresLayer);
                    /*$scope.doc.geometry = {
                        type: 'Point',
                        coordinates: [latlng.lng, latlng.lat]
                    };*/
                    _map.on('move', mapMove);
                    //_map.on('moveend', mapMoveend);
                    //$scope.geometryValidated = testgeometry();
                    break;
                case 'LineString':
                    _map.editTools.startPolyline();
                    //polyline.enable();
                    //_map.on('editable:drawing:end', mapDrawingCommit);
                    //_map.on('draw:created', mapDrawCreated);
                    break;
                case 'Polygon':
                    _map.editTools.startPolygon();
                    //polygon.enable();
                    //_map.on('editable:drawing:end', mapDrawingCommit);
                    //_map.on('draw:created', mapDrawCreated);
                    break;
            }
        };
        var inRing = function (pt, ring) {
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
        };
        var inside = function (pt, polygon) {
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
        };
        var testgeometry = function (feature, geometry) {
            var j, k, point;
            switch (geometry.type) {
                case 'Point':
                    if (!inside(geometry.coordinates, feature)) {
                        return false;
                    }
                    break;
                case 'LineString':
                    for (j = 0; j < geometry.coordinates.length; j++) {
                        point = geometry.coordinates[j];
                        if (!inside(point, feature)) {
                            return false;
                        }
                    }
                    break;
                case 'Polygon':
                    for (j = 0; j < geometry.coordinates.length; j++) {
                        var linestring = geometry.coordinates[j];
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
        };
        $scope.next = function () {
            var tilladt, forbudt = [],
                description = "",
                key, l;
            /*if (polygon._enabled) {
                polygon._finishShape();
            }
            if (polyline._enabled) {
                polyline._finishShape();
            }*/
            if (_map.editTools.drawing()) {
                _map.editTools.stopDrawing();
            }
            var geojson = {
                features: [$scope.doc]
            };
            if (editFeature) {
                geojson = {
                    features: [editFeature.toGeoJSON()]
                };
            } else {
                geojson = _map.editTools.featuresLayer.toGeoJSON();
            }
            if (geojson.features.length > 0) {
                var geom = geojson.features[0].geometry;
            
            
                /*if ($rootScope.straks.hasOwnProperty($rootScope.overlays[$scope.layer].database)) {
                  $scope.straks = $rootScope.straks[$rootScope.overlays[$scope.layer].database];
                }*/
                $scope.overlay = $rootScope.overlays[$scope.layer]
                var dbname = 'db-' + $scope.overlay.database;
                if (_straks.hasOwnProperty(dbname)) {
                    for (var key in _straks[dbname]) {
                        var item = _straks[dbname][key];
                        for (l = 0; l < item.geojson.features.length; l += 1) {
                            var feature = item.geojson.features[l];
                            if (testgeometry(feature, geom)) {
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
                if (!alertPopup) {
                    alertPopup = $ionicPopup.alert({
                        title: 'Advarsel',
                        template: description
                    }).then(function () {
                        alertPopup = null;
                    });;
                }
            } else {
                $scope.doc.geometry = geom;
                $scope.showStart = false;

                if (_modals.hasOwnProperty('modal-item')) {
                    _modals['modal-item'].show();
                } else {
                    $ionicModal.fromTemplateUrl('templates/modal-item.html', {
                        scope: $scope,
                        backdropClickToClose: false
                    }).then(function (modal) {

                        _modals['modal-item'] = modal;
                        modal.show();
                    });
                }
            }
        };
        var _blobToBase64Attachment = function (attachment) {
            return new Promise(function (resolve, reject) {
                blobUtil.blobToBase64String(attachment.data).then(function (base64String) {
                    attachment.data = base64String;
                    resolve(attachment);
                }).catch(function (err) {
                    reject(err);
                });
            });
        };


        $scope.submit = function () {
            clearValid($scope.valid);
            var localdoc = angular.copy($scope.doc);
            if (localdoc.hasOwnProperty('distance')) {
                delete localdoc.distance;
            }
            date2string(localdoc);
            if (localdoc.hasOwnProperty('_attachments')) {
                for (var key in localdoc._attachments) {
                    var attachment = localdoc._attachments[key];
                    if (!(attachment.data instanceof Blob)) {
                        delete attachment.data;
                    }
                }
            }
            $scope.errormessage = [];
            tv4.language('da-DK');
            if (tv4.validate(localdoc, _validateschemas['db-' + $scope.overlay.database].schema)) {
                if (!alertPopup) {
                    alertPopup = $ionicPopup.confirm({
                        title: 'Send indberetning',
                        template: 'Er du sikker på at du vil sende indberetningen?',
                        cancelText: 'Fortryd'
                    }).then(function (res) {
                        alertPopup = null;
                        if (res) {
                            _modals['modal-item'].hide();
                            /*$ionicLoading.show({
                                template: '<ion-spinner></ion-spinner><div>Gemmer, vent venligst...</div>'
                            });*/
                            $scope.status['db-' + $scope.overlay.database] = false;
                            //console.log('status false', 'db-' + $scope.overlay.database);
                            updateStatus();
                            var promises = [];

                            if (!$scope.doc.hasOwnProperty('_id')) {
                                $scope.doc._id = uuid.v4();
                            }
                            var queueDoc = {
                                _id: $scope.doc._id,
                                db: $scope.overlay.database,
                                doc: {}
                            };
                            localdoc = {};

                            for (var key in $scope.doc) {
                                if (key === '_attachments') {
                                    localdoc._attachments = {};
                                    for (var key2 in $scope.doc._attachments) {
                                        if ($scope.doc._attachments[key2].hasOwnProperty('data') && $scope.doc._attachments[key2].data instanceof Blob) {
                                            localdoc._attachments[key2] = {
                                                content_type: $scope.doc._attachments[key2].content_type,
                                                data: $scope.doc._attachments[key2].data
                                            };
                                        } else {
                                            localdoc._attachments[key2] = {};
                                            for (var key3 in $scope.doc._attachments[key2]) {
                                                if (key3 !== 'data') {
                                                    localdoc._attachments[key2][key3] = $scope.doc._attachments[key2][key3];
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    localdoc[key] = $scope.doc[key];
                                }
                            }
                            date2string(localdoc);

                            if (navigator.userAgent.indexOf('Chrome') === -1) {

                                for (var key in localdoc) {
                                    if (key === '_attachments') {
                                        queueDoc.doc._attachments = {};
                                        for (var key2 in localdoc._attachments) {
                                            if (localdoc._attachments[key2].hasOwnProperty('data')) {
                                                var attachment = {
                                                    content_type: localdoc._attachments[key2].content_type,
                                                    data: localdoc._attachments[key2].data
                                                };
                                                queueDoc.doc._attachments[key2] = attachment;
                                                promises.push(_blobToBase64Attachment(attachment));
                                            }
                                        }

                                    } else {
                                        queueDoc.doc[key] = localdoc[key];
                                    }
                                }
                            } else {
                                queueDoc.doc = localdoc;
                            }
                            //console.log('queueDoc', queueDoc);
                            Promise.all(promises).then(function () {
                                return queue.put('data', queueDoc);
                            }).then(function (res) {
                                queueDoc.doc = localdoc;
                                updateDatabase('db-' + $scope.overlay.database, $scope.doc, false);
                                filterItems($scope.index['db-' + $scope.overlay.database][$scope.overlay.id]);
                                //console.log('emit queue', queueDoc);
                                socket.emit('queue', queueDoc);
                                //$ionicLoading.hide();

                                reset();
                                //_crosshairLayer.clearLayers();
                                editFeature = null;
                                _map.editTools.featuresLayer.clearLayers();
                                if ($rootScope.widgets.indberetninger.showReceipt) {
                                    if (_modals.hasOwnProperty('modal-receipt')) {
                                        _modals['modal-receipt'].show();
                                    } else {
                                        $ionicModal.fromTemplateUrl('templates/modal-receipt.html', {
                                            scope: $scope,
                                            backdropClickToClose: false
                                        }).then(function (modal) {

                                            _modals['modal-receipt'] = modal;
                                            modal.show();
                                        });
                                    }
                                }
                            }).catch(function (err) {
                                //$ionicLoading.hide();
                                console.log(err);
                                if (!alertPopup) {
                                    alertPopup = $ionicPopup.alert({
                                        title: 'Fejl',
                                        template: err
                                    }).then(function () {
                                        alertPopup = null;
                                    });
                                }
                            });
                        }
                    });
                }
            } else {
                tv4error(tv4.error);
                $scope.error = tv4.error;
                if (!alertPopup) {
                    alertPopup = $ionicPopup.alert({
                        title: 'Fejl',
                        templateUrl: 'templates/error.html',
                        scope: $scope
                    }).then(function () {
                        alertPopup = null;
                    });
                }
            }
        };
        /*********
         * Kortkontrol
         *********/
        $scope.overlayChange = function (overlay) {
            if (_map && _map.hasLayer(overlay.leaflet)) {
                _map.removeLayer(overlay.leaflet);
            }
            addLayer(overlay);
        };
        $scope.baselayerChange = function (layer) {
            if (layer !== $scope.baselayer) {
                layer.maxZoom = layer.maxZoom || 18;
                layer.minZoom = layer.minZoom || 0;
                createLayer(layer).then(function (leaflet) {
                    layer.leaflet = leaflet;
                    var bounds = _map.getBounds();
                    var boundsOffline;
                    if (_mapOffline) {
                        boundsOffline = _mapOffline.getBounds();
                    }
                    createMap(layer);
                    if (_map.hasLayer($scope.baselayer.leaflet)) {
                        _map.removeLayer($scope.baselayer.leaflet);
                    }
                    var redoOverlays = layer.epsg !== $scope.baselayer.epsg;
                    //var hasUserMarker = $scope.map.hasLayer(userMarker);
                    if (redoOverlays) {
                        _map.fitBounds(bounds);
                        //removeOverlays();
                    }
                    _map.addLayer(layer.leaflet);
                    if (layer.leaflet.setZIndex) {
                        layer.leaflet.setZIndex(0);
                    }
                    $scope.baselayer = layer;
                    $scope.selectedBaselayer = $scope.baselayer.id;
                    /*if (redoOverlays) {
                        createOverlays();
                        if (hasUserMarker) {
                            $scope.map.addLayer(userMarker);
                        }
                    }*/
                    _modals.kortkontrol.hide();
                    $rootScope.widgets.kortkontrol.active = false;



                    if (_mapOffline) {

                        if (_mapOfflineBaselayer) {
                            _mapOffline.removeLayer(_mapOfflineBaselayer);
                        }


                        createLayer($scope.baselayer).then(function (leaflet) {
                            _mapOfflineBaselayer = leaflet;
                            _mapOffline.addLayer(leaflet);
                            if (redoOverlays) {
                                _mapOffline.fitBounds(boundsOffline);
                                //removeOverlays();
                            }
                            $scope.go = {
                                minZoom: _mapOffline.options.minZoom,
                                maxZoom: $scope.baselayer.maxNativeZoom || _mapOffline.options.maxZoom
                            };

                        });
                    }
                });
            }
        };
        /*********
         * Søg adresse
         *********/
        //region widget adressesøgning
        var overlaySearch = L.featureGroup();
        var awsConfig = {};
        var pagination = {
            side: 0,
            per_side: 20
        };
        $scope.searchReset = function () {
            $scope.search.input = '';
            $scope.canLoadMore = true;
            pagination.side = 1;
            prevSearch = '';
            invokeSource(0, '', awsResponse);

        };
        $scope.canLoadMore = true;
        $scope.loadMore = function () {
            //console.log('loadmore');
            pagination.side += 1;
            var q = $scope.search.input;

            // we start over searching in vejnavne (index 0) if the current query is not a prefix of
            // the previous one.
            var sourceTypeIdx = q.indexOf(prevSearch) !== 0 ? 0 : prevResultType;
            invokeSource(sourceTypeIdx, q, awsResponse);
        };

        var awsOptions = {
            baseUrl: 'https://dawa.aws.dk',
            adgangsadresserOnly: true
        };
        var caches = [{}, {}, {}, {}];
        var paths = ['/vejnavne/autocomplete', '/adgangsadresser/autocomplete', '/adresser/autocomplete'];

        var prevSearch = "",
            prevResultType = 0,
            constrainedToAdgangsAdresseId;
        var initSearch = function () {
            overlaySearch.addTo(_map)
            if ($rootScope.widgets.hasOwnProperty("adressesøgning") && $rootScope.widgets["adressesøgning"].hasOwnProperty('options')) {
                var awskeyvalue = $rootScope.widgets["adressesøgning"].options.split('=');
                for (var n = 0; n < awskeyvalue.length;) {
                    awsConfig[awskeyvalue[n]] = awskeyvalue[n + 1];
                    n = n + 2;
                }

            }

        };
        var awsResponse = function (data, ny) {
            if (data.length === 0) {
                $scope.canLoadMore = false;
            } else {
                if (ny) {
                    $scope.search.result = data;
                } else {
                    $scope.search.result = $scope.search.result.concat(data);
                }
            }
            $scope.$broadcast('scroll.infiniteScrollComplete');

        };
        var showAdressInMap = function (item) {
            if (item.length > 0) {
                overlaySearch.clearLayers();
                var point = [item[0].adgangspunkt.koordinater[1], item[0].adgangspunkt.koordinater[0]];
                var marker = L.marker(point);

                overlaySearch.addLayer(marker);
                marker.bindPopup($scope.search.input).openPopup();
                _map._locateOptions.setView = false;
                //$timeout(function () {
                _map.setView(point, $scope.baselayer.selectZoom || Infinity, {
                    animate: true
                });
                $scope.close('adressesøgning');
                //}, 500);
            }
        };

        var get = function (path, params, cache, cb) {

            var stringifiedParams = JSON.stringify(params);
            if (cache && cache[stringifiedParams]) {
                return cb(cache[stringifiedParams]);
            }
            $http({
                method: 'GET',
                url: awsOptions.baseUrl + path,
                params: angular.extend(params, awsConfig)
            }).then(function (res) {
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
            var params = {}
            //awsConfig.q = q;
            if (constrainedToAdgangsAdresseId) {
                params.adgangsadresseid = constrainedToAdgangsAdresseId;
                typeIdx = 2;
                // the constraint to search for adresser for a specific adgangsadresse is a one-off, so reset it
                constrainedToAdgangsAdresseId = undefined;
            } else {
                params.q = q;
                params.side = pagination.side;
                params.per_side = pagination.per_side;
            }

            get(paths[typeIdx], params, caches[typeIdx], function (data) {
                if (data.length <= 1 && typeIdx < maxTypeIdx) {
                    invokeSource(typeIdx + 1, q, cb);
                } else {
                    var ny = q !== prevSearch || params.side === 1;
                    prevResultType = typeIdx;
                    prevSearch = q;
                    cb(data, ny);
                }
            });
        };
        $scope.selectAddr = function (item) {

            if (item.vejnavn) {
                pagination.side = 1;
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
                    pagination.side = 1;
                    $scope.canLoadMore = true;
                    // we start over searching in vejnavne (index 0) if the current query is not a prefix of
                    // the previous one.
                    var sourceTypeIdx = q.indexOf(prevSearch) !== 0 ? 0 : prevResultType;

                    invokeSource(sourceTypeIdx, q, awsResponse);
                    //search();
                } else {

                    pagination.side = 1;
                    $scope.canLoadMore = true;
                    // we start over searching in vejnavne (index 0) if the current query is not a prefix of
                    // the previous one.
                    

                    invokeSource(0, '', awsResponse);
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



        

        //endregion

        /**********
         * List
         **********/
        var binarySearch = function (arr, docId) {
            var low = 0,
                high = arr.length,
                mid;
            while (low < high) {
                mid = (low + high) >>> 1; // faster version of Math.floor((low + high) / 2)
                arr[mid]['/_id'] < docId ? low = mid + 1 : high = mid;
            }
            return low;
        };
        var selectItemOnInit = false;
        if ($stateParams.layer && $stateParams.id) {
            selectItemOnInit = true;
        }
        $scope.selectItem = function (layerId, id) {
            if ($rootScope.overlays.hasOwnProperty(layerId)) {
                var overlay = $rootScope.overlays[layerId];
                if ($scope.index.hasOwnProperty('db-' + overlay.database)) {
                    var database = $scope.index['db-' + overlay.database];
                    if (database.hasOwnProperty(layerId)) {
                        if (!overlay.selected) {
                            overlay.selected = true;
                            $scope.overlayChange(overlay);
                        }
                        var data = database[layerId];
                        var layer = data.data[id];

                        var bounds = layer.getBounds();
                        _map.fitBounds(bounds);
                        if (layer instanceof L.FeatureGroup) {
                            for (var id in layer._layers) {
                                layer = layer._layers[id];
                                break;
                            }
                        }
                        layer.openPopup();
                        if ($scope.widget && $scope.widget.id) {
                            $scope.close($scope.widget.id);
                        }
                        return true;
                    }
                }
            }
            return false;
        };

        var filterdoc = function (doc, filters) {
            if (filters && doc) {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    if (doc.hasOwnProperty(filter.path)) {
                        var value = doc[filter.path];
                        for (var key in filter.checked) {
                            if (!filter.checked[key] && value === key) {
                                return false
                            }
                        }
                    }
                }
            }
            return true;
        };
        var filterSearch = function (doc, searchInput) {
            if (typeof searchInput === 'undefined' || searchInput === '') {
                return true;
            } else {
                for (var key in doc) {
                    if (typeof (doc[key]) === 'string' && doc[key].indexOf(searchInput) !== -1) {
                        return true;
                    }
                }
            }
            return false;
        };
        var distance = function (doc, position) {
            if (doc.hasOwnProperty('/geometry/coordinates') && position) {
                var point = turf.point([position.longitude, position.latitude]);
                var coordinates = doc['/geometry/coordinates'];
                var nearest;
                switch (doc['/geometry/type']) {
                    case 'Point':
                        nearest = turf.point(coordinates);
                        break;
                    case 'MultiPoint':
                        nearest = turf.point(coordinates[0]);
                        break;
                    case 'LineString':
                        //nearest = turf.pointOnLine(opgave, point);
                        nearest = turf.point(coordinates[0]);
                        break;
                    case 'MultiLineString':
                        nearest = turf.point(coordinates[0][0]);
                        break;
                    case 'Polygon':
                        nearest = turf.point(coordinates[0][0]);
                        break;
                    case 'MultiPolygon':
                        nearest = turf.point(coordinates[0][0]);
                        break;
                }
                doc.distance = turf.distance(point, nearest);
            }
        };
        var filterItems = function (scope) {
            if ($scope.listOpen) {
                /*
                if (scope.listWorker) {
                    scope.listWorker.terminate();
                }
                scope.listWorker = new Worker('js/list-worker.js');
                scope.listWorker.addEventListener('message', function (e) {
                    $timeout(function () {
                        scope.rows = e.data.rows;
                        scope.pag_rows = scope.rows.slice(0, 10);
                        scope.pagination = 0;
                    }, 0);
                });
                scope.listWorker.postMessage({
                    filters: $scope.listFilters[scope.id],
                    searchInput: scope.searchInput,
                    position: _myposition ? { longitude: _myposition.longitude, latitude: _myposition.latitude } : null,
                    list: scope.list,
                    ascending: scope.ascending,
                    selectedSortering: scope.selectedSortering
                });
                */
                var filters = $scope.listFilters[scope.id];

                scope.rows = [];
                var position = _myposition ? { longitude: _myposition.longitude, latitude: _myposition.latitude } : null;
                for (var n = 0; n < scope.list.length; n++) {
                    var doc = scope.list[n];
                    distance(doc, position);
                    if (filterdoc(doc, filters) && filterSearch(doc, scope.searchInput)) {
                        scope.rows.push(doc);
                    }
                }
                var sort = scope.selectedSortering;
                if (sort && sort.indexOf('_attachments') !== -1) {
                    sort += '/data';
                }
                scope.rows.sort(function (a, b) {
                    if (sort) {
                        var aa = a[sort] || '';
                        var bb = b[sort] || '';
                        if (aa < bb) {
                            if (scope.ascending) {
                                return -1
                            } else {
                                return 1
                            }
                        } else if (aa > bb) {
                            if (scope.ascending) {
                                return 1
                            } else {
                                return -1
                            }
                        }
                    }
                    return 0
                });
                $timeout(function () {
                    scope.pag_rows = scope.rows.slice(0, 10);
                    scope.pagination = 0;

                }, 0)
            }
        };
        //region Tracking
        $rootScope.tracking = function () {
            if (!$rootScope.widgets.tracking.checked) {
                if (window.cordova) {
                    //backgroundGeoLocation.stop();
                }
            } else {


                if ($rootScope.widgets.opgaver) {
                    if ($scope.opgave) {
                        _map._locateOptions.setView = true;
                        setView();
                        if (window.cordova) {
                            //backgroundGeoLocation.start();
                        }
                    } else {
                        //revert
                        $rootScope.widgets.tracking.checked = !$rootScope.widgets.tracking.checked;
                        if (!alertPopup) {
                            alertPopup = $ionicPopup.alert({
                                title: 'Advarsel',
                                template: 'Du skal først vælge en opgave!'
                            }).then(function () {
                                alertPopup = null;
                            });
                        }
                    }
                } else {
                    _map._locateOptions.setView = true;
                    setView();
                    if (window.cordova) {
                        //backgroundGeoLocation.start();
                    }
                }
            }
        };
       
        //endregion
        /********
         * Position
         ********/

        var positionOptions = {};
        var userMarker;
        var lastpos;
        var dragstart = function () {
            _map._locateOptions.setView = false;
        };
        var isLocationEnabledSuccess = function (enabled) {
            if (!enabled) {
                if (!alertPopup) {
                    alertPopup = $ionicPopup.confirm({
                        title: 'GPS er ikke aktiveret',
                        template: 'Vil du se indstillingerne for at aktivere GPS?',
                        cancelText: 'Fortryd'
                    }).then(function (res) {
                        alertPopup = null;
                        if (res) {
                            if (cordova.plugins.diagnostic.switchToLocationSettings) {
                                cordova.plugins.diagnostic.switchToLocationSettings();
                            } else {
                                cordova.plugins.diagnostic.switchToSettings(function () {
                                    console.log("Successfully switched to Settings app");
                                }, function (error) {
                                    console.error("The following error occurred: " + error);
                                });
                            }
                        }
                    })
                }
            }
        }
        var isLocationEnabledError = function (error) {
            console.log(error);
        }
        var initPosition = function () {
            if ($rootScope.widgets.position) {
                _map.on('dragstart', dragstart);
                _map.on('locationfound', locationfound);
                _map.on('locationerror', locationerror);
                _map._locateOptions.enableHighAccuracy = true;
                _map._locateOptions.watch = true;
                if ($rootScope.widgets.position.pulsing) {
                    positionOptions.pulsing = true;
                }
                if ($rootScope.widgets.position.smallIcon) {
                    positionOptions.smallIcon = true;
                }
                userMarker = L.userMarker([0, 0], positionOptions);

                if ($rootScope.widgets.position.start && !$stateParams.layer && !$stateParams.id) {
                    _map._locateOptions.setView = true;
                }
                _map.locate(_map._locateOptions);
            }
        };
        $scope.locate = function () {
            _map._locateOptions.setView = true;
            setView();
            if (window.cordova) {
                cordova.plugins.diagnostic.isLocationEnabled(isLocationEnabledSuccess, isLocationEnabledError);
            };
        };
        $rootScope.showPosition = function () {
            if ($rootScope.widgets.position.show) {
                _map._locateOptions.setView = true;
                if (!_map.hasLayer(userMarker)) {
                    _map.addLayer(userMarker);
                }
                setView();
            } else {
                _map._locateOptions.setView = false;
                if (_map.hasLayer(userMarker)) {
                    _map.removeLayer(userMarker);
                }
            }
        };
        var locationerror = function (err) {
            var message = '';
            switch (err.code) {
                case 1: message = 'Du har ikke retitghed til at bruge GPS'
                    break;
                case 2: message = 'Der er sket en fejl ved brug af GPS';
                    break;
                case 3: message = 'der opstod en timeout ved brug af GPS'
                    break;
            }
            console.log(message);
            /*if (!alertPopup) {
                alertPopup = $ionicPopup.alert({
                    title: 'GPS fejl',
                    template: message
                }).then(function () {
                    alertPopup = null;
                });
            }*/
        }
        var saveTrack = function (pos) {
            if (($rootScope.widgets.tracking.interval && lastpos && (pos.timestamp - lastpos.timestamp > $rootScope.widgets.tracking.interval)) || !$rootScope.widgets.tracking.interval || !lastpos) {
                lastpos = pos;
                var doc = {
                    _id: uuid.v4(),
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
                var layer = $rootScope.overlays[$rootScope.widgets.tracking.layer];
                var queueDoc = {
                    _id: doc._id,
                    db: layer.database,
                    doc: doc
                };
                updateDatabase('db-' + layer.database, doc, false);
                queue.add('data', queueDoc).then(function (doc) {
                    socket.emit('queue', doc);
                }).catch(function (err) {
                    console.log(err);
                });

            }
        };
        var locationfound = function (pos) {
            userMarker.setLatLng(pos.latlng);
            if ($rootScope.widgets.position && $rootScope.widgets.position.accuracy) {
                userMarker.setAccuracy(pos.accuracy);
            }
            if ($rootScope.widgets.position && $rootScope.widgets.position.show && !_map.hasLayer(userMarker)) {
                userMarker.addTo(_map);
            }
            _myposition = pos;
            if ($rootScope.widgets.tracking && $rootScope.widgets.tracking.checked) {// && !window.cordova) {
                saveTrack(pos);
            }
        };
        /***********
         * Offline map
         ***********/
        var _mapOffline;
        var _mapOfflineBaselayer;
        /***********
         * Map
         ***********/
        var gpslocationfound = function (e, pos) {
            if (gpslocationfoundListener) {
                gpslocationfoundListener();
            }
            $scope.next();
        };
        $scope.index = {};
        var _map,
            //$scope.baselayer, //valgt baselayer

            _configuration,
            _initialized = false,
            _myposition = null,
            _straks = {},
            _validateschemas = {}; //valideringsskema


        var enumFilter = function (values, schema) {
            var items = [];
            if (values && schema) {

                angular.forEach(values, function (input) {
                    var path = input.split('/');
                    var item = schema;
                    var key, i, m;
                    for (m = 1; m < path.length; m++) {
                        key = path[m];
                        if (item.properties && item.properties.hasOwnProperty(key)) {
                            item = item.properties[key];

                        }
                    }
                    if (item.enum) {
                        item.key = key;
                        item.path = input;
                        if (!item.checked) {
                            item.checked = {};
                            for (i = 0; i < item.enum.length; i++) {
                                item.checked[item.enum[i]] = true;
                            }
                        }
                        items.push(item);
                    }
                });
            }
            return items;
        };
        var makeFormSchema = function (node, schema, parent) {
            var key,
                localnode,
                i, j;
            for (key in node) {
                localnode = node[key];
                if (key === 'oneOf') {
                    schema.properties = schema.properties || {};
                    for (i = 0; i < localnode.length; i++) {
                        makeFormSchema(localnode[i].properties, schema.properties, schema);
                        if (localnode[i].required) {
                            parent.properties.required = parent.properties.required || [];
                            for (j = 0; j < localnode[i].required.length; j++) {
                                if (parent.properties.required.indexOf(localnode[i].required[j]) === -1)
                                    parent.properties.required.push(localnode[i].required[j]);
                            }
                        }
                    }
                } else if (key === 'enum') {
                    schema.enum = schema.enum || [];
                    for (i = 0; i < localnode.length; i++) {
                        if (schema.enum.indexOf(localnode[i]) === -1)
                            schema.enum.push(localnode[i]);
                    }
                } else if (Object.prototype.toString.call(localnode) === '[object Object]') {
                    schema[key] = schema[key] || {};
                    makeFormSchema(localnode, schema[key], schema);
                } else {
                    schema[key] = localnode;
                }
            }
        };

        var buildSchemaKeys = function (node, parent, doc) {
            for (var key in node) {
                var localnode = node[key];
                if (localnode.oneOf && localnode.oneOf.length > 0) {
                    buildSchemaKeys(localnode.oneOf[0].properties, parent + '/' + key, doc);
                    //buildSchemaKeys(localnode.oneOf[0].properties, parent + key + '/', doc);
                } else if (localnode.properties) {
                    buildSchemaKeys(localnode.properties, parent + '/' + key, doc);
                    //buildSchemaKeys(localnode.properties, parent + key + '/', doc);
                } else {
                    doc[parent + '/' + key] = {
                        title: localnode.title || key,
                        node: localnode
                    };
                    //doc[parent + key] = localnode.title || key;
                }
            }
        };
        var onDeleted = function (dbname, id) {
            if ($scope.index.hasOwnProperty(dbname)) {
                for (var key in $scope.index[dbname]) {
                    var overlay = $scope.index[dbname][key];
                    if (overlay.data.hasOwnProperty(id)) {
                        overlay.leaflet.removeLayer(overlay.data[id])
                        delete overlay.data[id];
                    }
                    var index = binarySearch(overlay.list, id);
                    var doc = overlay.list[index];
                    if (doc && doc['/_id'] === id) {
                        overlay.list.splice(index, 1);
                        //filterItems(overlay);
                    }
                }
            }
        };
        var updateStraks = function (dbname, newDoc) {
            var straks = JSON.parse(newDoc.lib.straks.substring(15));
            _straks[dbname] = straks;
            for (var key in $scope.index[dbname]) {
                var overlay = $scope.index[dbname][key];
                if (overlay.hasOwnProperty('straks') && straks.hasOwnProperty(overlay.straks)) {
                    overlay.leaflet.clearLayers();
                    var layer = L.geoJson(straks[overlay.straks].geojson, overlay.leaflet.options);
                    overlay.leaflet.addLayer(layer);
                }
            }
        };
        var updateDatabase = function (dbname, newDoc, notify) {
            if (newDoc.hasOwnProperty('_attachments')) {
                for (var key in newDoc._attachments) {
                    if (newDoc._attachments[key].hasOwnProperty('data') && newDoc._attachments[key].data instanceof Blob) {
                        newDoc._attachments[key].data = URL.createObjectURL(newDoc._attachments[key].data);
                        if (key.substring(0, 3) !== 'tn_' && !newDoc._attachments.hasOwnProperty('tn_' + key)) {
                            newDoc._attachments['tn_' + key] = newDoc._attachments[key];
                        }
                    } else {
                        newDoc._attachments[key].data = 'https://geo.os2geo.dk/couchdb/' + dbname + '/' + newDoc._id + '/' + key;
                    }
                }
            }
            //leaflet
            var listDoc = {};
            buildDocKeys(newDoc, "", listDoc);
            for (var key in $scope.index[dbname]) {
                var overlay = $scope.index[dbname][key];
                if (!overlay.hasOwnProperty('straks')) {

                    var isPopupOpen = false;;
                    if (overlay.data.hasOwnProperty(newDoc._id)) {
                        var layer2 = overlay.data[newDoc._id];
                        if (layer2 instanceof L.FeatureGroup) {
                            for (var id in layer2._layers) {
                                layer2 = layer2._layers[id];
                                break;
                            }
                        }
                        if (layer2.hasOwnProperty('_popup')) {
                            isPopupOpen = layer2.isPopupOpen();
                        }
                        overlay.leaflet.removeLayer(overlay.data[newDoc._id]);

                    }
                    var layer = L.geoJson(newDoc, overlay.leaflet.options);
                    overlay.leaflet.addLayer(layer);

                    overlay.data[newDoc._id] = layer;
                    var index = binarySearch(overlay.list, newDoc._id);
                    var doc = overlay.list[index];
                    if (doc && doc['/_id'] === listDoc['/_id']) { // update
                        overlay.list[index] = listDoc;
                    } else { // insert
                        overlay.list.splice(index, 0, listDoc);
                    }
                    if (isPopupOpen) {
                        if (layer instanceof L.FeatureGroup) {
                            for (var id in layer._layers) {
                                layer = layer._layers[id];
                                break;
                            }
                        }
                        layer.openPopup();
                    }
                }
                if (notify && window.cordova && $rootScope.user && $rootScope.widgets.hasOwnProperty('indberetninger') && $rootScope.widgets.indberetninger.layers.indexOf(key) !== -1) {
                    cordova.plugins.notification.local.schedule({
                        id: 0,
                        title: "Rapport Fra Stedet",
                        text: "Ny indberetning om " + $rootScope.overlays[key].name,
                        data: { organization: $stateParams.organization, configuration: $stateParams.configuration, layer: key, id: newDoc._id }
                    });

                }

            }

        };
        var onUpdatedOrInserted = function (dbname, newDoc, notify) {

            if (newDoc._id === "_design/schema") {
                var formSchema = {};
                makeFormSchema(newDoc.schema, formSchema);
                $scope.formSchemas[dbname] = formSchema;

                _validateschemas[dbname] = newDoc;
                var schema = {};
                buildSchemaKeys(newDoc.schema.properties, "", schema);
                $scope.listSchemas[dbname] = schema;
                //$rootScope.$emit(dbname + '-schema', formSchema);
                for (var overlay in $scope.index[dbname]) {
                    $scope.listFilters[overlay] = enumFilter($rootScope.overlays[overlay].list, formSchema);

                }

            } else if (newDoc._id === "_design/straks") {
                updateStraks(dbname, newDoc);
            } else {
                updateDatabase(dbname, newDoc, notify);
            }
        };
        var buildDocKeys = function (node, parent, doc) {
            for (var key in node) {
                var localnode = node[key];
                if (Object.prototype.toString.call(localnode) === '[object Object]' && !(localnode instanceof Blob)) {
                    buildDocKeys(localnode, parent + '/' + key, doc);
                    //buildDocKeys(localnode, parent + key + '/', doc);
                } else {
                    doc[parent + '/' + key] = localnode;
                    //doc[parent + key] = localnode;
                }
            }
        };
        var findStatus = function () {
            for (var key in $scope.status) {
                if (!$scope.status[key]) {
                    return false;
                }
            }
            return true;
        };
        var updateStatus = function () {
            $timeout(function () {
                $scope.dbstatus = findStatus();
            }, 0);
        };
        var listen = function (dbname) {
            //console.log('listen ' + dbname);
            var idb = databases.get(dbname);
            socket.on(dbname + '-check', function () {
                //console.log('socket on', dbname + 'check');
                $scope.status[dbname] = false;
                //console.log('status false', dbname);
                updateStatus();
                idb.sequence().then(function (sequence) {

                    socket.emit('database-all', {
                        d: dbname,
                        s: sequence.s
                    });
                });
            });
            socket.on(dbname, function (result) {
                $scope.status[dbname] = false;
                //console.log('socket on', dbname);
                //console.log('status false', dbname);
                updateStatus();
                var promises = [];
                var promise;
                for (var id in result.changes) {
                    var change = result.changes[id];
                    if (change.hasOwnProperty('deleted')) {
                        onDeleted(dbname, change.id);
                        promise = $q.when(idb.delete('data', change.id));
                        promises.push(promise);
                        /*promise.then(function () {
                            onDeleted(dbname, change.id);
                        }).catch(function (err) {
                            console.log(err);
                        });*/
                    } else {
                        if (change.doc.hasOwnProperty('_attachments')) {
                            for (var key in change.doc._attachments) {
                                if (change.doc._attachments[key].hasOwnProperty('data')) {
                                    change.doc._attachments[key].data = new Blob([change.doc._attachments[key].data], {
                                        type: change.doc._attachments[key].content_type
                                    });
                                }
                            }
                        }
                        onUpdatedOrInserted(dbname, change.doc, true);
                        promise = $q.when(idb.put('data', change.doc));
                        promises.push(promise);
                        /*promise.then(function (doc) {
                            onUpdatedOrInserted(dbname, doc);
         
                        }).catch(function (err) {
                            console.log(err);
                        });*/
                    }
                }
                $q.all(promises).then(function () {
                    idb.put('meta', {
                        i: 's',
                        s: result.seq
                    });
                    //console.log('status true', dbname);
                    $scope.status[dbname] = true;
                    updateStatus();
                    for (var key in $scope.index[dbname]) {
                        var overlay = $scope.index[dbname][key];
                        filterItems(overlay);
                    }
                    if (selectItemOnInit) {
                        if ($scope.selectItem($stateParams.layer, $stateParams.id)) {
                            selectItemOnInit = false;
                        }
                    }
                })
                /*if (doc.hasOwnProperty('d')) {
                  $q.when(idb.delete(dbname, doc._id)).then(function () {
                    onDeleted(dbname, doc._id);
                  }).catch(function (err) {
                    console.log(err);
                  });
                } else {
                  if (doc.hasOwnProperty('_attachments')) {
                    for (var key in doc._attachments) {
                      if (doc._attachments[key].hasOwnProperty('data')) {
                        doc._attachments[key].data = new Blob([doc._attachments[key].data], {
                          type: doc._attachments[key].content_type
                        });
                      }
                    }
                  }
                  $q.when(idb.put(dbname, doc)).then(function () {
                    onUpdatedOrInserted(dbname, doc);
                    return idb.put('databases', {
                      _id: dbname,
                      s: doc.s
                    });
                  }).catch(function (err) {
                    console.log(err);
                  });
                }*/
            });

            idb.sequence().then(function (sequence) {
                $q.when(idb.cursor('data')).then(function (result) {
                    for (var i = 0; i < result.length; i++) {
                        var doc = result[i];
                        onUpdatedOrInserted(dbname, doc, false);
                    }
                    socket.emit('database-all', {
                        d: dbname,
                        s: sequence.s
                    });
                });
            });
        };

        var epsg25832 = new L.Proj.CRS('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs', {
            bounds: L.bounds([120000, 5900000], [1000000, 6500000]),
            origin: [120000, 6500000],
            resolution: 1638.4
        });
        var createMap = function (layer) {
            if (!_map) {
                var content = document.querySelector('#kort[nav-view="entering"] #map');

                _map = new L.Map(content, {
                    zoomControl: true,
                    attributionControl: false,
                    editable: true
                });
                _map.attributionControl = L.control.attribution({
                    position: 'bottomleft',
                    prefix: ''
                }).addTo(_map);
                _map.options.attributionControl = true;
                _map._locateOptions = {};
            }
            if (_mapOffline) {
                if (layer.maxZoom) {
                    _mapOffline.options.maxZoom = layer.maxZoom;
                } else {
                    _mapOffline.options.maxZoom = 18;
                }
                if (layer.minZoom) {
                    _mapOffline.options.minZoom = layer.minZoom;
                } else {
                    _mapOffline.options.minZoom = 0;
                }
                if (layer.epsg === "25832") {
                    _mapOffline.options.crs = epsg25832
                } else {
                    _mapOffline.options.crs = L.CRS.EPSG3857;
                }
            }

            if (layer.maxZoom) {
                _map.options.maxZoom = layer.maxZoom;
            } else {
                _map.options.maxZoom = 18;
            }
            if (layer.minZoom) {
                _map.options.minZoom = layer.minZoom;
            } else {
                _map.options.minZoom = 0;
            }
            if (layer.epsg === "25832") {
                _map.options.crs = epsg25832
            } else {
                _map.options.crs = L.CRS.EPSG3857;
            }
        };
        var createLayer = function (value) {
            var deferred = $q.defer();
            $timeout(function () {
                var jsonTransformed = {};
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
                if (typeof (value.maxNativeZoom) !== 'undefined' && value.maxNativeZoom !== null) {
                    jsonTransformed.maxNativeZoom = value.maxNativeZoom;
                }
                if (typeof (value.disableClusteringAtZoom) !== 'undefined' && value.disableClusteringAtZoom !== null) {
                    jsonTransformed.disableClusteringAtZoom = value.disableClusteringAtZoom;
                }
                if (value.attribution) {
                    jsonTransformed.attribution = value.attribution;
                }
                if (value.useCache) {
                    jsonTransformed.useCache = true;
                }
                if (value.type === 'xyz' && value.url && value.url !== "") {
                    var url = value.url.replace('http://', 'https://');
                    url = url.replace('tile.osm.org', 'tile.openstreetmap.org');
                    if (value.ticket) {
                        url = url.replace('ticket={ticket}', 'login=qgisdk&password=qgisdk');
                    }
                    deferred.resolve(L.tileLayer(url, jsonTransformed));

                } else if (value.type === 'wms') {

                    if (value.ticket) {
                        value.wms.login = 'qgisdk';
                        value.wms.password = 'qgisdk';
                    }
                    jsonTransformed = angular.extend(jsonTransformed, value.wms);
                    deferred.resolve(L.tileLayer.wms(value.url, jsonTransformed));
                } else if (value.type === 'geojson' || value.type === 'database' || value.type === 'straks') {
                    deferred.resolve();
                } else if (value.type === 'mbtiles' && value.mbtile && value.bounds) {
                    if (typeof (value.minZoom) !== 'undefined') {
                        jsonTransformed.minZoom = value.minZoom;
                    }
                    if (typeof (value.maxZoom) !== 'undefined') {
                        jsonTransformed.maxZoom = value.maxZoom;
                    }
                    deferred.resolve(L.tileLayer(tilestream + value.mbtile + '/{z}/{x}/{y}.' + value.format, jsonTransformed));

                }
            });
            return deferred.promise;
        };

        var addLayer = function (layer) {
            if (layer.selected) {
                if (_map.hasLayer(layer.leaflet)) {
                    _map.removeLayer(layer.leaflet);
                }
                _map.addLayer(layer.leaflet);
                if (layer.leaflet.setZIndex) {
                    layer.leaflet.setZIndex(layer.index);
                }
            }
        };
        var createOverlays = function (overlay) {
            overlay.list = overlay.list || [];
            for (var i = 0; i < overlay.list.length; i++) {
                var key = overlay.list[i];
                if (key.indexOf('/_attachments') === 0){
                    if(key.length > 17) {
                        var s = key.substring(14, 17);
                        if (s !== 'tn_') {
                            overlay.list[i] = '/_attachments/tn_' + key.substring(14);
                        }
                    } else {
                        overlay.list[i] = '/_attachments/tn_' + key.substring(14);
                    }
                }
            }

            createLayer(overlay).then(function (leaflet) {
                if (leaflet) {
                    overlay.leaflet = leaflet;
                }
                addLayer(overlay);
            });
            /*
        $scope.map.addLayer($scope.crosshairLayer);
        if ($scope.crosshairLayer.setZIndex) {
          $scope.crosshairLayer.setZIndex(i + 1);
        }
        */
        };

        var init = function () {
            if (_map && _configuration && !_initialized) {
                var i;
                for (i = 0; i < _configuration.map.baselayers.length; i++) {
                    var baselayer = _configuration.map.baselayers[i];
                    baselayer.maxZoom = baselayer.maxZoom || 18;
                    baselayer.minZoom = baselayer.minZoom || 0;
                    if (baselayer.selected) {
                        $scope.baselayer = baselayer;
                        $scope.selectedBaselayer = $scope.baselayer.id;
                        createMap(baselayer);
                        createLayer(baselayer).then(function (leaflet) {
                            baselayer.leaflet = leaflet;
                            _map.addLayer(leaflet);
                            if (leaflet.setZIndex) {
                                leaflet.setZIndex(0);
                            }
                            _map.fitBounds(baselayer.bounds);
                            for (var i = 0; i < _configuration.map.overlays.length; i++) {
                                var overlay = _configuration.map.overlays[i];
                                overlay.index = i + 1;
                                createOverlays(overlay);

                            }
                            
                            //reset();
                        });
                        break;
                    }
                }
                for (i = 0; i < _configuration.widgets.length; i++) {
                    var widget = _configuration.widgets[i];
                    $rootScope.widgets[widget.id] = widget;
                    /*if (widget.id === 'indberetninger') {
                        $scope.indberetningswidgets.push(widget);
                    }*/
                }
                initSearch();
                initEdit();
                initPosition();
            }
        };
        var bindPopup = function (s) {
            return s;
        }
        var createOverlay = function (overlay) {
            var dbname;
            //Flere overlays kan have samme database
            if (overlay.type !== 'geojson') {
                dbname = 'db-' + overlay.database;

                if (!$scope.index.hasOwnProperty(dbname)) {
                    $scope.index[dbname] = {};
                }
                if (!$scope.index[dbname].hasOwnProperty(overlay.id)) {
                    $scope.index[dbname][overlay.id] = {
                        list: [],
                        leaflet: null,
                        data: {}
                    };
                }
                if (overlay.type === 'straks') {
                    $scope.index[dbname][overlay.id].straks = overlay.straks;
                }
            }
            var jsonTransformed = {};
            if (overlay.options) {
                jsonTransformed = JSON.parse(overlay.options, function (key, value) {
                    if (value && (typeof value === 'string') && value.indexOf("function") === 0) {
                        var jsFunc = new Function('return ' + value)();
                        return jsFunc;
                    }
                    return value;
                });
            }
            if (typeof (overlay.minZoom) !== 'undefined' && overlay.minZoom !== null) {
                jsonTransformed.minZoom = overlay.minZoom;
            }
            if (typeof (overlay.maxZoom) !== 'undefined' && overlay.maxZoom !== null) {
                jsonTransformed.maxZoom = overlay.maxZoom;
            }
            if (typeof (overlay.disableClusteringAtZoom) !== 'undefined' && overlay.disableClusteringAtZoom !== null) {
                jsonTransformed.disableClusteringAtZoom = overlay.disableClusteringAtZoom;
            }
            if (overlay.attribution) {
                jsonTransformed.attribution = overlay.attribution;
            }
            var theme = {};
            if (overlay.styles) {
                for (var j = 0; j < overlay.styles.length; j++) {
                    var style = overlay.styles[j];
                    theme[style.id] = style;
                }
            }
            if (overlay.style) {
                jsonTransformed.style = JSON.parse(overlay.style, function (key, value) {
                    if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                        var jsFunc = new Function("theme", 'return ' + value)(theme);
                        return jsFunc;
                    }
                    return value;
                });
            }
            if (overlay.onEachFeature) {
                /*jsonTransformed.onEachFeature = JSON.parse(overlay.onEachFeature, function (key, value) {
                    if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                        var jsFunc = new Function('return ' + value)();
                        return jsFunc;
                    }
                    return value;
                });*/
                /*var f = overlay.onEachFeature.replace('layer.bindPopup', 'return bindPopup');
                overlay.popupContent = JSON.parse(f, function (key, value) {
                    if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                        var jsFunc = new Function('bindPopup', 'return ' + value)(bindPopup);
                        return jsFunc;
                    }
                    return value;
                });*/
                jsonTransformed.onEachFeature = function (feature, layer) {
                    layer.bindPopup(function (layer) {
                        var listSchema;
                        var doc;
                        if (overlay.database) {
                            listSchema = $scope.listSchemas['db-' + overlay.database];
                            var pack = $scope.index['db-' + overlay.database][overlay.id];
                            var index = binarySearch(pack.list, layer.feature._id);
                            doc = pack.list[index];
                        } else {
                            listSchema = {};
                            doc = {};
                            for (var key in layer.feature.properties) {
                                listSchema["/properties/" + key] = { title: key };
                                doc["/properties/" + key] = layer.feature.properties[key];
                            }
                        }
                        var content = '<table class="table-popup">';//overlay.popupContent(layer.feature, layer);
                        var row = 'even';
                        for (var i = 0; i < overlay.list.length; i++) {
                            var field = overlay.list[i];

                            if (field.indexOf('/_attachments') === 0) {
                                if (doc.hasOwnProperty(field + '/data')) {
                                    var kn = '/_attachments/'+field.substring(17);
                                    content += '<tr class="' + row + '"><td class="positive bold">' + listSchema[kn].title + '</td>';
                                    content += '<td><a style="cursor:pointer" onclick="popupImage(\'' + overlay.database + '\',\'' + layer.feature._id + '\',\'' + field + '\')"><img src="' + doc[field + '/data'] + '"></a</td></tr>';
                                    if (row === 'even') {
                                        row = 'odd';
                                    } else {
                                        row = 'even';
                                    }
                                }
                            } else {
                                var value = "";
                                if (doc.hasOwnProperty(field) && typeof doc[field] !== 'undefined') {
                                    value = doc[field];
                                }
                                content += '<tr class="' + row + '"><td class="text positive bold">' + listSchema[field].title + '</td>';
                                if (listSchema[field].node && listSchema[field].node.format === 'uri' && value) {
                                    content += '<td><a style="cursor:pointer" onclick="popupLink(\'' + value + '\')">' + value + '</a></td>';
                                } else if (value) {
                                    content += '<td>' + value + '</td>';
                                } else {
                                    content += '<td></td>';
                                }
                                content += '</tr>';
                                if (row === 'even') {
                                    row = 'odd';
                                } else {
                                    row = 'even';
                                }

                            }

                        }
                        content += '</table>';
                        //var popup = layer.getPopup();
                        
                        //var content = popup.getContent();
                        if (_configuration.hasOwnProperty('security') && $rootScope.hasOwnProperty('user') && _configuration.security.indexOf($rootScope.user.name) !== -1) {
                            content += '<div class="button-bar">';
                            if (overlay.allowRemove) {
                                content += '<button class="button button-small icon ion-trash-a" onclick="popupDelete(\'' + overlay.id + '\',\'' + layer.feature._id + '\')"></button>';
                            }
                            content += '<button class="button button-small icon ion-edit" onclick="popupEdit(\'' + overlay.id + '\',\'' + layer.feature._id + '\')"></button>';
                            //content += '<button class="button button-small icon ion-edit" onclick="popupDraw(\'' + overlay.id + '\',\'' + layer.feature._id + '\')"></button>';
                            content += '</div>';
                        }
                        //popup.setContent(content);


                        return content;
                    });
                };

            }
            if (overlay.pointToLayer) {
                jsonTransformed.pointToLayer = JSON.parse(overlay.pointToLayer, function (key, value) {
                    if (value && (typeof value === 'string') && value.indexOf("function") !== -1) {
                        var jsFunc = new Function("theme", "L", 'return ' + value)(theme, L);
                        return jsFunc;
                    }
                    return value;
                });
            }

            var leaflet;
            if (overlay.type === 'geojson') {
                if (_configuration.hasOwnProperty('_attachments') && _configuration._attachments.hasOwnProperty(overlay.id + '.geojson')) {
                    leaflet = L.geoJson(_configuration._attachments[overlay.id + '.geojson'].data, jsonTransformed);
                    if (overlay.markercluster) {
                        overlay.leaflet = new L.MarkerClusterGroup();
                        overlay.leaflet.addLayer(leaflet);
                    } else {
                        overlay.leaflet = leaflet;
                    }
                }
            } else {
                if (overlay.markercluster) {
                    leaflet = L.markerClusterGroup(jsonTransformed);
                } else {
                    leaflet = L.geoJson(null, jsonTransformed);
                }
                $scope.index[dbname][overlay.id].leaflet = leaflet;
                overlay.leaflet = leaflet;
            }
            /*leaflet.on('layeradd', function (e) {
              if (overlay.type === 'straks') {
                $scope.index[dbname][overlay.id].data['_design/straks'].leaflet = e.layer;
              } else {
                $scope.index[dbname][overlay.id].data[e.layer.feature._id].leaflet = e.layer;
              }
            });*/


        }
        $rootScope.$on('unauthenticated', function (data) {
            console.log(data);
            $scope.navOrganization();

        });
        /*$rootScope.$on('authenticated', function (data) {
            console.log(data);
            if (_configuration) {
                createConfiguration(_configuration);
            }
         
        });*/
        var createConfiguration = function (configuration) {
            //$ionicLoading.hide();
            _configuration = configuration;
            if (configuration.hasOwnProperty('security') && configuration.security.length > 0 && (!$rootScope.hasOwnProperty('user') || ($rootScope.hasOwnProperty('user') && configuration.security.indexOf($rootScope.user.name) === -1))) {
                $rootScope.showlogin();
            } else {

                //var dbs = [];
                var overlays = configuration.map.overlays;
                for (var i = 0; i < overlays.length; i++) {
                    var overlay = overlays[i];
                    $rootScope.overlays[overlay.id] = overlay;

                    if (overlay.type === 'database' || overlay.type === 'straks') {
                        createOverlay(overlay);
                    } else if (overlay.type === 'geojson') {
                        createOverlay(overlay);
                        $scope.index['db-' + overlay.id] = {};
                        $scope.index['db-' + overlay.id][overlay.id] = {
                            list: [],
                            leaflet: null,
                            data: {}
                        };
                    }
                }
                for (var key in $scope.index) {
                    //dbs.push(key);
                    listen(key);
                }
                init();
                /*$q.when(idb.createDB(dbs)).then(function () {
         
                    init();
                    //init(configuration);
                    //$scope.configuration = configuration;
                    //console.log('broadcast');
                    //$scope.$broadcast('configuration', configuration);
                }).catch(function (err) {
                    console.log(err);
                })*/
            }
        };

        var create = function () {

            var content = document.querySelector('#kort[nav-view="stage"] #map');

            _map = new L.Map(content, {
                zoomControl: true,
                attributionControl: false,
                editable: true
            });
            _map.attributionControl = L.control.attribution({
                position: 'bottomleft',
                prefix: ''
            }).addTo(_map);
            _map.options.attributionControl = true;
            _map._locateOptions = {};
            init();
        };
        var update = function () {
            if (_map) {
                _map.invalidateSize();
            }
        };
        var configurationsDB = databases.get('configurations');
        var configDB = databases.get('configuration-list-' + $stateParams.organization);
        socket.on('configuration', function (doc) {
            if (doc.hasOwnProperty('deleted')) {
                configurationsDB.delete('data', doc._id).then(function () {
                    $state.go('kommune.item', {
                        organization: $scope.organizationid
                    });
                }).catch(function (err) {
                    console.log(err);
                });
            } else {
                $rootScope.configuration = doc;
                //console.log('socket configuration', doc);
                configurationsDB.put('data', doc).then(function () {
                    createConfiguration(doc);
                    //onUpdatedOrInserted(doc);
                }).catch(function (err) {
                    console.log(err);
                });
            }
        });
        socket.on('configuration-list-' + $stateParams.organization + '/' + $stateParams.configuration, function (doc) {
            if (doc.hasOwnProperty('d')) {
                configDB.delete('data', doc._id).then(function () {
                    /*$state.go('kommune.item', {
                      organization: $scope.organizationid
                    });*/
                }).catch(function (err) {
                    console.log(err);
                });
            } else {

                $q.when(configDB.testBlobToBase64(doc)).then(function (doc) {
                    return $q.when(configDB.put('data', doc));
                }).then(function (doc) {
                    return $q.when(configDB.testBase64ToBlob(doc));
                }).then(function (doc) {
                    $scope.config = doc;
                }).catch(function (err) {
                    console.log(err);
                });
            }
        });

        configurationsDB.get('data', $stateParams.configuration).then(function (result) {
            if (result) {
                $rootScope.configuration = result;
                createConfiguration(result);
            }

            socket.emit('configuration-rev', {
                i: $stateParams.configuration,
                r: result ? result._rev : ''
            });
        }).catch(function (err) {
            console.log(err);
            socket.emit('configuration-rev', {
                i: $stateParams.configuration,
                r: ''
            });
        });
        configDB.get('data', $stateParams.configuration).then(function (result) {
            var r = '';
            if (result) {
                $scope.config = result;
                r = result.r;
            }

            socket.emit('configuration-list-rev', {
                o: $stateParams.organization,
                i: $stateParams.configuration,
                r: r
            });
        }).catch(function (err) {
            console.log(err);
            socket.emit('configuration-list-rev', {
                o: $stateParams.organization,
                i: $stateParams.configuration,
                r: ''
            });
        });
        $scope.$on("$destroy", function () {
            console.log('destroy');
            delete $rootScope.overlays;
            delete $rootScope.widgets;
            delete $rootScope.configuration;
            for (var key in _modals)
                _modals[key].remove();
            _map.stopLocate();
            socket.off('configuration');
            socket.off('configuration-list-' + $stateParams.organization + '/' + $stateParams.configuration);

            for (var dbname in $scope.index) {
                socket.off(dbname);
                socket.off(dbname + 'check');
                for (var key in $scope.index[dbname]) {
                    var overlay = $scope.index[dbname][key];
                    if (overlay.listWorker) {
                        overlay.listWorker.terminate();
                    }
                }
                databases.terminate(dbname);
            }
            /*if (locationfoundListener) {
                locationfoundListener();
            }
            if (locationerrorListener) {
                locationerrorListener();
            }*/
        })
    });
})(this, this.angular, this.console, this.URL, this.Blob, this.L, this.turf, this.tv4, this.uuid);
