var User = require('../app/models/user');
var Polish = require('../app/models/polish');
var Checkin = require('../app/models/checkin');
var CheckinComment = require('../app/models/checkincomment');
var sanitizer = require('sanitizer');
var markdown = require('markdown-css');
var nodemailer = require('nodemailer');
var moment = require('moment-timezone');
var _ = require('lodash');
var fs = require('node-fs');
var path = require('path');
var gm = require('gm').subClass({ imageMagick: true });
var http = require('http');

module.exports = function(app, passport) {


//recent checkins
app.get('/checkin', function(req, res) {
    Checkin.find({pendingdelete:false}).sort({creationdate: -1}).limit(10).populate('user', 'username').populate('polish', 'name brand').exec(function(err, posts) {
        data = {};
        data.title = 'Fresh Coats - Lacquer Tracker';
        data.page = 1;
        var allposts = posts.map(function(x) {
            if (req.isAuthenticated() && req.user.timezone.length > 0) {
                x.date = moment(x.creationdate).tz(req.user.timezone).format('llll');
            } else {
                x.date = moment(x.creationdate).tz("America/New_York").format('llll');
            }
            return x;
        })
        data.checkins = allposts;
        res.render('checkins/recentcheckins.ejs', data);
    })
});


app.get('/checkin/page/:page', function(req, res) {
    data = {};
    data.title = 'Fresh Coats - Lacquer Tracker';

    if (typeof req.params.page === "undefined") {
        var page = 1;
        data.page = 1;
    } else {
        var page = Number(req.params.page);
        data.page = page;
    }

    Checkin.countDocuments({}, function (err, count) {
        data.count = count;
        Checkin.find({pendingdelete:false}).sort({creationdate: -1}).skip((page-1)*10).limit(10).populate('user', 'username').populate('polish', 'name brand').exec(function(err, posts) {
            var allposts = posts.map(function(x) {
                if (req.isAuthenticated() && req.user.timezone.length > 0) {
                    x.date = moment(x.creationdate).tz(req.user.timezone).format('llll');
                } else {
                    x.date = moment(x.creationdate).tz("America/New_York").format('llll');
                }
                return x;
            })
            data.checkins = allposts;
            res.render('checkins/recentcheckins.ejs', data);
        })
    })
});



//add a new check-in
app.get('/checkin/add', isLoggedIn, function(req, res) {
    data = {}
    data.title = 'Check In Your Mani - Lacquer Tracker';
    res.render('checkins/add.ejs', data);
});


app.post('/allpolish', isLoggedIn, function(req, res) {
    Polish.find({name:new RegExp(req.body.term.term, 'i')}).select('id brand name').exec(function (err, polishes) {
        res.send(polishes);
    })
});


app.post('/checkin/add', isLoggedIn, function(req, res) {
    Checkin.findOne({user: req.user}).sort({creationdate: -1}).exec(function(err, checkin) {
        if (checkin == null) {
            // need to update below as well if under 12 hours
            if (req.files.photo.name.length > 0) {
                if (req.files.photo.mimetype.startsWith("image")) {
                    var ext = path.extname(req.files.photo.name);
                    var newCheckin = new Checkin ({
                        user: req.user.id,
                        creationdate: new Date,
                        editdate: new Date,
                        photo: "",
                        polish: req.body.polish,
                        pendingdelete: false,
                        pendingreason: "",
                        comments: [],
                        description: sanitizer.sanitize(req.body.description),
                    })
                    newCheckin.save(function(err) {
                        if (err) {
                            fs.unlink(req.files.photo.tempFilePath, function(err) {
                                newCheckin.remove(function(err) {
                                    res.redirect('/error');
                                })
                            })
                        } else {
                            gm(req.files.photo.tempFilePath).strip().interlace('Plane').samplingFactor(4,2,0).quality(50).resize(60,60,"%").write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext), function (err) {
                                if (err) {
                                    fs.unlink(req.files.photo.tempFilePath, function(err) {
                                        newCheckin.remove();
                                        res.redirect('/error');
                                    })
                                } else {
                                    fs.unlink(req.files.photo.tempFilePath, function() {
                                        newCheckin.photo = '/images/checkinphotos/' + newCheckin.id + ext;
                                        newCheckin.save(function(err) {
                                            req.user.checkins.addToSet(newCheckin.id);
                                            req.user.save();
                                            for (i=0; i<newCheckin.polish.length; i++) {
                                                Polish.findById(newCheckin.polish[i]).exec(function(err, polish) {
                                                    polish.checkins.addToSet(newCheckin.id);
                                                    polish.save();
                                                })
                                            }
                                            res.redirect('/checkin');
                                        })
                                    })
                                }
                            })
                        }
                    })
                } else {
                    fs.unlink(req.files.photo.tempFilePath, function() {
                        res.redirect('/error');
                    })
                }
            } else {
                fs.unlink(req.files.photo.tempFilePath, function() {
                    res.redirect('/error');
                })
            }
        } else if (moment(checkin.creationdate).add(12, 'hours').toDate() < moment().toDate() === false) {
            Polish.find({}).sort({brand: 1}).sort({name: 1}).exec(function (err, polishes) {
                fs.unlink(req.files.photo.tempFilePath, function() {
                    data = {}
                    data.title = 'Check In Your Mani - Lacquer Tracker';
                    data.polish = polishes;
                    data.message = 'You already checked in today. Upload your new mani tomorrow!'
                    res.render('checkins/add.ejs', data);
                })
            })
        } else {
            if (req.files.photo.name.length > 0) {
                if (req.files.photo.mimetype.startsWith("image")) {
                    var ext = path.extname(req.files.photo.name);
                    var newCheckin = new Checkin ({
                        user: req.user.id,
                        creationdate: new Date,
                        editdate: new Date,
                        photo: "",
                        polish: req.body.polish,
                        pendingdelete: false,
                        pendingreason: "",
                        comments: [],
                        description: sanitizer.sanitize(req.body.description),
                    })
                    newCheckin.save(function(err) {
                        if (err) {
                            fs.unlink(req.files.photo.tempFilePath, function(err) {
                                newCheckin.remove(function(err) {
                                    res.redirect('/error');
                                })
                            })
                        } else {
                            gm(req.files.photo.tempFilePath).strip().interlace('Plane').samplingFactor(4,2,0).quality(50).resize(60,60,"%").write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext), function (err) {
                                if (err) {
                                    fs.unlink(req.files.photo.tempFilePath, function(err) {
                                        newCheckin.remove();
                                        res.redirect('/error');
                                    })
                                } else {
                                    fs.unlink(req.files.photo.tempFilePath, function() {
                                        newCheckin.photo = '/images/checkinphotos/' + newCheckin.id + ext;
                                        newCheckin.save(function(err) {
                                            req.user.checkins.addToSet(newCheckin.id);
                                            req.user.save();
                                            for (i=0; i<newCheckin.polish.length; i++) {
                                                Polish.findById(newCheckin.polish[i]).exec(function(err, polish) {
                                                    polish.checkins.addToSet(newCheckin.id);
                                                    polish.save();
                                                })
                                            }
                                            res.redirect('/checkin');
                                        })
                                    })
                                }
                            })
                        }
                    })
                } else {
                    fs.unlink(req.files.photo.tempFilePath, function() {
                        res.redirect('/error');
                    })
                }
            } else {
                fs.unlink(req.files.photo.tempFilePath, function() {
                    res.redirect('/error');
                })
            }
        }
    })
});




