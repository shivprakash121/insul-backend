const express = require('express');
const router = express.Router();
const nutritionController = require("../controllers/nutritionController")
// const verifyUser = require('../includes/middleware/verifyUser');


router.post("/add-data", nutritionController.addUserNutrition)
router.put("/update-data/:id", nutritionController.updateNutritionById)
router.get("/get-data/:userId", nutritionController.getUserNutritionByUserId)
router.get("/get-nutrition-data/:userId", nutritionController.getUserNutritionDataCountById)
router.delete("/delete-data/:id", nutritionController.deleteNutritionById)

// Add user weight 
router.post("/add-weight", nutritionController.addUserWt)
router.get("/get-user-wt/:userId", nutritionController.getUserWt)
router.delete("/delete-user-wt/:id", nutritionController.deleteUserWtById)
router.get("/get-wt-analysis-data/:userId", nutritionController.getUserWtAnalysisData)


// Nutrition Data count API
router.get("/get-data-count/:userId", nutritionController.getUserNutritionCountByUserId)




// router.post("/login", authController.login)
// router.post("/verify-otp", authController.verifyOtp)

module.exports = router;