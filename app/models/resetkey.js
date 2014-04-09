//load the things we need
var mongoose = require('mongoose');


//define the schema for our blog post model
var resetkeySchema = mongoose.Schema({
	username: String,
	expiredate: Date,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('ResetKey', resetkeySchema);