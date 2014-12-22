var Polish = require('../app/models/polish');
var Brand = require('../app/models/brand');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');

module.exports = function(app, passport) {


app.get('/polish/:brand/:name', function(req, res) {

    Polish.findOne({brand: req.params.brand.replace(/_/g," "), name:req.params.name.replace(/_/g," ")}, function(err, polish) {
        if (polish === null) {
            res.redirect('/error');
        } else {
            data = {};
            data.title = polish.name + ' - ' + polish.brand + ' - Lacquer Tracker'
            data.pname = polish.name;
            data.pbrand = polish.brand;
            data.pbatch = polish.batch;
            data.pcolorcat = polish.colorcat;
            data.pswatch = polish.swatch;
            data.ptype = polish.type;
            data.pcode = polish.code;
            data.pid = polish.id;
            data.pindie = polish.indie;
            data.pdupes = markdown(polish.dupes);
            data.linkbrand = polish.brand.replace("%20"," ");
            data.linkname = polish.name.replace("%20"," ");

            Photo.find({polishid : polish.id, pendingdelete:false}, function(err, photo) {
                if (photo.length < 1) {
                    data.numphotos = 0;
                } else {
                    var allphotos = photo.map(function(x) {
                        return x;
                    })
                    data.allphotos = _.shuffle(allphotos);
                    data.numphotos = allphotos.length;
                }

                if (req.isAuthenticated()) {

                    if (req.user.ownedpolish.indexOf(polish.id) > -1) {
                        data.status = "owned";
                    } else if (req.user.wantedpolish.indexOf(polish.id) > -1) {
                        data.status = "wanted";
                    } else {
                        data.status = "none";
                    }


                    Review.findOne({user:req.user.id, polishid:polish.id}).populate('user').exec(function (err, review) {
                        if (review) {
                        data.rating = review.rating;
                        data.userreview = review.userreview;
                        data.notes = review.notes;
                        } else {
                        data.rating = "";
                        data.userreview = "";
                        data.notes = "";
                        }

                    Review.find({polishid:polish.id}).populate('user').exec(function(err, r) {
                        data.allreviews = r;
                        res.render('polish/polish.ejs', data);
                    })

                    })
                } else {
                    data.rating = "";
                    data.userreview = "";
                    data.notes = "";
                    data.status = "none";
                    Review.find({polishid:polish.id}).populate('user').exec(function(err, r) {
                        data.allreviews = r;
                        res.render('polish/polish.ejs', data);
                    })
                }
            })
        }
    });
});


app.get('/polishid/:id', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.findById(req.params.id, function(err, polish) {
            if (polish === null) {
                res.redirect('/error');
            } else {
                data = {};
                data.title = polish.name + ' - ' + polish.brand + ' - Lacquer Tracker'
                data.pname = polish.name;
                data.pbrand = polish.brand;
                data.pbatch = polish.batch;
                data.pcolorcat = polish.colorcat;
                data.pswatch = polish.swatch;
                data.ptype = polish.type;
                data.pcode = polish.code;
                data.pid = polish.id;
                data.pindie = polish.indie;
                data.pdupes = markdown(polish.dupes);
                data.linkbrand = polish.brand.replace("%20"," ");
                data.linkname = polish.name.replace("%20"," ");

                Photo.find({polishid : polish.id, pendingdelete:false}, function(err, photo) {
                    if (photo.length < 1) {
                        data.numphotos = 0;
                    } else {
                        var allphotos = photo.map(function(x) {
                            return x;
                        })
                        data.allphotos = _.shuffle(allphotos);
                        data.numphotos = allphotos.length;
                    }

                    if (req.isAuthenticated()) {

                        if (req.user.ownedpolish.indexOf(polish.id) > -1) {
                            data.status = "owned";
                        } else if (req.user.wantedpolish.indexOf(polish.id) > -1) {
                            data.status = "wanted";
                        } else {
                            data.status = "none";
                        }


                        Review.findOne({user:req.user.id, polishid:polish.id}).populate('user').exec(function (err, review) {
                            if (review) {
                            data.rating = review.rating;
                            data.userreview = review.userreview;
                            data.notes = review.notes;
                            } else {
                            data.rating = "";
                            data.userreview = "";
                            data.notes = "";
                            }

                        Review.find({polishid:polish.id}).populate('user').exec(function(err, r) {
                            data.allreviews = r;
                            res.render('polish/polish.ejs', data);
                        })

                        })
                    } else {
                        data.rating = "";
                        data.userreview = "";
                        data.notes = "";
                        data.status = "none";
                        Review.find({polishid:polish.id}).populate('user').exec(function(err, r) {
                            data.allreviews = r;
                            res.render('polish/polish.ejs', data);
                        })
                    }
                })
            }
        })
    } else {
        res.redirect('/error');
    }
});


