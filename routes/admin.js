var User = require('../app/models/user');
var moment = require('moment-timezone');
var Polish = require('../app/models/polish');
var Photo = require('../app/models/photo');
var Brand = require('../app/models/brand');
var Checkin = require('../app/models/checkin');
var Review = require('../app/models/review');
var fs = require('node-fs');
var path = require('path');
var mongoose = require('mongoose');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');
var nodemailer = require('nodemailer');
var ColorThief = require('color-thief');
var {rgb2lab, lab2rgb, deltaE} = require('rgb-lab');
var PolishColors = require('../app/constants/polishColors');

module.exports = function(app, passport) {


//admin user page
app.get('/admin/users', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        User.find({}).sort('usernumber').exec(function(err, users) {
            res.render('admin/users.ejs', {title: 'All Users - Lacquer Tracker', allusers: users, moment:moment});
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
                    res.redirect('/admin/portal');
                });
            }
        });
    };
});


//photos pending delete
app.get('/admin/flaggedphotos', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Photo.find({pendingdelete:true}).exec(function(err, photos) {
            data = {};
            data.title = 'Photos Pending Delete - Lacquer Tracker';
            data.flaggedphotos = photos;
            res.render('admin/flaggedphotos.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});


//remove pending photo
app.get('/admin/flaggedphotos/:pid/:id/:action', isLoggedIn, function(req, res) {
    Photo.findById(req.params.id).exec(function(err, photo) {
        if (photo === null || photo === undefined) {
            res.redirect('/error');
        } else {
            if (req.params.action === "restore") {
                photo.pendingdelete = false;
                photo.pendingreason = '';
                photo.save(function(err) {
                    res.redirect('/admin/flaggedphotos');
                })
            } else if (req.params.action === "remove") {
                fs.unlink(path.resolve('./public/'+photo.location), function(err) {
                    if (err) throw err;
                })
                photo.remove();
                Polish.findById(req.params.pid, function(err, p) {
                    p.photos.remove(req.params.id);
                    p.save(function(err) {
                        res.redirect('/admin/flaggedphotos');
                    });
                })
            } else {
                res.redirect('/error');
            }
        }
    });
});



//check-ins pending delete
app.get('/admin/flaggedcheckins', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Checkin.find({pendingdelete:true}).exec(function(err, checkins) {
            data = {};
            data.title = 'Fresh Coats Pending Delete - Lacquer Tracker';
            data.flaggedcheckins = checkins;
            res.render('admin/flaggedcheckins.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});

//restore pending check-in
app.get('/admin/flaggedcheckins/:id/restore', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).exec(function(err, checkin) {
        if (checkin === null || checkin === undefined) {
            res.redirect('/error');
        } else {
            checkin.pendingdelete = false;
            checkin.pendingreason = '';
            checkin.save(function(err) {
                res.redirect('/admin/flaggedcheckins');
            })
        }
    });
});


/////////////////////////////////////////////////////////////////////////////////////////////

//admin duplicate polish search
app.get('/admin/duplicate', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        data = {};
        data.title = 'Duplicate Polish Search - Lacquer Tracker';
        res.render('admin/duplicate.ejs', data);
    } else {
        res.redirect('/error');
    }
});


app.post('/admin/duplicate', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.find({name:sanitizer.sanitize(req.body.polishname), brand:sanitizer.sanitize(req.body.polishbrand)}, function(err, polishes) {
            data = {};
            data.title = 'Combine Polishes - Lacquer Tracker';
            data.polishes = polishes;
            res.render('admin/combine.ejs', data);
        })
    } else {
        res.redirect('/error');
    }
});


//admin combine polishes
app.get('/admin/combine', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        data = {};
        data.title = 'Combine Polishes - Lacquer Tracker';
        res.render('admin/combine.ejs', data);
    } else {
        res.redirect('/error');
    }
});

