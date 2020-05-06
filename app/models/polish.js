//load the things we need
var mongoose = require('mongoose');


//define the schema for our model
var polishSchema = mongoose.Schema({
	batch: String,
    brand: String,
    brandid: {type: mongoose.Schema.Types.ObjectId, ref: 'Brand'},
    name: String,
    type: [],
    code: String,
    keywords: String,
    dateupdated: Date,
    createddate: Date,
    createdby: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    createdmethod: String,
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
    tool: Boolean,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Polish', polishSchema);