//add own polish
app.get('/addown/:id', isLoggedIn, function(req, res) {
    req.user.wantedpolish.remove(req.params.id);
    req.user.ownedpolish.addToSet(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        p.dateupdated = new Date();
        p.save(function(err) {
            res.redirect('/polish/' + p.brand.replace(/ /g,"_") + '/' + p.name.replace(/ /g,"_"));
        })
    })
});

//add wishlist polish
app.get('/addwant/:id', isLoggedIn, function(req, res) {
    req.user.wantedpolish.addToSet(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        p.dateupdated = new Date();
        p.save(function(err) {
            res.redirect('/polish/' + p.brand.replace(/ /g,"_") + '/' + p.name.replace(/ /g,"_"));
        })
    })
});


//add own polish browse
app.post('/addownbrowse/:id', isLoggedIn, function(req, res) {
    req.user.wantedpolish.remove(req.params.id);
    req.user.ownedpolish.addToSet(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        p.dateupdated = new Date();
        p.save(function(err) {
            res.end();
        })
    })
});

//add wishlist polish browse
app.post('/addwantbrowse/:id', isLoggedIn, function(req, res) {
    req.user.wantedpolish.addToSet(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        p.dateupdated = new Date();
        p.save(function(err) {
            res.end();
        })
    })
});

//remove owned polish
app.get('/removeown/:id', isLoggedIn, function(req, res) {
    req.user.ownedpolish.remove(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + '/' + p.name.replace(/ /g,"_"))
    })
});

//remove wanted polish
app.get('/removewant/:id', isLoggedIn, function(req, res) {
    req.user.wantedpolish.remove(req.params.id);
    req.user.save();
    Polish.findById(req.params.id, function(err, p) {
        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + '/' + p.name.replace(/ /g,"_"))
    })
});

//delete polish by view page
app.get('/polish/:brand/:name/delete', isLoggedIn, function(req, res) {
    if (req.user.level !== "admin") {
        res.redirect('/error')
    } else if (req.user.level === "admin") {
        Polish.findOne({brand: req.params.brand.replace(/_/g," "), name:req.params.name.replace(/_/g," ")}, function(err, polish) {
            if (polish === null) {
                res.redirect('/error');
            } else {
                polish.remove();
                res.redirect('/browse');
            }
        })
    }
});

//delete polish by ID
app.get('/polishid/:id/delete', isLoggedIn, function(req, res) {
    if (req.user.level !== "admin") {
        res.redirect('/error')
    } else if (req.user.level === "admin") {
        Polish.findById(req.params.id, function(err, polish) {
            if (polish === null) {
                res.redirect('/error');
            } else {
                polish.remove();
                res.redirect('/browse');
            }
        })
    }
});


///////////////////////////////////////////////////////////////////////////


//add polish
app.get('/polishadd', isLoggedIn, function(req, res) {
    Polish.find().distinct('brand', function(error, brands) {
        var allbrands = _.sortBy(brands, function(b) {return b.toLowerCase();});
        data = {};
        data.title = 'Add a Polish - Lacquer Tracker';
        data.brands = allbrands;
        res.render('polish/add.ejs', data);
    })
});

