var Polish = require('../app/models/polish');
var Brand = require('../app/models/brand');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var Checkin = require('../app/models/checkin');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var _ = require('lodash');
var fs = require('node-fs');
var path = require('path');
var PolishTypes = require('../app/constants/polishTypes');


module.exports = function(app, passport) {


//view a polish by name
app.get('/polish/:brand/:name', function(req, res) {

    Polish.findOne({brand: req.params.brand.replace(/_/g," "), name:req.params.name.replace(/_/g," ")}).populate('dupes', 'brand name').populate('checkins', 'photo pendingdelete').populate('photos').exec(function(err, polish) {
        if (polish === null) {
            res.redirect('/error');
        } else {
            data = {};
            data.title = polish.name + ' - ' + polish.brand + ' - Lacquer Tracker'
            data.pname = polish.name;
            data.pbrand = polish.brand;
            data.pbatch = polish.batch;
            data.pswatch = polish.swatch;
            data.pcolors = polish.colorsname;
            data.ptype = polish.type;
            data.pcode = polish.code;
            data.pid = polish.id;
            data.pdupes = polish.dupes;
            data.linkbrand = polish.brand.replace("%20"," ");
            data.linkname = polish.name.replace("%20"," ");
            data.checkins = polish.checkins;

            var formattedTypes = PolishTypes.map(function(type) {
                return {value: type, text: type};
            });
            data.types = formattedTypes;

            var allphotos = [];
            polish.photos.map(function(x) {
                if (x.pendingdelete === false) {
                    allphotos.push(x);
                }
            })
            data.allphotos = _.shuffle(allphotos);
            data.numphotos = allphotos.length;

            if (req.isAuthenticated()) {

                if (req.user.ownedpolish.indexOf(polish.id) > -1) {
                    data.status = "owned";
                } else if (req.user.wantedpolish.indexOf(polish.id) > -1) {
                    data.status = "wanted";
                } else {
                    data.status = "none";
                }


                Review.findOne({user:req.user.id, polish:polish.id}).populate('user', 'username').exec(function (err, review) {
                    if (review) {
                    data.rating = review.rating;
                    data.review = review.review;
                    data.notes = review.notes;
                    } else {
                    data.rating = "";
                    data.review = "";
                    data.notes = "";
                    }

                Review.find({polish:polish.id}).populate('user', 'username').exec(function(err, r) {
                    data.allreviews = r;
                    res.render('polish/polish.ejs', data);
                })

                })
            } else {
                data.rating = "";
                data.review = "";
                data.notes = "";
                data.status = "none";
                Review.find({polish:polish.id}).populate('user', 'username').exec(function(err, r) {
                    data.allreviews = r;
                    res.render('polish/polish.ejs', data);
                })
            }
        }
    });
});


//view a polish by id
app.get('/polishid/:id', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        Polish.findById(req.params.id).populate('dupes', 'brand name').populate('checkins', 'photo pendingdelete').populate('photos').exec(function(err, polish) {
            if (polish === null) {
                res.redirect('/error');
            } else {
                data = {};
                data.title = polish.name + ' - ' + polish.brand + ' - Lacquer Tracker'
                data.pname = polish.name;
                data.pbrand = polish.brand;
                data.pbatch = polish.batch;
                data.pswatch = polish.swatch;
                data.ptype = polish.type;
                data.pcolors = polish.colorsname;
                data.pcode = polish.code;
                data.pid = polish.id;
                data.pdupes = polish.dupes;
                data.linkbrand = polish.brand.replace("%20"," ");
                data.linkname = polish.name.replace("%20"," ");
                data.checkins = polish.checkins;

                var formattedTypes = PolishTypes.map(function(type) {
                    return {value: type, text: type};
                });
                data.types = formattedTypes;

                var allphotos = [];
                polish.photos.map(function(x) {
                    if (x.pendingdelete === false) {
                        allphotos.push(x);
                    }
                })
                data.allphotos = _.shuffle(allphotos);
                data.numphotos = allphotos.length;

                if (req.isAuthenticated()) {

                    if (req.user.ownedpolish.indexOf(polish.id) > -1) {
                        data.status = "owned";
                    } else if (req.user.wantedpolish.indexOf(polish.id) > -1) {
                        data.status = "wanted";
                    } else {
                        data.status = "none";
                    }


                    Review.findOne({user:req.user.id, polish:polish.id}).populate('user', 'username').exec(function (err, review) {
                        if (review) {
                        data.rating = review.rating;
                        data.review = review.review;
                        data.notes = review.notes;
                        } else {
                        data.rating = "";
                        data.review = "";
                        data.notes = "";
                        }

                    Review.find({polish:polish.id}).populate('user', 'username').exec(function(err, r) {
                        data.allreviews = r;
                        res.render('polish/polish.ejs', data);
                    })

                    })
                } else {
                    data.rating = "";
                    data.review = "";
                    data.notes = "";
                    data.status = "none";
                    Review.find({polish:polish.id}).populate('user', 'username').exec(function(err, r) {
                        data.allreviews = r;
                        res.render('polish/polish.ejs', data);
                    })
                }
            }
        })
    } else {
        res.redirect('/error');
    }
});


