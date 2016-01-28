(function (window, angular, console, turf) {
    'use strict';
    angular.module('starter.filters')

    .filter('listfilter', function ($filter, $rootScope) {
        return function (input, search, overlay, myposition, selectedSortering, layerid) {
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


})(this, this.angular, this.console, this.turf);