app.post('/polishadd', isLoggedIn, function(req, res) {
    Polish.findOne({ name : req.body.name.replace(/^\s+|\s+$/g,''), brand : req.body.brand.replace(/^\s+|\s+$/g,'')}, function(err, polish) {
        //check to see if there's already a polish name and brand in the database
        if (polish) {
            res.render('polish/add.ejs', {title: 'Add a Polish - Lacquer Tracker', message: 'That polish already exists in the database.'});
        } else {
            var newPolish = new Polish ({
                name: sanitizer.sanitize((req.body.name).replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-").replace(/^\s+|\s+$/g,'')),
                brand: sanitizer.sanitize((req.body.brand).replace(/[()?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-").replace(/^\s+|\s+$/g,'')),
                batch: sanitizer.sanitize(req.body.batch),
                indie: req.body.indie,
                code: sanitizer.sanitize(req.body.code).replace(/^\s+|\s+$/g,''),
                keywords: sanitizer.sanitize(req.body.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")) + " " + sanitizer.sanitize(req.body.brand.replace(/[()?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")) + " " + sanitizer.sanitize(req.body.batch) + " " + sanitizer.sanitize(req.body.code),
                dateupdated: new Date(),
                dupes: sanitizer.sanitize(req.body.dupes),
                swatch: '',
            });
            newPolish.save(function(err) {
                if (err) {
                    res.redirect('/error');
                } else {
                    if (req.body.type !== undefined) {
                        newPolish.type = req.body.type;
                    } else {
                        newPolish.type = '';
                    }
                    if (req.body.colorcat !== undefined) {
                        newPolish.colorcat = req.body.colorcat;
                    } else {
                        newPolish.colorcat = '';
                    }
                    newPolish.save(function(err) {
                        Brand.findOne({name: req.body.brand.replace(/^\s+|\s+$/g,'')}, function(err, brand) {
                            //check if brand is already in brand database
                            if (brand) {
                                res.render('polish/addsuccessful.ejs', {title:'Add another? - Lacquer Tracker', url:'/polish/' + newPolish.brand.replace(/ /g,"_") + "/" + newPolish.name.replace(/ /g,"_")});
                            } else {
                                var newBrand = new Brand ({
                                    name: req.body.brand.replace(/^\s+|\s+$/g,''),
                                    website: '',
                                    bio: '',
                                    photo: '',
                                    official: false,
                                })
                                newBrand.save(function(err) {
                                    res.render('polish/addsuccessful.ejs', {title:'Add another? - Lacquer Tracker', url:'/polish/' + newPolish.brand.replace(/ /g,"_") + "/" + newPolish.name.replace(/ /g,"_"), polishid:newPolish.id});
                                })
                            }
                        })
                    })
                }
            });
        }
    });
});


///////////////////////////////////////////////////////////////////////////


//edit polish
app.get('/polishedit/:id/dupes', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (p === null || err) {
            res.redirect('/error');
        } else {
            var data = {};
                data.title = 'Edit Dupes - Lacquer Tracker';
                data.editid = p.id;
                data.editname = p.name;
                data.editbrand = p.brand;
                data.editdupes = p.dupes;
            res.render('polish/edit.ejs', data);
        }
    });
});

app.post('/polishedit/:id/dupes', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (!p) {
            res.redirect('/error');
        } else {
            p.name = sanitizer.sanitize((req.body.name).replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")),
            p.brand = sanitizer.sanitize((req.body.brand).replace(/[()?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")),
            p.dupes = sanitizer.sanitize(req.body.dupes);
            p.dateupdated = new Date();
            p.save(function(err) {
                p.keywords = sanitizer.sanitize(p.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")) + " " + sanitizer.sanitize(p.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")) + " " + sanitizer.sanitize(p.batch) + " " + sanitizer.sanitize(p.code);
                p.save(function(err) {
                    res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));;
                })
            });
        }
    });
});

app.post('/polishedit/:id/code', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (!p) {
            res.redirect('/error');
        } else {
            p.code = sanitizer.sanitize(req.body.value);
            p.dateupdated = new Date();
            p.save(function(err) {
                p.keywords = sanitizer.sanitize(p.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")) + " " + sanitizer.sanitize(p.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")) + " " + sanitizer.sanitize(p.batch) + " " + sanitizer.sanitize(p.code);
                p.save(function(err) {
                    res.end();
                })
            })
        }
    });
});

app.post('/polishedit/:id/batch', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (!p) {
            res.redirect('/error');
        } else {
            p.batch = sanitizer.sanitize(req.body.value);
            p.dateupdated = new Date();
            p.save(function(err) {
                p.keywords = sanitizer.sanitize(p.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")) + " " + sanitizer.sanitize(p.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\/]/g,"-")) + " " + sanitizer.sanitize(p.batch) + " " + sanitizer.sanitize(p.code);
                p.save(function(err) {
                    res.end();
                })
            });
        }
    });
});

app.post('/polishedit/:id/colorcat', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (!p) {
            res.redirect('/error');
        } else {
            if (req.body.value !== undefined) {
                p.colorcat = sanitizer.sanitize(req.body.value);
                p.dateupdated = new Date();
            } else {
                p.dateupdated = new Date();
                p.colorcat = '';
            }
            p.save(function(err) {
                res.end();
            });
        }
    });
});

app.post('/polishedit/:id/type', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (!p) {
            res.redirect('/error');
        } else {
            if (req.body.value !== undefined) {
                p.type = sanitizer.sanitize(req.body.value);
                p.dateupdated = new Date();
            } else {
                p.dateupdated = new Date();
                p.type = '';
            }
            p.save(function(err) {
                res.end();
            });
        }
    });
});

app.post('/polishedit/:id/indie', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (!p) {
            res.redirect('/error');
        } else {
            p.indie = sanitizer.sanitize(req.body.value);
            p.dateupdated = new Date();
            p.save(function(err) {
                res.end();
            });
        }
    });
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