app.post('/admin/combine', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        if (req.body.keepid.length > 0 && req.body.removeid.length > 0) {
            Polish.findById(mongoose.Types.ObjectId(sanitizer.sanitize(req.body.keepid)), function(err, keep) {
                Polish.findById(mongoose.Types.ObjectId(sanitizer.sanitize(req.body.removeid)), function(err, remove) {
                    User.find({ownedpolish:remove.id}, function(err, users) {
                        for (var j=0; j<users.length; j++) {
                            users[j].ownedpolish.remove(remove.id);
                            users[j].ownedpolish.addToSet(keep.id);
                            users[j].save();
                        }

                        User.find({wantedpolish:remove.id}, function(err, users) {
                            for (var k=0; k<users.length; k++) {
                                users[k].wantedpolish.remove(remove.id);
                                users[k].wantedpolish.addToSet(keep.id);
                                users[k].save();
                            }

                            Photo.find({polishid:remove.id}, function(err, photos) {
                                for (var l=0; l<photos.length; l++) {
                                    photos[l].polishid = keep.id;
                                    photos[l].save();
                                    keep.photos.addToSet(photos[l].id);
                                }

                                keep.dateupdated = new Date();
                                keep.save(function(err) {

                                    Review.find({polish:remove.id}, function(err, reviews) {
                                        for (var m=0; m<reviews.length; m++) {
                                            reviews[m].polish = keep.id;
                                            reviews[m].save();
                                            remove.reviews.remove(reviews[m].id);
                                            keep.reviews.addToSet(reviews[m].id);
                                        }

                                        remove.save();
                                        keep.save(function(err) {

                                            Review.find({polish: keep.id}, function (err, allreviews) {
                                                if (allreviews.length > 0) {
                                                    var ratings = allreviews.map(function(x) {
                                                        if (x.rating.length > 0) {
                                                            return parseInt(x.rating);
                                                        }
                                                    })
                                                    keep.avgrating = _.mean(ratings);
                                                }
                                                keep.save(function(err) {

                                                    Checkin.find({polish:remove.id}, function(err, checkins) {
                                                        for (var n=0; n<checkins.length; n++) {
                                                            checkins[n].polish.remove(remove.id);
                                                            checkins[n].polish.addToSet(keep.id);
                                                            checkins[n].save();
                                                            remove.checkins.remove(checkins[n].id);
                                                            keep.checkins.addToSet(checkins[n].id);
                                                        }

                                                        remove.save();
                                                        keep.save();
                                                    })
                                                })
                                            })
                                        })
                                    })
                                })
                            })
                        })
                    })

                    if (!keep.batch.length) {
                        if (remove.batch.length) {
                            keep.batch = remove.batch;
                            keep.keywords = keep.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.batch + " " + keep.code;
                        }
                    }

                    if (!keep.code.length) {
                        if (remove.code.length) {
                            keep.code = remove.code;
                            keep.keywords = keep.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-") + " " + keep.batch + " " + keep.code;
                        }
                    }

                    if (remove.type.length) {
                        var input = remove.type;
                        var formatted = keep.type;
                        for (j=0; j<input.length; j++) {
                            if (formatted.indexOf(input[j]) == -1) {
                                formatted.push(input[j]);
                            }
                        }
                        keep.type = formatted;
                    }

                    if (!keep.dupes.length) {
                        if (remove.dupes.length) {
                            keep.dupes = remove.dupes;
                        }
                    }

                    if (!keep.swatch.length) {
                        if (remove.swatch.length) {
                            keep.swatch = remove.swatch;
                        }
                    }

                    if (!keep.colorscategory.length) {
                        if (remove.colorscategory) {
                            keep.colorscategory = remove.colorscategory;
                        }
                    }

                    if (!keep.colorsrgb.length) {
                        if (remove.colorsrgb) {
                            keep.colorsrgb = remove.colorsrgb;
                        }
                    }

                    if (!keep.colorsname.length) {
                        if (remove.colorsname) {
                            keep.colorsname = remove.colorsname;
                        }
                    }

                    keep.save();
                    data = {};
                    data.title = 'Combine Polishes - Lacquer Tracker';
                    data.message = 'Polishes successfully combined. Please remember to delete the polish you wish to remove.<br><br>Would you like to remove that now? Click here: <a href="https://www.lacquertracker.com/polishid/' + sanitizer.sanitize(req.body.removeid) + '/delete">Delete!</a>';
                    res.render('admin/combine.ejs', data);
                })
            })
        } else {
            data = {};
            data.title = 'Combine Polishes - Lacquer Tracker';
            data.message = 'Error combining polishes.'
            res.render('admin/combine.ejs', data);
        }
    } else {
        res.redirect('/error');
    }
});


/////////////////////////////////////////////////////////////////////////////////////////////


//admin get flagged polishes
app.get('/admin/flaggedpolish', isLoggedIn, function(req, res) {
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
app.post('/polishid/:id/flag', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id).exec(function(err, polish) {
        if (polish === null || polish === undefined) {
            res.redirect('/error');
        } else {
            polish.flagged = true;
            polish.flaggedreason = req.user.username + " - " + sanitizer.sanitize(req.body.message);
            polish.save(function(err) {
                var transport = nodemailer.createTransport({
                    sendmail: true,
                    path: "/usr/sbin/sendmail"
                });

                var mailOptions = {
                    from: "polishrobot@lacquertracker.com",
                    replyTo: "lacquertrackermailer@gmail.com",
                    to: 'lacquertrackermailer@gmail.com',
                    subject: 'Flagged Polish',
                    text: req.user.username + " has flagged a polish.\n\nReason for flagging: "+sanitizer.sanitize(req.body.message)+"\n\nhttps://www.lacquertracker.com/admin/flaggedpolish",
                }

                transport.sendMail(mailOptions, function(error, response) {
                    transport.close();
                });
                res.redirect('/browse');
            })
        }
    });
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
                res.redirect('/admin/flaggedpolish');
            }
        })
    } else {
        res.redirect('/error');
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////

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
                brand.bio = sanitizer.sanitize(req.body.bio);
                brand.official = sanitizer.sanitize(req.body.official);
                brand.polishlock = sanitizer.sanitize(req.body.polishlock);
                brand.indie = sanitizer.sanitize(req.body.indie);
                brand.save(function(err) {
                    res.redirect('/brand/' + brand.name.replace(/ /g,"_"));
                })
            }
        })
    } else {
        res.redirect('/error');
    }
});


