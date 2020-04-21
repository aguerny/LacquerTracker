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


module.exports = function(app, passport) {


//User sends request to import polish from CSV
app.get('/import', isLoggedIn, function(req, res) {
    data = {};
    data.title = 'Import Polish - Lacquer Tracker';
    res.render('polish/importuser.ejs', data);
});


app.post('/import', isLoggedIn, function(req, res) {
    if (req.files.spreadsheet.name.length > 0) {
        if (req.files.spreadsheet.mimetype.startsWith("text/csv") || req.files.spreadsheet.mimetype.startsWith("application/vnd.ms-excel")) {
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
                    filename: req.user.username + '.csv',
                    content: fs.createReadStream(req.files.spreadsheet.tempFilePath)
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
                res.render('polish/importuser.ejs', {title: 'Import Polish - Lacquer Tracker', message:'Error: Filetype not .CSV'});
            })
        }
    } else {
        fs.unlink(req.files.spreadsheet.tempFilePath, function(err) {
            res.render('polish/importuser.ejs', {title: 'Import Polish - Lacquer Tracker', message:'Error: Filetype not .CSV'});
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



app.post('/admin/import', isLoggedIn, function(req, res) {
    if (req.files.spreadsheet.name.length > 0) {
        if (req.files.spreadsheet.mimetype.startsWith("text/csv") || req.files.spreadsheet.mimetype.startsWith("application/vnd.ms-excel")) {
            var reader = csv.createCsvFileReader(req.files.spreadsheet.tempFilePath, {columnsFromHeader:true, 'separator': ','});
            reader.addListener('data', function(data, err) {
                if (data.name.length > 0 && data.brand.length > 0) {
                    var polishNameToFind = sanitizer.sanitize(data.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,''));
                    var polishBrandEntered = sanitizer.sanitize(data.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,''));
                    var polishBrandToFind;
                    Brand.findOne({alternatenames:polishBrandEntered.toLowerCase()}, function(err, brand) {
                        if (brand) {
                            polishBrandToFind = brand.name;
                        } else {
                            polishBrandToFind = polishBrandEntered;
                        }
                        Polish.findOne({name: new RegExp("^"+polishNameToFind+"$","i"), brand: new RegExp("^"+polishBrandToFind+"$", "i")}, function(err, polish) {
                            if (polish !== null) {
                                if (req.body.ownership == "yes") {
                                    User.findOne({'username':req.body.user}, function(err, user) {
                                        if (user !== null) {
                                            user.wantedpolish.remove(polish.id);
                                            user.ownedpolish.addToSet(polish.id);
                                            user.save();
                                        }
                                    })
                                }

                                if ((data.collection) && (polish.batch == '')) {
                                    polish.batch = sanitizer.sanitize(data.collection);
                                }

                                if ((data.code) && (polish.code == '')) {
                                    polish.code = sanitizer.sanitize(data.code);
                                }

                                if (data.type) {
                                    if (data.type.length > 0) {
                                        var input = sanitizer.sanitize(data.type).toLowerCase().replace("cream","creme").split(',');
                                        var formatted = polish.type;
                                        var types = PolishTypes;
                                        for (i=0; i<types.length; i++) {
                                            if ((input.indexOf(types[i]) !== -1) && (formatted.indexOf(types[i]) === -1)) {
                                                formatted.push(types[i]);
                                            }
                                        }
                                        polish.type = formatted;
                                    }
                                }

                                if (data.color) {
                                    if (data.color.length > 0) {
                                        var input = sanitizer.sanitize(data.color).toLowerCase().split(',');
                                        if (polish.colorscategory) {
                                            var formatted = polish.colorscategory;
                                        } else {
                                            var formatted = [];
                                        }
                                        var colors = PolishColors;
                                        for (i=0; i<colors.length; i++) {
                                            if ((input.indexOf(colors[i].category) !== -1) && (formatted.indexOf(colors[i]) == -1)) {
                                                formatted.push(colors[i].category);
                                            }
                                        }
                                        polish.colorscategory = formatted;
                                    }
                                }

                                polish.save(function (err) {
                                    polish.keywords = polish.name + " " + polish.brand + " " + polish.batch + " " + polish.code;
                                    polish.dateupdated = new Date();
                                    polish.save();
                                })
                            } else {
                                User.findOne({'username':req.body.user}, function(err, user) {

                                    var newPolish = new Polish ({
                                        name: polishNameToFind,
                                        brand: polishBrandToFind,
                                        dateupdated: new Date(),
                                        createdby: user.id,
                                        createdmethod: 'excel',
                                        dupes: [],
                                        photos: [],
                                        reviews: [],
                                        swatch: '',
                                        flagged: false,
                                        falggedreason: '',
                                        checkins: [],
                                    })

                                    if (data.collection) {
                                        if (data.collection.length > 0) {
                                            newPolish.batch = sanitizer.sanitize(data.collection);
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
                                            var input = sanitizer.sanitize(data.type).toLowerCase().replace("cream","creme").split(',');
                                            var formatted = [];
                                            var types = PolishTypes;
                                            for (i=0; i<types.length; i++) {
                                                if (input.indexOf(types[i]) !== -1) {
                                                    formatted.push(types[i]);
                                                }
                                            }
                                            newPolish.type = formatted;
                                        } else {
                                            newPolish.type = [];
                                        }
                                    }

                                    if (data.color) {
                                        if (data.color.length > 0) {
                                            var input = sanitizer.sanitize(data.color).toLowerCase().split(',');
                                            var formatted = [];
                                            var colors = PolishColors;
                                            for (i=0; i<colors.length; i++) {
                                                if (input.indexOf(colors[i].category) !== -1) {
                                                    formatted.push(colors[i].category);
                                                }
                                            }
                                            newPolish.colorscategory = formatted;
                                        } else {
                                            newPolish.colorscategory = [];
                                        }
                                    }

                                    newPolish.save(function(err) {
                                        newPolish.keywords = newPolish.name + " " + newPolish.brand + " " + newPolish.batch + " " + newPolish.code;
                                        if (req.body.ownership == "yes") {
                                            User.findOne({'username':req.body.user}, function(err, user) {
                                                if (user !== null) {
                                                    user.wantedpolish.remove(newPolish.id);
                                                    user.ownedpolish.addToSet(newPolish.id);
                                                    user.save();
                                                }
                                            })
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
                                                        polishlock: false,
                                                        alternatenames: [polishBrandToFind.toLowerCase()]
                                                    })
                                                    newBrand.save();
                                                }
                                            })
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




// app.post('/import', isLoggedIn, function(req, res) {
//     if (mime.contentType(req.files.spreadsheet.path).startsWith("text/csv")) {
//         var reader = csv.createCsvFileReader(req.files.spreadsheet.path, {columnsFromHeader:true, 'separator': ','});
//         reader.addListener('data', function(data, err) {
//             if (data.name.length > 0 && data.brand.length > 0) {
//                 var polishNameToFind = sanitizer.sanitize(data.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,''));
//                 var polishBrandEntered = sanitizer.sanitize(data.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,''));
//                 var polishBrandToFind;
//                 Brand.findOne({alternatenames:polishBrandEntered.toLowerCase()}, function(err, brand) {
//                     if (brand) {
//                         polishBrandToFind = brand.name;
//                     } else {
//                         polishBrandToFind = polishBrandEntered;
//                         var newBrand = new Brand ({
//                             name: polishBrandToFind,
//                             bio: '',
//                             photo: '',
//                             official: false,
//                             indie: false,
//                             alternatenames: [polishBrandToFind.toLowerCase()]
//                         })
//                         newBrand.save();
//                     }
//                     Polish.find({name: new RegExp("^"+polishNameToFind+"$","i"), brand: new RegExp("^"+polishBrandToFind+"$", "i")}, function(err, polish) {
//                         if (polish.length !== 0) {
//                             req.user.wantedpolish.remove(polish[0].id);
//                             req.user.ownedpolish.addToSet(polish[0].id);
//                             req.user.save();
//                             if (polish[0].batch.length === 0) {
//                                 if (data.collection) {
//                                     if (data.collection.length > 0) {
//                                         polish[0].batch = sanitizer.sanitize(data.collection);
//                                         polish[0].keywords = polish[0].name + " " + polish[0].brand + " " + sanitizer.sanitize(data.collection) + " " + polish[0].code;
//                                         polish[0].dateupdated = new Date();
//                                         polish[0].save();
//                                     }
//                                 }
//                             }
//                             if (polish[0].type.length === 0) {
//                                 if (data.type) {
//                                     if (data.type.length > 0) {
//                                         var input = sanitizer.sanitize(data.type.toLowerCase().replace("cream","creme").split(" "));
//                                         var formatted = [];
//                                         var types = PolishTypes;
//                                         for (i=0; i<types.length; i++) {
//                                             if (input.indexOf(types[i]) !== -1) {
//                                                 formatted.push(types[i]);
//                                             }
//                                         }
//                                         polish[0].type = formatted.toString();
//                                         polish[0].dateupdated = new Date();
//                                         polish[0].save();
//                                     }
//                                 }
//                             }
//                             if (polish[0].code.length === 0) {
//                                 if (data.code) {
//                                     if (data.code.length > 0) {
//                                         polish[0].code = sanitizer.sanitize(data.code);
//                                         polish[0].keywords = polish[0].name + " " + polish[0].brand + " " + polish[0].batch + " " + sanitizer.sanitize(data.code);
//                                         polish[0].dateupdated = new Date();
//                                         polish[0].save();
//                                     }
//                                 }
//                             }
//                         } else {
//                             var newPolish = new Polish ({
//                                 name: polishNameToFind,
//                                 brand: polishBrandToFind,
//                                 keywords: polishNameToFind + " " + polishBrandToFind,
//                                 batch: '',
//                                 type: '',
//                                 code: '',
//                                 swatch: '',
//                                 dupes: '',
//                                 dateupdated: new Date(),
//                             });
//                             newPolish.save(function(err) {
//                                 req.user.ownedpolish.addToSet(newPolish.id);
//                                 req.user.save();
//                                 if (data.collection) {
//                                     if (data.collection.length > 0) {
//                                         newPolish.batch = sanitizer.sanitize(data.collection);
//                                         newPolish.keywords = newPolish.name + " " + newPolish.brand + " " + sanitizer.sanitize(data.collection) + " " + newPolish.code;
//                                         newPolish.save();
//                                     }
//                                 }
//                                 if (data.type) {
//                                     if (data.type.length > 0) {
//                                         var input = sanitizer.sanitize(data.type.toLowerCase().replace("cream","creme").split(" "));
//                                         var formatted = [];
//                                         var types = PolishTypes;
//                                         for (i=0; i<types.length; i++) {
//                                             if (input.indexOf(types[i]) !== -1) {
//                                                 formatted.push(types[i]);
//                                             }
//                                         }
//                                         newPolish.type = formatted.toString();
//                                         newPolish.save();
//                                     }
//                                 }
//                                 if (data.code) {
//                                     if (data.code.length > 0) {
//                                         newPolish.code = sanitizer.sanitize(data.code);
//                                         newPolish.keywords = newPolish.name + " " + newPolish.brand + " " + newPolish.batch + " " + sanitizer.sanitize(data.code);
//                                         newPolish.save();
//                                     }
//                                 }
//                             })
//                         }
//                     })
//                 })
//             }
//         })
//         reader.addListener('end', function(){
//             fs.unlink(req.files.spreadsheet.path, function(err) {
//                 res.redirect('/profile');
//             })
//         })
//     } else {
//         fs.unlink(req.files.spreadsheet.path, function(err) {
//             res.render('polish/import.ejs', {title: 'Import Owned Polish - Lacquer Tracker', message:'Error: Filetype not .CSV'});
//         })
//     }
// });





// //Import polish from CSV as an admin
// app.get('/admin/importnew', isLoggedIn, function(req, res) {
//     if (req.user.level === "admin") {
//         data = {};
//         data.title = 'Import Polish - Lacquer Tracker';
//         res.render('admin/importnew.ejs', data);
//     } else {
//         res.redirect('/error');
//     }
// });

// app.post('/admin/importnew', isLoggedIn, function(req, res) {
//     if (mime.contentType(req.files.spreadsheet.path).startsWith("text/csv")) {
//         var reader = csv.createCsvFileReader(req.files.spreadsheet.path, {columnsFromHeader:true, 'separator': ','});
//         reader.addListener('data', function(data) {
//             if (data.name.length > 0 && data.brand.length > 0) {
//                 var polishNameToFind = sanitizer.sanitize(data.name.replace(/[?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,''));
//                 var polishBrandEntered = sanitizer.sanitize(data.brand.replace(/[\(\)?]/g,"").replace(/[&]/g,"and").replace(/[\\/]/g,"-").replace(/^\s+|\s+$/g,''));
//                 var polishBrandToFind;
//                 Brand.findOne({alternatenames:polishBrandEntered.toLowerCase()}, function(err, brand) {
//                     if (brand) {
//                         polishBrandToFind = brand.name;
//                     } else {
//                         polishBrandToFind = polishBrandEntered;
//                         var newBrand = new Brand ({
//                             name: polishBrandToFind,
//                             bio: '',
//                             photo: '',
//                             official: false,
//                             indie: false,
//                             alternatenames: [polishBrandToFind.toLowerCase()]
//                         })
//                         newBrand.save();
//                     }
//                     Polish.find({name: new RegExp("^"+polishNameToFind+"$","i"), brand: new RegExp("^"+polishBrandToFind+"$", "i")}, function(err, polish) {
//                         if (polish.length !== 0) {
//                             if (polish[0].batch.length === 0) {
//                                 if (data.collection) {
//                                     if (data.collection.length > 0) {
//                                         polish[0].batch = sanitizer.sanitize(data.collection);
//                                         polish[0].keywords = polish[0].name + " " + polish[0].brand + " " + sanitizer.sanitize(data.collection) + " " + polish[0].code;
//                                         polish[0].dateupdated = new Date();
//                                         polish[0].save();
//                                     }
//                                 }
//                             }
//                             if (polish[0].type.length === 0) {
//                                 if (data.type) {
//                                     if (data.type.length > 0) {
//                                         var input = sanitizer.sanitize(data.type.toLowerCase().replace("cream","creme").split(" "));
//                                         var formatted = [];
//                                         var types = PolishTypes;
//                                         for (i=0; i<types.length; i++) {
//                                             if (input.indexOf(types[i]) !== -1) {
//                                                 formatted.push(types[i]);
//                                             }
//                                         }
//                                         polish[0].type = formatted.toString();
//                                         polish[0].dateupdated = new Date();
//                                         polish[0].save();
//                                     }
//                                 }
//                             }
//                             if (polish[0].code.length === 0) {
//                                 if (data.code) {
//                                     if (data.code.length > 0) {
//                                         polish[0].code = sanitizer.sanitize(data.code);
//                                         polish[0].keywords = polish[0].name + " " + polish[0].brand + " " + polish[0].batch + " " + sanitizer.sanitize(data.code);
//                                         polish[0].dateupdated = new Date();
//                                         polish[0].save();
//                                     }
//                                 }
//                             }
//                         } else {
//                             var newPolish = new Polish ({
//                                 name: polishNameToFind,
//                                 brand: polishBrandToFind,
//                                 keywords: polishNameToFind + " " + polishBrandToFind,
//                                 batch: '',
//                                 type: '',
//                                 code: '',
//                                 swatch: '',
//                                 dupes: '',
//                                 dateupdated: new Date(),
//                             });
//                             newPolish.save(function(err) {
//                                 if (data.collection) {
//                                     if (data.collection.length > 0) {
//                                         newPolish.batch = sanitizer.sanitize(data.collection);
//                                         newPolish.keywords = newPolish.name + " " + newPolish.brand + " " + sanitizer.sanitize(data.collection) + " " + newPolish.code;
//                                         newPolish.save();
//                                     }
//                                 }
//                                 if (data.type) {
//                                     if (data.type.length > 0) {
//                                         var input = sanitizer.sanitize(data.type.toLowerCase().replace("cream","creme").split(" "));
//                                         var formatted = [];
//                                         var types = PolishTypes;
//                                         for (i=0; i<types.length; i++) {
//                                             if (input.indexOf(types[i]) !== -1) {
//                                                 formatted.push(types[i]);
//                                             }
//                                         }
//                                         newPolish.type = formatted.toString();
//                                         newPolish.save();
//                                     }
//                                 }
//                                 if (data.code) {
//                                     if (data.code.length > 0) {
//                                         newPolish.code = sanitizer.sanitize(data.code);
//                                         newPolish.keywords = newPolish.name + " " + newPolish.brand + " " + newPolish.batch + " " + sanitizer.sanitize(data.code);
//                                         newPolish.save();
//                                     }
//                                 }
//                             })
//                         }
//                     })
//                 })
//             }
//         })
//         reader.addListener('end', function(){
//             fs.unlink(req.files.spreadsheet.path, function(err) {
//                 res.render('polish/import.ejs', {title: 'Contact - Lacquer Tracker', message:'Could not send feedback. Please try again later.', inputname:req.body.name, inputemail:req.body.email, inputmessage:req.body.usermessage});
//             })
//         })
//     } else {
//         fs.unlink(req.files.spreadsheet.path, function(err) {
//             res.render('/admin/importnew', {title: 'Import Polish - Lacquer Tracker', message:'Error: Filetype not .CSV'});
//         })
//     }
// });



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