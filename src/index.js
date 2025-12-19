// require('dotenv').config({path: './env'})

import dotenv from "dotenv"
import mongoose from 'mongoose'
import express from 'express'
import connectDB from './db/index.js';


dotenv.config(
    {path: './.env'}
)

connectDB()
.then(() =>{
    app.listen(process.env.PORT, ()=>{
        console.log("app listening .... at:", process.env.PORT);
    })
})
.catch(()=> {
    console.log("DataBase connection Failed..")
})


// const app = express()

// ;( async()=>{
//     try {
//         await mongoose.connect(`${proccess.env.URI}/${DB_NAME}`)
//         app.on("error", ()=>{
//             console.log("application not able to talk to database", error)
//             throw error
//         })
//     } catch (error) {
//         console.log("DATABASE CONNECTION ERROR: ", error)
//     }

// })()