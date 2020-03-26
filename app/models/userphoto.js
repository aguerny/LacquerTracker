//load the things we need
var mongoose = require('mongoose');


//define the schema for our model
var userphotoSchema = mongoose.Schema({
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    location: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('UserPhoto', userphotoSchema);