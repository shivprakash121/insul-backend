const mongoose = require('mongoose');

const basalSchema = new mongoose.Schema({
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

const basalModel = mongoose.model("basal", basalSchema);

module.exports = basalModel;