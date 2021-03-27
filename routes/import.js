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
var csv = require('ya-csv');
var PolishTypes = require('../app/constants/polishTypes');
var PolishColors = require('../app/constants/polishColors');
var nodemailer = require('nodemailer');
var request = require('request');
var http = require('http');
var accents = require('remove-accents');


module.exports = function(app, passport) {


//User sends request to import polish from CSV
app.get('/import', isLoggedIn, function(req, res) {
    data = {};
    data.title = 'Import Polish - Lacquer Tracker';
    data.meta = 'Track your nail polish by uploading your spreadsheet of owned shades into Lacquer Tracker.';
    res.render('polish/importuser.ejs', data);
});


app.post('/import', isLoggedIn, function(req, res) {
    if (req.files.spreadsheet.name.length > 0) {
        if (req.files.spreadsheet.mimetype.startsWith("text/csv") ||
            req.files.spreadsheet.mimetype.startsWith("application/csv") ||
            req.files.spreadsheet.mimetype.startsWith("application/x-csv") ||
            req.files.spreadsheet.mimetype.startsWith("text/comma-separated-values") ||
            req.files.spreadsheet.mimetype.startsWith("text/x-comma-separated-values") ||
            req.files.spreadsheet.mimetype.startsWith("text/tab-separated-values") ||
            req.files.spreadsheet.mimetype.startsWith("application/vnd.ms-excel") ||
            req.files.spreadsheet.mimetype.startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml")
            ) {
            //send import request e-mail
            var transport = nodemailer.createTransport({
                sendmail: true,
                path: "/usr/sbin/sendmail"
            });
            var mailOptions = {
                from: "polishrobot@lacquertracker.com",
                to: 'lacquertrackermailer@gmail.com',
                subject: 'Import Polish Request',
                text: req.user.username + " has requested to add the attached polish.\n\nOwnership option: " + req.body.ownership,
                attachments: {
                    filename: req.user.username + path.extname(req.files.spreadsheet.name),
                    path: req.files.spreadsheet.tempFilePath
                }
            }
            transport.sendMail(mailOptions, function(error, response) {
                if (error) {
                    fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
                        res.render('polish/importuser.ejs', {title: 'Import Polish - Lacquer Tracker', message:'Error. Please try again later.'});
                    })
                }
                else {
                    fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
                        res.render('polish/importuser.ejs', {title: 'Import Polish - Lacquer Tracker', message: "Success! Your polish file has been sent for validation. Please allow time for review."});
                    })
                }
                transport.close();
            });
        } else {
            fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
                res.render('polish/importuser.ejs', {title: 'Import Polish - Lacquer Tracker', message:'Error: Filetype not CSV or Excel format.'});
            })
        }
    } else {
        fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
            res.render('polish/importuser.ejs', {title: 'Import Polish - Lacquer Tracker', message:'Error: Filetype not CSV or Excel format.'});
        })
    }
})



//admin validates CSV file and proceeds to upload
app.get('/admin/import', isLoggedIn, function(req, res) {
    if (req.user.level == "admin") {
        data = {};
        data.title = 'Admin Import Polish - Lacquer Tracker';
        res.render('polish/importadmin.ejs', data);
    } else {
        res.redirect('/error');
    }
});



app.post('/admin/importbrands', isLoggedIn, function(req, res) {
    if (req.files.spreadsheet.name.length > 0) {
        if (req.files.spreadsheet.mimetype.startsWith("text/csv") || req.files.spreadsheet.mimetype.startsWith("application/vnd.ms-excel")) {
            var reader = csv.createCsvFileReader(req.files.spreadsheet.tempFilePath, {columnsFromHeader:true, 'separator': ','});
            reader.addListener('data', function(data, err) {
                if (data.brand.length > 0) {
                    var polishBrandEntered = sanitizer.sanitize(data.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,'').replace(/\s+/g, " ").trim());
                    Brand.findOne({alternatenames:polishBrandEntered.toLowerCase()}, function(err, brand) {
                        if (!brand) {
                            var newBrand = new Brand ({
                                name: polishBrandEntered,
                                bio: '',
                                photo: '',
                                official: false,
                                polishlock: false,
                                alternatenames: [polishBrandEntered.toLowerCase()],
                                polish: [],
                            })
                            newBrand.save();
                        }
                    })
                }
            })
            reader.addListener('end', function(){
                fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
                    res.render('polish/importadmin.ejs', {title: 'Admin Import Polish - Lacquer Tracker', message: "Success! The brands have been added. Continue to step 2."});
                })
            })
        } else {
            fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
                res.render('polish/importadmin.ejs', {title: 'Import Polish - Lacquer Tracker', message:'Error: Filetype not .CSV'});
            })
        }
    } else {
        fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
            res.render('polish/importadmin.ejs', {title: 'Import Polish - Lacquer Tracker', message:'Error: Filetype not .CSV'});
        })
    }
});



