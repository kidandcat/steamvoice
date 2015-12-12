var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var socketio = require('socket.io');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/index');
var colors = require('colors');
var crypto = require('crypto');
var session = require('express-session');
var redis   = require("redis");
var redisStore = require('connect-redis')(session);
var client  = redis.createClient();
var passport = require('passport');
var SteamStrategy = require('passport-steam').Strategy;


var app = express();



//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new SteamStrategy({
  returnURL: 'http://steamvoice.com:80/auth/steam/return',
  realm: 'http://steamvoice.com:80/',
  apiKey: 'BA2681B8FA62A55A007EAE5E3F279212'
},
function(identifier, profile, done) {
  user = {
    identifier: identifier,
    profile: profile
  };
  done(null, user);
}
));


app.use(passport.initialize());
app.use(passport.session());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));


//app.use('/', routes);
app.get('/', function(req, res, next) {
//  console.log("typeof " + typeof req.cookies.steamVoiceCookie);
  client.get(req.cookies.steamVoiceCookie, function(err, reply) {
    res.render('index.jade', { steamID: reply });
  });
});

app.get('/auth/steam',
passport.authenticate('steam'),
function(req, res) {
  // The request will be redirected to Steam for authentication, so
  // this function will not be called.
});

app.get('/auth/steam/return',
passport.authenticate('steam', { failureRedirect: '/' }),
function(req, res) {
  var randomS = randomString();
  res.cookie('steamVoiceCookie', randomS);
  client.set(randomS, JSON.stringify(req.user));
  //res.render('index.ejs', { steamID: req.user.identifier });
  res.redirect('/');
});

app.get('/logout',
function(req, res) {
  res.clearCookie('steamVoiceCookie');
  //res.render('index.ejs', { steamID: req.user.identifier });
  res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send('error');
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send('error');
});

var server = app.listen('80');
io = socketio.listen(server);
require('./routes/socket-server').listen(io, console);

module.exports = app;
console.log('                  SERVER  RUNNING'.magenta);
console.log('          developed by kidandcat@gmail.com'.rainbow);



function randomString(length) {
  return crypto.randomBytes(20).toString('hex');
}
