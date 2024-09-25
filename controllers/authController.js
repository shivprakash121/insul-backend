const Joi = require('joi');
const usersModel = require("../models/usersModel");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "../.env" });
const {sendOtp} = require('../helper/sendOtp');
// console.log(process.env.JWT_SECRET)
var unirest = require("unirest");
const userBolusModel = require('../models/userBolusModel');
const momentTimeZone = require('moment-timezone');
const userSmartBolusModel = require('../models/userSmartBolusModel');
const basalModel = require('../models/basalModel');
const userGlucoseModel = require('../models/userGlucoseModel');
const { Country, State, City } = require('country-state-city');
const moment = require("moment");
const userWtModel = require('../models/userWtModel');
// function as a middleware
function isValidData(data) {
    // Check if data is not null, undefined, or an empty object/array
    return data && 
           (typeof data === 'object' ? Object.keys(data).length > 0 : data.trim().length > 0);
}


exports.signup = async (req, res) => {
    try {
        const schema = Joi.object({
            name: Joi.string().required(),
            email: Joi.string().required(),
            phone: Joi.string().required(),
        });
        let result = schema.validate(req.body);
        if (result.error) {
            return res.status(400).json({
                status: 0,
                statusCode: 400,
                message: result.error.details[0].message,
            });
        }
        const {name, email, phone} = req.body;
        // Check Email and Phone already exists or not
        let user = await usersModel.findOne({$and:[{email:email},{isEmailVerified:true}]})
        if (!!user) {
            return res.status(400).json({
                statusCode: 400,
                statusValue: "FAIL",
                message: "Email Id already exists.",
            });
        }
        const userPhone = await usersModel.findOne({$and:[{phone:phone},{isPhoneVerified:true}]})
        if (!!userPhone) {
            return res.status(400).json({
                statusCode: 400,
                statusValue: "FAIL",
                message: "Contact already exists.",
            });
        }
        // Delete data if user registered but not verified
        const userData = await usersModel.findOne({$or:[{email:email},{isEmailVerified:false},{isPhoneVerified:false}]})
        if (!!userData) {
            await usersModel.findByIdAndDelete({_id:userData._id})
        }
        let password = "12345"
        user = new usersModel({name:name, email:email, password:password, phone:phone, userType: "User"})
        
        // Generate salt and hash the password
        const saltRounds = 10; // Number of rounds to generate salt
        const salt = await bcrypt.genSalt(saltRounds);
        user.password = await bcrypt.hash(password, salt);

        // Save the user to the database
        const savedDoc = await user.save();

       
        // Send OTP on email and Phone number
        var val = Math.floor(1000 + Math.random() * 9000)
        var val2 = Math.floor(1000 + Math.random() * 9000)
        const emailOtp = val.toString()
        const phoneOtp = val2.toString()
        // For email OTP
        const sendEmail = await sendOtp(email, emailOtp)
        // if (!!sendEmail) {
        //     console.log(true)
        // }
        var req = unirest("GET", "https://www.fast2sms.com/dev/bulkV2");
        const sendSms = req.query({
            "authorization": process.env.Fast2SMS_AUTHORIZATION,
            "variables_values": phoneOtp,
            "route": "otp",
            "numbers": phone
        })
        req.headers({
            "cache-control": "no-cache"
        })
        req.end(function (res) {
        // console.log(123,res.error.status)
            if (res.error.status === 400) {
                console.log(false)
            } 
            console.log("Error! while sending OTP.")  
        });
        if (!!savedDoc) {
            await usersModel.findOneAndUpdate({email:savedDoc.email},{emailOtp:emailOtp,phoneOtp:phoneOtp},{upsert:true})
            return res.status(201).json({
                statusCode: 201,
                statusValue: "SUCCESS",
                message: "Profile created successfully.",
                // token
            })
        }
        
                
        // if (sendSms) {
        //     return res.status(200).json({
        //         statusCode:201,
        //         statusValue:"SUCCESS",
        //         message:"Otp Sent Successfully.",
        //         otp:otp
        //     })
        // }

        
        // const payload = { user: {id: user.id} }
        // jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15d' }, (err, token) => {
        //     if (err) throw err;
        //     res.status(201).json({
        //         statusCode: 201,
        //         statusValue: "SUCCESS",
        //         message: "Profile created successfully.",
        //         // token
        //     })
        // })

    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.login = async (req, res) => {
    try {
        const {userId} = req.body;
        if (!userId) {
            return res.status(400).json({
                statusCode: 400,
                statusValue: "FAIL",
                message: "User email || contact is required.",
            }); 
        }

        // Function to validate an email
        function validateEmail(userId) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(userId);
        }

        // Function to validate a phone number (assuming a format like +1234567890 or 123-456-7890)
        function validatePhoneNumber(userId) {
            const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
            return phoneRegex.test(userId);
        }
        
        var val = Math.floor(1000 + Math.random() * 9000)
        const otp = val.toString();
        const otpExpiration = new Date(Date.now() + 10 * 60000);

        if (validateEmail(userId) === true) {
            // console.log(true)
            const checkUser = await usersModel.findOne({email:req.body.userId})
            await usersModel.findOneAndUpdate({email:userId},{email:userId, emailOtp:otp, otpExpiration:otpExpiration},{upsert:true}) 
            const sendEmail = await sendOtp(userId, otp)
            return res.status(200).json({
                statusCode: 200,
                statusValue: "SUCCESS",
                message: "OTP has been sent successfully!.",
            });
        }
        else if (validatePhoneNumber(userId) === true) {
            await usersModel.findOneAndUpdate({phone:userId},{phoneOtp:otp,otpExpiration:otpExpiration},{upsert:true})
            var req = unirest("GET", "https://www.fast2sms.com/dev/bulkV2");
            const sendSms = req.query({
                "authorization": process.env.Fast2SMS_AUTHORIZATION,
                "variables_values": otp,
                "route": "otp",
                "numbers": `${userId}`
            })
            req.headers({
                "cache-control": "no-cache"
            })
            req.end(function (res) {
            // console.log(123,res.error.status)
                if (res.error.status === 400) {
                    console.log(false)
                  } 
                //   console.log("Error! while sending OTP.")  
                });
                
            if (sendSms) {
                return res.status(200).json({
                    statusCode:201,
                    statusValue:"SUCCESS",
                    message:"Otp Sent Successfully.",
                    otp:otp
                })
            }  
            return res.status(400).json({
                statusCode:400,
                statusValue:"FAIL",
                message:"Otp was not sent.",
            })
        } else {
            return res.status(400).json({
                statusCode:400,
                statusValue:"FAIL",
                message:"Error!! You have entered invalid email or phone number.",
            }) 
        }

    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.verifyOtp = async (req, res) => {
    try {
        const {otp} = req.body;
        if (!otp) {
            return res.status(400).json({
                statusCode: 400,
                statusValue: "FAIL",
                message: "OTP is required.",
            }); 
        }
        
        // Check OTP
        const checkOtp = await usersModel.findOne({$or:[{emailOtp:otp},{phoneOtp:otp}]})
        if (!!checkOtp) {
            if (checkOtp.otpExpiration < new Date()) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue:"SUCCESS",
                    message:"OTP has been expired.",
                }) 
            }
            // req.session.user = {
            //     _id:checkOtp._id,
            //     email:checkOtp.email,
            //     userType:checkOtp.userType
            // }
            // console.log(req.session.user)
            await usersModel.findOneAndUpdate({$or:[{emailOtp:otp},{phoneOtp:otp}]},{isEmailVerified:true,isPhoneVerified:true},{upsert:true})
            return res.status(200).json({
                statusCode:200,
                statusValue:"SUCCESS",
                message:"OTP has been verified successfully.",
                otp:otp,
                data:checkOtp
            })
        }
        return res.status(400).json({
            statusCode: 400,
            statusValue: "FAIL",
            message: "You have entered wrong OTP",
        });

    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.addUserDetails = async (req, res) => {
    try {
    
        const utcDate = new Date(); // Example UTC date from MongoDB
        const istDate = momentTimeZone(utcDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm");
        const istTime = momentTimeZone(utcDate).tz("Asia/Kolkata").format("HH:mm");

        const schema = Joi.object({
            firstName: Joi.string().optional(),
            lastName: Joi.string().optional(),
            age: Joi.string().optional(),
            city: Joi.string().optional(),
            state: Joi.string().optional(),
            gender: Joi.string().optional(),
            height: Joi.string().optional(),
            weight: Joi.string().optional(),
            diabetes: Joi.boolean().optional(),
            isProfileCompleted: Joi.boolean().optional(),
            hypertension: Joi.boolean().optional(),
            dob: Joi.string().optional(),
        });
        let result = schema.validate(req.body);
        if (result.error) {
            return res.status(400).json({
                status: 0,
                statusCode: 400,
                message: result.error.details[0].message,
            });
        }
        
        const checkUser = await usersModel.findOne({_id:req.params.userId})
        if (!checkUser) {
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "Error! wrong userId."
            })
        }
        await usersModel.findOneAndUpdate(
            {_id:req.params.userId},
            {
                firstName:!!(req.body.firstName) ? req.body.firstName : checkUser.firstName,
                lastName:!!(req.body.lastName) ? req.body.lastName : checkUser.lastName,
                age:!!(req.body.age) ? req.body.age : checkUser.age,
                city:!!(req.body.city) ? req.body.city : checkUser.city,
                state:!!(req.body.state) ? req.body.state : checkUser.state,
                gender:!!(req.body.gender) ? req.body.gender : checkUser.gender,
                height:!!(req.body.height) ? req.body.height : checkUser.height,
                weight:!!(req.body.weight) ? req.body.weight : checkUser.weight,
                diabetes:!!(req.body.diabetes === true) ? req.body.diabetes : false,
                hypertension:!!(req.body.hypertension === true) ? req.body.hypertension : false,
                dob:!!(req.body.dob) ? req.body.dob : checkUser.dob,
                isProfileCompleted:!!(req.body.isProfileCompleted === true) ? req.body.isProfileCompleted : false
            },
            {upsert:true}
        );
        
        const bodyDoc = new userWtModel({userId: req.params.userId,weight: req.body.weight,dateTime: istDate,time: istTime});
        await bodyDoc.save();

        return res.status(200).json({
            statusCode:200,
            statusValue: "SUCCESS",
            message: "Data added successfully!."
        })
        
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}

exports.updateUserDeviceSetupById = async (req, res) => {
    try {
        // console.log(req.body)
        // console.log(req.params.userId)
        const schema = Joi.object({
            isDeviceSetup: Joi.boolean().required(),
        });
        let result = schema.validate(req.body);
        if (result.error) {
            return res.status(400).json({
                status: 0,
                statusCode: 400,
                message: result.error.details[0].message,
            });
        }
        
        const checkUser = await usersModel.findOne({_id:req.params.userId})
        if (!checkUser) {
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "Error! wrong userId."
            })
        }
        await usersModel.findOneAndUpdate(
            {_id:req.params.userId},
            {
                isDeviceSetup:!!(req.body.isDeviceSetup === true) ? req.body.isDeviceSetup : false
            },
            {upsert:true}
        );
        return res.status(200).json({
            statusCode:200,
            statusValue: "SUCCESS",
            message: "Data added successfully!."
        })
        
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.getUserDetailsById = async (req, res) => {
    try {
        const checkUser = await usersModel.findOne(
            {_id:req.params.userId},
            {__v:0, userType:0, isEmailVerified:0, isPhoneVerified:0, emailOtp:0, password:0}
        )
        if (!checkUser) {
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "Error! wrong userId."
            })
        }
        return res.status(200).json({
            statusCode:200,
            statusValue: "SUCCESS",
            message: "Data get successfully!.",
            data:checkUser
        })
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.addBolusData = async (req, res) => {
    try {
        // Convert UTC date time to IST date timne
        const utcDate = new Date()  // Example UTC date from MongoDB
        const istDateTime = momentTimeZone(utcDate).tz("Asia/Kolkata").format("HH:mm")
        // console.log(istDateTime)

        const checkUser = await usersModel.findOne({_id:req.params.userId})
        if (!checkUser) {
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "Error! wrong userId."
            })
        }
        const bodyDoc = new userBolusModel({
            userId:req.params.userId,
            unit:req.body.unit,
            time:istDateTime
        })
        const saveDoc = await bodyDoc.save();
        if (saveDoc) {
            return res.status(200).json({
                statusCode:200,
                statusValue: "SUCCESS",
                message: "Data get successfully!.",
                data:saveDoc
            })
        }
        return res.status(400).json({
            statusCode:400,
            statusValue: "FAIL",
            message: "Error! data not added."
        })
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.addGlucoseData = async (req, res) => {
    try {
        // Convert UTC date time to IST date timne
        const utcDate = new Date()  // Example UTC date from MongoDB
        const istDateTime = momentTimeZone(utcDate).tz("Asia/Kolkata").format("HH:mm")
        // console.log(istDateTime)

        const checkUser = await usersModel.findOne({_id:req.params.userId})
        if (!checkUser) {
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "Error! wrong userId."
            })
        }
        const bodyDoc = new userGlucoseModel({
            userId:req.params.userId,
            unit:req.body.unit,
            time:istDateTime
        })
        const saveDoc = await bodyDoc.save();
        if (saveDoc) {
            return res.status(200).json({
                statusCode:200,
                statusValue: "SUCCESS",
                message: "Data get successfully!.",
                data:saveDoc
            })
        }
        return res.status(400).json({
            statusCode:400,
            statusValue: "FAIL",
            message: "Error! data not added."
        })
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}



exports.addSmartBolusData = async (req, res) => {
    try {
        // Convert UTC date time to IST date timne
        const utcDate = new Date()  // Example UTC date from MongoDB
        const istDateTime = momentTimeZone(utcDate).tz("Asia/Kolkata").format("HH:mm")
        // console.log(istDateTime)

        const checkUser = await usersModel.findOne({_id:req.params.userId})
        if (!checkUser) {
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "Error! wrong userId."
            })
        }
        const bodyDoc = new userSmartBolusModel({
            userId:req.params.userId,
            unit:req.body.unit,
            time:istDateTime
        })
        const saveDoc = await bodyDoc.save();
        if (saveDoc) {
            return res.status(200).json({
                statusCode:200,
                statusValue: "SUCCESS",
                message: "Data get successfully!.",
                data:saveDoc
            })
        }
        return res.status(400).json({
            statusCode:400,
            statusValue: "FAIL",
            message: "Error! data not added."
        })
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.addBasalData = async (req, res) => {
    try {
        // Convert UTC date time to IST date timne
        const utcDate = new Date()  // Example UTC date from MongoDB
        const istDateTime = momentTimeZone(utcDate).tz("Asia/Kolkata").format("HH:mm")
        // console.log(istDateTime)

        const checkUser = await usersModel.findOne({_id:req.params.userId})
        if (!checkUser) {
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "Error! wrong userId."
            })
        }
        const bodyDoc = new basalModel({
            userId:req.params.userId,
            unit:req.body.unit,
            time:!!(req.body.time) ? req.body.time : istDateTime
        })
        const saveDoc = await bodyDoc.save();
        if (saveDoc) {
            return res.status(200).json({
                statusCode:200,
                statusValue: "SUCCESS",
                message: "Data added successfully!.",
                data:saveDoc
            })
        }
        return res.status(400).json({
            statusCode:400,
            statusValue: "FAIL",
            message: "Error! data not added."
        })
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.getBolusData = async (req, res) => {
    // try {
    //     if (req.query.filter == "today") {
    //         // Get the start and end of the current date
    //         const startOfDay = new Date();
    //         startOfDay.setHours(0, 0, 0, 0);
    
    //         const endOfDay = new Date();
    //         endOfDay.setHours(23, 59, 59, 999);

    //         // Aggregation pipeline
    //         const pipeline = [
    //             {
    //                 $match: {
    //                     userId:req.params.userId,
    //                     createdAt: {
    //                         $gte: startOfDay,
    //                         $lt: endOfDay
    //                     }
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     time:1,
    //                     unit:1,
    //                     _id:0
    //                 }
    //             }
    //         ]
    //         // const getData = await userBolusModel.aggregate(pipeline)
    //         const bolusData = await userBolusModel.aggregate(pipeline)
    //         // console.log(bolusData)
    //         if (bolusData.length>0) {
    //             return res.status(200).json({
    //                 statusCode:200,
    //                 statusValue: "SUCCESS",
    //                 message: "Data get successfully!.",
    //                 data:bolusData
    //             })
    //         }
    //         return res.status(200).json({
    //             statusCode:200,
    //             statusValue: "SUCCESS",
    //             message: "data not found or Invalid userId",
    //             data:[]
    //         })
    //     } else if (req.query.filter == "weekly") {
    //         // Get the date 7 days ago
    //         const startDate = new Date();
    //         startDate.setHours(0, 0, 0, 0);
    //         startDate.setDate(startDate.getDate() - 6); // 7 days including today
           
    //         const pipeline = [
    //             {
    //                 $match: {
    //                     userId:req.params.userId,
    //                     createdAt: {
    //                         $gte:startDate
    //                     }
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     dayOfWeek: { $dayOfWeek: "$createdAt" }, // Day of week as a number
    //                     unit: { $toDouble: "$unit" }
    //                 }
    //             },
    //             {
    //                 $group: {
    //                     _id: "$dayOfWeek",
    //                     meanUnit: { $avg: "$unit" }  // Calculate mean value of unit
    //                 }
    //             },
    //             {
    //                 $addFields: {
    //                     dayOfWeekName: {
    //                         $arrayElemAt: [
    //                             ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    //                             { $subtract: ["$_id", 1] }
    //                         ]
    //                     }
    //                 }
    //             },
    //             {
    //                 $sort: {_id:1}  // Sort by id
    //             },
    //             {
    //                $project: {
    //                 _id:0,
    //                 time: "$dayOfWeekName",
    //                 unit: { $toString: { $round: ["$meanUnit", 2] } }
    //                }
    //             }
    //         ]
            
    //         const bolusData = await userBolusModel.aggregate(pipeline)
    //         // console.log(bolusData)

    //         if (bolusData.length>0) {
    //             return res.status(200).json({
    //                 statusCode:200,
    //                 statusValue: "SUCCESS",
    //                 message: "Data get successfully!.",
    //                 data:bolusData
    //             })
    //         }
    //         return res.status(400).json({
    //             statusCode:400,
    //             statusValue: "FAIL",
    //             message: "data not found."
    //         })
    //     } else if (req.query.filter == "monthly") {

    //         // Get the date 7 days ago
    //         const startDate = new Date();
    //         startDate.setHours(0, 0, 0, 0);
    //         startDate.setDate(startDate.getDate() - 27); // 27 days including today
    //         // const data2 = await userBolusModel.find({userId:req.params.userId})
    //         // console.log(data2)
            
    //         const pipeline = [
    //             {
    //                 $match: {
    //                     userId: req.params.userId,
    //                     createdAt: { $gte: startDate }
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     day: { $dateToString: { format: "%d", date: "$createdAt" } },  // Extract day as string
    //                     month: { $dateToString: { format: "%m", date: "$createdAt" } },  // Extract month as two-digit string
    //                     unit: { $toDouble: "$unit" }  // Convert unit to double for aggregation
    //                 }
    //             },
    //             {
    //                 $addFields: {
    //                     dateStr: { $concat: ["$day", "-", "$month"] }  // Combine day and month
    //                 }
    //             },
    //             {
    //                 $group: {
    //                     _id: "$dateStr",
    //                     meanUnit: { $avg: "$unit" }  // Calculate mean value of unit
    //                 }
    //             },
    //             {
    //                 $sort: { _id: 1 }  // Sort by date string
    //             },
    //             {
    //                 $project: {
    //                     _id: 0,
    //                     time: "$_id",  // Use the date string as time
    //                     unit: { $toString: { $round: ["$meanUnit", 2] } }  // Round mean unit and convert to string
    //                 }
    //             }
    //         ];
            
    //         const bolusData = await userBolusModel.aggregate(pipeline);
            
    //         // Format the above bolusData response
    //         const formattedResponse = bolusData.map(item => {
    //             // Split the time string into day and month
    //             const [day, month] = item.time.split("-");
    //              // Convert the numeric month to abbreviated month name
    //             const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    //             const monthName = months[parseInt(month, 10) - 1];  // first convert month i.e. "08" to integer base 10 and then subtract 1 due to array index start from 0
    //             // and month count start 1

    //             return {
    //                 time: `${day}-${monthName}`,
    //                 unit:item.unit
    //             }
    //         })
    //         if (bolusData.length>0) {
    //             return res.status(200).json({
    //                 statusCode:200,
    //                 statusValue: "SUCCESS",
    //                 message: "Data get successfully!.",
    //                 data:formattedResponse
    //             })
    //         }
    //         return res.status(400).json({
    //             statusCode:400,
    //             statusValue: "FAIL",
    //             message: "data not found."
    //         })
    //     }
    // } catch (err) {
    //     return res.status(500).json({
    //         statusCode: 500,
    //         statusValue: "FAIL",
    //         message: "Internal server error",
    //         data: {
    //             generatedTime: new Date(),
    //             errMsg: err.stack,
    //         },
    //     });
    // }
    try {
        if (req.query.filter == "today") {
            // Get the start and end of the current date
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));
            
            // Query to find documents for the current date
            const bolusData = await userBolusModel.find({
                userId: req.params.userId,
                createdAt: {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            },{userId: 1,time: 1,unit: 1})
            // console.log(basalData)

            // Initialize an object to store sums and counts for each hour
            const hourlyData = {};

            // Process each item in basalData
            bolusData.forEach(item => {
            const [hour] = item.time.split(':'); 
            const hourInt = parseInt(hour, 10); 
            const unit = parseFloat(item.unit); 

            
            if (!hourlyData[hourInt]) {
                hourlyData[hourInt] = { total: 0, count: 0 };
            }

            // Accumulate total units and count
            hourlyData[hourInt].total += unit;
            hourlyData[hourInt].count += 1;
            });

            // Calculate the average for each hour and format the result
            const result = Object.keys(hourlyData).map(hour => {
            const { total, count } = hourlyData[hour];
            return {
                time: hour.toString().padStart(2, '0'), 
                unit: (total / count).toFixed(2) 
            };
            });

            // If needed, sort by hour
            result.sort((a, b) => parseInt(a.time) - parseInt(b.time));
            // Define all hour
            const allHours = ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"]
            
            // Create new Map
            const mapData = new Map(result.map(item => [item.time, item.unit]))
            // console.log(mapData)
            // Create new Array
            const finalData = allHours.map((hour) => ({
                time:hour,
                unit:mapData.get(hour) || "0.00"
            }))
           
            if (finalData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:finalData
                })
            }
            return res.status(200).json({
                statusCode:200,
                statusValue: "SUCCESS",
                message: "data not found or Incorrect userId",
                data:[]
            })
        } else if (req.query.filter == "weekly") {
            // Get the date 7 days ago
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            startDate.setDate(startDate.getDate() - 6); // 7 days including today
           
            const pipeline = [
                {
                    $match: {
                        userId:req.params.userId,
                        createdAt: {
                            $gte:startDate
                        }
                    }
                },
                {
                    $project: {
                        dayOfWeek: { $dayOfWeek: "$createdAt" }, // Day of week as a number
                        unit: { $toDouble: "$unit" }
                    }
                },
                {
                    $group: {
                        _id: "$dayOfWeek",
                        meanUnit: { $avg: "$unit" }  // Calculate mean value of unit
                    }
                },
                {
                    $addFields: {
                        dayOfWeekName: {
                            $arrayElemAt: [
                                ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                                { $subtract: ["$_id", 1] }
                            ]
                        }
                    }
                },
                {
                    $sort: {_id:1}  // Sort by id
                },
                {
                   $project: {
                    _id:0,
                    time: "$dayOfWeekName",
                    unit: { $toString: { $round: ["$meanUnit", 2] } }
                   }
                }
            ]
            
            const bolusData = await userBolusModel.aggregate(pipeline)
            // console.log(bolusData)
            const allDays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
            // Create new Map
            const mapData = new Map(bolusData.map(item => [item.time, item.unit]))
            // console.log(mapData)
            // Create new Array
            const finalData = allDays.map((item) => ({
                time:item,
                unit:mapData.get(item) || "0.00"
            }))

            if (finalData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:finalData
                })
            }
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "data not found."
            })
        } else if (req.query.filter == "30days-data") {

            // Step 1: Get the first day of the current month and the total number of days in the month
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth(); 
            const startDate = new Date(currentYear, currentMonth, 1); 
            const endDate = new Date(currentYear, currentMonth + 1, 0); 
            const daysInMonth = endDate.getDate();

            // MongoDB aggregation pipeline
            const pipeline = [
                {
                $match: {
                    userId: req.params.userId,
                    createdAt: { $gte: startDate },
                },
                },
                {
                $project: {
                    day: { $dateToString: { format: "%d", date: "$createdAt" } }, 
                    month: { $dateToString: { format: "%m", date: "$createdAt" } }, 
                    unit: { $toDouble: "$unit"}, 
                },
                },
                {
                $addFields: {
                    dateStr: { $concat: ["$day", "-", "$month"] }, 
                },
                },
                {
                $group: {
                    _id: "$dateStr",
                    meanUnit: { $avg: "$unit" }, 
                },
                },
                {
                $sort: { _id: 1 }, 
                },
                {
                $project: {
                    _id: 0,
                    time: "$_id", 
                    unit: { $toString: { $round: ["$meanUnit", 2] } },
                },
                },
            ];

            const bolusData = await userBolusModel.aggregate(pipeline);

            // Generate an array with all the days of the current month
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthNumber = String(currentMonth + 1).padStart(2, '0');
            const allDays = Array.from({ length: daysInMonth }, (_, i) => {
                const day = String(i + 1).padStart(2, '0'); 
                return {
                time: `${day}-${monthNumber}`, 
                unit: "0.00", 
                };
            });

            const finalResponse = allDays.map((day) => {
                const existingData = bolusData.find(item => item.time === day.time);
                return existingData ? existingData : day; 
            });

            const transformedData = finalResponse.map(item => {
                const day = item.time.split('-')[0];  // Extract day part
                return { time: day, unit: item.unit };
            });
            // console.log(transformedData)

            if (transformedData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:transformedData
                })
            }
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "data not found."
            })
        } else if (req.query.filter == "12month-data") {

            const startDate = new Date(new Date().getFullYear(), 0, 1); // Start of the current year
            const pipeline = [
              {
                $match: {
                  userId: req.params.userId,
                  createdAt: {
                    $gte: startDate,
                  },
                },
              },
              {
                $project: {
                  month: { $month: "$createdAt" }, // Extract month from createdAt
                  unit: { $toDouble: "$unit" },
                },
              },
              {
                $group: {
                  _id: "$month",
                  meanUnit: { $avg: "$unit" }, // Calculate mean value of weight
                },
              },
              {
                $addFields: {
                  monthName: {
                    $arrayElemAt: [
                      [
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                      ],
                      { $subtract: ["$_id", 1] },
                    ],
                  },
                },
              },
              {
                $sort: { _id: 1 }, // Sort by month
              },
              {
                $project: {
                  _id: 0,
                  time: "$monthName",
                  unit: { $toString: { $round: ["$meanUnit", 2] } }, // Round and convert to string
                },
              },
            ];
      
            const aggrResult = await userBolusModel.aggregate(pipeline);
            
            // Step : Define all month names
            const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            // Create a map for quick look-up of existing data
            const dataMap = new Map(aggrResult.map(item => [item.time, item.unit]))
            // console.log(dataMap)
            
            // Create a new array to fill 0 weight value with month name if not exists
            const result = allMonths.map(month => ({
              time: month,
              unit: dataMap.get(month) || "0.00"
            }))
            // console.log(result)

            if (result.length > 0) {
                return res.status(200).json({
                statusCode: 200,
                statusValue: "SUCCESS",
                message: "Data get successfully!.",
                data: result,
                });
            }
            return res.status(400).json({
                statusCode: 400,
                statusValue: "FAIL",
                message: "data not found.",
            });
        }
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.getGlucoseData = async (req, res) => {
    try {
        if (req.query.filter == "today") {
            // Get the start and end of the current date
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));
            
            // Query to find documents for the current date
            const glucoseData = await userGlucoseModel.find({
                userId: req.params.userId,
                createdAt: {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            },{userId: 1,time: 1,unit: 1})
            // console.log(basalData)

            // Initialize an object to store sums and counts for each hour
            const hourlyData = {};

            // Process each item in basalData
            glucoseData.forEach(item => {
            const [hour] = item.time.split(':'); 
            const hourInt = parseInt(hour, 10); 
            const unit = parseFloat(item.unit); 

            
            if (!hourlyData[hourInt]) {
                hourlyData[hourInt] = { total: 0, count: 0 };
            }

            // Accumulate total units and count
            hourlyData[hourInt].total += unit;
            hourlyData[hourInt].count += 1;
            });

            // Calculate the average for each hour and format the result
            const result = Object.keys(hourlyData).map(hour => {
            const { total, count } = hourlyData[hour];
            return {
                time: hour.toString().padStart(2, '0'), 
                unit: (total / count).toFixed(2) 
            };
            });

            // If needed, sort by hour
            result.sort((a, b) => parseInt(a.time) - parseInt(b.time));
            // Define all hour
            const allHours = ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"]
            
            // Create new Map
            const mapData = new Map(result.map(item => [item.time, item.unit]))
            // console.log(mapData)
            // Create new Array
            const finalData = allHours.map((hour) => ({
                time:hour,
                unit:mapData.get(hour) || "0.00"
            }))
           
            if (finalData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:finalData
                })
            }
            return res.status(200).json({
                statusCode:200,
                statusValue: "SUCCESS",
                message: "data not found or Incorrect userId",
                data:[]
            })
        } else if (req.query.filter == "weekly") {
            // Get the date 7 days ago
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            startDate.setDate(startDate.getDate() - 6); // 7 days including today
           
            const pipeline = [
                {
                    $match: {
                        userId:req.params.userId,
                        createdAt: {
                            $gte:startDate
                        }
                    }
                },
                {
                    $project: {
                        dayOfWeek: { $dayOfWeek: "$createdAt" }, // Day of week as a number
                        unit: { $toDouble: "$unit" }
                    }
                },
                {
                    $group: {
                        _id: "$dayOfWeek",
                        meanUnit: { $avg: "$unit" }  // Calculate mean value of unit
                    }
                },
                {
                    $addFields: {
                        dayOfWeekName: {
                            $arrayElemAt: [
                                ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                                { $subtract: ["$_id", 1] }
                            ]
                        }
                    }
                },
                {
                    $sort: {_id:1}  // Sort by id
                },
                {
                   $project: {
                    _id:0,
                    time: "$dayOfWeekName",
                    unit: { $toString: { $round: ["$meanUnit", 2] } }
                   }
                }
            ]
            
            const glucoseData = await userGlucoseModel.aggregate(pipeline)
            // console.log(bolusData)
            const allDays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
            // Create new Map
            const mapData = new Map(glucoseData.map(item => [item.time, item.unit]))
            // console.log(mapData)
            // Create new Array
            const finalData = allDays.map((item) => ({
                time:item,
                unit:mapData.get(item) || "0.00"
            }))

            if (finalData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:finalData
                })
            }
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "data not found."
            })
        } else if (req.query.filter == "30days-data") {

            // Step 1: Get the first day of the current month and the total number of days in the month
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth(); 
            const startDate = new Date(currentYear, currentMonth, 1); 
            const endDate = new Date(currentYear, currentMonth + 1, 0); 
            const daysInMonth = endDate.getDate();

            // MongoDB aggregation pipeline
            const pipeline = [
                {
                $match: {
                    userId: req.params.userId,
                    createdAt: { $gte: startDate },
                },
                },
                {
                $project: {
                    day: { $dateToString: { format: "%d", date: "$createdAt" } }, 
                    month: { $dateToString: { format: "%m", date: "$createdAt" } }, 
                    unit: { $toDouble: "$unit"}, 
                },
                },
                {
                $addFields: {
                    dateStr: { $concat: ["$day", "-", "$month"] }, 
                },
                },
                {
                $group: {
                    _id: "$dateStr",
                    meanUnit: { $avg: "$unit" }, 
                },
                },
                {
                $sort: { _id: 1 }, 
                },
                {
                $project: {
                    _id: 0,
                    time: "$_id", 
                    unit: { $toString: { $round: ["$meanUnit", 2] } },
                },
                },
            ];

            const glucoseData = await userGlucoseModel.aggregate(pipeline);

            // Generate an array with all the days of the current month
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthNumber = String(currentMonth + 1).padStart(2, '0');
            const allDays = Array.from({ length: daysInMonth }, (_, i) => {
                const day = String(i + 1).padStart(2, '0'); 
                return {
                time: `${day}-${monthNumber}`, 
                unit: "0.00", 
                };
            });

            const finalResponse = allDays.map((day) => {
                const existingData = glucoseData.find(item => item.time === day.time);
                return existingData ? existingData : day; 
            });

            const transformedData = finalResponse.map(item => {
                const day = item.time.split('-')[0];  // Extract day part
                return { time: day, unit: item.unit };
            });
            // console.log(transformedData)

            if (transformedData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:transformedData
                })
            }
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "data not found."
            })
        } else if (req.query.filter == "12month-data") {

            const startDate = new Date(new Date().getFullYear(), 0, 1); // Start of the current year
            const pipeline = [
              {
                $match: {
                  userId: req.params.userId,
                  createdAt: {
                    $gte: startDate,
                  },
                },
              },
              {
                $project: {
                  month: { $month: "$createdAt" }, // Extract month from createdAt
                  unit: { $toDouble: "$unit" },
                },
              },
              {
                $group: {
                  _id: "$month",
                  meanUnit: { $avg: "$unit" }, // Calculate mean value of weight
                },
              },
              {
                $addFields: {
                  monthName: {
                    $arrayElemAt: [
                      [
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                      ],
                      { $subtract: ["$_id", 1] },
                    ],
                  },
                },
              },
              {
                $sort: { _id: 1 }, // Sort by month
              },
              {
                $project: {
                  _id: 0,
                  time: "$monthName",
                  unit: { $toString: { $round: ["$meanUnit", 2] } }, // Round and convert to string
                },
              },
            ];
      
            const aggrResult = await userGlucoseModel.aggregate(pipeline);
            
            // Step : Define all month names
            const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            // Create a map for quick look-up of existing data
            const dataMap = new Map(aggrResult.map(item => [item.time, item.unit]))
            // console.log(dataMap)
            
            // Create a new array to fill 0 weight value with month name if not exists
            const result = allMonths.map(month => ({
              time: month,
              unit: dataMap.get(month) || "0.00"
            }))
            // console.log(result)

            if (result.length > 0) {
                return res.status(200).json({
                statusCode: 200,
                statusValue: "SUCCESS",
                message: "Data get successfully!.",
                data: result,
                });
            }
            return res.status(400).json({
                statusCode: 400,
                statusValue: "FAIL",
                message: "data not found.",
            });
        }
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}

