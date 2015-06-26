(function (window, angular, console, turf) {
    'use strict';
    angular.module('starter.filters', [])

    .filter('organizationsfilter', function ($filter, $rootScope) {
        return function (input, security) {
            var items = [];
            angular.forEach(input, function (doc) {
                if (security && security.organizations.indexOf(doc._id) !== -1) {
                    items.push(doc);
                }
            });
            return items;
        };
    })

    .filter('organizationfilter', function ($filter, $scope) {
        return function (input, security) {

            angular.forEach(input, function (doc) {
                if (doc._id === $scope.configurationid) {
                    return doc.name
                }
            });
            return "";
        };
    })

    .filter('distance', function () {
        return function (input) {
            if (input <= 0) {
                return (input * 1000).toFixed(2) + ' m';
            } else {
                return input.toFixed(2) + ' km';
            }
        };
    })

    .filter('opgaverfilter', function ($filter, $rootScope) {
        return function (input, search, widgets, myposition) {
            var items = [];

            function distance(opgave) {
                if (opgave.geometry && myposition) {
                    var point = turf.point([myposition.longitude, myposition.latitude]);
                    var nearest;
                    switch (opgave.geometry.type) {
                    case 'Point':
                        nearest = turf.point(opgave.geometry.coordinates);
                        break;
                    case 'MultiPoint':
                        nearest = turf.point(opgave.geometry.coordinates[0]);
                        break;
                    case 'LineString':
                        //nearest = turf.pointOnLine(opgave, point);
                        nearest = turf.point(opgave.geometry.coordinates[0]);
                        break;
                    case 'MultiLineString':
                        nearest = turf.point(opgave.geometry.coordinates[0][0]);
                        break;
                    case 'Polygon':
                        nearest = turf.point(opgave.geometry.coordinates[0][0]);
                        break;
                    case 'MultiPolygon':
                        nearest = turf.point(opgave.geometry.coordinates[0][0]);
                        break;
                    }
                    opgave.distance = turf.distance(point, nearest);
                }
            }
            angular.forEach(input, function (opgave) {
                if (opgave.properties.user && opgave.properties.user === $rootScope.user.name) {
                    if (typeof (search) === 'undefined' || search === '') {
                        distance(opgave);
                        items.push(opgave);
                    } else {
                        var s = search.toLowerCase();
                        for (var i = 0; i < $rootScope.overlays[widgets.opgaver.layer].list.length; i++) {
                            var j = $filter('objectpath')($rootScope.overlays[widgets.opgaver.layer].list[i], opgave);
                            var type = typeof (j);
                            if (type !== 'undefined' && type !== 'object') {
                                if (type === 'number') {
                                    j = j.toString();
                                }
                                j = j.toLowerCase();
                                if (j.indexOf(s) !== -1) {
                                    items.push(opgave);
                                    break;
                                }
                            }
                        }
                    }
                }
            });
            return items;
        };
    })

    .filter('listfilter', function ($filter, $rootScope) {
        return function (input, search, overlay, myposition) {
            var items = [];

            function distance(doc) {
                if (doc.geometry && myposition) {
                    var point = turf.point([myposition.longitude, myposition.latitude]);
                    var nearest;
                    switch (doc.geometry.type) {
                    case 'Point':
                        nearest = turf.point(doc.geometry.coordinates);
                        break;
                    case 'MultiPoint':
                        nearest = turf.point(doc.geometry.coordinates[0]);
                        break;
                    case 'LineString':
                        //nearest = turf.pointOnLine(opgave, point);
                        nearest = turf.point(doc.geometry.coordinates[0]);
                        break;
                    case 'MultiLineString':
                        nearest = turf.point(doc.geometry.coordinates[0][0]);
                        break;
                    case 'Polygon':
                        nearest = turf.point(doc.geometry.coordinates[0][0]);
                        break;
                    case 'MultiPolygon':
                        nearest = turf.point(doc.geometry.coordinates[0][0]);
                        break;
                    }
                    doc.distance = turf.distance(point, nearest);
                }
            }


            angular.forEach(input, function (doc) {
                if (typeof (search) === 'undefined' || search === '') {
                    distance(doc);
                    items.push(doc);
                } else {
                    var s = search.toLowerCase();
                    for (var i = 0; i < overlay.list.length; i++) {
                        var j = $filter('objectpath')(overlay.list[i], doc);
                        var type = typeof (j);
                        if (type !== 'undefined' && type !== 'object') {
                            if (type === 'number') {
                                j = j.toString();
                            }
                            j = j.toLowerCase();
                            if (j.indexOf(s) !== -1) {
                                items.push(doc);
                                break;
                            }
                        }
                    }
                }
            });
            return items;
        };
    })

    .filter('enumfilter', function ($filter, $rootScope) {
        return function (values, schema) {

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
    })

    .filter('objectpath', function () {
        return function (input, doc) {
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
    })

    .filter('schemapath', function () {
        return function (input, doc) {
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
                if (item.title) {
                    return item.title;
                }
                return key;
            }
            return null;
        };
    })




    .filter('bytes', function () {
        return function (bytes, precision) {
            if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
            if (typeof precision === 'undefined') precision = 1;
            var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
                number = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) + ' ' + units[number];
        };
    });
})(this, this.angular, this.console, this.turf);