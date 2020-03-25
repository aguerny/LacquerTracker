var Polish = require('../app/models/polish');
var Brand = require('../app/models/brand');
var User = require('../app/models/user');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var fs = require('node-fs');
var path = require('path');
var sanitizer = require('sanitizer');
var gm = require('gm').subClass({imageMagick: true});
var http = require('http');
var nodemailer = require('nodemailer');
var request = require('request');
var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};


module.exports = function(app, passport) {


//add polish photo
app.get('/photo/add/:id', isLoggedIn, function(req, res) {
    Polish.findById(req.params.id, function(err, p) {
        if (p === null) {
            res.redirect('/error');
        } else {
            var data = {};
                data.title = 'Add a Photo - Lacquer Tracker';
                data.pname = p.name;
                data.pbrand = p.brand;
                data.pid = p.id;
            res.render('photos/polish.ejs', data);
        }
    })
});

app.post('/photo/add/:id', isLoggedIn, function(req, res) {
    if (req.files.photo.name.length > 0) {
        if (req.files.photo.mimetype.startsWith("image")) {
            var ext = path.extname(req.files.photo.name);
            Polish.findById(req.params.id, function(err, p) {
                var newPhoto = new Photo ({
                    polishid: p.id,
                    userid: req.user.id,
                    location: '',
                    creditname: sanitizer.sanitize(req.body.creditname),
                    creditlink: sanitizer.sanitize(req.body.creditlink),
                    pendingdelete: false,
                    pendingreason: '',
                })
                newPhoto.save(function(err) {
                    p.dateupdated = new Date();
                    p.photos.push(newPhoto.id);
                    p.save();
                    gm(req.files.photo.tempFilePath).size(function(err, value) {
                        if (err) {
                            fs.unlink(req.files.photo.tempFilePath, function(err) {
                                newPhoto.remove();
                                p.photos.remove(newPhoto.id);
                                p.save(function(err) {
                                    res.redirect('/error');
                                })
                            })
                        } else if (value.width > 400) {
                            gm(req.files.photo.tempFilePath).resize(400).write(path.resolve('./public/images/polish/' + req.params.id + "-" + newPhoto.id + ext), function (err) {
                                if (err) {
                                    fs.unlink(req.files.photo.tempFilePath, function(err) {
                                        newPhoto.remove();
                                        p.photos.remove(newPhoto.id);
                                        p.save(function(err) {
                                            res.redirect('/error');
                                        })
                                    })
                                } else {
                                    fs.unlink(req.files.photo.tempFilePath, function() {
                                        newPhoto.location = '/images/polish/' + p.id + "-" + newPhoto.id + ext;
                                        newPhoto.save(function(err) {
                                            fs.exists(path.resolve('./public/images/swatches/' + p.id + '.jpg'), function(exists) {
                                                if (exists === false) {
                                                    res.redirect('/photo/swatch/' + p.id + '/' + newPhoto.id);
                                                } else {
                                                    res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
                                                }
                                            })
                                        })
                                    })
                                }
                            })
                        } else {
                            fs.rename(req.files.photo.tempFilePath, path.resolve('./public/images/polish/' + req.params.id + "-" + newPhoto.id + ext), function(err) {
                                if (err) {
                                    fs.unlink(req.files.photo.tempFilePath, function(err) {
                                        newPhoto.remove();
                                        p.photos.remove(newPhoto.id);
                                        p.save(function(err) {
                                            res.redirect('/error');
                                        })
                                    })
                                } else {
                                    fs.unlink(req.files.photo.tempFilePath, function() {
                                        newPhoto.location = '/images/polish/' + p.id + "-" + newPhoto.id + ext;
                                        newPhoto.save(function(err) {
                                            fs.exists(path.resolve('./public/images/swatches/' + p.id + '.jpg'), function(exists) {
                                                if (exists === false) {
                                                    res.redirect('/photo/swatch/' + p.id + '/' + newPhoto.id);
                                                } else {
                                                    res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
                                                }
                                            })
                                        })
                                    })
                                }
                            })
                        }
                    })
                })
            })
        } else {
            fs.unlink(req.files.photo.tempFilePath, function(){
                res.redirect('/error');
            })
        }
    } else if (req.body.url.length > 0) {
        fs.unlink(req.files.photo.tempFilePath, function() {
            var ext = path.extname(req.body.url);
            Polish.findById(req.params.id, function(err, p) {
                var newPhoto = new Photo ({
                    polishid: p.id,
                    userid: req.user.id,
                    location: '',
                    creditname: sanitizer.sanitize(req.body.creditname),
                    creditlink: sanitizer.sanitize(req.body.creditlink),
                    pendingdelete: false,
                    pendingreason: '',
                })
                newPhoto.save(function(err) {
                    var targetPath = path.resolve('./public/images/polish/' + req.params.id + '-' + newPhoto.id + ext);
                    p.dateupdated = new Date();
                    p.photos.push(newPhoto.id);
                    p.save();
                    download(req.body.url, targetPath, function(err) {
                        if (err) {
                            newPhoto.remove();
                            p.photos.remove(newPhoto.id);
                            p.save(function(err) {
                                res.redirect('/error');
                            })
                        } else {
                            gm(targetPath).size(function(err, value) {
                                if (err) {
                                    fs.unlink(targetPath, function() {
                                        newPhoto.remove();
                                        p.photos.remove(newPhoto.id);
                                        p.save(function(err) {
                                            res.redirect('/error');
                                        })
                                    })
                                } else if (value.width > 400) {
                                    gm(targetPath).resize(400).write(targetPath, function (err) {
                                        if (err) {
                                            fs.unlink(targetPath, function() {
                                                newPhoto.remove();
                                                p.photos.remove(newPhoto.id);
                                                p.save(function(err) {
                                                    res.redirect('/error');
                                                })
                                            })
                                        } else {
                                            newPhoto.location = '/images/polish/' + p.id + "-" + newPhoto.id + ext;
                                            newPhoto.save(function(err) {
                                                fs.exists(path.resolve('./public/images/swatches/' + p.id + '.jpg'), function(exists) {
                                                    if (exists === false) {
                                                        res.redirect('/photo/swatch/' + p.id + '/' + newPhoto.id);
                                                    } else {
                                                        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
                                                    }
                                                })
                                            })
                                        }
                                    })
                                } else {
                                    newPhoto.location = '/images/polish/' + p.id + "-" + newPhoto.id + ext;
                                    newPhoto.save(function(err) {
                                        fs.exists(path.resolve('./public/images/swatches/' + p.id + '.jpg'), function(exists) {
                                            if (exists === false) {
                                                res.redirect('/photo/swatch/' + p.id + '/' + newPhoto.id);
                                            } else {
                                                res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
                                            }
                                        })
                                    })
                                }
                            })
                        }
                    })
                })
            })
        })
    } else {
        res.redirect('/error');
    }
});


//user flags polish photo
app.get('/photo/flag/:pid/:id', isLoggedIn, function(req, res) {
    Photo.findById(req.params.id).exec(function(err, photo) {
        if (photo === null || photo === undefined) {
            res.redirect('/error');
        } else {
            data = {};
            data.title = "Flag Photo - Lacquer Tracker";
            data.photo = photo;
            res.render('photos/flag.ejs', data);
        }
    });
});

app.post('/photo/remove/:pid/:id', isLoggedIn, function(req, res) {
    Photo.findById(req.params.id).exec(function(err, photo) {
        if (photo === null || photo === undefined) {
            res.redirect('/error');
        } else {
            Polish.findById(req.params.pid, function(err, p) {
                photo.pendingdelete = true;
                photo.pendingreason = sanitizer.sanitize(req.body.pendingreason) + " - " + req.user.username + " - " + p.brand + "-" + p.name;
                photo.save(function(err) {
                    var transport = nodemailer.createTransport({
                        sendmail: true,
                        path: "/usr/sbin/sendmail"
                    });

                    var mailOptions = {
                        from: "polishrobot@lacquertracker.com",
                        to: 'lacquertrackermailer@gmail.com',
                        subject: 'Flagged Photo',
                        text: req.user.username + " has flagged a photo.\n\n\nwww.lacquertracker.com/admin/pending",
                    }

                    transport.sendMail(mailOptions, function(error, response) {
                        transport.close();
                    });
                    res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
                })
            })
        }
    });
});


app.get('/photo/edit/:pid', isLoggedIn, function(req, res) {
    data = {};
    data.title = 'Edit Polish Photos - Lacquer Tracker';
    Photo.find({polishid: req.params.pid, pendingdelete:false}, function(err, photo) {
        data.allphotos = photo;
        Polish.findById(req.params.pid, function(err, p) {
            data.urlbrand = p.brand.replace(/ /g,"_");
            data.urlname = p.name.replace(/ /g,"_");
            res.render('photos/polishedit.ejs', data)
        })
    })
});


//edit polish photo credit
app.get('/photo/edit/:pid/:id', isLoggedIn, function(req, res) {
    Photo.findById(req.params.id).exec(function(err, photo) {
        if (photo === null || photo === undefined) {
            res.redirect('/error');
        } else {
            data = {};
            data.title = 'Edit Photo Credit - Lacquer Tracker';
            data.photo = photo;
            res.render('photos/polisheditcredit.ejs', data);
        }
    });
});

app.post('/photo/edit/:pid/:id', isLoggedIn, function(req, res) {
    Photo.findById(req.params.id).exec(function(err, photo) {
        if (photo === null || photo === undefined) {
            res.redirect('/error');
        } else {
            photo.creditname = sanitizer.sanitize(req.body.creditname);
            photo.creditlink = sanitizer.sanitize(req.body.creditlink);
            photo.save(function(err) {
                Polish.findById(req.params.pid, function(err, p) {
                    p.dateupdated = new Date();
                    p.save(function(err) {
                        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
                    });
                });
            })
        }
    })
});




//forum photo upload
app.get('/photo/upload', isLoggedIn, function(req, res) {
    var data = {};
    data.title = 'Upload a Photo - Lacquer Tracker';
    res.render('photos/forum.ejs', data);
});


//from file
app.post('/photo/upload', isLoggedIn, function(req, res) {
    if (req.files.photo.name.length > 0) {
        if (req.files.photo.mimetype.startsWith("image")) {
            var ext = path.extname(req.files.photo.name);
            var newUserPhoto = new UserPhoto ({
                userid: req.user.id,
                onprofile: req.body.onprofile,
                location: '',
            })
            newUserPhoto.save(function(err) {
                if (err) {
                    fs.unlink(req.files.photo.tempFilePath, function(err) {
                        newUserPhoto.remove(function(err) {
                            res.redirect('/error');
                        })
                    })
                } else {
                    req.user.photos.push(newUserPhoto.id);
                    req.user.save(function(err) {
                        gm(req.files.photo.tempFilePath).size(function(err, value) {
                            if (err) {
                                fs.unlink(req.files.photo.tempFilePath, function(err) {
                                    newUserPhoto.remove();
                                    req.user.photos.remove(newUserPhoto.id);
                                    req.user.save(function(err) {
                                        res.redirect('/error');
                                    })
                                })
                            } else {
                                if (value.width > 400) {
                                    gm(req.files.photo.tempFilePath).resize(400).write(path.resolve('./public/images/useruploads/' + req.user.username + "-" + newUserPhoto.id + ext), function (err) {
                                        if (err) {
                                            fs.unlink(req.files.photo.tempFilePath, function(err) {
                                                newUserPhoto.remove();
                                                req.user.photos.remove(newUserPhoto.id);
                                                req.user.save(function(err) {
                                                    res.redirect('/error');
                                                })
                                            })
                                        } else {
                                            fs.unlink(req.files.photo.tempFilePath, function() {
                                                newUserPhoto.location = '/images/useruploads/' + req.user.username + "-" + newUserPhoto.id + ext;
                                                newUserPhoto.save(function(err) {
                                                    res.render('photos/forumsuccess.ejs', {title: 'Upload a Photo - Lacquer Tracker', message: 'To use this photo on the forums, the URL is:', url: 'http://www.lacquertracker.com/images/useruploads/' + req.user.username + '-' + newUserPhoto.id + ext, srcurl: newUserPhoto.location});
                                                })
                                            })
                                        }
                                    })
                                } else {
                                    fs.rename(req.files.photo.tempFilePath, path.resolve('./public/images/useruploads/' + req.user.username + "-" + newUserPhoto.id + ext), function(err) {
                                        if (err) {
                                            fs.unlink(req.files.photo.tempFilePath, function(err) {
                                                newUserPhoto.remove();
                                                req.user.photos.remove(newUserPhoto.id);
                                                req.user.save(function(err) {
                                                    res.redirect('/error');
                                                })
                                            })
                                        } else {
                                            fs.unlink(req.files.photo.tempFilePath, function() {
                                                newUserPhoto.location = '/images/useruploads/' + req.user.username + "-" + newUserPhoto.id + ext;
                                                newUserPhoto.save(function(err) {
                                                    res.render('photos/forumsuccess.ejs', {title: 'Upload Success - Lacquer Tracker', message: 'To use this photo on the forums, the URL is:', url: 'http://www.lacquertracker.com/images/useruploads/' + req.user.username + '-' + newUserPhoto.id + ext, srcurl: newUserPhoto.location});
                                                })
                                            })
                                        }
                                    })
                                }
                            }
                        })
                    })
                }
            })
    }    else {
            fs.unlink(req.files.photo.tempFilePath, function() {
                res.redirect('/error');
            })
        }
    } else if (req.body.url.length > 0) {
        fs.unlink(req.files.photo.tempFilePath, function() {
            var ext = path.extname(req.body.url);
            var newUserPhoto = new UserPhoto ({
                userid: req.user.id,
                onprofile: req.body.onprofile,
                location: '',
            })
            newUserPhoto.save(function(err) {
                if (err) {
                    res.redirect('/error');
                } else {
                    req.user.photos.push(newUserPhoto.id);
                    var targetPath = path.resolve('./public/images/useruploads/' + req.user.username + "-" + newUserPhoto.id + ext);
                    req.user.save(function(err) {
                        download(req.body.url, targetPath, function(err) {
                            if (err) {
                                newUserPhoto.remove();
                                req.user.photos.remove(newUserPhoto.id);
                                req.user.save(function(err) {
                                    res.redirect('/error');
                                })
                            } else {
                                gm(targetPath).size(function(err, value) {
                                    if (err) {
                                        fs.unlink(targetPath, function(err) {
                                            newUserPhoto.remove();
                                            req.user.photos.remove(newUserPhoto.id);
                                            req.user.save(function(err) {
                                                res.redirect('/error');
                                            })
                                        })
                                    } else if (value.width > 400) {
                                        gm(targetPath).resize(400).write(targetPath, function (err) {
                                            if (err) {
                                                fs.unlink(targetPath, function(err) {
                                                    newUserPhoto.remove();
                                                    req.user.photos.remove(newUserPhoto.id);
                                                    req.user.save(function(err) {
                                                        res.redirect('/error');
                                                    })
                                                })
                                            } else {
                                                newUserPhoto.location = '/images/useruploads/' + req.user.username + "-" + newUserPhoto.id + ext;
                                                newUserPhoto.save(function(err) {
                                                    res.render('photos/forumsuccess.ejs', {title: 'Upload a Photo - Lacquer Tracker', message: 'To use this photo on the forums, the URL is:', url: 'http://www.lacquertracker.com/images/useruploads/' + req.user.username + '-' + newUserPhoto.id + ext, srcurl: newUserPhoto.location});
                                                })
                                            }
                                        })
                                    } else {
                                        newUserPhoto.location = '/images/useruploads/' + req.user.username + "-" + newUserPhoto.id + ext;
                                        newUserPhoto.save(function(err) {
                                                res.render('photos/forumsuccess.ejs', {title: 'Upload Success - Lacquer Tracker', message: 'To use this photo on the forums, the URL is:', url: 'http://www.lacquertracker.com/images/useruploads/' + req.user.username + '-' + newUserPhoto.id + ext, srcurl: newUserPhoto.location});
                                        })
                                    }
                                })
                            }
                        })
                    })
                }
            })
        })
    } else {
        res.redirect('/error');
    }
});




//profile photo
app.get('/photo/profile', isLoggedIn, function(req, res) {
    var data = {};
    data.title = 'Upload a Profile Photo - Lacquer Tracker';
    res.render('photos/profile.ejs', data);
});


//from file
app.post('/photo/profile', isLoggedIn, function(req, res) {
    if (req.files.photo.name.length > 0) {
        if (req.files.photo.mimetype.startsWith("image")) {
            var ext = path.extname(req.files.photo.name);
            var tempPath = req.files.photo.tempFilePath;
            var targetPath = path.resolve('./public/images/profilephotos/' + req.user.username + ext);
            gm(tempPath).resize(200).write(targetPath, function (err) {
                if (err) {
                    fs.unlink(tempPath, function(err) {
                        res.redirect('/error');
                    })
                } else {
                    fs.unlink(tempPath, function() {
                        req.user.profilephoto = '/images/profilephotos/' + req.user.username + ext,
                        req.user.save(function(err) {
                            res.redirect('/profile/' + req.user.username);
                        })
                    })
                }
            })
        } else {
            fs.unlink(req.files.photo.tempFilePath, function() {
                res.redirect('/error');
            })
        }
    } else if (req.body.url.length > 0) {
        fs.unlink(req.files.photo.tempFilePath);
        var ext = path.extname(req.body.url);
        var tempPath = path.resolve('./public/images/tmp/' + req.user.username + ext);
        var targetPath = path.resolve('./public/images/profilephotos/' + req.user.username + ext);
        download(req.body.url, tempPath, function(err) {
            if (err) {
                res.redirect('/error');
            } else {
                gm(tempPath).resize(200).write(targetPath, function(err) {
                    if (err) {
                        fs.unlink(tempPath, function(err) {
                            res.redirect('/error');
                        })
                    } else {
                        fs.unlink(tempPath, function() {
                            req.user.profilephoto = '/images/profilephotos/' + req.user.username + ext,
                            req.user.save(function(err) {
                                res.redirect('/profile/' + req.user.username);
                            })
                        })
                    }
                })
            }
        })
    } else {
        res.redirect('/error');
    }
});


//brand photo
app.get('/admin/brandphoto/:id', isLoggedIn, function(req, res) {
    var data = {};
    data.title = 'Upload a Brand Photo - Lacquer Tracker';
    data.brandid = req.params.id;
    res.render('photos/brand.ejs', data);
});


//from file
app.post('/admin/brandphoto/:id', isLoggedIn, function(req, res) {
    Brand.findById(req.params.id, function(err, brand) {
        if (req.files.photo.name.length > 0) {
            if (req.files.photo.mimetype.startsWith("image")) {
                var ext = path.extname(req.files.photo.name);
                var tempPath = req.files.photo.tempFilePath;
                var targetPath = path.resolve('./public/images/brandphotos/' + brand.id + ext);
                gm(tempPath).resize(200).write(targetPath, function (err) {
                    if (err) {
                        fs.unlink(tempPath, function(err) {
                            res.redirect('/error');
                        })
                    } else {
                        fs.unlink(tempPath, function() {
                            brand.photo = '/images/brandphotos/' + brand.id + ext,
                            brand.save(function(err) {
                                res.redirect('/brand/' + brand.name.replace(/ /g,"_"));
                            })
                        })
                    }
                })
            } else {
                fs.unlink(req.files.photo.tempFilePath, function () {
                    res.redirect('/error');
                })
            }
        } else if (req.body.url.length > 0) {
            fs.unlink(req.files.photo.tempFilePath);
            var ext = path.extname(req.body.url);
            var tempPath = path.resolve('./public/images/tmp/' + brand.id + ext);
            var targetPath = path.resolve('./public/images/brandphotos/' + brand.id + ext);
            download(req.body.url, tempPath, function(err) {
                if (err) {
                    res.redirect('/error');
                } else {
                    gm(tempPath).resize(200).write(targetPath, function(err) {
                        if (err) {
                            fs.unlink(tempPath, function(err) {
                                res.redirect('/error');
                            })
                        } else {
                            fs.unlink(tempPath, function() {
                                brand.photo = '/images/brandphotos/' + brand.id + ext,
                                brand.save(function(err) {
                                    res.redirect('/brand/' + brand.name.replace(/ /g,"_"));
                                })
                            })
                        }
                    })
                }
            })
        } else {
            res.redirect('/error');
        }
    })
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