exports.getBasalData = async (req, res) => {
    try {
        if (req.query.filter == "today") {
            // Get the start and end of the current date
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));
            
            // Query to find documents for the current date
            const basalData = await basalModel.find({
                userId: req.params.userId,
                createdAt: {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            },{userId: 1,time: 1,unit: 1})
            // console.log(basalData)

            // Initialize an object to store sums and counts for each hour
            const hourlyData = {};

            // Process each item in basalData
            basalData.forEach(item => {
            const [hour] = item.time.split(':'); 
            const hourInt = parseInt(hour, 10); 
            const unit = parseFloat(item.unit); 

            
            if (!hourlyData[hourInt]) {
                hourlyData[hourInt] = { total: 0, count: 0 };
            }

            // Accumulate total units and count
            hourlyData[hourInt].total += unit;
            hourlyData[hourInt].count += 1;
            });

            // Calculate the average for each hour and format the result
            const result = Object.keys(hourlyData).map(hour => {
            const { total, count } = hourlyData[hour];
            return {
                time: hour.toString().padStart(2, '0'), 
                unit: (total / count).toFixed(2) 
            };
            });

            // If needed, sort by hour
            result.sort((a, b) => parseInt(a.time) - parseInt(b.time));
            // Define all hour
            const allHours = ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"]
            
            // Create new Map
            const mapData = new Map(result.map(item => [item.time, item.unit]))
            // console.log(mapData)
            // Create new Array
            const finalData = allHours.map((hour) => ({
                time:hour,
                unit:mapData.get(hour) || "0.00"
            }))
           
            if (finalData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:finalData
                })
            }
            return res.status(200).json({
                statusCode:200,
                statusValue: "SUCCESS",
                message: "data not found or Incorrect userId",
                data:[]
            })
        } else if (req.query.filter == "weekly") {
            // Get the date 7 days ago
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            startDate.setDate(startDate.getDate() - 6); // 7 days including today
           
            const pipeline = [
                {
                    $match: {
                        userId:req.params.userId,
                        createdAt: {
                            $gte:startDate
                        }
                    }
                },
                {
                    $project: {
                        dayOfWeek: { $dayOfWeek: "$createdAt" }, // Day of week as a number
                        unit: { $toDouble: "$unit" }
                    }
                },
                {
                    $group: {
                        _id: "$dayOfWeek",
                        meanUnit: { $avg: "$unit" }  // Calculate mean value of unit
                    }
                },
                {
                    $addFields: {
                        dayOfWeekName: {
                            $arrayElemAt: [
                                ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                                { $subtract: ["$_id", 1] }
                            ]
                        }
                    }
                },
                {
                    $sort: {_id:1}  // Sort by id
                },
                {
                   $project: {
                    _id:0,
                    time: "$dayOfWeekName",
                    unit: { $toString: { $round: ["$meanUnit", 2] } }
                   }
                }
            ]
            
            const basalData = await basalModel.aggregate(pipeline)
            // console.log(bolusData)
            const allDays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
            // Create new Map
            const mapData = new Map(basalData.map(item => [item.time, item.unit]))
            // console.log(mapData)
            // Create new Array
            const finalData = allDays.map((item) => ({
                time:item,
                unit:mapData.get(item) || "0.00"
            }))

            if (finalData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:finalData
                })
            }
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "data not found."
            })
        } else if (req.query.filter == "30days-data") {

            // Step 1: Get the first day of the current month and the total number of days in the month
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth(); 
            const startDate = new Date(currentYear, currentMonth, 1); 
            const endDate = new Date(currentYear, currentMonth + 1, 0); 
            const daysInMonth = endDate.getDate();

            // MongoDB aggregation pipeline
            const pipeline = [
                {
                $match: {
                    userId: req.params.userId,
                    createdAt: { $gte: startDate },
                },
                },
                {
                $project: {
                    day: { $dateToString: { format: "%d", date: "$createdAt" } }, 
                    month: { $dateToString: { format: "%m", date: "$createdAt" } }, 
                    unit: { $toDouble: "$unit"}, 
                },
                },
                {
                $addFields: {
                    dateStr: { $concat: ["$day", "-", "$month"] }, 
                },
                },
                {
                $group: {
                    _id: "$dateStr",
                    meanUnit: { $avg: "$unit" }, 
                },
                },
                {
                $sort: { _id: 1 }, 
                },
                {
                $project: {
                    _id: 0,
                    time: "$_id", 
                    unit: { $toString: { $round: ["$meanUnit", 2] } },
                },
                },
            ];

            const basalData = await basalModel.aggregate(pipeline);

            // Generate an array with all the days of the current month
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthNumber = String(currentMonth + 1).padStart(2, '0');
            const allDays = Array.from({ length: daysInMonth }, (_, i) => {
                const day = String(i + 1).padStart(2, '0'); 
                return {
                time: `${day}-${monthNumber}`, 
                unit: "0.00", 
                };
            });

            const finalResponse = allDays.map((day) => {
                const existingData = basalData.find(item => item.time === day.time);
                return existingData ? existingData : day; 
            });

            const transformedData = finalResponse.map(item => {
                const day = item.time.split('-')[0];  // Extract day part
                return { time: day, unit: item.unit };
            });
            // console.log(transformedData)

            if (transformedData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:transformedData
                })
            }
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "data not found."
            })
        } else if (req.query.filter == "12month-data") {

            const startDate = new Date(new Date().getFullYear(), 0, 1); // Start of the current year
            const pipeline = [
              {
                $match: {
                  userId: req.params.userId,
                  createdAt: {
                    $gte: startDate,
                  },
                },
              },
              {
                $project: {
                  month: { $month: "$createdAt" }, // Extract month from createdAt
                  unit: { $toDouble: "$unit" },
                },
              },
              {
                $group: {
                  _id: "$month",
                  meanUnit: { $avg: "$unit" }, // Calculate mean value of weight
                },
              },
              {
                $addFields: {
                  monthName: {
                    $arrayElemAt: [
                      [
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                      ],
                      { $subtract: ["$_id", 1] },
                    ],
                  },
                },
              },
              {
                $sort: { _id: 1 }, // Sort by month
              },
              {
                $project: {
                  _id: 0,
                  time: "$monthName",
                  unit: { $toString: { $round: ["$meanUnit", 2] } }, // Round and convert to string
                },
              },
            ];
      
            const aggrResult = await basalModel.aggregate(pipeline);
            
            // Step : Define all month names
            const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            // Create a map for quick look-up of existing data
            const dataMap = new Map(aggrResult.map(item => [item.time, item.unit]))
            // console.log(dataMap)
            
            // Create a new array to fill 0 weight value with month name if not exists
            const result = allMonths.map(month => ({
              time: month,
              unit: dataMap.get(month) || "0.00"
            }))
            // console.log(result)

            if (result.length > 0) {
                return res.status(200).json({
                statusCode: 200,
                statusValue: "SUCCESS",
                message: "Data get successfully!.",
                data: result,
                });
            }
            return res.status(400).json({
                statusCode: 400,
                statusValue: "FAIL",
                message: "data not found.",
            });
        }
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}