app.post('/admin/importpolish', isLoggedIn, function(req, res) {
    if (req.files.spreadsheet.name.length > 0) {
        if (req.files.spreadsheet.mimetype.startsWith("text/csv") || req.files.spreadsheet.mimetype.startsWith("application/vnd.ms-excel")) {
            var reader = csv.createCsvFileReader(req.files.spreadsheet.tempFilePath, {columnsFromHeader:true, 'separator': ','});
            reader.addListener('data', function(data, err) {
                if (data.name.length > 0 && data.brand.length > 0) {
                    var polishNameToFind = sanitizer.sanitize(data.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,'').replace(/[#]/g,"").replace(/\s+/g, " ").replace(/[_]/g,"-").trim());
                    var polishBrandEntered = sanitizer.sanitize(data.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,'').replace(/[#]/g,"").replace(/\s+/g, " ").replace(/[_]/g,"-").trim());
                    var polishBrandToFind;
                    Brand.findOne({alternatenames:polishBrandEntered.toLowerCase()}, function(err, brand) {
                        polishBrandToFind = brand.name;
                        Polish.findOne({name: new RegExp("^"+polishNameToFind+"$","i"), brand: new RegExp("^"+polishBrandToFind+"$", "i")}, function(err, polish) {
                            if (polish !== null) {
                                if (req.body.ownership == "yes") {
                                    User.findOne({'username':new RegExp(["^", sanitizer.sanitize(req.body.user), "$"].join(""), "i")}, function(err, user) {
                                        if (user !== null) {
                                            user.wantedpolish.remove(polish.id);
                                            user.ownedpolish.addToSet(polish.id);
                                            user.save();
                                        }
                                    })
                                }

                                if ((data.collection) && (polish.batch == '')) {
                                    polish.batch = sanitizer.sanitize(data.collection.replace(/[&]/g,"and").replace(/\s+/g, " ").trim());
                                }

                                if ((data.code) && (polish.code == '')) {
                                    polish.code = sanitizer.sanitize(data.code);
                                }

                                if (data.type) {
                                    if (data.type.length > 0) {
                                        var input = sanitizer.sanitize(data.type).toLowerCase().replace("cream","creme").replace("crème","creme").replace("holographic","holo").replace("flakes","flakie").replace("top coat","top").replace("base coat","base").split(/[ ,]+/);
                                        input = input.map(function (item) {
                                          return item.trim();
                                        });
                                        var formatted = polish.type;
                                        var types = PolishTypes;
                                        var typesTools = [];
                                        for (i=0; i<types.length; i++) {
                                            if ((input.indexOf(types[i].name) !== -1) && (formatted.indexOf(types[i].name) === -1)) {
                                                formatted.push(types[i].name);
                                            }
                                            if (types[i].category == "tool") {
                                                typesTools.push(types[i].name);
                                            }
                                        }
                                        if (_.intersection(typesTools,formatted).length > 0) {
                                            polish.tool = true;
                                        } else {
                                            polish.tool = false;
                                        }
                                        polish.type = formatted;
                                    }
                                }

                                if (data.color) {
                                    if (data.color.length > 0) {
                                        var input = sanitizer.sanitize(data.color).toLowerCase().replace("grey","gray").split(/[ ,]+/);
                                        input = input.map(function (item) {
                                          return item.trim();
                                        });
                                        if (polish.colorscategory) {
                                            var formatted = polish.colorscategory;
                                        } else {
                                            var formatted = [];
                                        }
                                        var colors = PolishColors;
                                        for (i=0; i<colors.length; i++) {
                                            if ((input.indexOf(colors[i].category) !== -1) && (formatted.indexOf(colors[i].category) == -1)) {
                                                formatted.push(colors[i].category);
                                            }
                                        }
                                        polish.colorscategory = formatted;
                                        polish.colorstodisplay = formatted;
                                    }
                                }

                                polish.save(function (err) {
                                    brand.polish.addToSet(polish.id);
                                    brand.save();
                                    polish.keywords = accents.remove(polish.brand) + " - " + accents.remove(polish.name) + " - " + accents.remove(polish.batch) + " - " + polish.code;
                                    polish.dateupdated = new Date();
                                    polish.save();
                                })
                            } else {
                                User.findOne({'username':new RegExp(["^", sanitizer.sanitize(req.body.user), "$"].join(""), "i")}, function(err, user) {

                                    var newPolish = new Polish ({
                                        name: polishNameToFind,
                                        brand: polishBrandToFind,
                                        batch: '',
                                        code: '',
                                        type: [],
                                        dateupdated: new Date(),
                                        createddate: new Date(),
                                        createdby: user.id,
                                        createdmethod: 'excel',
                                        dupes: [],
                                        photos: [],
                                        reviews: [],
                                        swatch: '',
                                        flagged: false,
                                        falggedreason: '',
                                        checkins: [],
                                        tool: false,
                                    })

                                    if (data.collection) {
                                        if (data.collection.length > 0) {
                                            newPolish.batch = sanitizer.sanitize(data.collection.replace(/[&]/g,"and").replace(/\s+/g, " ").trim());
                                        } else {
                                            newPolish.batch = '';
                                        }
                                    }

                                    if (data.code) {
                                        if (data.code.length > 0) {
                                            newPolish.code = sanitizer.sanitize(data.code);
                                        } else {
                                            newPolish.code = '';
                                        }
                                    }

                                    if (data.type) {
                                        if (data.type.length > 0) {
                                            var input = sanitizer.sanitize(data.type).toLowerCase().replace("cream","creme").replace("crème","creme").replace("holographic","holo").replace("flakes","flakie").replace("top coat","top").replace("base coat","base").split(/[ ,]+/);
                                            input = input.map(function (item) {
                                                return item.trim();
                                            });
                                            var formatted = [];
                                            var types = PolishTypes;
                                            var typesTools = [];
                                            for (i=0; i<types.length; i++) {
                                                if (input.indexOf(types[i].name) !== -1) {
                                                    formatted.push(types[i].name);
                                                }
                                                if (types[i].category == "tool") {
                                                    typesTools.push(types[i].name);
                                                }
                                            }
                                            if (_.intersection(typesTools,formatted).length > 0) {
                                                newPolish.tool = true;
                                            } else {
                                                newPolish.tool = false;
                                            }
                                            newPolish.type = formatted;
                                        } else {
                                            newPolish.type = [];
                                            newPolish.tool = false;
                                        }
                                    }

                                    if (data.color) {
                                        if (data.color.length > 0) {
                                            var input = sanitizer.sanitize(data.color).toLowerCase().replace("grey","gray").split(/[ ,]+/);
                                            input = input.map(function (item) {
                                                return item.trim();
                                            });
                                            var formatted = [];
                                            var colors = PolishColors;
                                            for (i=0; i<colors.length; i++) {
                                                if ((input.indexOf(colors[i].category) !== -1) && (formatted.indexOf(colors[i].category) == -1)) {
                                                    formatted.push(colors[i].category);
                                                }
                                            }
                                            newPolish.colorscategory = formatted;
                                            newPolish.colorstodisplay = formatted;
                                        } else {
                                            newPolish.colorscategory = [];
                                            newPolish.colorstodisplay = [];
                                        }
                                    }

                                    newPolish.save(function(err) {
                                        newPolish.keywords = accents.remove(newPolish.brand) + " - " + accents.remove(newPolish.name) + " - " + accents.remove(newPolish.batch) + " - " + newPolish.code;
                                        if (req.body.ownership == "yes") {
                                            User.findOne({'username':new RegExp(["^", sanitizer.sanitize(req.body.user), "$"].join(""), "i")}, function(err, user) {
                                                if (user !== null) {
                                                    user.wantedpolish.remove(newPolish.id);
                                                    user.ownedpolish.addToSet(newPolish.id);
                                                    user.save();
                                                }
                                            })
                                        }
                                        newPolish.save(function(err) {
                                            brand.polish.addToSet(newPolish.id);
                                            brand.save();
                                        })
                                    })
                                })
                            }
                        })
                    })
                }
            })
            reader.addListener('end', function(){
                fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
                    res.render('polish/importadmin.ejs', {title: 'Admin Import Polish - Lacquer Tracker', message: "Success! The polishes have been added."});
                })
            })
        } else {
            fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
                res.render('polish/importadmin.ejs', {title: 'Import Polish - Lacquer Tracker', message:'Error: Filetype not .CSV'});
            })
        }
    } else {
        fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
            res.render('polish/importadmin.ejs', {title: 'Import Polish - Lacquer Tracker', message:'Error: Filetype not .CSV'});
        })
    }
});



