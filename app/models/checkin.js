//load the things we need
var mongoose = require('mongoose');


//define the schema for our model
var checkinSchema = mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    creationdate: Date,
    editdate: Date,
    photo: String,
    polish: [{type: mongoose.Schema.Types.ObjectId, ref: 'Polish'}],
    pendingdelete: Boolean,
    pendingreason: String,
    comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'CheckinComment'}],
    description: String,
    savedby: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    type: String,
});


//create the model for users and expose it to our app
module.exports = mongoose.model('Checkin', checkinSchema);