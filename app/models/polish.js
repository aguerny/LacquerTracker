//load the things we need
var mongoose = require('mongoose');


//define the schema for our user model
var polishSchema = mongoose.Schema({
	batch: String,
    brand: String,
    name: String,
    colorcat: String,
    type: String,
    indie: String,
    code: String,
    keywords: String,
    dateupdated: Date,
    dupes: String,
    photos: [{type: mongoose.Schema.Types.ObjectId, ref: 'Photo'}],
    checkins     : [{type: mongoose.Schema.Types.ObjectId, ref: 'Checkin'}],
    swatch: String,
    flagged: Boolean,
    flaggedreason: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Polish', polishSchema);