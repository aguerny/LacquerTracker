module.exports = function(app) {

  app.get('/', function(req, res) {
    res.render('main.ejs', {title: 'Lacquer Tracker'});
  });

  app.get('/browse', function(req, res) {
    res.render('browse.ejs', {title: 'Browse - Lacquer Tracker'});
  });

  app.get('/contact', function(req, res) {
    res.render('contact.ejs', {title: 'Contact - Lacquer Tracker'});
  });

  app.get('/signup', function(req, res) {
    res.render('signup.ejs', {title: 'Signup - Lacquer Tracker'});
  });

  app.get('/login', function(req, res) {
    res.render('login.ejs', {title: 'Login - Lacquer Tracker'});
  });

  app.get('/forgotpassword', function(req, res) {
    res.render('forgotpassword.ejs', {title: 'Retrieve Password - Lacquer Tracker'});
  });

 }