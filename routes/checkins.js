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
var thumbler = require('thumbler');
var request = require('request');

module.exports = function(app, passport) {


//recent checkins
app.get('/freshcoats', function(req, res) {
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


app.get('/freshcoats/page/:page', function(req, res) {
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



//saved checkins
app.get('/freshcoats/saved', isLoggedIn, function(req, res) {
    User.findById(req.user.id).select('savedcheckins').populate({path:'savedcheckins',populate:{path:'polish',select:'name brand'}}).populate({path:'savedcheckins',populate:{path:'user',select:'username'}}).exec(function(err, posts) {
        data = {};
        data.title = 'Saved Fresh Coats - Lacquer Tracker';
        data.page = 1;
        var allposts = posts.savedcheckins.map(function(x) {
            if (req.isAuthenticated() && req.user.timezone.length > 0) {
                x.date = moment(x.creationdate).tz(req.user.timezone).format('llll');
            } else {
                x.date = moment(x.creationdate).tz("America/New_York").format('llll');
            }
            return x;
        })
        data.checkins = allposts.reverse();
        res.render('checkins/savedcheckins.ejs', data);
    })
});




//add a new check-in
app.get('/freshcoats/add', isLoggedIn, function(req, res) {
    data = {}
    data.title = 'Check In Your Mani - Lacquer Tracker';
    res.render('checkins/add.ejs', data);
});


app.post('/allpolish', isLoggedIn, function(req, res) {
    Polish.find({keywords:new RegExp(sanitizer.sanitize(req.body.term.term), 'i')}).select('id brand name').exec(function (err, polishes) {
        res.send(polishes);
    })
});


app.post('/freshcoats/add', isLoggedIn, function(req, res) {
    Checkin.findOne({user: req.user}).sort({creationdate: -1}).exec(function(err, checkin) {
        if (checkin == null) {
            // need to update below as well if under 12 hours
            if (req.files.photo.name.length > 0) {
                if (req.files.photo.mimetype.startsWith("image")) {
                    if (req.files.photo.size <= 5242880) {
                        var ext = path.extname(req.files.photo.name);
                        var newCheckin = new Checkin ({
                            user: req.user.id,
                            creationdate: new Date,
                            editdate: new Date,
                            photo: "",
                            polish: [],
                            pendingdelete: false,
                            pendingreason: "",
                            comments: [],
                            description: sanitizer.sanitize(req.body.description),
                            type: "image",
                        })
                        newCheckin.save(function(err) {
                            if (req.body.polish) {
                                newCheckin.polish = sanitizer.sanitize(req.body.polish).split(',');
                            }
                            if (err) {
                                fs.unlink(req.files.photo.tempFilePath, function(err) {
                                    newCheckin.remove(function(err) {
                                        res.redirect('/error');
                                    })
                                })
                            } else {
                                fs.rename(req.files.photo.tempFilePath, path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext), function(err) {
                                    gm(path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext)).strip().interlace('Plane').samplingFactor(4,2,0).quality(50).resize(60,60,"%").write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext), function (err) {
                                        if (err) {
                                            fs.unlink(path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext), function(err) {
                                                newCheckin.remove();
                                                res.redirect('/error');
                                            })
                                        } else {
                                            newCheckin.photo = '/images/checkinphotos/' + newCheckin.id + ext;
                                            newCheckin.save(function(err) {
                                                fs.unlink(req.files.photo.tempFilePath, function() {
                                                    req.user.checkins.addToSet(newCheckin.id);
                                                    req.user.save();
                                                    for (i=0; i<newCheckin.polish.length; i++) {
                                                        Polish.findById(newCheckin.polish[i]).exec(function(err, polish) {
                                                            polish.checkins.addToSet(newCheckin.id);
                                                            polish.dateupdated = new Date();
                                                            polish.save();
                                                        })
                                                    }
                                                    gm(path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext)).resize(null,500).write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 't.jpeg'), function (err) {
                                                        res.redirect('/freshcoats/'+newCheckin.id+'/crop');
                                                    })
                                                })
                                            })
                                        }
                                    })
                                })
                            }
                        })
                    } else {
                        fs.unlink(req.files.photo.tempFilePath, function() {
                            Polish.find({}).sort({brand: 1}).sort({name: 1}).exec(function (err, polishes) {
                                data = {}
                                data.title = 'Check In Your Mani - Lacquer Tracker';
                                data.polish = polishes;
                                data.message = 'File size too large. Limit for photos is 5MB.'
                                res.render('checkins/add.ejs', data);
                            })
                        })
                    }
                } else if (req.files.photo.mimetype.startsWith("video")) {
                    if (req.files.photo.size <= 10485760) {
                        var ext = path.extname(req.files.photo.name);
                        var newCheckin = new Checkin ({
                            user: req.user.id,
                            creationdate: new Date,
                            editdate: new Date,
                            photo: "",
                            polish: [],
                            pendingdelete: false,
                            pendingreason: "",
                            comments: [],
                            description: sanitizer.sanitize(req.body.description),
                            type: "video",
                        })
                        newCheckin.save(function(err) {
                            if (req.body.polish) {
                                newCheckin.polish = sanitizer.sanitize(req.body.polish).split(',');
                            }
                            if (err) {
                                fs.unlink(req.files.photo.tempFilePath, function(err) {
                                    newCheckin.remove(function(err) {
                                        res.redirect('/error');
                                    })
                                })
                            } else {
                                fs.rename(req.files.photo.tempFilePath, path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext), function() {
                                    fs.unlink(req.files.photo.tempFilePath, function() {
                                        newCheckin.photo = '/images/checkinphotos/' + newCheckin.id + ext;
                                        thumbler({
                                            type: 'video',
                                            input: path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext),
                                            output: path.resolve('./public/images/checkinphotos/' + newCheckin.id + 'thumb.jpeg'),
                                            time:'00:00:01'
                                        }, function(){
                                            newCheckin.save(function(err) {
                                                gm(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 'thumb.jpeg')).strip().interlace('Plane').samplingFactor(4,2,0).quality(50).resize(60,60,"%").write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 'thumb.jpeg'), function (err) {
                                                    req.user.checkins.addToSet(newCheckin.id);
                                                    req.user.save();
                                                    for (i=0; i<newCheckin.polish.length; i++) {
                                                        Polish.findById(newCheckin.polish[i]).exec(function(err, polish) {
                                                            polish.checkins.addToSet(newCheckin.id);
                                                            polish.dateupdated = new Date();
                                                            polish.save();
                                                        })
                                                    }
                                                    gm(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 'thumb.jpeg')).resize(null,500).write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 't.jpeg'), function (err) {
                                                        res.redirect('/freshcoats');
                                                    })
                                                })
                                            })
                                        })
                                    })
                                })
                            }
                        })
                    } else {
                        fs.unlink(req.files.photo.tempFilePath, function() {
                            Polish.find({}).sort({brand: 1}).sort({name: 1}).exec(function (err, polishes) {
                                data = {}
                                data.title = 'Check In Your Mani - Lacquer Tracker';
                                data.polish = polishes;
                                data.message = 'File size too large. Limit for videos is 10MB.'
                                res.render('checkins/add.ejs', data);
                            })
                        })
                    }
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
                    if (req.files.photo.size <= 5242880) {
                        var ext = path.extname(req.files.photo.name);
                        var newCheckin = new Checkin ({
                            user: req.user.id,
                            creationdate: new Date,
                            editdate: new Date,
                            photo: "",
                            polish: [],
                            pendingdelete: false,
                            pendingreason: "",
                            comments: [],
                            description: sanitizer.sanitize(req.body.description),
                            type: "image",
                        })
                        newCheckin.save(function(err) {
                            if (req.body.polish) {
                                newCheckin.polish = sanitizer.sanitize(req.body.polish).split(',');
                            }
                            if (err) {
                                fs.unlink(req.files.photo.tempFilePath, function(err) {
                                    newCheckin.remove(function(err) {
                                        res.redirect('/error');
                                    })
                                })
                            } else {
                                fs.rename(req.files.photo.tempFilePath, path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext), function(err) {
                                    gm(path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext)).strip().interlace('Plane').samplingFactor(4,2,0).quality(50).resize(60,60,"%").write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext), function (err) {
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
                                                            polish.dateupdated = new Date();
                                                            polish.save();
                                                        })
                                                    }
                                                    gm(path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext)).resize(null,500).write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 't.jpeg'), function (err) {
                                                        res.redirect('/freshcoats/'+newCheckin.id+'/crop');
                                                    })
                                                })
                                            })
                                        }
                                    })
                                })
                            }
                        })
                    } else {
                        fs.unlink(req.files.photo.tempFilePath, function() {
                            Polish.find({}).sort({brand: 1}).sort({name: 1}).exec(function (err, polishes) {
                                data = {}
                                data.title = 'Check In Your Mani - Lacquer Tracker';
                                data.polish = polishes;
                                data.message = 'File size too large. Limit for photos is 5MB.'
                                res.render('checkins/add.ejs', data);
                            })
                        })
                    }
                } else if (req.files.photo.mimetype.startsWith("video")) {
                    if (req.files.photo.size <= 10485760) {
                        var ext = path.extname(req.files.photo.name);
                        var newCheckin = new Checkin ({
                            user: req.user.id,
                            creationdate: new Date,
                            editdate: new Date,
                            photo: "",
                            polish: [],
                            pendingdelete: false,
                            pendingreason: "",
                            comments: [],
                            description: sanitizer.sanitize(req.body.description),
                            type: "video",
                        })
                        newCheckin.save(function(err) {
                            if (req.body.polish) {
                                newCheckin.polish = sanitizer.sanitize(req.body.polish).split(',');
                            }
                            if (err) {
                                fs.unlink(req.files.photo.tempFilePath, function(err) {
                                    newCheckin.remove(function(err) {
                                        res.redirect('/error');
                                    })
                                })
                            } else {
                                fs.rename(req.files.photo.tempFilePath, path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext), function() {
                                    fs.unlink(req.files.photo.tempFilePath, function() {
                                        newCheckin.photo = '/images/checkinphotos/' + newCheckin.id + ext;
                                        thumbler({
                                            type: 'video',
                                            input: path.resolve('./public/images/checkinphotos/' + newCheckin.id + ext),
                                            output: path.resolve('./public/images/checkinphotos/' + newCheckin.id + 'thumb.jpeg'),
                                            time:'00:00:01'
                                        }, function(){
                                            newCheckin.save(function(err) {
                                                gm(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 'thumb.jpeg')).strip().interlace('Plane').samplingFactor(4,2,0).quality(50).resize(60,60,"%").write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 'thumb.jpeg'), function (err) {
                                                    req.user.checkins.addToSet(newCheckin.id);
                                                    req.user.save();
                                                    for (i=0; i<newCheckin.polish.length; i++) {
                                                        Polish.findById(newCheckin.polish[i]).exec(function(err, polish) {
                                                            polish.checkins.addToSet(newCheckin.id);
                                                            polish.dateupdated = new Date();
                                                            polish.save();
                                                        })
                                                    }
                                                    gm(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 'thumb.jpeg')).resize(null,500).write(path.resolve('./public/images/checkinphotos/' + newCheckin.id + 't.jpeg'), function (err) {
                                                        res.redirect('/freshcoats');
                                                    })
                                                })
                                            })
                                        })
                                    })
                                })
                            }
                        })
                    } else {
                        fs.unlink(req.files.photo.tempFilePath, function() {
                            Polish.find({}).sort({brand: 1}).sort({name: 1}).exec(function (err, polishes) {
                                data = {}
                                data.title = 'Check In Your Mani - Lacquer Tracker';
                                data.polish = polishes;
                                data.message = 'File size too large. Limit for videos is 10MB.'
                                res.render('checkins/add.ejs', data);
                            })
                        })
                    }
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