//view specific check-in
app.get('/checkin/:id', function(req, res) {
    data = {};
    Checkin.findById(req.params.id).populate({path: 'comments', populate:{path:'user', select: 'username profilephoto'}}).populate('user', 'username').populate('polish', 'brand name').exec(function (err, post) {
        if (post === null || post === undefined || post.pendingdelete == true) {
            res.redirect('/error');
        } else {
            data.title = "View Check-in - Lacquer Tracker";
            data.checkinuser = post.user;
            data.checkinid = post.id;
            data.checkinphoto = post.photo;
            data.checkinpolish = post.polish;
            data.checkindescription = post.description;
            if (req.isAuthenticated() && req.user.timezone.length > 0) {
                data.checkindate = moment(post.creationdate).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
            } else {
                data.checkindate = moment(post.creationdate).tz("America/New_York").format('MMM D YYYY, h:mm a');
            }
            var allcomments = post.comments.map(function(x) {
                if (req.isAuthenticated() && req.user.timezone.length > 0) {
                    x.date = moment(x.date).tz(req.user.timezone).format('MMM D YYYY, h:mm a');
                } else {
                    x.date = moment(x.date).tz("America/New_York").format('MMM D YYYY, h:mm a');
                }
                if (x.message == "<p><em>comment deleted</em></p>\n") {
                    x.user.username = '';
                    x.user.profilephoto = '';
                }
                return x;
            })
            data.checkincomment = allcomments;
            data.moment = moment;
            res.render('checkins/viewonecheckin.ejs', data);
        }
    })
});




