/**
 * express.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var NodeSession = require('node-session');
var express = require('express');
var parseurl = require('parseurl');

var nodeSession = new NodeSession({secret: 'Q3UBzdH9GEfiRCTKbi5MTPyChpzXLsTD'});

function session(req, res, next){
    nodeSession.startSession(req, res, next);
}

var app = express();

app.use(session);

app.use(function (req, res, next) {
    var views = req.session.get('views', {});

    // get the url pathname
    var pathname = parseurl(req).pathname.slice(1);

    // count the views
    views[pathname] = (views[pathname] || 0) + 1;

    req.session.set('views', views);

    next();
});

app.get('/foo', function (req, res, next) {
    res.send('you viewed this page ' + req.session.get('views.foo') + ' times')
});

app.get('/bar', function (req, res, next) {
    res.send('you viewed this page ' + req.session.get('views').bar + ' times')
});

app.listen(3000);