exports.getSmartBolusData = async (req, res) => {
    try {
        if (req.query.filter == "today") {
            // Get the start and end of the current date
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
    
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            // Aggregation pipeline
            const pipeline = [
                {
                    $match: {
                        userId:req.params.userId,
                        createdAt: {
                            $gte: startOfDay,
                            $lt: endOfDay
                        }
                    }
                },
                {
                    $project: {
                        time:1,
                        unit:1,
                        _id:0
                    }
                }
            ]
            // const getData = await userBolusModel.aggregate(pipeline)
            const bolusData = await userSmartBolusModel.aggregate(pipeline)
            // console.log(bolusData)
            if (bolusData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:bolusData
                })
            }
            return res.status(200).json({
                statusCode:200,
                statusValue: "SUCCESS",
                message: "data not found or Invalid userId",
                data:[]
            })
        } else if (req.query.filter == "weekly") {
            // Get the date 7 days ago
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            startDate.setDate(startDate.getDate() - 6); // 7 days including today
           
            const pipeline = [
                {
                    $match: {
                        userId:req.params.userId,
                        createdAt: {
                            $gte:startDate
                        }
                    }
                },
                {
                    $project: {
                        dayOfWeek: { $dayOfWeek: "$createdAt" }, // Day of week as a number
                        unit: { $toDouble: "$unit" }
                    }
                },
                {
                    $group: {
                        _id: "$dayOfWeek",
                        meanUnit: { $avg: "$unit" }  // Calculate mean value of unit
                    }
                },
                {
                    $addFields: {
                        dayOfWeekName: {
                            $arrayElemAt: [
                                ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                                { $subtract: ["$_id", 1] }
                            ]
                        }
                    }
                },
                {
                    $sort: {_id:1}  // Sort by id
                },
                {
                   $project: {
                    _id:0,
                    time: "$dayOfWeekName",
                    unit: { $toString: { $round: ["$meanUnit", 2] } }
                   }
                }
            ]
            
            const bolusData = await userSmartBolusModel.aggregate(pipeline)
            // console.log(bolusData)

            if (bolusData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:bolusData
                })
            }
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "data not found."
            })
        } else if (req.query.filter == "monthly") {
            // Get the date 7 days ago
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            startDate.setDate(startDate.getDate() - 27); // 27 days including today
            // const data2 = await userBolusModel.find({userId:req.params.userId})
            // console.log(data2)
            
            const pipeline = [
                {
                    $match: {
                        userId: req.params.userId,
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $project: {
                        day: { $dateToString: { format: "%d", date: "$createdAt" } },  // Extract day as string
                        month: { $dateToString: { format: "%m", date: "$createdAt" } },  // Extract month as two-digit string
                        unit: { $toDouble: "$unit" }  // Convert unit to double for aggregation
                    }
                },
                {
                    $addFields: {
                        dateStr: { $concat: ["$day", "-", "$month"] }  // Combine day and month
                    }
                },
                {
                    $group: {
                        _id: "$dateStr",
                        meanUnit: { $avg: "$unit" }  // Calculate mean value of unit
                    }
                },
                {
                    $sort: { _id: 1 }  // Sort by date string
                },
                {
                    $project: {
                        _id: 0,
                        time: "$_id",  // Use the date string as time
                        unit: { $toString: { $round: ["$meanUnit", 2] } }  // Round mean unit and convert to string
                    }
                }
            ];
            
            const bolusData = await userSmartBolusModel.aggregate(pipeline);
            
            // Format the above bolusData response
            const formattedResponse = bolusData.map(item => {
                // Split the time string into day and month
                const [day, month] = item.time.split("-");
                 // Convert the numeric month to abbreviated month name
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const monthName = months[parseInt(month, 10) - 1];  // first convert month i.e. "08" to integer base 10 and then subtract 1 due to array index start from 0
                // and month count start 1

                return {
                    time: `${day}-${monthName}`,
                    unit:item.unit
                }
            })
            if (bolusData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:formattedResponse
                })
            }
            return res.status(400).json({
                statusCode:400,
                statusValue: "FAIL",
                message: "data not found."
            })
        } else if (req.query.filter == "24hour-data") {
            
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            // Aggregation pipeline
            const pipeline = [
                {
                    $match: {
                        userId: req.params.userId,
                        createdAt: {
                            $gte: startOfDay,
                            $lt: endOfDay
                        }
                    }
                },
                // Step 1: Project to convert `createdAt` to hourly intervals
                {
                    $project: {
                        hourInterval: {
                            $dateToString: {
                                format: "%Y-%m-%d %H:00",
                                date: "$createdAt",
                                timezone: "UTC"  // Adjust if you are in a different timezone
                            }
                        },
                        unit: { $toInt: "$unit" }
                    }
                },
                // Step 2: Group by the hour interval and calculate the mean of `unit`
                {
                    $group: {
                        _id: "$hourInterval",
                        unit: { $avg: "$unit" }
                    }
                },
                // Step 3: Create a complete list of all hours in the day
                {
                    $facet: {
                        hourlyData: [
                            {
                                $addFields: {
                                    hourInterval: "$_id"
                                }
                            }
                        ],
                        allHours: [
                            {
                                $addFields: {
                                    hours: Array.from({ length: 24 }, (_, i) => {
                                        const hourDate = new Date(startOfDay);
                                        hourDate.setHours(i, 0, 0, 0);
                                        return {
                                            time: hourDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
                                            hourInterval: hourDate.toISOString().slice(0, 13) + ":00:00Z",
                                            unit: "0"
                                        };
                                    })
                                }
                            },
                            { $unwind: "$hours" },
                            { $replaceRoot: { newRoot: "$hours" } }
                        ]
                    }
                },
                // Step 4: Merge both datasets, prefer actual data over "0" data
                {
                    $project: {
                        combined: {
                            $map: {
                                input: {
                                    $range: [0, { $size: "$allHours" }]
                                },
                                as: "idx",
                                in: {
                                    $mergeObjects: [
                                        { $arrayElemAt: ["$allHours", "$$idx"] },
                                        { $arrayElemAt: ["$hourlyData", "$$idx"] }
                                    ]
                                }
                            }
                        }
                    }
                },
                // Step 5: Unwind the combined array to output the final result
                { $unwind: "$combined" },
                { $replaceRoot: { newRoot: "$combined" } },
                // Step 6: Sort the results by time
                { $sort: { hourInterval: 1 } }
            ];

            // const getData = await userBolusModel.aggregate(pipeline)
            const bolusDatA = await userSmartBolusModel.aggregate(pipeline)
            
            // Transform the data
            const bolusData = bolusDatA.map(item => ({
                time: item.time,
                unit: String(item.unit)
            })) 
            // console.log(bolusData)
            if (bolusData.length>0) {
                return res.status(200).json({
                    statusCode:200,
                    statusValue: "SUCCESS",
                    message: "Data get successfully!.",
                    data:bolusData
                })
            }
            return res.status(200).json({
                statusCode:200,
                statusValue: "SUCCESS",
                message: "data not found or Invalid userId",
                data:[]
            })
        }
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.getCountryList = async (req, res) => {
    try {
        const countryData = await Country.getAllCountries();
        // const getData = https://api.postalpincode.in/pincode/110001
        if (!countryData) {
            return res.status(400).json({
                statusCode: 400,
                statusValue: "FAIL",
                message: "Data not found.",
                data: [],
            });
        }
        return res.status(200).json({
            statusCode: 200,
            statusValue: "SUCCESS",
            message: "Country list get successfully.",
            data: countryData,
        });
    } catch (err) {
        return res.status(500).json({
            statusCode: 500,
            statusValue: "FAIL",
            message: "Internal server error",
            data: {
                generatedTime: new Date(),
                errMsg: err.stack,
            },
        });
    }
}