//reply to a checkin or comment
app.post('/checkin/:id/:cid/add', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).populate('user').exec(function (err, post){
        var newCheckinComment = new CheckinComment ({
            checkinid: post.id,
            parentid: req.params.cid,
            user: req.user.id,
            message: markdown(req.body.message),
            date: new Date(),
        })
        newCheckinComment.save(function(err) {
            CheckinComment.findById(req.params.cid).populate('user').exec(function(err, comment) {
                if (comment !== null) {
                    if (req.user.username !== comment.user.username && comment.user.notifications === "on" && comment.user.username !== post.user.username) {
                        //mail notification
                        var transport = nodemailer.createTransport({
                            sendmail: true,
                            path: "/usr/sbin/sendmail"
                        });

                        var mailOptions = {
                            from: "polishrobot@lacquertracker.com",
                            to: comment.user.email,
                            subject: 'New reply to your check-in comment',
                            text: "Hey " + comment.user.username + ",\n\n" + req.user.username + " just replied to your comment on check-in.\n\nCome check it out here: http://www.lacquertracker.com/checkin/" + post.id + "\n\n\nThanks,\nLacquer Tracker",
                        }

                        transport.sendMail(mailOptions, function(error, response) {
                            transport.close();
                        });
                    }
                }

                if (req.user.username !== post.user.username && post.user.notifications === "on") {
                    //mail notification
                    var transport = nodemailer.createTransport({
                        sendmail: true,
                        path: "/usr/sbin/sendmail"
                    });

                    var mailOptions = {
                        from: "polishrobot@lacquertracker.com",
                        to: post.user.email,
                        subject: 'New reply to your check-in',
                        text: "Hey " + post.user.username + ",\n\n" + req.user.username + " just replied to your check-in.\n\nCome check it out here: http://www.lacquertracker.com/checkin/" + post.id + "\n\n\nThanks,\nLacquer Tracker",
                    }

                    transport.sendMail(mailOptions, function(error, response) {
                        transport.close();
                    });
                }

                post.comments.push(newCheckinComment.id);
                CheckinComment.findById(req.params.cid, function(err, parent) {
                    if (parent) {
                        parent.childid.push(newCheckinComment.id);
                        post.save(function(err) {
                            parent.save(function(err) {
                                res.redirect('/checkin/' + post.id)
                            })
                        })
                    } else {
                        post.save(function(err) {
                            res.redirect('/checkin/' + post.id)
                        })
                    }
                })
            })
        })
    })
});




//edit check-in
app.get('/checkin/:id/edit', isLoggedIn, function(req, res) {
    data = {};
    Polish.find({}).sort({brand: 1}).sort({name: 1}).exec(function (err, polishes) {
        data.polish = polishes;
        Checkin.findById(req.params.id).populate('polish', 'name brand').exec(function (err, post) {
            if (post === null || post === undefined) {
                res.redirect('/error');
            } else {
                if (post.user == req.user.id) {
                    data.title = "Edit Check-in - Lacquer Tracker";
                    data.checkinid = post.id;
                    data.checkinphoto = post.photo;
                    data.checkinpolish = post.polish;
                    data.checkindescription = post.description;
                    res.render('checkins/edit.ejs', data);
                } else {
                    res.redirect('/error');
                }
            }
        })
    })
});

app.post('/checkin/:id/edit', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id, function (err, post){
        var currentPolish = post.polish;
        if (post.user == req.user.id) {
            if (post.polish === undefined) {
                for (i=0; i<currentPolish.length; i++) {
                    Polish.findById(currentPolish[i]).exec(function(err, polish) {
                        polish.checkins.remove(req.params.id);
                        polish.save();
                    })
                }
            }
            post.polish = req.body.polish;
            post.editdate = new Date;
            post.description = sanitizer.sanitize(req.body.description);
            post.save(function(err) {
                if (req.body.polish) {
                    if (Array.isArray(req.body.polish) === false) {
                        Polish.findById(req.body.polish).exec(function(err, polish) {
                            polish.checkins.addToSet(req.params.id);
                            polish.save();
                        })
                    } else {
                        for (j=0; j<req.body.polish.length; j++) {
                            Polish.findById(req.body.polish[j]).exec(function(err, polish) {
                                polish.checkins.addToSet(req.params.id);
                                polish.save();
                            })
                        }
                    }
                }
                res.redirect('/checkin/' + post.id);
            })
        } else {
            res.redirect('/error');
        }
    })
});





