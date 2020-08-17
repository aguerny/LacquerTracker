var Polish = require('../app/models/polish');
var User = require('../app/models/user');
var sanitizer = require('sanitizer');
var _ = require('lodash');
var PolishColors = require('../app/constants/polishColors');



module.exports = function(app, passport) {


//generate random mani
app.get('/random', isLoggedIn, function(req, res) {
    if (req.user.level === "admin") {
        User.findOne({username: req.user.username}).populate('ownedpolish', 'name brand type swatch tool').exec(function (err, user) {
            var data = {};
            data.title = "Manicure Generator";
            data.results = false;
            data.number = "surprise";
            data.technique = "no";
            data.chosenTechnique = "no";
            data.allPolish = '';
            data.allChosenTechniqueAccessories = '';
            var plate = user.ownedpolish.filter(function( obj ) {
                return obj.tool == true && _.includes(obj.type, "plate");
            });
            if (plate.length > 0){
                data.plate = true;
            } else {
                data.plate = false;
            }
            var vinyl = user.ownedpolish.filter(function( obj ) {
                return obj.tool == true && _.includes(obj.type, "vinyl");
            });
            if (vinyl.length > 0){
                data.vinyl = true;
            } else {
                data.vinyl = false;
            }
            var loose = user.ownedpolish.filter(function( obj ) {
                return obj.tool == true && (_.includes(obj.type, "loose-flakes") || _.includes(obj.type, "loose-gems") || _.includes(obj.type, "loose-glitter"));
            });
            if (loose.length > 0){
                data.loose = true;
            } else {
                data.loose = false;
            }
            var sticker = user.ownedpolish.filter(function( obj ) {
                return obj.tool == true && _.includes(obj.type, "sticker");
            });
            if (sticker.length > 0){
                data.sticker = true;
            } else {
                data.sticker = false;
            }
            res.render('random.ejs', data);
        })
    }
});


app.post('/random', function(req, res) {
    User.findOne({username: req.user.username}).populate('ownedpolish', 'name brand type swatch tool').exec(function(err, user) {
        var data = {};
        data.title = "Manicure Generator";
        data.results = true;
        data.number = req.body.number;
        data.technique = req.body.technique;

        var plate = user.ownedpolish.filter(function( obj ) {
            return obj.tool == true && _.includes(obj.type, "plate");
        });
        if (plate.length > 0){
            data.plate = true;
        } else {
            data.plate = false;
        }
        var vinyl = user.ownedpolish.filter(function( obj ) {
            return obj.tool == true && _.includes(obj.type, "vinyl");
        });
        if (vinyl.length > 0){
            data.vinyl = true;
        } else {
            data.vinyl = false;
        }
        var loose = user.ownedpolish.filter(function( obj ) {
            return obj.tool == true && (_.includes(obj.type, "loose-flakes") || _.includes(obj.type, "loose-gems") || _.includes(obj.type, "loose-glitter"));
        });
        if (loose.length > 0){
            data.loose = true;
        } else {
            data.loose = false;
        }
        var sticker = user.ownedpolish.filter(function( obj ) {
            return obj.tool == true && _.includes(obj.type, "sticker");
        });
        if (sticker.length > 0){
            data.sticker = true;
        } else {
            data.sticker = false;
        }

        //generate polish
        if (req.body.number !== "surprise") {
            var numPolish = parseInt(req.body.number);
        } else {
            var item = {
                1:50,
                2:25,
                3:15,
                4:10,
                5:5,
            };
            function get(input) {
                var array = [];
                for(var item in input) {
                    if ( input.hasOwnProperty(item) ) {
                        for( var i=0; i<input[item]; i++ ) {
                            array.push(item);
                        }
                    }
                }
                return array[Math.floor(Math.random() * array.length)];
            }
            var numPolish = parseInt(get(item));
        }
        data.numPolish = numPolish;

        var shufflePolish = _.shuffle(user.ownedpolish);

        var polish = shufflePolish.filter(function( obj ) {
            if ((obj.tool == undefined || obj.tool == false) && (obj.type !== ["top"] && _.includes(obj.type, "base") !== true)) {
                return obj;
            }
        });

        if (user.ownedpolish.length == 0) {
            data.message = "Oops! Come back once you've added some polish to your owned list.";
        } else {
            data.message = "Create a manicure using these items from your collection:";
        }

        if (user.ownedpolish.length = 0) {
            data.polish = [];
        } else {
            if (polish.length < numPolish) {
                data.polish = polish;
                data.allPolish = polish;
            } else {
                data.polish = polish.slice(0, numPolish);
                data.allPolish = polish;
            }
        }

        //generate technique/accessory
        if (req.body.technique == "surprise") {
            var techniques = [
                "french",
                "half moon",
                "stripe",
                "dotted",
                "gradient",
                "freehand",
                "marble",
                "splatter",
                "accent nail",
                "braided",
                "geometric",
                "abstract",
                "chevron",
                "animal print"
            ];

            var plate = shufflePolish.filter(function( obj ) {
                return obj.tool == true && _.includes(obj.type, "plate");
            });
            if (plate.length > 0){
                techniques.push("stamping");
            }

            var vinyl = shufflePolish.filter(function( obj ) {
                return obj.tool == true && _.includes(obj.type, "vinyl");
            });
            if (vinyl.length > 0){
                techniques.push("vinyl");
            }

            var loose = shufflePolish.filter(function( obj ) {
                return obj.tool == true && (_.includes(obj.type, "loose-flakes") || _.includes(obj.type, "loose-gems") || _.includes(obj.type, "loose-glitter"));
            });
            if (loose.length > 0){
                techniques.push("loose accessory");
            }

            var sticker = shufflePolish.filter(function( obj ) {
                return obj.tool == true && _.includes(obj.type, "sticker");
            });
            if (sticker.length > 0){
                techniques.push("sticker");
            }

            var chosenTechnique = _.sample(techniques);
            data.chosenTechnique = chosenTechnique;

            if (chosenTechnique == "stamping") {
                data.chosenTechniqueAccessory = plate[0];
                data.allChosenTechniqueAccessories = plate;
            } else if (chosenTechnique == "vinyl") {
                data.chosenTechniqueAccessory = vinyl[0];
                data.allChosenTechniqueAccessories = vinyl;
            } else if (chosenTechnique == "loose accessory") {
                data.chosenTechniqueAccessory = loose[0];
                data.allChosenTechniqueAccessories = loose;
            } else if (chosenTechnique == "sticker") {
                data.chosenTechniqueAccessory = sticker[0];
                data.allChosenTechniqueAccessories = sticker;
            } else {
                data.chosenTechniqueAccessory = '';
                data.allChosenTechniqueAccessories = '';
            }
            var vowels = ("aeiouAEIOU"); 
            if (vowels.indexOf(chosenTechnique[0]) !== -1) {
                data.message2 = "Create an ";
                data.message3 = " manicure using these items from your collection:";
            } else {
                data.message2 = "Create a ";
                data.message3 = " manicure using these items from your collection:";
            }
        } else if (req.body.technique == "plate") {
            var techniques = [];

            var plate = shufflePolish.filter(function( obj ) {
                return obj.tool == true && _.includes(obj.type, "plate");
            });
            if (plate.length > 0){
                techniques.push("stamping");
            }

            var chosenTechnique = _.sample(techniques);
            data.chosenTechnique = chosenTechnique;

            if (chosenTechnique == "stamping") {
                data.chosenTechniqueAccessory = plate[0];
                data.allChosenTechniqueAccessories = plate;
            }
            var vowels = ("aeiouAEIOU"); 
            if (vowels.indexOf(chosenTechnique[0]) !== -1) {
                data.message2 = "Create an ";
                data.message3 = " manicure using these items from your collection:";
            } else {
                data.message2 = "Create a ";
                data.message3 = " manicure using these items from your collection:";
            }
        } else if (req.body.technique == "vinyl") {
            var techniques = [];

            var vinyl = shufflePolish.filter(function( obj ) {
                return obj.tool == true && _.includes(obj.type, "vinyl");
            });
            if (vinyl.length > 0){
                techniques.push("vinyl");
            }

            var chosenTechnique = _.sample(techniques);
            data.chosenTechnique = chosenTechnique;

            if (chosenTechnique == "vinyl") {
                data.chosenTechniqueAccessory = vinyl[0];
                data.allChosenTechniqueAccessories = vinyl;
            }
            var vowels = ("aeiouAEIOU"); 
            if (vowels.indexOf(chosenTechnique[0]) !== -1) {
                data.message2 = "Create an ";
                data.message3 = " manicure using these items from your collection:";
            } else {
                data.message2 = "Create a ";
                data.message3 = " manicure using these items from your collection:";
            }
        } else if (req.body.technique == "loose") {
            var techniques = [];

            var loose = shufflePolish.filter(function( obj ) {
                return obj.tool == true && (_.includes(obj.type, "loose-flakes") || _.includes(obj.type, "loose-gems") || _.includes(obj.type, "loose-glitter"));
            });
            if (loose.length > 0){
                techniques.push("loose accessory");
            }

            var chosenTechnique = _.sample(techniques);
            data.chosenTechnique = chosenTechnique;

            if (chosenTechnique == "loose accessory") {
                data.chosenTechniqueAccessory = loose[0];
                data.allChosenTechniqueAccessories = loose;
            }
            var vowels = ("aeiouAEIOU"); 
            if (vowels.indexOf(chosenTechnique[0]) !== -1) {
                data.message2 = "Create an ";
                data.message3 = " manicure using these items from your collection:";
            } else {
                data.message2 = "Create a ";
                data.message3 = " manicure using these items from your collection:";
            }
        } else if (req.body.technique == "sticker") {
            var techniques = [];

            var sticker = shufflePolish.filter(function( obj ) {
                return obj.tool == true && _.includes(obj.type, "sticker");
            });
            if (sticker.length > 0){
                techniques.push("sticker");
            }

            var chosenTechnique = _.sample(techniques);
            data.chosenTechnique = chosenTechnique;

            if (chosenTechnique == "sticker") {
                data.chosenTechniqueAccessory = sticker[0];
                data.allChosenTechniqueAccessories = sticker;
            }
            var vowels = ("aeiouAEIOU"); 
            if (vowels.indexOf(chosenTechnique[0]) !== -1) {
                data.message2 = "Create an ";
                data.message3 = " manicure using these items from your collection:";
            } else {
                data.message2 = "Create a ";
                data.message3 = " manicure using these items from your collection:";
            }
        // } else if (req.body.technique !== "no") {
        //     data.chosenTechnique = req.body.technique;
        //     data.chosenTechniqueAccessory = '';
        //     var vowels = ("aeiouAEIOU"); 
        //     if (vowels.indexOf(req.body.technique[0]) !== -1) {
        //         data.message2 = "Create an ";
        //         data.message3 = " manicure using these items from your collection:";
        //     } else {
        //         data.message2 = "Create a ";
        //         data.message3 = " manicure using these items from your collection:";
        //     }
        } else {
            data.chosenTechnique = "no";
            data.chosenTechniqueAccessory = '';
            data.allChosenTechniqueAccessories = '';
            data.message2 = '';
        }
        res.render('random.ejs', data);
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