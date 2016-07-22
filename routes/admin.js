var User = require('../app/models/user');
var moment = require('moment-timezone');
var Polish = require('../app/models/polish');
var Photo = require('../app/models/photo');
var Brand = require('../app/models/brand');
var fs = require('node-fs');
var path = require('path');
var Review = require('../app/models/review');
var mongoose = require('mongoose');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');
var nodemailer = require('nodemailer');

module.exports = function(app, passport) {


//admin user page
app.get('/admin/users', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        User.find({}).sort('usernumber').exec(function(err, users) {
            var users = users.map(function(x) {
                x.creationdate = moment(x.creationdate).tz("America/New_York").format('M-D-YY, h:mm a');
                return x;
            })
            res.render('admin/users.ejs', {title: 'All Users - Lacquer Tracker', allusers: users});
        })
    } else {
        res.redirect('/error');
    }
});


//admin settings
app.get('/admin/settings', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        data = {};
        data.title = 'Admin Settings - Lacquer Tracker';
        data.adminview = req.user.adminview;
        data.username = req.user.username;
        res.render('admin/settings.ejs', data);
    } else {
        res.redirect('/error');
    }
});

app.post('/admin/settings', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        User.findOne(req.user, function(err, user) {
            if (!user) {
                res.redirect('/error');
            } else {
                if (req.body.adminview) {
                    user.adminview = true;
                } else {
                    user.adminview = false;
                }
                user.save(function(err) {
                    res.redirect('/');
                });
            }
        });
    };
});


