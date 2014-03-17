var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var Review = require('../app/models/review');
var Photo = require('../app/models/photo');
var UserPhoto = require('../app/models/userphoto');
var Blog = require('../app/models/blog');
var BlogComment = require('../app/models/blogcomment');
var ForumPost = require('../app/models/forumpost');
var ForumComment = require('../app/models/forumcomment');
var mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');
var nodemailer = require('nodemailer');
var sanitizer = require('sanitizer');
var markdown = require('markdown').markdown;
var _ = require('lodash');
var simple_recaptcha = require('simple-recaptcha');



module.exports = function(app, passport) {


//polish photo
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
            res.render('photoadd.ejs', data);
    }
    })
});

app.post('/photo/add/:id', isLoggedIn, function(req, res) {
    var tempPath = req.files.photo.path;
    var targetPath = path.resolve('./public/images/polish/' + req.params.id + "-" + req.files.photo.name.replace(/ /g,"_"));
    fs.rename(tempPath, targetPath, function(err) {
        if (err) {
            throw err;
        } else {
            fs.unlink(tempPath, function() {
                if (err) throw err;
            })
            Polish.findById(req.params.id, function(err, p) {
                var newPhoto = new Photo ({
                    polishid: p.id,
                    userid: req.user.id,
                    location: '/images/polish/' + p.id + "-" + req.files.photo.name.replace(/ /g,"_"),
                })
                newPhoto.save(function(err) {
                    p.dateupdated = new Date();
                    p.save(function(err) {
                        res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
                    })
                })
            })
        }
    })
});


//remove polish photo
app.get('/photo/remove/:pid/:id', isLoggedIn, function(req, res) {
    Photo.findById(req.params.id).exec(function(err, photo) {
        fs.unlink('./public' + photo.location, function(err) {
            if (err) throw err;
            photo.remove();
        });
    })

    Polish.findById(req.params.pid, function(err, p) {
            res.redirect('/polish/' + p.brand.replace(/ /g,"_") + "/" + p.name.replace(/ /g,"_"));
    });
})


//user photo
app.get('/photo/upload', isLoggedIn, function(req, res) {
    var data = {};
    data.title = 'Upload a Photo - Lacquer Tracker';
    data.message = "";
    res.render('photoadduser.ejs', data);
});


app.post('/photo/upload', isLoggedIn, function(req, res) {
    var tempPath = req.files.photo.path;
    var targetPath = path.resolve('./public/images/useruploads/' + req.user.username + "-" + req.files.photo.name.replace(/ /g,"_"));
    fs.rename(tempPath, targetPath, function(err) {
        if (err) {
            throw err;
        } else {
            fs.unlink(tempPath, function() {
                if (err) throw err;
            })
            var newUserPhoto = new UserPhoto ({
                userid: req.user.id,
                onprofile: req.body.onprofile,
                location: '/images/useruploads/' + req.user.username + "-" + req.files.photo.name.replace(/ /g,"_"),
            })
            newUserPhoto.save(function(err) {
                req.user.photos.push(newUserPhoto.id);
                req.user.save(function(err) {
                    res.render('photoadduser.ejs', {title: 'Upload a Photo - Lacquer Tracker', message: 'Your photo URL is: localhost:3000/images/useruploads/' + req.user.username + "-" + req.files.photo.name.replace(/ /g,"_")});
                })
            })
        }
    })
});



//profile photo
app.get('/photo/profile', isLoggedIn, function(req, res) {
    var data = {};
    data.title = 'Upload a Profile Photo - Lacquer Tracker';
    res.render('photoaddprofile.ejs', data);
});


app.post('/photo/profile', isLoggedIn, function(req, res) {
    var tempPath = req.files.photo.path;
    var targetPath = path.resolve('./public/images/profilephotos/' + req.user.username + "-" + req.files.photo.name.replace(/ /g,"_"));
    fs.rename(tempPath, targetPath, function(err) {
        if (err) {
            throw err;
        } else {
            fs.unlink(tempPath, function() {
                if (err) throw err;
            })
            req.user.profilephoto = '/images/profilephotos/' + req.user.username + "-" + req.files.photo.name.replace(/ /g,"_"),
            req.user.save(function(err) {
                res.redirect('/profile/' + req.user.username);
            })
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