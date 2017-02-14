var express = require('express'),
    cors = require('cors'),
    app = express(),
    request = require('request');

app.use(express["static"](__dirname + '/app'));
app.all('/couchdb*', function (req, res) {

    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Origin', 'http://localhost:4000');
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, HEAD, DELETE');
    res.set('Access-Control-Allow-Headers', 'accept, authorization, content-type, origin, referer');
    var url = "http://test.geo.os2geo.dk" + req.url;
    if (req.method === 'PUT') {
        req.pipe(request.put(url)).pipe(res);
    } else if (req.method === 'POST') {
        req.pipe(request.post(url)).pipe(res);
    } else if (req.method === 'GET') {
        req.pipe(request.get(url)).pipe(res);
    } else if (req.method === 'DELETE') {
        req.pipe(request.del(url)).pipe(res);
    } else if (req.method === 'OPTIONS') {
        res.end();
    }

});

app.listen(4000);
