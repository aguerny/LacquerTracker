//load the things we need
var mongoose = require('mongoose');


//define the schema for our user model
var polishSchema = mongoose.Schema({
	name: String,
	brand: String,
	collection: String,
	year: String,
});




//create the model for users and expose it to our app
module.exports = mongoose.model('Polish', polishSchema);