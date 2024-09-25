const express = require('express');
const router = express.Router();
const authController = require("../controllers/authController")
const verifyUser = require('../includes/middleware/verifyUser');

// user auth end point
router.post("/signup", authController.signup)
router.post("/login", authController.login)
router.post("/verify-otp", authController.verifyOtp)

// user profile end point
router.post("/add-profile-details/:userId", authController.addUserDetails)
router.put("/update-user-device-setup/:userId", authController.updateUserDeviceSetupById)
router.get("/get-profile-details/:userId", authController.getUserDetailsById)

// user bolus end point
router.post("/add-bolus-data/:userId", authController.addBolusData)
router.get("/get-bolus-data/:userId", authController.getBolusData)   

// user glucose end point
router.post("/add-glucose-data/:userId", authController.addGlucoseData)
router.get("/get-glucose-data/:userId", authController.getGlucoseData) 

// user smart bolus end point
router.post("/add-smart-bolus-data/:userId", authController.addSmartBolusData)
router.get("/get-smart-bolus-data/:userId", authController.getSmartBolusData)
// router.get("/get-smart-bolus-data/:userId", authController.getSmartBolusData)

// user vessel end point
router.post("/add-basal-data/:userId", authController.addBasalData)
router.get("/get-basal-data/:userId", authController.getBasalData)


// Country-State city route
router.get('/get-country-list', authController.getCountryList);
router.get('/get-state-list/:name', authController.getStateListByCountryName);
router.get('/get-city-list', authController.getCityListByStateName);

module.exports = router;