//crop image check-in
app.get('/freshcoats/:id/crop', isLoggedIn, function(req, res) {
    data = {};
    Checkin.findById(req.params.id).populate('user', 'username').exec(function (err, post) {
        if (post === null || post === undefined) {
            res.redirect('/error');
        } else {
            if (post.user.id == req.user.id) {
                data.title = "Crop Fresh Coat - Lacquer Tracker";
                data.checkinid = post.id;
                data.checkinphoto = post.photo;
                res.render('checkins/crop.ejs', data);
            } else {
                res.redirect('/error');
            }
        }
    })
});

app.post('/freshcoats/:id/crop', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id, function(err, post) {
        if (req.body.x) {
            fs.copyFile(path.resolve('./public/' + sanitizer.sanitize(post.photo)), path.resolve('./public/images/checkinphotos/' + post.id + 't.jpeg'), function (err) {
                gm(path.resolve('./public/' + sanitizer.sanitize(post.photo)))
                .crop(sanitizer.sanitize(req.body.w), sanitizer.sanitize(req.body.h), sanitizer.sanitize(req.body.x), sanitizer.sanitize(req.body.y))
                .write(path.resolve('./public/' + sanitizer.sanitize(post.photo)), function (err) {
                    var ext = path.extname(path.resolve('./public/' + sanitizer.sanitize(req.body.location)));
                    gm(path.resolve('./public/images/checkinphotos/' + post.id + 't.jpeg'))
                    .crop(sanitizer.sanitize(req.body.w), sanitizer.sanitize(req.body.h), sanitizer.sanitize(req.body.x), sanitizer.sanitize(req.body.y))
                    .resize(null,500)
                    .write(path.resolve('./public/images/checkinphotos/' + post.id + 't.jpeg'), function (err) {
                        res.redirect('/freshcoats');
                    })
                })
            })
        } else {
            res.redirect('/freshcoats');
        }
    })
});




