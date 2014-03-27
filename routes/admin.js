var User = require('../app/models/user');


module.exports = function(app, passport) {


//admin user page
app.get('/admin/users', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        User.find({}).sort('usernumber').exec(function(err, users) {
            res.render('adminusers.ejs', {title: 'All Users - Lacquer Tracker', allusers: users});
        })
    } else {
        res.redirect('/error');
    }
});


};



//route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    //if user is authenticated in the session, carry on
    if (req.isAuthenticated())
    return next();

    //if they aren't, redirect them to the login page
    req.session.returnTo = req.path;
    res.redirect('/login');
};