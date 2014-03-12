//load the things we need
var mongoose = require('mongoose');


//define the schema for our user model
var reviewSchema = mongoose.Schema({
	polishid: String,
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    rating: String,
    userreview: String,
    notes: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Review', reviewSchema);