//view specific check-in
app.get('/freshcoats/:id', function(req, res) {
    data = {};
    Checkin.findById(req.params.id).populate({path: 'comments', populate:{path:'user', select: 'username profilephoto'}}).populate('user', 'username').populate('polish', 'brand name').exec(function (err, post) {
        if (post === null || post === undefined || post.pendingdelete == true) {
            res.redirect('/error');
        } else {
            data.title = post.user.username + "'s Fresh Coat - Lacquer Tracker";
            data.checkinuser = post.user;
            data.checkinid = post.id;
            data.checkinphoto = post.photo;
            data.checkintype = post.type;
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
            data.alttagpolish = post.polish.map(function(x) {
                return x.brand + " " + x.name;
            }).toString().replace(",", ", ");
            res.render('checkins/viewonecheckin.ejs', data);
        }
    })
});




//save checkin
app.post('/freshcoats/:id/save', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).exec(function(err, post) {
        post.savedby.addToSet(req.user.id);
        post.save();
        req.user.savedcheckins.addToSet(req.params.id);
        req.user.save();
    });
});


//unsave checkin
app.post('/freshcoats/:id/unsave', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).exec(function(err, post) {
        post.savedby.remove(req.user.id);
        post.save();
        req.user.savedcheckins.remove(req.params.id);
        req.user.save();
    });
});




