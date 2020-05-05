var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var fs = require('fs');
var path = require('path');
var sanitizer = require('sanitizer');
var gm = require('gm').subClass({ imageMagick: true });
var http = require('http');
var request = require('request');
var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};
var ColorThief = require('color-thief');
var {rgb2lab, lab2rgb, deltaE} = require('rgb-lab');
var PolishColors = require('../app/constants/polishColors');


module.exports = function(app, passport) {


//show image to crop
app.post('/swatch/add/:id', isLoggedIn, function(req, res) {
    if (req.files.photo.name.length > 0) {
        if (req.files.photo.mimetype.startsWith("image")) {
            var ext = path.extname(req.files.photo.name);
            var tempPath = path.resolve('./public/images/tmp/' + req.user.username + ext);
            fs.rename(req.files.photo.tempFilePath, tempPath, function (err) {
                var data = {};
                data.title = 'Add a Swatch - Lacquer Tracker';
                data.pid = req.params.id;
                data.ext = ext;
                data.location = '/images/tmp/' + req.user.username + ext;
                res.render('swatch/crop.ejs', data);
            })
        } else {
            fs.unlink(req.files.photo.tempFilePath, function(){
                res.redirect('/error');
            })
        }
    } else if (req.body.url.length > 0) {
        fs.unlink(req.files.photo.tempFilePath);
        var ext = path.extname(sanitizer.sanitize(req.body.url));
        var tempPath = path.resolve('./public/images/tmp/' + req.user.username + ext);
        download(sanitizer.sanitize(req.body.url), tempPath, function(err) {
            if (err) {
                res.redirect('/error');
            } else {
                var data = {};
                data.title = 'Add a Swatch - Lacquer Tracker';
                data.pid = req.params.id;
                data.ext = ext;
                data.location = '/images/tmp/' + req.user.username + ext;
                res.render('swatch/crop.ejs', data);
            }
        })
    } else {
        res.redirect('/error');
    }
});



//crop happens here
app.post('/swatch/crop/:id', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, polish) {
        fs.unlink(path.resolve('./public/'+polish.swatch), function() {
            gm(path.resolve('./public/' + sanitizer.sanitize(req.body.location)))
            .crop(sanitizer.sanitize(req.body.w), sanitizer.sanitize(req.body.h), sanitizer.sanitize(req.body.x), sanitizer.sanitize(req.body.y))
            .resize(100)
            .write(path.resolve('./public/images/swatches/' + req.params.id + sanitizer.sanitize(req.body.ext)), function (err) {
                if (err) {
                    fs.unlink(path.resolve('./public/' + sanitizer.sanitize(req.body.location)), function(err) {
                        res.redirect('/error');
                    })
                } else {
                    fs.unlink(path.resolve('./public/' + sanitizer.sanitize(req.body.location)), function(err) {
                        var colorThief = new ColorThief();
                        var colorsrgb = colorThief.getPalette(path.resolve('./public/images/swatches/' + req.params.polishid + sanitizer.sanitize(req.body.ext)), 2);
                        var colorsname = [];
                        var colorscategory = [];
                        for (i=0; i<colorsrgb.length; i++) {
                            var deltas = [];
                            for (j=0; j<PolishColors.length; j++) {
                                deltas.push(deltaE(rgb2lab(PolishColors[j].rgb), rgb2lab(colorsrgb[i])));
                            }
                            colorsname.push(PolishColors[deltas.indexOf(Math.min(...deltas))].name);
                            colorscategory.push(PolishColors[deltas.indexOf(Math.min(...deltas))].category);
                        }
                        polish.colorsrgb = colorsrgb;
                        polish.colorsname = colorsname;
                        polish.colorscategory = colorscategory;
                        polish.dateupdated = new Date();
                        polish.swatch = '/images/swatches/' + req.params.id + sanitizer.sanitize(req.body.ext);
                        polish.save(function(err) {
                            res.redirect('/polish/' + polish.brand.replace(/ /g,"_") + "/" + polish.name.replace(/ /g,"_"));
                        })
                    })
                }
            })
        })
    })
});







//swatch from photo already uploaded
app.get('/photo/swatch/:pid/:id', isLoggedIn, function(req, res) {
    Photo.findById(req.params.id, function(err, photo) {
        if (err) {
            res.redirect('/error');
        } else if (photo.length < 1) {
            res.redirect('/error');
        } else {
            var ext = path.extname(photo.location);
            var data = {};
                data.title = 'Add a Swatch - Lacquer Tracker';
                data.photo = photo;
                data.location = photo.location;
                data.ext = ext;
            res.render('swatch/edit.ejs', data);
        }
    })
});

//crop happens here
app.post('/swatch/edit/:pid/:id', isLoggedIn, function(req, res) {
    Polish.findById(req.params.pid, function (err, polish) {
        fs.unlink(path.resolve('./public/'+polish.swatch), function() {
            gm(path.resolve('./public/' + sanitizer.sanitize(req.body.location)))
            .crop(sanitizer.sanitize(req.body.w), sanitizer.sanitize(req.body.h), sanitizer.sanitize(req.body.x), sanitizer.sanitize(req.body.y))
            .resize(100)
            .write(path.resolve('./public/images/swatches/' + req.params.pid + sanitizer.sanitize(req.body.ext)), function (err) {
                if (err) {
                    res.redirect('/error');
                } else {
                    var colorThief = new ColorThief();
                    var colorsrgb = colorThief.getPalette(path.resolve('./public/images/swatches/' + req.params.pid + sanitizer.sanitize(req.body.ext)), 2);
                    var colorsname = [];
                    var colorscategory = [];
                    for (i=0; i<colorsrgb.length; i++) {
                        var deltas = [];
                        for (j=0; j<PolishColors.length; j++) {
                            deltas.push(deltaE(rgb2lab(PolishColors[j].rgb), rgb2lab(colorsrgb[i])));
                        }
                        colorsname.push(PolishColors[deltas.indexOf(Math.min(...deltas))].name);
                        colorscategory.push(PolishColors[deltas.indexOf(Math.min(...deltas))].category);
                    }
                    polish.colorsrgb = colorsrgb;
                    polish.colorsname = colorsname;
                    polish.colorscategory = colorscategory;
                    polish.dateupdated = new Date();
                    polish.swatch = '/images/swatches/' + polish.id + sanitizer.sanitize(req.body.ext);
                    polish.save(function(err) {
                        res.redirect('/polish/' + polish.brand.replace(/ /g,"_") + "/" + polish.name.replace(/ /g,"_"));
                    })
                }
            })
        })
    })
});



};



//route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    if (req.isAuthenticated()) {
        User.findById(req.user.id).exec(function(err, user) {
            user.lastlogindate = new Date();
            user.save();
        })
    }

    //if user is authenticated in the session, carry on
    if (req.isAuthenticated())
    return next();

    //if they aren't, redirect them to the login page
    req.session.returnTo = req.path;
    res.redirect('/login');
};