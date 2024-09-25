const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        default: ""
    },
    lastName: {
        type: String,
        default: ""
    },
    age: {
        type: String,
        default: ""
    },
    dob: {
        type: String,
        default: ""
    },
    city: {
        type: String,
        default: ""
    },
    state: {
        type: String,
        default: ""
    },
    gender: {
        type: String,
        default: ""
    },
    height: {
        type: String,
        default: ""
    },
    weight: {
        type: String,
        default: ""
    },
    diabetes:{ 
        type: Boolean, 
        default: false 
    },
    isProfileCompleted: {
        type: Boolean,
        default: false
    },
    hypertension:{ 
        type: Boolean, 
        default: false 
    },
    email: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        default: ""    
    },
    password: {
        type: String,
        default: ""
    },
    userType:{
        type: String,
        enum:["User"],
        default: "User",
        required:true,
    },
    isPhoneVerified:{
        type: Boolean,
        default: false,
    },
    isEmailVerified:{
        type: Boolean,
        default: false,
    },
    phoneOtp: {
        type: String,
        default:""
    },
    emailOtp: {
        type: String,
        default: ""
    },
    otpExpiration: {
        type: Date
    },
    isDeviceSetup: {
        type: Boolean,
        default: false
    }
},{ timestamps: true 

})

// Create indexes for the email and name fields
// userSchema.index({ email: 1 }, { unique: true });
// userSchema.index({ name: 1 });

const usersModel = mongoose.model("user", userSchema);

module.exports = usersModel;