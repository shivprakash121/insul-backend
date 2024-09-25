const { required } = require("joi");
const mongoose = require("mongoose");
// const moment = require('moment-timezone');

const userWtSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    weight: {
        type: String,
        required: true
    },
    time:{
        type: String,
        required: true
    },
    dateTime: {
        type: String,
        required: true
    }
},{ timestamps: true })


const userWtModel = mongoose.model("user_wt", userWtSchema);

module.exports = userWtModel;