//reply to a checkin or comment
app.post('/freshcoats/:id/:cid/add', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).populate('user').exec(function (err, post){
        var newCheckinComment = new CheckinComment ({
            checkinid: post.id,
            parentid: req.params.cid,
            user: req.user.id,
            message: markdown(sanitizer.sanitize(req.body.message)),
            date: new Date(),
        })
        newCheckinComment.save(function(err) {
            if (req.files.photo.name.length > 0) {
                if (req.files.photo.mimetype.startsWith("image")) {
                    var ext = path.extname(req.files.photo.name);
                    newCheckinComment.photo = '/images/checkincommentphotos/' + newCheckinComment.id + ext;
                    newCheckinComment.save();
                    gm(req.files.photo.tempFilePath).strip().resize(400).write(path.resolve('./public/images/checkincommentphotos/' + newCheckinComment.id + ext), function (err) {
                        if (err) {
                            fs.unlink(req.files.photo.tempFilePath, function(err) {
                                newCheckinComment.photo = undefined;
                                newCheckinComment.save(function(err) {
                                    res.redirect('/freshcoats/' + newCheckinComment.checkinid);
                                });
                            })
                        } else {
                            fs.unlink(req.files.photo.tempFilePath, function() {
                                newCheckinComment.photo = '/images/checkincommentphotos/' + newCheckinComment.id + ext;
                                newCheckinComment.save(function(err) {
                                    res.redirect('/freshcoats/' + newCheckinComment.checkinid);
                                });
                            })
                        }
                    })
                } else {
                    fs.unlink(req.files.photo.tempFilePath, function(err) {
                        res.redirect('/freshcoats/' + newCheckinComment.checkinid);
                    })
                }
            } else {
                res.redirect('/freshcoats/' + newCheckinComment.checkinid);
            }
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
                            replyTo: "lacquertrackermailer@gmail.com",
                            to: comment.user.email,
                            subject: 'New reply to your comment',
                            text: "Hi " + comment.user.username + ",\n\n" + req.user.username + " just replied to your comment on a fresh coat.\n\nCheck it out here: https://www.lacquertracker.com/freshcoats/" + post.id + "\n\n\nHappy polishing,\nLacquer Tracker",
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
                        replyTo: "lacquertrackermailer@gmail.com",
                        to: post.user.email,
                        subject: 'New reply to your fresh coat',
                        text: "Hi " + post.user.username + ",\n\n" + req.user.username + " just replied to your fresh coat.\n\nCheck it out here: https://www.lacquertracker.com/freshcoats/" + post.id + "\n\n\nHappy polishing,\nLacquer Tracker",
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
                            parent.save();
                        })
                    } else {
                        post.save();
                    }
                })
            })
        })
    })
});




