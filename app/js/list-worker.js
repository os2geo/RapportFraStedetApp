importScripts('../lib/turf/turf.min.js');

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

var rows = [];
self.addEventListener('message', function (e) {
    for (var n = 0; n < e.data.list.length; n++) {
        var doc = e.data.list[n];
        distance(doc, e.data.position);
        if (filterdoc(doc, e.data.filters) && filterSearch(doc, e.data.searchInput)) {
            rows.push(doc);
        }
    }
    var sort = e.data.selectedSortering;
    if (sort && sort.indexOf('_attachments') !== -1) {
        sort += '/data';
    }
    self.postMessage({
        rows: rows.sort(function (a, b) {
            if (sort) {
                var aa = a[sort] || '';
                var bb = b[sort] || '';
                if (aa < bb) {
                    if (e.data.ascending) {
                        return -1
                    } else {
                        return 1
                    }
                } else if (aa > bb) {
                    if (e.data.ascending) {
                        return 1
                    } else {
                        return -1
                    }
                }
            }
            return 0
        })
    });
});