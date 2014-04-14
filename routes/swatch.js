var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var fs = require('fs');
var path = require('path');
var gm = require('gm').subClass({ imageMagick: true });


module.exports = function(app, passport) {


//polish photo
app.get('/swatch/add/:id', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (p === null) {
            res.redirect('/error');
        } else {
            var data = {};
                data.title = 'Add a Swatch - Lacquer Tracker';
                data.pname = p.name;
                data.pbrand = p.brand;
                data.pid = p.id;
            res.render('swatchupload.ejs', data);
    }
    })
});

app.post('/swatch/add/:id', isLoggedIn, function(req, res) {
    var ext = path.extname(req.files.photo.name);
    var data = {};
    data.title = 'Add a Swatch - Lacquer Tracker';
    data.pid = req.params.id;
    data.location = '/images/swatches/' + req.params.id + ext;
    fs.rename(req.files.photo.path, path.resolve('./public/images/swatches/' + req.params.id + ext), function(err) {
        if (err) {
            res.redirect('/error');
        } else {
            fs.unlink(req.files.photo.path, function() {
                res.render('swatchcrop.ejs', data);

            })
        }
    })
});


app.post('/swatch/crop/:id', isLoggedIn, function(req, res) {
    gm(path.resolve('./public/' + req.body.location))
        .crop(req.body.w, req.body.h, req.body.x, req.body.y)
        .write(path.resolve('./public/' + req.body.location), function (err) {
            gm(path.resolve('./public/' + req.body.location)).resize(300).write(path.resolve('./public/' + req.body.location)), function (err) {
            if (err) {
                res.redirect('/error');
            } else {
                Polish.findById(req.params.id, function(err, p) {
                    p.swatch = req.body.location;
                    p.save(function(err) {
                        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
                    })
                })
            }
        }
    })
})


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