//photos pending delete
app.get('/admin/pending', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Photo.find({pendingdelete:true}).exec(function(err, photos) {
            data = {};
            data.title = 'Photos Pending Delete - Lacquer Tracker';
            data.pendingphotos = photos;
            res.render('admin/pending.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});


//remove pending photo
app.get('/admin/pending/:pid/:id/:action', isLoggedIn, function(req, res) {
    Photo.findById(req.params.id).exec(function(err, photo) {
        if (photo === null || photo === undefined) {
            res.redirect('/error');
        } else {
            if (req.params.action === "restore") {
                photo.pendingdelete = false;
                photo.save(function(err) {
                    res.redirect('/admin/pending');
                })
            } else if (req.params.action === "remove") {
                fs.unlink('./public' + photo.location, function(err) {
                    if (err) throw err;
                })
                photo.remove();
                Polish.findById(req.params.pid, function(err, p) {
                    p.photos.remove(req.params.id);
                    p.save(function(err) {
                        res.redirect('/admin/pending');
                    });
                })
            } else {
                res.redirect('/error');
            }
        }
    });
});


//admin duplicate polishes
app.get('/admin/duplicate', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        data = {};
        data.title = 'Duplicate Polishes - Lacquer Tracker';
        res.render('admin/duplicate.ejs', data);
    } else {
        res.redirect('/error');
    }
});

app.post('/admin/duplicate', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.find({name:req.body.polishname, brand:req.body.polishbrand}, function(err, polishes) {
            data = {};
            data.title = 'Edit Duplicate Polishes - Lacquer Tracker';
            data.polishes = polishes;
            res.render('admin/duplicateedit.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});


app.post('/admin/duplicate/remove', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.findById(mongoose.Types.ObjectId(req.body.keepid.replace(/^\s+|\s+$/g,'')), function(err, keep) {
            Polish.findById(mongoose.Types.ObjectId(req.body.removeid.replace(/^\s+|\s+$/g,'')), function(err, remove) {
                User.find({ownedpolish:remove.id}, function(err, users) {
                    for (var j=0; j<users.length; j++) {
                        users[j].ownedpolish.remove(remove.id);
                        users[j].ownedpolish.addToSet(keep.id);
                        users[j].save();
                    }
                })

                User.find({wantedpolish:remove.id}, function(err, users) {
                    for (var j=0; j<users.length; j++) {
                        users[j].wantedpolish.remove(remove.id);
                        users[j].wantedpolish.addToSet(keep.id);
                        users[j].save();
                    }
                })

                
                Photo.find({polishid:remove.id}, function(err, photos) {
                    for (var j=0; j<photos.length; j++) {
                        photos[j].polishid = keep.id;
                        photos[j].save();
                        keep.photos.addToSet(photos[j].id);
                        keep.save();
                    }
                })

                Review.find({polishid:remove.id}, function(err, reviews) {
                    for (var j=0; j<reviews.length; j++) {
                        reviews[j].polishid = keep.id;
                        reviews[j].save();
                    }
                })

                if (!keep.batch.length) {
                    if (remove.batch.length) {
                        keep.batch = remove.batch;
                        keep.keywords = keep.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.batch + " " + keep.code;
                        keep.save();
                    }
                }
                if (!keep.code.length) {
                    if (remove.code.length) {
                        keep.code = remove.code;
                        keep.keywords = keep.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.batch + " " + keep.code;
                        keep.save();
                    }
                }
                if (remove.colorcat.length) {
                    var input = remove.colorcat.split(",");
                    var formatted = keep.colorcat.split(",");
                    for (j=0; j<input.length; j++) {
                        if (formatted.indexOf(input[j]) == -1) {
                            formatted.push(input[j]);
                        }
                    }
                    keep.colorcat = formatted.toString();
                    keep.save();
                }
                if (remove.type.length) {
                    var input = remove.type.split(",");
                    var formatted = keep.type.split(",");
                    for (j=0; j<input.length; j++) {
                        if (formatted.indexOf(input[j]) == -1) {
                            formatted.push(input[j]);
                        }
                    }
                    keep.type = formatted.toString();
                    keep.save();
                }
                if (!keep.indie.length) {
                    if (remove.indie.length) {
                        keep.indie = remove.indie;
                        keep.keywords = keep.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.batch + " " + keep.code;
                        keep.save();
                    }
                }
                if (!keep.dupes.length) {
                    if (remove.dupes.length) {
                        keep.dupes = remove.dupes;
                        keep.keywords = keep.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.batch + " " + keep.code;
                        keep.save();
                    }
                }
                if (!keep.swatch.length) {
                    if (remove.swatch.length) {
                        keep.swatch = remove.swatch;
                        keep.keywords = keep.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.batch + " " + keep.code;
                        keep.save();
                    }
                }
                res.redirect('/browse');
            })
        });
    } else {
        res.redirect('/error');
    }
});



//admin get flagged polishes
app.get('/admin/flagged', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.find({flagged:true}).exec(function(err, polish) {
            data = {};
            data.title = 'Flagged Polish - Lacquer Tracker';
            data.pendingpolish = polish;
            res.render('admin/flaggedpolish.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});


//user flags polish
app.get('/polishid/:id/flag', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, polish) {
        if (polish === null || polish === undefined) {
            res.redirect('/error');
        } else {
            data = {};
            data.title = 'Flag Polish - Lacquer Tracker';
            data.polish = polish;
            res.render('polish/flag.ejs', data);
        }
    })
});


app.post('/polishid/:id/flag', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, polish) {
        if (polish === null || polish === undefined) {
            res.redirect('/error');
        } else {
            polish.flagged = true;
            polish.flaggedreason = sanitizer.sanitize(req.body.flaggedreason) + " - " + req.user.username;
            polish.save();
            var transport = nodemailer.createTransport('sendmail', {
                path: "/usr/sbin/sendmail",
            });

            var mailOptions = {
                from: "polishrobot@lacquertracker.com",
                to: 'lacquertrackermailer@gmail.com',
                subject: 'Flagged Polish',
                text: req.user.username + " has flagged a polish: " + polish.brand + " - " + polish.name + "\n\n\nwww.lacquertracker.com/admin/flagged",
            }

            transport.sendMail(mailOptions, function(error, response) {
                transport.close();
            });
            res.redirect('/browse');
        }
    })
});

//unflag
app.get('/polishid/:id/unflag', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.findById(req.params.id, function(err, polish) {
            if (polish === null || polish === undefined) {
                res.redirect('/error');
            } else {
                polish.flagged = false;
                polish.flaggedreason = '';
                polish.save();
                res.redirect('/admin/flagged');
            }
        })
    } else {
        res.redirect('/error');
    }
});


//admin brands page
app.get('/admin/brands', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Brand.find({}).sort('name').exec(function(err, brands) {
            var brands = brands;
            res.render('admin/brands.ejs', {title: 'All Brands - Lacquer Tracker', allbrands: brands});
        })
    } else {
        res.redirect('/error');
    }
});


//admin brand edit
app.get('/admin/brandedit/:id', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Brand.findById(req.params.id, function(err, brand) {
            if (brand === null || brand === undefined) {
                res.redirect('/error');
            } else {
                var brand = brand;
                res.render('admin/brandedit.ejs', {title: 'Edit Brands - Lacquer Tracker', brand: brand});
            }
        })
    } else {
        res.redirect('/error');
    }
});

app.post('/admin/brandedit/:id', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Brand.findById(req.params.id, function(err, brand) {
            if (brand === null || brand === undefined) {
                res.redirect('/error');
            } else {
                brand.website = sanitizer.sanitize(req.body.website);
                brand.bio = sanitizer.sanitize(req.body.bio);
                brand.official = sanitizer.sanitize(req.body.official);
                brand.save(function(err) {
                    res.redirect('/brand/' + brand.name.replace(/ /g,"_"));
                })
            }
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