//load the things we need
var mongoose = require('mongoose');


//define the schema for our user model
var userphotoSchema = mongoose.Schema({
	userid: String,
    location: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('UserPhoto', userphotoSchema);