app.get('/checkin/:id/add', isLoggedIn, function(req, res) {
    res.redirect('/checkin/' + req.params.id + "#addcomment")
});

app.get('/checkin/:id/addreply', isLoggedIn, function(req, res) {
    res.redirect('/checkin/' + req.params.id)
});




//remove comment
app.get('/checkin/:id/:cid/remove', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id, function(err, post) {
        CheckinComment.findById(req.params.cid, function(err, comment) {
            if (comment === null || comment === undefined) {
                res.redirect('/error');
            } else {
                if (comment.user == req.user.id || req.user.level === "admin") {
                    if (comment.childid.length > 0) {
                        comment.message = sanitizer.sanitize(markdown("_comment deleted_"));
                        comment.save(function(err) {
                            res.redirect("/checkin/" + req.params.id);
                        })
                    } else {
                        post.comments.remove(req.params.cid);
                        post.save(function(err) {
                            if (comment.parentid !== comment.checkinid) {
                                CheckinComment.findById(comment.parentid, function(err, parentcomment) {
                                    parentcomment.childid.remove(req.params.cid);
                                    parentcomment.save();
                                    CheckinComment.findByIdAndRemove(req.params.cid, function(err) {
                                        res.redirect("/checkin/" + req.params.id);
                                    })
                                })
                            } else {
                                CheckinComment.findByIdAndRemove(req.params.cid, function(err) {
                                    res.redirect("/checkin/" + req.params.id);
                                })
                            }
                        })
                    }
                } else {
                    res.redirect('/error');
                }
            }
        })
    })
});




//delete check-in
app.get('/checkin/:id/remove', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id, function(err, post) {
        if (post === null || post === undefined) {
             res.redirect('/error');
         } else {
             if (post.user == req.user.id || req.user.level === "admin") {
                 CheckinComment.find({checkinid:req.params.id}, function(err, comments) {
                     for (i=0; i < comments.length; i++) {
                         comments[i].remove();
                     }
                    fs.unlink(path.resolve('./public/'+post.photo), function(err) {
                        for (i=0; i<post.polish.length; i++) {
                            Polish.findById(post.polish[i]).exec(function(err, polish) {
                                polish.checkins.remove(req.params.id);
                                polish.save();
                            })
                        }
                        Checkin.findByIdAndRemove(req.params.id, function(err) {
                            req.user.checkins.remove(req.params.id);
                            req.user.save();
                            res.redirect('/checkin');
                        })
                    })
                 })
             } else {
                 res.redirect('/error');
             }
         }
    })
});



//user flags a check-in
app.get('/checkin/:id/flag', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).exec(function(err, checkin) {
        if (checkin === null || checkin === undefined) {
            res.redirect('/error');
        } else {
            data = {};
            data.title = "Flag Check-in - Lacquer Tracker";
            data.checkin = checkin;
            res.render('checkins/flag.ejs', data);
        }
    });
});

app.post('/checkin/:id/flag', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).exec(function(err, checkin) {
        if (checkin === null || checkin === undefined) {
            res.redirect('/error');
        } else {
            checkin.pendingdelete = true;
            checkin.pendingreason = sanitizer.sanitize(req.body.pendingreason) + " - " + req.user.username;
            checkin.save(function(err) {
                var transport = nodemailer.createTransport({
                    sendmail: true,
                    path: "/usr/sbin/sendmail"
                });

                var mailOptions = {
                    from: "polishrobot@lacquertracker.com",
                    to: 'lacquertrackermailer@gmail.com',
                    subject: 'Flagged Check-in',
                    text: req.user.username + " has flagged a check-in.\n\n\nwww.lacquertracker.com/admin/pendingcheckins",
                }

                transport.sendMail(mailOptions, function(error, response) {
                    transport.close();
                });
                res.redirect('/checkin');
            })
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