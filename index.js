const express = require("express");
const {json} = require('express');
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db.js");
require("dotenv").config({ path: "./.env" });
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const http = require("http");
var cookieParser = require('cookie-parser');
const logger = require("./config/logger.js");
const session = require('express-session');



// Import all routes file
const authRoute = require("./routes/authRoute.js")
const nutritionRoute = require("./routes/nutritionRoute.js");
const { reverse } = require("dns");

// Creating connection with DB
connectDB();

const app = express();
const server = http.createServer(app);
app.use(express.json());
app.use(cookieParser());
app.enable("trust proxy");
app.use(express.static(path.join(__dirname, 'public')));
// DEVELOPMENT environment morgan logs
// if (process.env.NODE_ENV === "DEVELOPMENT") {
app.use(morgan("tiny"));
// }

app.use(cors());

// adding static folder
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json({ limit: "1mb", extended: true }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Define routes end point
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/nutrition", nutritionRoute);


app.use(
    session({
      secret: "keyboard cat",
      resave: true,
      rolling: true,
      saveUninitialized: false,
      cookie: { expires: 60*60*1000 },
    })
);


// given an integer array [2,4,53,2,346,75]
// find a value if value exists then return its index value

// function searchItem(arr, target) {
//     for (let i = 0; i <arr.length; i++) {
//         if (arr[i] === target) {
//             // return [i, arr[i]];
//             return i;
//         }
//     }
//     return -1;
// }

// console.log(searchItem([2,4,53,2,346,75], 53))

// // Big-O = O(n)


// function binarySearch(arr, target) {
//     let leftIndex = 0;
//     let rightIndex = arr.length-1;

//     while (leftIndex <= rightIndex) {
//         let middleIndex = Math.floor((leftIndex+rightIndex)/2);
//         if (target === arr[middleIndex]) {
//             return middleIndex;
//         }
//         if (target < arr[middleIndex]) {
//             rightIndex = middleIndex-1;
//         } else {
//             leftIndex = middleIndex+1;
//         }
//     }
//     return -1;
// }


// console.log(binarySearch([2,4,6,88,99,100], 4))

// Big-O = O(logn)


// function recursiveBSearch(arr, target) {
//     return search (arr, target, 0, arr.length-1)
// }

// function search (arr, target, leftIndex, rightIndex) {
//     if (leftIndex > rightIndex) {
//         return -1;
//     }

//     let middleIndex = Math.floor((leftIndex+rightIndex)/2);
//     if (target === arr[middleIndex]) {
//         return middleIndex;
//     }
//     if (target < arr[middleIndex]) {
//         return search(arr, target, leftIndex, middleIndex-1);
//     } else {
//         return search(arr, target, middleIndex+1, rightIndex);
//     }
// }

// console.log(recursiveBSearch([22,33,44,55,66,77], 44))

// Big-O = O(logn)


// // Bubble sort algo
// function bubbleSort(arr) {
//     let swapped;
//     do {
//         swapped = false;
//         for (let i = 0; i < arr.length-1; i++) {
//             if (arr[i] > arr[i+1]) {
//                 let temp = arr[i];
//                 arr[i] = arr[i+1];
//                 arr[i+1] = temp;
//                 swapped = true;
//             }
//         }
//     } while (swapped)
// }

// const arr = [4,6,1,8,34,65,9]
// bubbleSort(arr)
// console.log(arr)

// // Big-O = O(nsqr)


// function insertionSort(arr) {
//     for (let i = 1; i < arr.length; i++) {
//         let numToInsert = arr[i];
//         let j = i-1;

//         while (j >= 0 && arr[j] > numToInsert) {
//             arr[j+1] = arr[j];
//             j = j-1;
//         }
//         arr[j+1] = numToInsert
//     }
// }

// const arr = [4,6,1,8,34,65,7]
// insertionSort(arr)
// console.log(arr)

// class Queue {
//   constructor () {
//     this.items = {}
//     this.front = 0
//     this.rear = 0
//   }

//   enqueue (element) {
//     this.items[this.rear] = element;
//     this.rear++;
//   }

//   dequeue () {
//     const item = this.items[this.front];
//     delete this.items[this.front];
//     this.front++;
//     return item;
//   }
// }

































// Define PORT
const PORT = process.env.PORT || 5000;

server.listen(PORT, () =>
    // logger.error(`Server is running on port : ${PORT}`)
    console.log(`Server is running on port : ${PORT}`)
);

// unhandledRejection Error handling
process.on("unhandledRejection", (err) => {
    console.log(err.name, err.message);
    console.log("UNHANDLED REJECTION! Shutting down...");
    process.exit(1);
});
