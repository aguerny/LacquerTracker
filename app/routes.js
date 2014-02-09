var Polish = require('../app/models/polish');

module.exports = function(app, passport) {

  //home page
  app.get('/', function(req, res) {
    res.render('main.ejs', {title: 'Lacquer Tracker'});
  });



//browse
  app.get('/browse', function(req, res) {
    Polish.find({})
          .limit(10)
          .exec(function (err, docs) {
             var newDocs = docs.map(function(idoc){
                console.log(idoc);
                return "<tr><td>"+idoc.name+"</td><td>" + idoc.brand + "</td><td>" + idoc.batch + "</td><td>" + idoc.year + "</td><td>" + idoc.color + "</td><td>" + idoc.type + "</td></tr>";
            })
            res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes:  newDocs });
          });
  });

//
  app.post('/browse', function(req, res) {
    var filterOptions = req.body;
    for(var key in filterOptions) {
      if(filterOptions.hasOwnProperty(key)) {
          filterOptions[key] = new RegExp(filterOptions[key], "i");
      }
    }

    Polish.find(filterOptions , function (err, docs) {
      console.log(docs);
      var polishItems = [];
      var newDocs = docs.map(function(idoc){
          console.log(idoc);
          return "<tr><td>"+idoc.name+"</td><td>" + idoc.brand + "</td><td>" + idoc.batch + "</td><td>" + idoc.year + "</td><td>" + idoc.color + "</td><td>" + idoc.type + "</td></tr>";
      })

      res.render('browse.ejs', {title: 'Browse - Lacquer Tracker', polishes: newDocs});
    });

  });



  //add new polish
  app.get('/addnewpolish', function(req, res) {
    res.render('addnewpolish.ejs', {title: 'Add a Polish - Lacquer Tracker', message : req.flash('addPolishMessage')});
  });

  app.post('/addnewpolish', function(req, res) {
    Polish.findOne({ name : req.body.name, brand : req.body.brand}, function(err, polish) {
        //check to see if there's already a polish name and brand in the database
        if (polish) {
          req.flash('addPolishMessage', 'That polish already exists in the database.')
          res.redirect('/addnewpolish');
        } else {
          var newPolish = new Polish ({
            name: req.body.name,
            brand: req.body.brand,
            batch: req.body.batch,
            year: req.body.year,
            color: req.body.color,
            type: req.body.type
          });
          newPolish.save(function(err) {
            req.flash('addPolishMessage', 'Polish has been successfully added. Add another?')
            res.redirect('/addnewpolish');
          });
        }
      });
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
    successRedirect: '/settings', //redirect to the secure profile section
    failureRedirect: '/signup', //redirect back to the signup page if there is an error
    failureFlash: true //allow flash messages
  }));



  //log in
  app.get('/login', function(req, res) {
    res.render('login.ejs', {title: 'Login - Lacquer Tracker', message: req.flash('loginMessage')});
  });

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/browse',
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
  app.get('/profile', function(req, res) {
    res.render('profile.ejs', {user: req.user, title: 'Profile - Lacquer Tracker'});
  });


  //settings
  app.get('/settings', isLoggedIn, function(req, res) {
    res.render('settings.ejs', {user: req.user, title: 'settings - Lacquer Tracker'});
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