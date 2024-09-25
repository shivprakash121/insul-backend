const mongoose = require('mongoose');


const smartBolusSchema = new mongoose.Schema({
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

const userSmartBolusModel = mongoose.model("user_smart_bolus", smartBolusSchema);

module.exports = userSmartBolusModel;