const mongoose = require('mongoose');

const glucoseSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true
    },
    unit: {
        type: String,
        required: true
    }
}, { timestamps:true }
)

const userGlucoseModel = mongoose.model("user_glucose", glucoseSchema);

module.exports = userGlucoseModel;