//////////////////////////////////////////////////////////////////////////////


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


///////////////////////////////////////////////////////////////////////////

//delete polish by view page
app.get('/polish/:brand/:name/delete', isLoggedIn, function(req, res) {
    if (req.user.level !== "admin") {
        res.redirect('/error')
    } else if (req.user.level === "admin") {
        Polish.findOne({brand: req.params.brand.replace(/_/g," "), name:req.params.name.replace(/_/g," ")}, function(err, polish) {
            if (polish === null) {
                res.redirect('/error');
            } else {
                req.user.ownedpolish.remove(polish.id);
                req.user.wantedpolish.remove(polish.id);
                req.user.save();
                fs.unlink(path.resolve('./public/'+polish.swatch), function(err) {
                    //removing
                })
                Checkin.find({polish:polish.id}, function (err, checkins) {
                    for (i=0; i<checkins.length; i++) {
                        checkins[i].polish.remove(polish.id);
                        checkins[i].save();
                    }
                })
                Photo.find({polishid:polish.id}, function(err, photos) {
                    for (j=0; j<photos.length; j++) {
                        fs.unlink(path.resolve('./public/'+photos[j].location), function(err) {
                            //removing
                        })
                        photos[j].remove();
                    }
                })
                Review.deleteMany({polish:polish.id}, function(err){
                    //removing
                });
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
        Polish.findById(req.params.id).exec(function(err, polish) {
            if (polish === null) {
                res.redirect('/error');
            } else {
                req.user.ownedpolish.remove(polish.id);
                req.user.wantedpolish.remove(polish.id);
                req.user.save();
                fs.unlink(path.resolve('./public/'+polish.swatch), function(err) {
                    //removing
                })
                Checkin.find({polish:polish.id}, function (err, checkins) {
                    for (i=0; i<checkins.length; i++) {
                        checkins[i].polish.remove(polish.id);
                        checkins[i].save();
                    }
                })
                Photo.find({polishid:polish.id}, function(err, photos) {
                    for (j=0; j<photos.length; j++) {
                        fs.unlink(path.resolve('./public/'+photos[j].location), function(err) {
                            //removing
                        })
                        photos[j].remove();
                    }
                })
                Review.deleteMany({polish:polish.id}, function(err){
                    //removing
                });
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
        data.types = PolishTypes;
        res.render('polish/add.ejs', data);
    })
});

app.post('/polishadd', isLoggedIn, function(req, res) {
    if (req.body.name.length > 0 && req.body.brand.length > 0) {
        var polishNameToFind = sanitizer.sanitize(req.body.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,''));
        var polishBrandEntered = sanitizer.sanitize(req.body.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,''));
        var polishBrandToFind;
        Brand.findOne({alternatenames:polishBrandEntered.toLowerCase()}, function(err, brand) {
            if (brand) {
                polishBrandToFind = brand.name;
            } else {
                polishBrandToFind = polishBrandEntered;
            }
            Polish.find({name: new RegExp("^"+polishNameToFind+"$","i"), brand: new RegExp("^"+polishBrandToFind+"$", "i")}, function(err, polish) {
                if (polish.length !== 0) {
                    Polish.find().distinct('brand', function(error, brands) {
                        var allbrands = _.sortBy(brands, function(b) {return b.toLowerCase();});
                        data = {};
                        data.title = 'Add a Polish - Lacquer Tracker';
                        data.message = 'That polish already exists in the database.';
                        data.brands = allbrands;
                        data.types = PolishTypes;
                        res.render('polish/add.ejs', data);
                    })
                } else {
                    var newPolish = new Polish ({
                        name: polishNameToFind,
                        brand: polishBrandToFind,
                        batch: sanitizer.sanitize(req.body.batch),
                        code: sanitizer.sanitize(req.body.code.replace(/^\s+|\s+$/g,'')),
                        keywords: sanitizer.sanitize(req.body.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")) + " " + sanitizer.sanitize(req.body.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")) + " " + sanitizer.sanitize(req.body.batch) + " " + sanitizer.sanitize(req.body.code),
                        dateupdated: new Date(),
                        createdby: req.user.id,
                        dupes: sanitizer.sanitize(req.body.dupes),
                        swatch: '',
                        checkins: [],
                    });
                    newPolish.save(function(err) {
                        if (err) {
                            console.log(err);
                            res.redirect('/error');
                        } else {
                            if (req.body.type !== undefined) {
                                newPolish.type = sanitizer.sanitize(req.body.type).split(',');
                            } else {
                                newPolish.type = [];
                            }
                            if (req.body.colorcategory !== undefined) {
                                newPolish.colorscategory = sanitizer.sanitize(req.body.colorcategory.split(','));
                            }
                            newPolish.save(function(err) {
                                Brand.findOne({name: polishBrandToFind}, function(err, brand) {
                                    //check if brand is already in brand database
                                    if (!brand) {
                                        var newBrand = new Brand ({
                                            name: polishBrandToFind,
                                            bio: '',
                                            photo: '',
                                            official: false,
                                            indie: false,
                                            alternatenames: [polishBrandToFind.toLowerCase()]
                                        })
                                        newBrand.save(function(err) {
                                            res.render('polish/addsuccessful.ejs', {title:'Add another? - Lacquer Tracker', url:'/polish/' + newPolish.brand.replace(/ /g,"_") + "/" + newPolish.name.replace(/ /g,"_"), polishid:newPolish.id});
                                        })
                                    } else {
                                        res.render('polish/addsuccessful.ejs', {title:'Add another? - Lacquer Tracker', url:'/polish/' + newPolish.brand.replace(/ /g,"_") + "/" + newPolish.name.replace(/ /g,"_"), polishid:newPolish.id});
                                    }
                                })
                            })
                        }
                    });
                }
            });
        });
    } else {
        res.redirect('/error');
    }
});




///////////////////////////////////////////////////////////////////////////


//edit polish
app.get('/polishedit/:id/dupes', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id).populate('dupes', 'brand name').exec(function(err, p) {
        if (p === null || err) {
            res.redirect('/error');
        } else {
            Polish.find({}).sort({brand: 1}).sort({name: 1}).exec(function (err, polishes) {
                var data = {};
                data.title = 'Edit Dupes - Lacquer Tracker';
                data.editid = p.id;
                data.editname = p.name;
                data.editbrand = p.brand;
                data.editdupes = p.dupes;
                data.polish = polishes;
                res.render('polish/edit.ejs', data);
            })
        }
    });
});

