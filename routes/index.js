module.exports = function(app) {

  var main = require('./main');
  app.get('/', main.get);

  var browse = require('./browse');
  app.get('/browse', browse.get);

  var contact = require('./contact');
  app.get('/contact', contact.get);

  var signup = require('./signup');
  app.get('/signup', signup.get);
 }