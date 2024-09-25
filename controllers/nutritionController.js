const Joi = require("joi");
const nutritionModel = require("../models/nutritionModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "../.env" });
const { sendOtp } = require("../helper/sendOtp");
// console.log(process.env.JWT_SECRET)
var unirest = require("unirest");
const moment = require("moment");
const momentTimeZone = require("moment-timezone");
const userWtModel = require("../models/userWtModel");
const usersModel = require("../models/usersModel");

exports.addUserNutrition = async (req, res) => {
  try {
    const schema = Joi.object({
      userId: Joi.string().required(),
      brandName: Joi.string().required(),
      foodDescription: Joi.string().required(),
      foodName: Joi.string().required(),
      calories: Joi.string().required(),
      fat: Joi.string().required(),
      carbs: Joi.string().allow("").optional(),
      protein: Joi.string().allow("").optional(),
      quantity: Joi.string().optional(),
    });
    let result = schema.validate(req.body);
    if (result.error) {
      return res.status(200).json({
        status: 0,
        statusCode: 400,
        message: result.error.details[0].message,
      });
    }
    // console.log(req.body)
    // Check OTP
    // const isAlreadyExists = await nutritionModel.findOne({$and:[{userId:req.body.userId},{food_name:req.body.foodName}]})
    // if (!!isAlreadyExists) {
    //    return res.status(400).json({
    //         statusCode:400,
    //         statusValue:"FAIL",
    //         message:"Data already exists.",
    //     })
    // }
    const bodyDoc = new nutritionModel({
      userId: req.body.userId,
      brand_name: req.body.brandName,
      food_description: req.body.foodDescription,
      food_name: req.body.foodName,
      Calories: req.body.calories,
      Fat: req.body.fat,
      Carbs: req.body.carbs,
      Protein: req.body.protein,
      quantity: req.body.quantity,
    });
    const savedDoc = await bodyDoc.save();
    if (!!savedDoc) {
      return res.status(200).json({
        statusCode: 200,
        statusValue: "SUCCESS",
        message: "Data added successfully.",
        // data:checkOtp
      });
    }
    return res.status(400).json({
      statusCode: 400,
      statusValue: "FAIL",
      message: "Data not added.",
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
};

exports.getUserNutritionByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    let getData = await nutritionModel.find({ userId: userId }, { __v: 0 });
    getData.forEach((item) => {
      const carbsMatch = item.food_description.match(/Carbs:\s*([\d.]+)g/);
      if (carbsMatch) {
        item.carbs_per_unit = carbsMatch[1];
      }
    });
    if (getData.length < 1) {
      return res.status(400).json({
        statusCode: 400,
        statusValue: "FAIL",
        message: "Data not found. || Provide valid userId",
      });
    }
    return res.status(200).json({
      statusCode: 200,
      statusValue: "SUCCESS",
      message: "Data get successfully.",
      data: getData,
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
};

exports.getUserNutritionDataCountById = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (req.query.filter == "today") {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0); // Set to the start of the day in UTC
      const endOfDay = new Date();
      endOfDay.setUTCHours(23, 59, 59, 999); // Set to the end of the day in UTC

      const getData = await nutritionModel.aggregate([
        {
          $match: {
            userId: req.params.userId,
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },
        // Additional stages if needed
        {
          $project: {
            userId: 1,
            Fat: 1,
            Carbs: 1,
            Protein: 1,
            createdAt: 1,
            createdAtIST: 1,
          },
        },
      ]);
      //
      function parseValue(value) {
        return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
      }

      function getMeanValues(getData) {
        const intervals = Array.from({ length: 24 }, (_, i) => ({
          time: String(i + 1).padStart(2, "0"),
          Fat: [],
          Carbs: [],
          Protein: [],
        }));

        getData.forEach((item) => {
          const date = new Date(item.createdAtIST);
          const hour = date.getHours() + 1; // Convert to 1-24 format
          const interval = intervals[hour - 1];

          interval.Fat.push(parseValue(item.Fat));
          interval.Carbs.push(parseValue(item.Carbs));
          interval.Protein.push(parseValue(item.Protein));
        });

        return intervals.map((interval) => ({
          time: interval.time,
          Fat: interval.Fat.length
            ? (
                interval.Fat.reduce((a, b) => a + b, 0) / interval.Fat.length
              ).toFixed(2) + ""
            : "0.00",
          Carbs: interval.Carbs.length
            ? (
                interval.Carbs.reduce((a, b) => a + b, 0) /
                interval.Carbs.length
              ).toFixed(2)
            : "0.00",
          Protein: interval.Protein.length
            ? (
                interval.Protein.reduce((a, b) => a + b, 0) /
                interval.Protein.length
              ).toFixed(2) + ""
            : "0.00",
        }));
      }
      const result = getMeanValues(getData);

      if (result.length > 0) {
        return res.status(200).json({
          statusCode: 200,
          statusValue: "SUCCESS",
          message: "Data get successfully.",
          data: result,
        });
      }
      return res.status(400).json({
        statusCode: 400,
        statusValue: "FAIL",
        message: "Data not found !! Invalid userId.",
      });
    }
    // console.log('check',result);
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
};

exports.deleteNutritionById = async (req, res) => {
  try {
    const id = req.params.id;
    const deleteData = await nutritionModel.findByIdAndDelete({ _id: id });
    // console.log(,deleteData)
    if (!deleteData) {
      return res.status(400).json({
        statusCode: 400,
        statusValue: "FAIL",
        message: "Data not deleted !! Invalid id.",
      });
    }
    return res.status(200).json({
      statusCode: 200,
      statusValue: "SUCCESS",
      message: "Data has been deleted successfully.",
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
};

exports.updateNutritionById = async (req, res) => {
  try {
    const id = req.params.id;
    const updateDoc = await nutritionModel.findByIdAndUpdate(
      { _id: req.params.id },
      {
        quantity: req.body.quantity,
        Carbs: req.body.carbs,
      }
    );
    if (!!updateDoc) {
      return res.status(200).json({
        statusCode: 200,
        statusValue: "SUCCESS",
        message: "Data updated successfully.",
      });
    }
    return res.status(400).json({
      statusCode: 400,
      statusValue: "FAIL",
      message: "Error! Data not updated || Invalid id",
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
};

exports.getUserNutritionCountByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    // console.log(today)
    if (req.query.filter == "today") {
      // Define today and yesterday
      const today = moment().startOf("day").toDate();
      const tomorrow = moment(today).endOf("day").toDate();

      const todayResult = await nutritionModel.aggregate([
        {
          $match: {
            userId: req.params.userId,
            createdAt: {
              $gte: today,
              $lt: tomorrow,
            },
          },
        },
        {
          $project: {
            Calories: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$Calories", "kcal"] }, 0],
                  },
                },
              },
            },
            Fat: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$Fat", "g"] }, 0],
                  },
                },
              },
            },
            Carbs: {
              $toDouble: {
                $trim: {
                  input: "$Carbs",
                },
              },
            },
            Protein: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$Protein", "g"] }, 0],
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCalories: { $sum: "$Calories" },
            totalFat: { $sum: "$Fat" },
            totalCarbs: { $sum: "$Carbs" },
            totalProtein: { $sum: "$Protein" },
          },
        },
      ]);

      if (todayResult.length < 1) {
        return res.status(400).json({
          statusCode: 400,
          statusValue: "FAIL",
          message: "Data not found. || Provide valid userId",
        });
      }
      return res.status(200).json({
        statusCode: 200,
        statusValue: "SUCCESS",
        message: "Data get successfully.",
        data: todayResult,
      });
    } else if (req.query.filter == "week") {
      // console.log("7days", true)
      // Define the start and end dates for the last 7 days including today
      const today = moment().endOf("day").toDate(); // End of the current day
      const sevenDaysAgo = moment(today)
        .subtract(6, "days")
        .startOf("day")
        .toDate();

      const sevenDaysResult = await nutritionModel.aggregate([
        {
          $match: {
            userId: req.params.userId,
            createdAt: {
              $gte: sevenDaysAgo,
              $lte: today,
            },
          },
        },
        {
          $project: {
            Calories: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$Calories", "kcal"] }, 0],
                  },
                },
              },
            },
            Fat: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$Fat", "g"] }, 0],
                  },
                },
              },
            },
            Carbs: {
              $toDouble: {
                $trim: {
                  input: "$Carbs",
                },
              },
            },
            Protein: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$Protein", "g"] }, 0],
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCalories: { $sum: "$Calories" },
            totalFat: { $sum: "$Fat" },
            totalCarbs: { $sum: "$Carbs" },
            totalProtein: { $sum: "$Protein" },
          },
        },
      ]);

      if (sevenDaysResult.length < 1) {
        return res.status(400).json({
          statusCode: 400,
          statusValue: "FAIL",
          message: "Data not found. || Provide valid userId",
        });
      }
      return res.status(200).json({
        statusCode: 200,
        statusValue: "SUCCESS",
        message: "Data get successfully.",
        data: sevenDaysResult,
      });
    } else if (req.query.filter == "month") {
      // Define the start and end dates for the last 30 days including today
      const today = moment().endOf("day").toDate(); // End of the current day
      const thirtyDaysAgo = moment(today)
        .subtract(29, "days")
        .startOf("day")
        .toDate();

      const thirtyDaysResult = await nutritionModel.aggregate([
        {
          $match: {
            userId: req.params.userId,
            createdAt: {
              $gte: thirtyDaysAgo,
              $lte: today,
            },
          },
        },
        {
          $project: {
            Calories: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$Calories", "kcal"] }, 0],
                  },
                },
              },
            },
            Fat: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$Fat", "g"] }, 0],
                  },
                },
              },
            },
            Carbs: {
              $toDouble: {
                $trim: {
                  input: "$Carbs",
                },
              },
            },
            Protein: {
              $toDouble: {
                $trim: {
                  input: {
                    $arrayElemAt: [{ $split: ["$Protein", "g"] }, 0],
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCalories: { $sum: "$Calories" },
            totalFat: { $sum: "$Fat" },
            totalCarbs: { $sum: "$Carbs" },
            totalProtein: { $sum: "$Protein" },
          },
        },
      ]);

      if (thirtyDaysResult.length < 1) {
        return res.status(400).json({
          statusCode: 400,
          statusValue: "FAIL",
          message: "Data not found. || Provide valid userId",
        });
      }
      return res.status(200).json({
        statusCode: 200,
        statusValue: "SUCCESS",
        message: "Data get successfully.",
        data: thirtyDaysResult,
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
};

exports.addUserWt = async (req, res) => {
  try {
    // Convert UTC date to IST
    const utcDate = new Date(); // Example UTC date from MongoDB
    const istDate = momentTimeZone(utcDate)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm");
    const istTime = momentTimeZone(utcDate).tz("Asia/Kolkata").format("HH:mm");
    // console.log(istDate)
    const bodyDoc = new userWtModel({
      userId: req.body.userId,
      weight: req.body.weight,
      dateTime: istDate,
      time: istTime,
    });
    const savedDoc = await bodyDoc.save();
    if (!!savedDoc) {
      await usersModel.findOneAndUpdate({_id:req.body.userId},{weight:req.body.weight})
      return res.status(200).json({
        statusCode: 200,
        statusValue: "SUCCESS",
        message: "Data added successfully.",
      });
    }
    return res.status(400).json({
      statusCode: 400,
      statusValue: "FAIL",
      message: "Data not added.",
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
};

exports.getUserWt = async (req, res) => {
  try {
    const getData = await userWtModel.find({ userId: req.params.userId });
    if (getData.length > 0) {
      return res.status(200).json({
        statusCode: 200,
        statusValue: "SUCCESS",
        message: "Data get successfully.",
        data: getData,
      });
    }
    return res.status(400).json({
      statusCode: 400,
      statusValue: "FAIL",
      message: "Data not added.",
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
};


exports.deleteUserWtById = async (req, res) => {
  try {
    const getData = await userWtModel.findOneAndDelete({ _id: req.params.id });
    if (!!getData) {
      return res.status(200).json({
        statusCode: 200,
        statusValue: "SUCCESS",
        message: "Data deleted successfully."
      });
    }
    return res.status(400).json({
      statusCode: 400,
      statusValue: "FAIL",
      message: "Wrong Id! || Data not deleted.",
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
};


exports.getUserWtAnalysisData = async (req, res) => {
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
            userId: req.params.userId,
            createdAt: {
              $gte: startOfDay,
              $lt: endOfDay,
            },
          },
        },
        {
          $project: {
            time: 1,
            weight: 1,
            _id: 0,
          },
        },
      ];
      // const getData = await userBolusModel.aggregate(pipeline)
      const userWtData = await userWtModel.aggregate(pipeline);
      // console.log(bolusData)
      if (userWtData.length > 0) {
        return res.status(200).json({
          statusCode: 200,
          statusValue: "SUCCESS",
          message: "Data get successfully!.",
          data: userWtData,
        });
      }
      return res.status(200).json({
        statusCode: 200,
        statusValue: "SUCCESS",
        message: "data not found or Invalid userId",
        data: [],
      });
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
            weight: { $toDouble: "$weight" },
          },
        },
        {
          $group: {
            _id: "$month",
            meanWeight: { $avg: "$weight" }, // Calculate mean value of weight
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
            weight: { $toString: { $round: ["$meanWeight", 2] } }, // Round and convert to string
          },
        },
      ];

      const aggrResult = await userWtModel.aggregate(pipeline);
      
      // Step : Define all month names
      const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      // Create a map for quick look-up of existing data
      const dataMap = new Map(aggrResult.map(item => [item.time, item.weight]))
      // console.log(dataMap)
      
      // Create a new array to fill 0 weight value with month name if not exists
      const result = allMonths.map(month => ({
        time: month,
        weight: dataMap.get(month) || "0.00"
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
            weight: { $toDouble: "$weight" }, 
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
            meanWeight: { $avg: "$weight" }, 
          },
        },
        {
          $sort: { _id: 1 }, 
        },
        {
          $project: {
            _id: 0,
            time: "$_id", 
            weight: { $toString: { $round: ["$meanWeight", 2] } },
          },
        },
      ];

      const userWtData = await userWtModel.aggregate(pipeline);

      // Generate an array with all the days of the current month
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthNumber = String(currentMonth + 1).padStart(2, '0');
      const allDays = Array.from({ length: daysInMonth }, (_, i) => {
        const day = String(i + 1).padStart(2, '0'); 
        return {
          time: `${day}-${monthNumber}`, 
          weight: "0", 
        };
      });

      const finalResponse = allDays.map((day) => {
        const existingData = userWtData.find(item => item.time === day.time);
        return existingData ? existingData : day; 
      });

      const transformedData = finalResponse.map(item => {
        const day = item.time.split('-')[0];  // Extract day part
        return { time: day, weight: item.weight };
      });

      if (transformedData.length > 0) {
        return res.status(200).json({
          statusCode: 200,
          statusValue: "SUCCESS",
          message: "Data get successfully!.",
          data: transformedData,
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
};

// exports.getUserWtAnalysisData = async (req, res) => {
//   try {

//     if (req.query.filter == "weekly") {
//       // Get the start and end dates of the current week
//       const startOfWeek = moment().startOf('isoWeek').toDate();
//       const endOfWeek = moment().endOf('isoWeek').toDate();

//       const pipeline = [
//         { $match: { createdAt: { $gte: startOfWeek, $lt: endOfWeek } } },
//         {
//             $group: {
//                 _id: { $dayOfWeek: "$createdAt" },
//                 meanWeight: { $avg: { $toDouble: "$weight" } }
//             }
//         },
//         {
//             $project: {
//               _id: 0,
//               dayOfWeek: "$_id",
//               meanWeight: { $round: ["$meanWeight", 2] }
//             }
//         },
//         {
//             $sort: { dayOfWeek: 1 }
//         }
//       ];

//       const result = await userWtModel.aggregate(pipeline).exec();

//       const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
//       const formattedResult = result.reduce((acc, curr) => {
//         const dayName = dayNames[curr.dayOfWeek - 1];
//           acc[dayName] = curr.meanWeight;
//         return acc;
//       }, {});
//       // console.log("weekdays-data", formattedResult)
//       if (!!formattedResult) {
//         return res.status(200).json({
//           statusCode:200,
//           statusValue:"SUCCESS",
//           message:"Data get successfully.",
//           data:[{
//             "Mon": !!(formattedResult && formattedResult.Monday) ? formattedResult.Monday.toString() : "0.0",
//             "Tue": !!(formattedResult && formattedResult.Tuesday) ? formattedResult.Tuesday.toString() : "0.0",
//             "Wed": !!(formattedResult && formattedResult.Wednesday) ? formattedResult.Wednesday.toString() : "0.0",
//             "Thu": !!(formattedResult && formattedResult.Thursday) ? formattedResult.Thursday.toString() : "0.0",
//             "Fri": !!(formattedResult && formattedResult.Friday) ? formattedResult.Friday.toString() : "0.0",
//             "Sat": !!(formattedResult && formattedResult.Saturday) ? formattedResult.Saturday.toString() : "0.0",
//             "Sun": !!(formattedResult && formattedResult.Sunday) ? formattedResult.Sunday.toString() : "0.0",
//           }]
//         })
//       }
//       return res.status(400).json({
//         statusCode:400,
//         statusValue:"FAIL",
//         message:"Error!! data not found",
//       })

//     } else if (req.query.filter == "monthly") {

//       // Get today's date at the start of the day
//       const today = moment().startOf('day');
//       const dateRanges = [
//           { label: "w1", start: today.clone().subtract(7, 'days').toDate(), end: today.clone().toDate() },
//           { label: "w2", start: today.clone().subtract(14, 'days').toDate(), end: today.clone().subtract(7, 'days').toDate() },
//           { label: "w3", start: today.clone().subtract(21, 'days').toDate(), end: today.clone().subtract(14, 'days').toDate() },
//           { label: "w4", start: today.clone().subtract(28, 'days').toDate(), end: today.clone().subtract(21, 'days').toDate() }
//       ];

//       const pipeline = [
//         {
//           $match:{userId:req.params.userId}
//         },
//         {
//             $facet: dateRanges.reduce((acc, range) => {
//                 acc[range.label] = [
//                     { $match: { createdAt: { $gte: range.start, $lt: range.end } } },
//                     {
//                         $group: {
//                             _id: null,
//                             averageWeight: { $avg: { $toDouble: "$weight" } }
//                         }
//                     },
//                     {
//                         $project: {
//                           _id: 0,
//                           averageWeight: { $round: ["$averageWeight", 2] }
//                         }
//                     }
//                 ];
//                 return acc;
//             }, {})
//         }
//       ];

//       const result = await userWtModel.aggregate(pipeline).exec();

//       const formattedResult = dateRanges.reduce((acc, range) => {
//         const data = result[0][range.label];
//         acc[range.label] = data.length > 0 ? data[0].averageWeight : 0;
//         return acc;
//       }, {});

//       console.log("weekly-data", formattedResult)
//       if (!!formattedResult) {
//         return res.status(200).json({
//           statusCode:200,
//           statusValue:"SUCCESS",
//           message:"Data get successfully.",
//           data:[{
//             "1-7":  !!(formattedResult && formattedResult.w1) ? formattedResult.w1.toString() : "0.0",
//             "8-14":  !!(formattedResult && formattedResult.w2) ? formattedResult.w2.toString() : "0.0",
//             "15-21":  !!(formattedResult && formattedResult.w3) ? formattedResult.w3.toString() : "0.0",
//             "22-28":  !!(formattedResult && formattedResult.w4) ? formattedResult.w4.toString() : "0.0",
//           }]
//         })
//       }
//       return res.status(400).json({
//         statusCode:400,
//         statusValue:"FAIL",
//         message:"Error!! data not found",
//       })

//     } else if (req.query.filter == "yearly") {

//       const pipeline = [
//         {
//           $match:{userId:req.params.userId}
//         },
//         {
//             $group: {
//                 _id: {
//                     year: { $year: "$createdAt" },
//                     month: { $month: "$createdAt" }
//                 },
//                 meanWeight: { $avg: { $toDouble: "$weight" } }
//             }
//         },
//         {
//             $project: {
//                 _id: 0,
//                 month: "$_id.month",
//                 year: "$_id.year",
//                 meanWeight: { $round: ["$meanWeight", 2] }
//             }
//         },
//         {
//             $sort: { year: 1, month: 1 }
//         }
//       ];

//       const result = await userWtModel.aggregate(pipeline).exec();

//       const formattedResult = result.reduce((acc, curr) => {
//         const monthName = moment().month(curr.month - 1).format("MMMM");
//           // acc[`${monthName}-${curr.year}`] = curr.meanWeight;
//           acc[`${monthName}`] = curr.meanWeight;
//           return acc;
//       }, {});

//       console.log("month data",formattedResult)
//       if (!!formattedResult) {
//         return res.status(200).json({
//           statusCode:200,
//           statusValue:"SUCCESS",
//           message:"Data get successfully.",
//           data:[{
//             "Jan": !!(formattedResult && formattedResult.January) ? formattedResult.January.toString() : "0.0",
//             "Feb": !!(formattedResult && formattedResult.February) ? formattedResult.February.toString() : "0.0",
//             "Mar": !!(formattedResult && formattedResult.March) ? formattedResult.March.toString() : "0.0",
//             "Apr": !!(formattedResult && formattedResult.April) ? formattedResult.April.toString() : "0.0",
//             "May": !!(formattedResult && formattedResult.May) ? formattedResult.May.toString() : "0.0",
//             "Jun": !!(formattedResult && formattedResult.June) ? formattedResult.June.toString() : "0.0",
//             "Jul": !!(formattedResult && formattedResult.July) ? formattedResult.July.toString() : "0.0",
//             "Aug": !!(formattedResult && formattedResult.August) ? formattedResult.August.toString() : "0.0",
//             "Sep": !!(formattedResult && formattedResult.September) ? formattedResult.Sepember.toString() : "0.0",
//             "Oct": !!(formattedResult && formattedResult.October) ? formattedResult.October.toString() : "0.0",
//             "Nov": !!(formattedResult && formattedResult.November) ? formattedResult.November.toString() : "0.0",
//             "Dec": !!(formattedResult && formattedResult.December) ? formattedResult.December.toString() : "0.0",
//           }]
//         })
//       }
//       return res.status(400).json({
//         statusCode:400,
//         statusValue:"FAIL",
//         message:"Error!! data not found",
//       })
//     } else if (req.query.filter == "monthbydays") {

//       // Get today's date at the start of the day
//       const today = moment().startOf('day');
//       const dateRanges = [
//           { label: "1-7", start: today.clone().subtract(7, 'days').toDate(), end: today.clone().toDate() },
//           { label: "8-14", start: today.clone().subtract(14, 'days').toDate(), end: today.clone().subtract(7, 'days').toDate() },
//           { label: "15-21", start: today.clone().subtract(21, 'days').toDate(), end: today.clone().subtract(14, 'days').toDate() },
//           { label: "22-28", start: today.clone().subtract(28, 'days').toDate(), end: today.clone().subtract(21, 'days').toDate() }
//       ];

//       const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

//       const pipeline = [
//           {
//               $match: { userId: req.params.userId }
//           },
//           {
//               $facet: dateRanges.reduce((acc, range) => {
//                   acc[range.label] = [
//                       { $match: { createdAt: { $gte: range.start, $lt: range.end } } },
//                       {
//                           $group: {
//                               _id: { $dayOfWeek: "$createdAt" },
//                               meanWeight: { $avg: { $toDouble: "$weight" } }
//                           }
//                       },
//                       {
//                           $project: {
//                               _id: 0,
//                               dayOfWeek: "$_id",
//                               meanWeight: { $round: ["$meanWeight", 2] }
//                           }
//                       },
//                       {
//                           $sort: { dayOfWeek: 1 }
//                       }
//                   ];
//                   return acc;
//               }, {})
//           }
//       ];

//       const result = await userWtModel.aggregate(pipeline).exec();

//       const formattedResult = dateRanges.reduce((acc, range) => {
//           const data = result[0][range.label];
//           const weekData = dayNames.reduce((innerAcc, dayName) => {
//               innerAcc[dayName] = "0"; // Initialize each day with "0"
//               return innerAcc;
//           }, {});

//           data.forEach(curr => {
//               const dayName = dayNames[curr.dayOfWeek - 1];
//               weekData[dayName] = curr.meanWeight.toString(); // Update with actual mean weight
//           });

//           acc[range.label] = weekData;
//           return acc;
//       }, {});

//       // console.log("monthbydays", formattedResult)
//       if (!!formattedResult) {
//         return res.status(200).json({
//           statusCode:200,
//           statusValue:"SUCCESS",
//           message:"Data get successfully.",
//           data:[formattedResult]
//         })
//       }
//       return res.status(400).json({
//         statusCode:400,
//         statusValue:"FAIL",
//         message:"Error!! data not found",
//       })
//     }
//   } catch (err) {
//     return res.status(500).json({
//       statusCode: 500,
//       statusValue: "FAIL",
//       message: "Internal server error",
//       data: {
//         generatedTime: new Date(),
//         errMsg: err.stack,
//       },
//     });
//   }
// }