app.post('/polishedit/:id/dupes', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, polish) {
        var currentDupes = polish.dupes;
        if (!polish) {
            res.redirect('/error');
        } else {
            if (req.user.level === "admin") {
                polish.name = sanitizer.sanitize((req.body.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")));
                polish.brand = sanitizer.sanitize((req.body.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")));
                Brand.findOne({alternatenames:sanitizer.sanitize((req.body.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")).toLowerCase())}, function(err, brand) {
                    if (brand === null || brand === undefined) {
                        var newBrand = new Brand ({
                            name: sanitizer.sanitize((req.body.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-"))),
                            bio: '',
                            photo: '',
                            official: false,
                            polishlock: false,
                            alternatenames: [sanitizer.sanitize((req.body.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")).toLowerCase())]
                        })
                        newBrand.save();
                    }
                });
            }
            for (i=0; i<currentDupes.length; i++) {
                Polish.findById(currentDupes[i]).exec(function(err, polish) {
                    polish.dupes.remove(req.params.id);
                    polish.save();
                })
            }
            if (req.body.dupes) {
                polish.dupes = sanitizer.sanitize(req.body.dupes).split(',');
                var newDupes = sanitizer.sanitize(req.body.dupes).split(',');
            } else {
                polish.dupes = [];
                var newDupes = [];
            }
            polish.dateupdated = new Date();
            polish.save(function(err) {
                if (req.body.dupes) {
                    for (j=0; j<newDupes.length; j++) {
                        Polish.findById(newDupes[j]).exec(function(err, dupepolish) {
                            dupepolish.dupes.push(req.params.id);
                            dupepolish.save();
                        })
                    }
                }
                polish.keywords = sanitizer.sanitize(polish.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")) + " " + sanitizer.sanitize(polish.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")) + " " + sanitizer.sanitize(polish.batch) + " " + sanitizer.sanitize(polish.code);
                polish.save(function(err) {
                    res.redirect('/polish/' + polish.brand.replace(/ /g,"_") + "/" + polish.name.replace(/ /g,"_"));;
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
                p.keywords = sanitizer.sanitize(p.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")) + " " + sanitizer.sanitize(p.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")) + " " + sanitizer.sanitize(p.batch) + " " + sanitizer.sanitize(p.code);
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
                p.keywords = sanitizer.sanitize(p.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")) + " " + sanitizer.sanitize(p.brand.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-")) + " " + sanitizer.sanitize(p.batch) + " " + sanitizer.sanitize(p.code);
                p.save(function(err) {
                    res.end();
                })
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
                p.type = sanitizer.sanitize(req.body.value).split(',')
                p.dateupdated = new Date();
            } else {
                p.dateupdated = new Date();
                p.type = [];
            }
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