///////////////////////////////////////////////////////////////////////////////////////

//Export polish list to CSV
app.get('/profile/:username/export', isLoggedIn, function(req, res) {
    User.findOne({username: new RegExp(["^", sanitizer.sanitize(req.params.username), "$"].join(""), "i"), level:{$ne:"deleted"}}).exec(function(err, user) {
        if (!user) {
            res.redirect('/error');
        } else if (req.user.username == user.username || req.user.level == "admin") {
            Polish.find().populate('reviews').sort({brand:1, name:1}).exec(function(err, polish) {
                var polish = _.sortBy(polish, function (x) {return x.brand.toLowerCase();});
                var data = [',Brand,Name,Collection,Color,Type,Status,Rating,Review,Notes'];
                // Brand, Name, Collection, Color, Type, Status, Rating, Review, Notes
                for (i=0; i<polish.length; i++) {
                    var brand = accents.remove(polish[i].brand).replace(/,/g, '').replace(/•/g, '.');
                    var name = accents.remove(polish[i].name).replace(/,/g, '');
                    var batch = accents.remove(polish[i].batch).replace(/,/g, '');
                    var color = _.uniqBy(polish[i].colorstodisplay).join("/").toLowerCase();
                    var type = polish[i].type.join("/");
                    if (user.ownedpolish.indexOf(polish[i].id) > -1) {
                        var status = "owned";
                    } else if (user.wantedpolish.indexOf(polish[i].id) > -1) {
                        var status = "wanted";
                    } else {
                        var status = "";
                    }
                    var index = _.findIndex(polish[i].reviews, function(reviews) { return reviews.user == user.id })
                    if (index > -1) {
                        var rating = accents.remove(polish[i].reviews[index].rating).replace(/,/g, '').replace(/\r\n/g, ' - ');
                        var review = accents.remove(polish[i].reviews[index].review).replace(/,/g, '').replace(/\r\n/g, ' - ');
                        var notes = accents.remove(polish[i].reviews[index].notes).replace(/,/g, '').replace(/\r\n/g, ' - ');
                    } else {
                        var rating = "";
                        var review = "";
                        var notes = "";
                    }
                    if (status !== "" || rating.length > 0 || review.length > 0 || notes.length > 0) {
                        data.push("\n");
                        data.push(brand +","+ name +","+ batch +","+ color +","+ type +","+ status +","+ rating +","+ review +","+ notes);
                    }
                }
                fs.writeFile(path.resolve('./public/images/tmp/export-' + user.username + ".csv"), data, 'utf8', function(err) {
                    res.download(path.resolve('./public/images/tmp/export-' + user.username + ".csv"), function(err) {
                        fs.unlink(path.resolve('./public/images/tmp/export-' + user.username + ".csv"), function(err){});
                    });
                })
            })
        } else {
            res.redirect('/error');
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