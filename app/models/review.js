//load the things we need
var mongoose = require('mongoose');


//define the schema for our model
var reviewSchema = mongoose.Schema({
	polish: {type: mongoose.Schema.Types.ObjectId, ref: 'Polish'},
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    rating: String,
    review: String,
    notes: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Review', reviewSchema);