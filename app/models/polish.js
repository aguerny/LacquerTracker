//load the things we need
var mongoose = require('mongoose');


//define the schema for our model
var polishSchema = mongoose.Schema({
	batch: String,
    brand: String,
    name: String,
    colorcat: String,
    type: String,
    code: String,
    keywords: String,
    dateupdated: Date,
    createdby: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    dupes: [{type: mongoose.Schema.Types.ObjectId, ref: 'Polish'}],
    photos: [{type: mongoose.Schema.Types.ObjectId, ref: 'Photo'}],
    reviews: [{type: mongoose.Schema.Types.ObjectId, ref: 'Review'}],
    swatch: String,
    flagged: Boolean,
    flaggedreason: String,
    checkins: [{type: mongoose.Schema.Types.ObjectId, ref: 'Checkin'}],
    colorsrgb: [],
    colorsname: [],
    colorscategory: [],
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Polish', polishSchema);