const mongoose = require("mongoose");
const moment = require('moment-timezone');

const nutritionSchema = new mongoose.Schema({
    userId: {
        type: String,
        default: ""
    },
    brand_name: {
        type: String,
        default: ""
    },
    food_description: {
        type: String,
        default: ""
    }, 
    food_name: {
        type: String,
        default: ""
    },
    Calories: {
        type: String,
        default: ""
    },
    Fat: {
        type: String,
        default: ""    
    },
    Carbs: {
        type: String,
        default: ""
    },
    Protein: {
        type: String,
        default:""
    },
    quantity:{
        type: String,
        default:""
    },
    carbs_per_unit:{
        type: String,
        default:""
    },
    createdAtIST: {
        type: String,
        default: ""
    }
},{ timestamps: true 

})

// Create indexes for the email and name fields
// nutritionSchema.index({ foodName: 1 }, { unique: true });

// Pre-save middleware to set `createdAtIST` to IST
nutritionSchema.pre('save', function(next) {
    if (!this.createdAtIST) {
        this.createdAtIST = moment.tz("Asia/Kolkata").toDate();
    }
    next();
});

const nutritionModel = mongoose.model("nutrition", nutritionSchema);

module.exports = nutritionModel;