exports.getStateListByCountryName = async (req, res) => {
    try {
        const countryData = await Country.getAllCountries();
        const getName = countryData.filter((item) => {
            return item.name == req.params.name
        });
        const countryCode = getName[0].isoCode;
        const stateData = await State.getStatesOfCountry(countryCode);
        if (!stateData) { 
            return res.status(400).json({ 
                statusCode: 400, 
                statusValue: "FAIL",
                message: "Data not found.", 
                data: [], 
            });
        } 
        return res.status(200).json({ 
            statusCode: 200, 
            statusValue: "SUCCESS", 
            message: "State list get successfully.", 
            data: stateData, 
        });
    } catch (err) { 
        return res.status(500).json({ 
            statusCode: 500, 
            statusValue: "FAIL", 
            message: "Internal server error", 
            data: { 
                generatedTime: new Date(), 
                errMsg: err.stack, 
            }, 
        });
    }
}


exports.getCityListByStateName = async (req, res) => {
    try {
        const { countryCode, stateName } = req.query;
        if (!countryCode || !stateName) {
            return res.status(400).json({
                message: 'Please provide both countryCode and stateName',
                statusCode: 400,
                statusValue: 'error'
            });
        }
         // Find state by name
        const states = State.getStatesOfCountry(countryCode);
        const state = states.find(state => state.name.toLowerCase() === stateName.toLowerCase());

        if (!state) {
            return res.status(404).json({
                message: 'State not found',
                statusCode: 404,
                statusValue: 'error'
            });
        }

        // Get cities by state code
        const cities = City.getCitiesOfState(countryCode, state.isoCode);
        if (!cities) { 
            return res.status(400).json({ 
                statusCode: 400, 
                statusValue: "FAIL",
                message: "Data not found.", 
                data: [], 
            });
        } 
        return res.status(200).json({ 
            statusCode: 200, 
            statusValue: "SUCCESS", 
            message: "City list get successfully.", 
            data: cities, 
        });
    } catch (err) { 
        return res.status(500).json({ 
            statusCode: 500, 
            statusValue: "FAIL", 
            message: "Internal server error", 
            data: { 
                generatedTime: new Date(), 
                errMsg: err.stack, 
            }, 
        });
    }
}






