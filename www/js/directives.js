(function (window, angular, console, L, ionic, URL, navigator, Image) {
    'use strict';
    angular.module('starter.directives', [])

    .directive('map', function () {
        return {
            restrict: 'E',
            scope: {
                onCreate: '&',
                onTs: '&'
            },
            link: function ($scope, $element, $attr) {
                var ts = function (event) {
                    $scope.onTs({
                        event: event
                    });
                };
                $element[0].addEventListener("touchstart", ts, false);
                $element[0].addEventListener("mousedown", ts, false);
                $element.on('$destroy', function () {
                    $element[0].removeEventListener("touchstart", ts);
                    $element[0].removeEventListener("mousedown", ts);
                    //$interval.cancel(timeoutId);
                });
                var map = new L.Map($element[0], {
                    zoomControl: typeof(window.cordova)==="undefined",
                    attributionControl: false
                });
                L.control.attribution({
                    position: 'bottomleft'
                }).setPrefix('').addTo(map);
                //map.attributionControl;
                $scope.onCreate({
                    map: map
                });
            }
        };
    })




    .directive('searchList', function ($rootScope, $ionicPopover, $ionicModal, $ionicPopup, $state, $http, couchdb, $filter, $timeout, $sce) {
        return {
            restrict: 'E',
            scope: {
                widget: '=',
                map: '=',
                baselayer: '=',
                login: '=',
                overlays: '=',
                widgets: '='
            },
            templateUrl: 'templates/searchList.html',
            controller: function ($scope) {
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
                    var index = binarySearch($scope.data, id);
                    var doc = $scope.data[index];
                    if (doc && doc._id === id) {
                        $scope.data.splice(index, 1);
                        $scope.overlay.leaflet.removeLayer($rootScope.index[$scope.overlay.id][id]);
                        delete $rootScope.index[$scope.overlay.id][id];
                    }
                }
                $rootScope.$on('login', function () {
                    showList();
                });
                var showList = function (layer) {
                        if (layer) {
                            $scope.layer = layer;
                            $scope.data = $rootScope.data[layer];
                            $scope.schema = $rootScope.schemas[layer];
                            $scope.validateschema = $rootScope.validateschemas[layer].schema;
                            $scope.overlay = $rootScope.overlays[layer];
                        }
                        if ($scope.overlay) {
                            if ($scope.overlay.replicateFrom && !$rootScope.user.name) {
                                $rootScope.showlogin();
                            } else {
                                $ionicPopover.fromTemplateUrl('templates/sorterList.html', {
                                    scope: $scope,
                                }).then(function (popover) {
                                    $scope.popover = popover;
                                });
                                $ionicModal.fromTemplateUrl('templates/modalList.html', {
                                    scope: $scope,
                                    backdropClickToClose: false
                                }).then(function (modal) {
                                    if ($scope.modal) {
                                        $scope.modal.remove();
                                    }
                                    $scope.modal = modal;
                                    modal.show();
                                });
                            }
                        }
                    },
                    clearValid = function (valid) {
                        if (typeof (valid) === 'object') {
                            for (var key in valid) {
                                if (key === '$error') {
                                    delete valid.$error;
                                } else {
                                    clearValid(valid[key]);
                                }
                            }
                        }
                    },
                    master = {
                        type: 'Feature',
                        properties: {},
                        geometry: {

                        }
                    };
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
                $rootScope.$on('selectLayer', function (e, doc, layer, scope, zoom) {
                    $scope.layer = layer;
                    $scope.schema = $rootScope.schemas[layer];
                    $scope.validateschema = $rootScope.validateschemas[layer].schema;
                    $scope.overlay = $rootScope.overlays[layer];
                    $scope.select(doc, zoom, scope);
                });
                $rootScope.$on("schema", function (e, layer) {
                    if ($scope.layer && $scope.layer === layer) {
                        $scope.schema = $rootScope.schemas[layer];
                        $scope.validateschema = $rootScope.validateschemas[layer].schema;
                    }
                });

                //$scope.listCanSwipe = false;
                $scope.selectedSortering = 'distance';
                $scope.selectSort = function (item) {
                    $scope.selectedSortering = item;
                };
                $scope.filteroverlay = function (doc) {
                    var overlay = $scope.overlays[doc];
                    if (overlay && !overlay.db) {
                        if (overlay.replicateFrom && overlay.replicateTo) {
                            return true;
                        }
                        return false;
                    }
                    return true;
                };
                $scope.getattachment = function (field, doc) {
                    var path = field.split('/');
                    if (doc.hasOwnProperty('_attachments') && doc._attachments.hasOwnProperty(path[2])) {
                        return $sce.trustAsResourceUrl(couchdb + 'db-' + $scope.overlay.database + '/' + doc._id + '/' + 'tn_' + path[2]);
                    }
                    return "";

                };
                $scope.filterByEnum = function (doc) {
                    for (var i = 0; i < $scope.overlay.list.length; i++) {
                        var item = schemaobject($scope.overlay.list[i], $scope.schema);
                        var value = objectpath($scope.overlay.list[i], doc);
                        if (item && item.checked && value !== null) {
                            if (!item.checked.hasOwnProperty(value) || (item.checked.hasOwnProperty(value) && !item.checked[value])) {
                                return false;
                            }

                        }
                    }
                    return true;
                };



                $scope.remove = function (doc) {
                    if ($scope.overlay.db) {
                        $scope.overlay.db.remove(doc, function (err, response) {
                            //$timeout(function () {
                            //    var index = $rootScope.index[$scope.overlay.id][doc._id];
                            //    $scope.data.splice(index.data, 1);
                            //});
                        });
                    } else {
                        $http.delete(couchdb + 'db-' + $scope.overlay.database + '/' + doc._id + '?rev=' + doc._rev).
                        success(function (data, status, headers, config) {
                            if (status !== 403) {
                                onDeleted(doc._id);
                            }
                        });
                    }
                };

                $scope.select = function (doc, zoom, scope) {

                    $scope.valid = {};

                    if ($scope.popover) {
                        $scope.popover.remove();
                    }
                    $scope.doc = doc;

                    var overlay = $scope.overlay.leaflet;
                    if (overlay) {
                        $scope.overlay.selected = true;
                        if (!$scope.map.hasLayer(overlay)) {
                            $scope.map.addLayer(overlay);
                        }
                        var item = overlay.getLayer($rootScope.index[$scope.overlay.id][doc._id]);
                        overlay.eachLayer(function (layer) {
                            if (layer.setStyle) {
                                var style = overlay.options.style(layer.feature);
                                layer.setStyle(style);
                            }
                        });
                        /*for (var key in overlay._layers) {
                            var layer = overlay._layers[key];
                            //layer.resetStyle(layer._layers[key]);
                            var style = overlay.options.style(layer.feature);
                            layer.setStyle(style);
                        }*/
                        if (item.setStyle) {
                            item.setStyle($scope.overlay.selectionStyle.style);
                        }
                        if (!L.Browser.ie && !L.Browser.opera) {
                            //item.bringToFront();
                        }
                        if (zoom) {
                            if (!item._latlng) {
                                $scope.map.fitBounds(item.getBounds());
                            } else {
                                $scope.map.setView(item._latlng, $scope.baselayer.selectZoom || Infinity);
                            }
                        }
                    }


                    $ionicModal.fromTemplateUrl('templates/modalItem.html', {
                        scope: $scope,
                        backdropClickToClose: false
                    }).then(function (modal) {
                        if (scope && scope.modal) {
                            scope.modal.remove();
                        }
                        if ($scope.modal) {
                            $scope.modal.remove();
                        }
                        $scope.modal = modal;
                        modal.show();
                    });
                };

                $scope.show = function () {
                    var layers = $scope.widget.layers; //$filter('filter')($scope.widget.layers, $scope.filteroverlay);
                    if (layers.length > 0) {
                        if (layers.length > 1) {
                            $ionicModal.fromTemplateUrl('templates/modalSelectList.html', {
                                scope: $scope,
                                backdropClickToClose: false
                            }).then(function (modal) {
                                if ($scope.modal) {
                                    $scope.modal.remove();
                                }
                                $scope.modal = modal;
                                modal.show();
                            });
                        } else {
                            showList(layers[0]);
                        }
                    }

                };
                $scope.selectType = function (layer) {
                    $scope.modal.remove();
                    showList(layer);
                };

                function date2string(doc) {
                    for (var key in doc) {
                        if (Object.prototype.toString.call(doc[key]) === '[object Object]') {
                            date2string(doc[key]);
                        } else if (Object.prototype.toString.call(doc[key]) === '[object Date]') {
                            doc[key] = doc[key].toJSON();
                        }
                    }
                }
                $scope.submit = function () {
                    clearValid($scope.valid);
                    var localdoc = angular.copy($scope.doc);
                    if (localdoc.hasOwnProperty('distance')) {
                        delete localdoc.distance;
                    }
                    date2string(localdoc);
                    tv4.language('da-DK');
                    if (tv4.validate(localdoc, $scope.validateschema)) {
                        $ionicPopup.confirm({
                            title: 'Send indberetning',
                            template: 'Er du sikker på at du vil sende indberetningen?',
                            cancelText: 'Fortryd'
                        }).then(function (res) {
                            if (res) {
                                if ($scope.overlay.db) {
                                    $scope.overlay.db.put(localdoc, function (err, response) {
                                        $timeout(function () {
                                            $scope.modal.remove();
                                        });
                                    });
                                } else {
                                    $http.put(couchdb + 'db-' + $scope.overlay.database + '/' + localdoc._id, localdoc).success(function (data, status, headers, config) {
                                        $scope.modal.remove();
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
                        var path = tv4.error.dataPath.split('/');
                        path.push(tv4.error.params.key);
                        var item = $scope.valid;
                        for (var i = 1; i < path.length; i++) {
                            var key = path[i];
                            if (item.hasOwnProperty(key)) {
                                item = item[key];
                            }
                        }
                        item.$error = tv4.error;
                        var alertPopup = $ionicPopup.alert({
                            title: 'Fejl',
                            template: tv4.error.message
                        });
                        alertPopup.then(function (res) {

                        });
                    }
                };
            }
        };
    })

    .directive("formular", function ($compile, $sce, $rootScope, $ionicActionSheet, $timeout, couchdb) {
        return {
            restrict: "E",
            scope: {
                formular: '=',
                schema: '=',
                overlay: '=',
                doc: '=',
                valid: '=',
                id: '=',
                parentkey: '=',
                onDoc: '&'
            },
            templateUrl: 'templates/form.html',
            compile: function (tElement, tAttr) {
                var contents = tElement.contents().remove();
                var compiledContents;
                return function (scope, iElement, iAttr) {
                    if (!compiledContents) {
                        compiledContents = $compile(contents);
                    }
                    compiledContents(scope, function (clone, scope) {
                        iElement.append(clone);
                    });
                };
            },
            controller: function ($scope) {
                $scope.fields = [];
                $scope.files = {};
                $scope.validate = function () {
                    $scope.$emit('validate');
                };
                $scope.stringType = function (type) {
                    return 'text';
                };

                var getField = function (key) {
                    for (var i = 0; i < $scope.formular.length; i++) {
                        var field = $scope.formular[i];
                        if (field.id === key) {
                            return field;
                        }
                    }
                    return null;
                };
                var updateFile = function (id) {
                    return function (err, res) {
                        $timeout(function () {
                            var fileURL = URL.createObjectURL(res);
                            $scope.files[id].src = $sce.trustAsResourceUrl(fileURL);
                        });
                    };
                };
                var convert = function () {
                    var field;
                    if (typeof ($scope.schema) !== 'undefined' && typeof ($scope.doc) !== 'undefined') {
                        angular.forEach($scope.schema.properties, function (value, key) {
                            $scope.valid[key] = {};
                            switch (value.type) {
                            case 'object':
                                var f = getField(key);
                                if (f && f.type !== 'file') {
                                    $scope.doc[key] = $scope.doc[key] || {};
                                }
                                break;
                            case 'string':
                                if (typeof (value.default) !== "undefined" && !$scope.id) {
                                    $scope.doc[key] = value.default;
                                } else if (typeof (value.format) !== "undefined" && value.format === 'date-time') {
                                    if (($scope.id && typeof ($scope.doc[key]) === 'undefined') || !$scope.id) {
                                        $scope.doc[key] = new Date();
                                    } else {
                                        $scope.doc[key] = new Date($scope.doc[key]);
                                    }
                                }
                                break;
                            case 'boolean':
                                if (!$scope.id && typeof (value.default) !== "undefined") {
                                    $scope.doc[key] = value.default;
                                }
                                break;
                            default:
                                if (!$scope.id && typeof (value.default) !== "undefined") {
                                    $scope.doc[key] = value.default;
                                }
                                break;
                            }
                        });
                        for (var i = 0; i < $scope.formular.length; i++) {
                            field = $scope.formular[i];
                            if (field.type === 'file') {
                                $scope.files[field.id] = {};
                                if ($scope.doc.hasOwnProperty(field.id) && ($scope.doc[field.id].stub || $scope.doc[field.id].data)) {
                                    if ($scope.overlay.db) {
                                        $scope.overlay.db.getAttachment($scope.id, 'tn_' + field.id, updateFile(field.id));
                                    } else {
                                        $scope.files[field.id].src = $sce.trustAsResourceUrl(couchdb + 'db-' + $scope.overlay.database + '/' + $scope.id + '/' + 'tn_' + field.id);
                                    }
                                    //var attachment = btoa($scope.doc[field.id].data);


                                }
                            }
                        }
                    }
                    $scope.fields = [];
                    for (var j = 0; j < $scope.formular.length; j++) {
                        field = $scope.formular[j];
                        if ($scope.schema.oneOf && $scope.schema.oneOf.length > 0) {
                            $scope.schema.properties = $scope.schema.oneOf[0].properties;
                        }
                        var prop = $scope.schema.properties[field.id] || $scope.schema.oneOf[0][field.id];
                        var key = field.id;
                        var required = ($scope.schema.required && $scope.schema.required.indexOf(key) !== -1);
                        $scope.fields.push({
                            field: field,
                            key: key,
                            prop: prop,
                            title: prop.title || key,
                            required: required
                        });
                    }

                };
                if (typeof ($scope.schema) !== "undefined" && typeof ($scope.doc) !== "undefined") {
                    convert();
                }
                $scope.$watch('doc', function (newValue, oldValue) {
                    if (newValue != oldValue && typeof ($scope.schema) !== "undefined") {
                        $scope.onDoc(newValue);
                        convert();
                    }
                });
                $scope.$watch('overlay', function (newValue, oldValue) {
                    if (newValue != oldValue && typeof ($scope.schema) !== "undefined") {
                        $scope.onDoc(newValue);
                        convert();
                    }
                });
                $scope.$watch('schema', function (newValue, oldValue) {
                    if (newValue != oldValue && typeof ($scope.schema) !== "undefined") {
                        convert();
                    }
                });
                $scope.$watch('formular', function (newValue, oldValue) {
                    if (newValue != oldValue && typeof ($scope.schema) !== "undefined") {
                        for (var i = 0; i < $scope.formular.length; i++) {
                            var field = $scope.formular[i];
                            if (field.type === 'file') {
                                $scope.files[field.id] = {};

                            }
                        }
                    }
                });
                $scope.changeCheckbox = function (key) {
                    if (!$scope.doc[key]) {
                        delete $scope.doc[key];
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

                                    var data = "data:image/jpeg;base64," + imageData;
                                    $scope.doc[id] = {
                                        'content_type': 'image/jpeg',
                                        'data': data.substring(23)
                                    };
                                    var image = new Image();
                                    image.src = data;
                                    image.onload = function () {
                                        var canvas = document.createElement('canvas');
                                        var width = Math.floor(100 * this.width / this.height);
                                        canvas.width = width;
                                        canvas.height = 100;
                                        var ctx = canvas.getContext('2d');
                                        ctx.drawImage(this, 0, 0, this.width, this.height, 0, 0, width, 100);
                                        var dataurl = canvas.toDataURL('image/jpeg');
                                        $scope.files[id].src = dataurl;
                                        $scope.$apply();
                                        $scope.doc['tn_' + id] = {
                                            'content_type': 'image/jpeg',
                                            'data': dataurl.substring(23)
                                        };
                                    };
                                }

                                function onFail(message) {

                                    alert('Failed because: ' + message);
                                }
                                navigator.camera.getPicture(onSuccess, onFail, options);

                                return true;
                            }

                        });




                        /*var confirmPopup = $ionicPopup.confirm({
                                title: 'Foto',
                                template: 'Brug kamera eller vælg foto fra album.',
                                cancelText: 'Album',
                                okText: 'Kamera'
                            });
                            confirmPopup.then(function (res) {
                                if (res) {
                                    console.log(res)
                                } else {
                                    console.log('You are not sure');
                                }
                                navigator.camera.getPicture(onSuccess, onFail, {
                                    quality: 50,
                                    destinationType: Camera.DestinationType.DATA_URL
                                });

                                function onSuccess(imageData) {
                                    var image = document.getElementById('myImage');
                                    image.src = "data:image/jpeg;base64," + imageData;
                                }

                                function onFail(message) {
                                    alert('Failed because: ' + message);
                                }
                            });*/

                    } else {
                        var file = window.document.getElementById(id);
                        angular.element(file).one('change', function (event) {
                            var file = event.target.files[0];

                            //$scope.doc[id] = file;
                            $scope.files[id] = {
                                name: file.name
                            };
                            var fileReader = new window.FileReader();
                            fileReader.readAsDataURL(file);
                            fileReader.onload = function (e) {
                                //$scope.files[id].src = e.target.result;
                                //$scope.files[id].total = e.total;
                                //$scope.files[id].timeStamp = new Date(e.timeStamp);
                                var data = e.target.result;
                                var data2 = data.split(';');
                                $scope.doc[id] = {
                                    'content_type': data2[0].substring(5),
                                    'data': data2[1].substring(7)
                                };

                                var image = new Image();

                                image.src = e.target.result;


                                image.onload = function () {
                                    var canvas = document.createElement('canvas');
                                    var width = Math.floor(100 * this.width / this.height);
                                    canvas.width = width;
                                    canvas.height = 100;
                                    var ctx = canvas.getContext('2d');

                                    ctx.drawImage(this, 0, 0, this.width, this.height, 0, 0, width, 100);
                                    var dataurl = canvas.toDataURL('image/jpeg');
                                    $scope.files[id].src = dataurl;
                                    $scope.$apply();
                                    $scope.doc['tn_' + id] = {
                                        'content_type': 'image/jpeg',
                                        'data': dataurl.substring(23)
                                    };
                                };
                                /*var binaryReader = new window.FileReader();
                            binaryReader.onload = function (e) {
                                $scope.doc[id] = {
                                    'content_type': 'image/jpeg',
                                    'data': btoa(e.target.result)
                                };
                            };
                            binaryReader.readAsBinaryString(file);*/
                                /*var binaryReader = new window.FileReader();
                        binaryReader.readAsBinaryString(file);
                        binaryReader.onload = function (e) {
                            $scope.doc[id].data = e.target.result;*/
                            };


                        });
                        ionic.trigger('click', {
                            target: file
                        });
                    }

                };
            }
        };
    });
})(this, this.angular, this.console, this.L, this.ionic, this.URL, this.navigator, this.Image);