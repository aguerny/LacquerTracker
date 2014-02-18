//load the things we need
var mongoose = require('mongoose');


//define the schema for our user model
var photoSchema = mongoose.Schema({
	polishid: String,
	userid: String,
    type: String,
    location: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Photo', photoSchema);