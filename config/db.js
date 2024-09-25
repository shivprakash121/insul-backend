const mongoose = require('mongoose')

const connectDB = async () => { 
    try {
        await mongoose.connect("mongodb://localhost:27017/Insul",{
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        console.log("MongoDB connection SUCCESS!");
    } catch (error) {
        console.error("MongoDB connection FAILED!",error);
        process.exit();
    }
}

module.exports = connectDB;     