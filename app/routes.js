module.exports = function(app, passport) {

  //home page
  app.get('/', function(req, res) {
    res.render('main.ejs', {title: 'Lacquer Tracker'});
  });



  //browse
  app.get('/browse', function(req, res) {
    res.render('browse.ejs', {title: 'Browse - Lacquer Tracker'});
  });



  //contact
  app.get('/contact', function(req, res) {
    res.render('contact.ejs', {title: 'Contact - Lacquer Tracker'});
  });



  //sign up
  app.get('/signup', function(req, res) {
    res.render('signup.ejs', {title: 'Signup - Lacquer Tracker', message: req.flash('signupMessage')});
  });

  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile', //redirect to the secure profile section
    failureRedirect: '/signup', //redirect back to the signup page if there is an error
    failureFlash: true //allow flash messages
  }));



  //log in
  app.get('/login', function(req, res) {
    res.render('login.ejs', {title: 'Login - Lacquer Tracker', message: req.flash('loginMessage')});
  });

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  }));



  //forgot password
  app.get('/forgotpassword', function(req, res) {
    res.render('forgotpassword.ejs', {title: 'Retrieve Password - Lacquer Tracker'});
  });



  //log out
  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });



  //profile
  app.get('/profile', isLoggedIn, function(req, res) {
    res.render('profile.ejs', {user: req.user, title: 'Profile - Lacquer Tracker'});
  });

};



//route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

  //if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  //if they aren't, redirect them to the home apge
  res.redirect('/');
}