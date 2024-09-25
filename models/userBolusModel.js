const mongoose = require('mongoose');

const bolusSchema = new mongoose.Schema({
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

const userBolusModel = mongoose.model("user_bolus", bolusSchema);

module.exports = userBolusModel;