//edit check-in
app.get('/freshcoats/:id/edit', isLoggedIn, function(req, res) {
    data = {};
    Polish.find({}).sort({brand: 1}).sort({name: 1}).exec(function (err, polishes) {
        data.polish = polishes;
        Checkin.findById(req.params.id).populate('polish', 'name brand').exec(function (err, post) {
            if (post === null || post === undefined) {
                res.redirect('/error');
            } else {
                if (post.user == req.user.id) {
                    data.title = "Edit Fresh Coat - Lacquer Tracker";
                    data.checkinid = post.id;
                    data.checkinphoto = post.photo;
                    data.checkintype = post.type;
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

app.post('/freshcoats/:id/edit', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id, function (err, post){
        var currentPolish = post.polish;
        if (post.user == req.user.id) {
            if (req.body.polish) {
                post.polish = sanitizer.sanitize(req.body.polish).split(',');
                var newPolish = sanitizer.sanitize(req.body.polish).split(',');
            } else {
                post.polish = [];
                var newPolish = [];
            }
            post.editdate = new Date;
            post.description = sanitizer.sanitize(req.body.description);
            post.save(function(err) {
                for (i=0; i<currentPolish.length; i++) {
                    if (newPolish.indexOf(currentPolish[i].toString()) == -1) {
                        Polish.findById(currentPolish[i]).exec(function(err, polish) {
                            polish.checkins.remove(req.params.id);
                            polish.save();
                        })
                    }
                }
                if (req.body.polish) {
                    for (j=0; j<newPolish.length; j++) {
                        Polish.findById(sanitizer.sanitize(newPolish[j])).exec(function(err, polish) {
                            polish.checkins.addToSet(req.params.id);
                            polish.dateupdated = new Date();
                            polish.save();
                        })
                    }
                }
                res.redirect('/freshcoats/' + post.id);
            })
        } else {
            res.redirect('/error');
        }
    })
});





app.get('/freshcoats/:id/add', isLoggedIn, function(req, res) {
    res.redirect('/freshcoats/' + req.params.id + "#addcomment")
});

app.get('/freshcoats/:id/addreply', isLoggedIn, function(req, res) {
    res.redirect('/freshcoats/' + req.params.id)
});




//remove comment
app.get('/freshcoats/:id/:cid/remove', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id, function(err, post) {
        CheckinComment.findById(req.params.cid, function(err, comment) {
            if (comment === null || comment === undefined) {
                res.redirect('/error');
            } else {
                if (comment.user == req.user.id || req.user.level === "admin") {
                    if (comment.childid.length > 0) {
                        fs.unlink(path.resolve('./public/'+comment.photo), function(err) {
                            comment.message = sanitizer.sanitize(markdown("_comment deleted_"));
                            comment.photo = undefined;
                            comment.save(function(err) {
                                res.redirect("/freshcoats/" + req.params.id);
                            })
                        })
                    } else {
                        fs.unlink(path.resolve('./public/'+comment.photo), function(err) {
                            post.comments.remove(req.params.cid);
                            post.save(function(err) {
                                if (comment.parentid !== comment.checkinid) {
                                    CheckinComment.findById(comment.parentid, function(err, parentcomment) {
                                        parentcomment.childid.remove(req.params.cid);
                                        parentcomment.save();
                                        CheckinComment.findByIdAndRemove(req.params.cid, function(err) {
                                            res.redirect("/freshcoats/" + req.params.id);
                                        })
                                    })
                                } else {
                                    CheckinComment.findByIdAndRemove(req.params.cid, function(err) {
                                        res.redirect("/freshcoats/" + req.params.id);
                                    })
                                }
                            })
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
app.get('/freshcoats/:id/remove', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).populate('user').exec(function(err, post) {
        if (post === null || post === undefined) {
            res.redirect('/error');
         } else {
             if (post.user.username == req.user.username || req.user.level === "admin") {
                for (i=0; i<post.savedby.length; i++) {
                    User.findById(post.savedby[i]).exec(function(err, user) {
                        user.savedcheckins.remove(req.params.id);
                        user.save();
                    })
                }
                CheckinComment.find({checkinid:req.params.id}, function(err, comments) {
                    for (i=0; i < comments.length; i++) {
                        fs.unlink(path.resolve('./public/'+comments[i].photo), function(err) {
                            //continue
                        })
                        comments[i].remove();
                    }
                    fs.unlink(path.resolve('./public/'+post.photo), function(err) {
                        fs.unlink(path.resolve('./public/images/checkinphotos/' + req.params.id + 't.jpeg'), function(err) {
                            fs.unlink(path.resolve('./public/images/checkinphotos/' + req.params.id + 'thumb.jpeg'), function(err) {
                                for (i=0; i<post.polish.length; i++) {
                                    Polish.findById(post.polish[i]).exec(function(err, polish) {
                                        polish.checkins.remove(req.params.id);
                                        polish.save();
                                    })
                                }
                                Checkin.findByIdAndRemove(req.params.id, function(err) {
                                    post.user.checkins.remove(req.params.id);
                                    post.user.save();
                                    res.redirect('/freshcoats');
                                })
                            })
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
app.post('/freshcoats/:id/flag', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).exec(function(err, checkin) {
        if (checkin === null || checkin === undefined) {
            res.redirect('/error');
        } else {
            checkin.pendingdelete = true;
            checkin.pendingreason = req.user.username + " - " + sanitizer.sanitize(req.body.message);
            checkin.save(function(err) {
                var transport = nodemailer.createTransport({
                    sendmail: true,
                    path: "/usr/sbin/sendmail"
                });

                var mailOptions = {
                    from: "polishrobot@lacquertracker.com",
                    replyTo: "lacquertrackermailer@gmail.com",
                    to: 'lacquertrackermailer@gmail.com',
                    subject: 'Flagged Fresh Coat',
                    text: req.user.username + " has flagged a fresh coat.\n\nReason for flagging: "+sanitizer.sanitize(req.body.message)+"\n\nhttps://www.lacquertracker.com/admin/flaggedcheckins",
                }

                transport.sendMail(mailOptions, function(error, response) {
                    transport.close();
                });
                res.redirect('/freshcoats');
            })
        }
    });
});


//user flags a check-in comment
app.post('/freshcoats/:id/:cid/flag', isLoggedIn, function(req, res) {
    Checkin.findById(req.params.id).exec(function(err, checkin) {
        if (checkin === null || checkin === undefined) {
            res.redirect('/error');
        } else {
            CheckinComment.findById(req.params.cid).populate('user', 'username').exec(function(err, comment) {
                var transport = nodemailer.createTransport({
                    sendmail: true,
                    path: "/usr/sbin/sendmail"
                });

                var mailOptions = {
                    from: "polishrobot@lacquertracker.com",
                    replyTo: "lacquertrackermailer@gmail.com",
                    to: 'lacquertrackermailer@gmail.com',
                    subject: 'Flagged Fresh Coat Comment',
                    text: req.user.username + " has flagged a comment on this post:\nhttps://www.lacquertracker.com/freshcoats/"+checkin.id+"\n\nReason for flagging: "+sanitizer.sanitize(req.body.message)+"\n\nComment information:\nUser: "+comment.user.username+"\nDate: "+moment(comment.date).tz("America/New_York").format('llll')+"\nText: "+comment.message,
                }

                transport.sendMail(mailOptions, function(error, response) {
                    transport.close();
                });
                res.redirect('/freshcoats/'+req.params.id);
            })
        }
    });
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