//admin add alternate polish brand names
app.get('/admin/brandalternate', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.find().distinct('brand', function(error, brands) {
            var allbrands = _.sortBy(brands, function(b) {return b.toLowerCase();});
            Brand.find({alternatenames: {$exists: true, $not: {$size: 0}}}).sort('name').exec(function (error, somebrands) {
                data = {};
                data.brandnames = allbrands;
                data.brands = somebrands;
                data.title = 'Add Alternate Brand Names - Lacquer Tracker';
                res.render('admin/brandalternate.ejs', data);
            })
        })
    } else {
        res.redirect('/error');
    }
});


app.post('/admin/brandalternate', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.find().distinct('brand', function(error, brands) {
            var allbrands = _.sortBy(brands, function(b) {return b.toLowerCase();});
                Brand.findOne({name:sanitizer.sanitize(req.body.brand)}, function(err, brand) {
                    if (brand) {
                        brand.alternatenames.addToSet(sanitizer.sanitize(req.body.alternate.toLowerCase()));
                        brand.save(function(err) {
                            Brand.find({}, function (error, somebrands) {
                                data = {};
                                data.title = 'Add Alternate Brand Names - Lacquer Tracker';
                                data.brandnames = allbrands;
                                data.brands = somebrands;
                                data.message = 'Alternate name successfully saved. Add another?';
                                res.render('admin/brandalternate.ejs', data);
                            })
                        })
                    } else {
                        Brand.find({}, function (error, somebrands) {
                            data = {};
                            data.title = 'Add Alternate Brand Names - Lacquer Tracker';
                            data.brandnames = allbrands;
                            data.brands = somebrands;
                            data.message = 'Error adding alternate name.';
                            res.render('admin/brandalternate.ejs', data);
                        })
                    }
                })
        })
    } else {
        res.redirect('/error');
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////


//admin portal
app.get('/admin/portal', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        data = {};
        data.title = 'Admin Portal - Lacquer Tracker';
        res.render('admin/portal.ejs', data);
    } else {
        res.redirect('/error');
    }
});



// //fix things in mongo
// app.get('/admin/fixtypes', isLoggedIn, function(req, res) {
//     Polish.find({}, function(err, polish) {
//         for (i=0; i<polish.length; i++) {
//             if (polish[i].type) {
//                 if (polish[i].type.length > 0) {
//                     polish[i].typenew = polish[i].type.split(',');
//                     polish[i].save();
//                 } else {
//                     polish[i].typenew = [];
//                 }
//             } else {
//                 polish[i].typenew = [];
//             }
//         }
//     })
// });
//for above:
//db.polishes.update({}, {$unset:{"type":""}}, false, true)
//db.polishes.update({}, {$rename:{"typenew":"type"}}, false, true)



//fix reviews
// app.get('/admin/fixreviews', isLoggedIn, function(req, res) {
//     Review.find({}).populate('polish').exec(function(err, reviews) {
//         for (i=0; i<reviews.length; i++) {
//             reviews[i].polish.reviews.push(reviews[i].id);
//             reviews[i].polish.save();
//         }
//     })
// });
// //db.polishes.update({}, {$set:{"reviews":[]}}, false, true)



//update colors based on current swatches and color list
app.get('/admin/updatecolors', isLoggedIn, function(req, res) {
    Polish.find({}, function (err, polish) {
        for (i=0; i<polish.length; i++) {
            if (polish[i].swatch) {
                if (polish[i].swatch.length > 0) {
                    var colorThief = new ColorThief();
                    var colorsrgb = colorThief.getPalette(path.resolve('./public/' + polish[i].swatch), 2);
                    var colorsname = [];
                    var colorscategory = [];
                    for (j=0; j<colorsrgb.length; j++) {
                        var deltas = [];
                        for (k=0; k<PolishColors.length; k++) {
                            deltas.push(deltaE(rgb2lab(PolishColors[k].rgb), rgb2lab(colorsrgb[j])));
                        }
                        colorsname.push(PolishColors[deltas.indexOf(Math.min(...deltas))].name);
                        colorscategory.push(PolishColors[deltas.indexOf(Math.min(...deltas))].category);
                    }
                    polish[i].colorsrgb = colorsrgb;
                    polish[i].colorsname = colorsname;
                    polish[i].colorscategory = colorscategory;
                    polish[i].save();
                }
            }
        }
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