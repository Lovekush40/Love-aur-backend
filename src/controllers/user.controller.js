import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/fileUploader.cloudnary.js";
import { log } from "console";
import { copyFile } from "fs";
import { subscribe } from "diagnostics_channel";
import mongoose from "mongoose";



const generateAccessTokenAndRefreshToken = async(userId) => {
   try {
      const user = await User.findById(userId);
      const accessToken = user.generateAccessToken(userId)
      const refreshToken = user.generateRefreshToken(userId)

      user.refreshToken = refreshToken
      await user.save({validateBeforeSave: false})
      console.log("accessToken: ",accessToken ,"\n refreshToken: ", refreshToken)

      return {accessToken, refreshToken}
   } catch (error) {
      throw new ApiError(500, "Something went wrong while genrating Accessing genrate access and refresh token")
   }
}

const userRegister = asyncHandler( async (req, res) => {
    
    const {fullName, email, username, password} = req.body
    

    if([fullName, email, username, password].some((field)=> field.trim() === "")
     ){
        throw new ApiError(400, "!! all fields are Required !!")
     }

     const existedUser = await User.findOne({
        $or: [{username}, {email}]
     })

     if(existedUser){
        throw new ApiError(400, "User with given email or username already exist")
     }

     const avatarLocalFilePath = req.files?.avatar[0]?.path;
     const coverImageLocalFilePath = req.files?.coverImage[0]?.path;

     if(!avatarLocalFilePath){
         throw new ApiError(400, "Avatar File is required")
     }

     console.log(avatarLocalFilePath)
     
     
   const avatar =  await uploadOnCloudinary(avatarLocalFilePath);
   const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);
   console.log(avatar);

   if(!avatar){
      throw new ApiError(500, "Avatar upload failed")
   }

    const user = await User.create({
      username: username.toLowerCase(),
      email,
      fullName,
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || ""
   })

   console.log("user: ",user);
   

   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )

   if(!createdUser){
      throw new ApiError(500, "Something went Wrong while registration")
   }

   return res.status(200).json(
      new ApiResponse(201, createdUser, "User Registerd Succesfully")
   )
})

const userLogin = asyncHandler( async(req, res) => {
      console.log("functions stta")
      const {username, email, password} = req.body
      console.log(username, email, password)

      if(!(username || email)){
          throw ApiError(400, "Username or email is required")
      }

     const user =  await User.findOne({
         $or: [{email} , {username}]
      })

      if(!user){
           throw new ApiError(400, "No User Exist with this email or username");
      }else{
           const isValidPassword = await user.isPasswordCorrect(password)

           if(isValidPassword){
               const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

               const loginUser = await User.findById(user._id).select("-password -refreshToken");

               const options = {
                  httpOnly: true,
                  Secure: true
               }

               return res
               .status(200)
               .cookie("accessToken", accessToken, options)
               .cookie("refreshToken", refreshToken, options)
               .json(
                  new ApiResponse(
                     200,
                     {
                        user: loginUser, accessToken, refreshToken
                     },
                     "User succesfully logged in"
                  )
               )
               
           }else{
               throw new ApiError(400, "Enter correct password")
           }
      }
})

const logoutUser = asyncHandler(async(req, res) => {
      await User.findByIdAndUpdate(
         req.user._id,
         {
            $set: {
               refreshToken: undefined,
            }
         },
         {
            new: true,
         }
      )

      const options = {
         httpOnly: true,
         Secure: true
      }

      return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(
         new ApiResponse(
            201,
            {},
            "User Logged Out"
         )
      )
})

const  changePassword = asyncHandler( async(req, res) => {
      const {oldPassword, newPassword, confPassword} = req.body

      if(!oldPassword && !newPassword && !confPassword){
         throw new ApiError(400, "Paswords are required")
      }

      if(newPassword !== confPassword){
         throw new ApiError(400, "newPassword and confirm password shuld be same")
      }

      const user = await User.findById(req.user._id)

      const isValidPassword = user.isPasswordCorrect(oldPassword)

      if(!isValidPassword){
         throw new ApiError(400, "Incoorect password")
      }

      user.password = newPassword
      user.save({validateBeforeSave: false})

      return res.
      status(200)
      .json(
         new ApiResponse(
            200, 
            "password changed Successfully"
         )
      )
          
})

const getCurrentUser = asyncHandler(async(req, res) => {
   return res.
   status(200)
   .json(
      new ApiResponse(
         200,
         req.user,
         "current user fetched succefully"
      )
   )
})

const updateUserAccountDetails = asyncHandler( async(req, res) => {
   const {username, fullName} = req.body

   if(!username || !fullName){
      throw new ApiError(400, "All fields Are required")
   }
   
   console.log(`username: ${username} fullName: ${fullName}`);
   
   const user = await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            username: username,
            fullName: fullName
         }
      },
      {
         new: true,
      }
   ).select(
      "-password -refreshToken"
   )

   console.log("userUpdate")
   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         user,
         "username and fullName updated succesfully"
      )
   )

})

const userSubscription = asyncHandler( async(req, res) => {
      const {fullName, username, email} = req.body

      // if()
})

const updateUserAvatar = asyncHandler( async(req, res) =>{

      const avatarLocalFilePath = req.file?.path

      console.log(avatarLocalFilePath);
      

      if(!avatarLocalFilePath){
         throw new ApiError(400, "Avatar file is required")
      }

      const avatar = await uploadOnCloudinary(avatarLocalFilePath)

      if(!avatar){
         throw new ApiError(400, "error while uplading avatar")
      }
      

      const user = await User.findByIdAndUpdate(
         req.user._id,
         {
            $set: {
               avatar: avatar.url
            }
         },
         {
            new: true
         }
      ).select("-password -refreshToken")    

      return res.
      status(200)
      .json(
         new ApiResponse(
            200, 
            user,
            "Avatar Updated Successfully"
         )
      )
})

const updateUserCoverImage = asyncHandler( async(req, res) =>{

      const coverImageLocalFilePath = req.file?.path

      console.log(coverImageLocalFilePath);
      
      if(!coverImageLocalFilePath){
         throw new ApiError(400, "coverImage file is required")
      }

      const coverImage = await uploadOnCloudinary(coverImageLocalFilePath)

      if(!coverImage){
         throw new ApiError(400, "error while uplading coverImage")
      }

      const user = await User.findByIdAndUpdate(
         req.user._id,
         {
            $set: {
               coverImage: coverImage.url
            }
         },
         {
            new: true
         }
      ) .select("-password -refreshToken") 
      
      return res.
      status(200)
      .json(
         new ApiResponse(
            200, 
            user,
            "Avatar Updated Successfully"
         )
      )
})

const getUserChannelDetails = asyncHandler( async(req, res) => {
   
   const {username} = req.params

   if(!username.trim()){
      throw new ApiError(400, "username is missing")
   }

   const channel = await User.aggregate(
      [
         {
            $match: {
            username: username.toLowerCase()
         },
         },
         {
            $lookup: {
               from: "subscriptions",
               localField: "_id",
               foreignField: "channel",
               as: "subscribers"

            }
         },     
         {
            $lookup: {
               from: "subscriptions",
               localField: "_id",
               foreignField: "subscriber",
               as: "subscribedTo"
            }
         },
         {
            $addFields: {
               subscriberCount: {$size: "$subscribers"},
               subscribedToCount: {$size: "$subscribedTo"},
               isSubscribed: {
                  $cond: {
                     if: {$in : [req.user?._id, "$subscribers.subscribe"]},
                     then: true,
                     else: false
                  }
               }
            }
         },
         {
            $project: {
               fullName: 1,
               username: 1,
               avatar: 1,
               coverImage: 1,
               subscriberCount: 1,
               subscribedToCount:1,
               email: 1    
            }
         }
         
      ]
   )

   console.log(channel)

   if(channel?.length){
      throw new ApiError(400, "Channel does not exist")
   }

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         channel[0],
         "User channel fetched succesfully"
      ) 
   ) 
})

const getWatchHistory = asyncHandler( async(req, res) => {
      const user = User.aggregate(
         [
            {
               $match: {
                  _id: new mongoose.Types.ObjectId(req.user._id)
               }
            },{
               $lookup: {
                  from: "videos", 
                  localField: "watchHistory",
                  foreignField: "_id",
                  as: "watchHistory",
                  pipeline: [
                    {
                      $lookup: {
                        from: "users", 
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline: [
                           {  
                              $project: {
                                 fullName: 1,
                                 username: 1,
                                 avatar: 1
                              }
                           }
                        ]
                     }
                  }
                  ]
               }
            }
         ]
      )

      return res
      .status(200)
      .json(
         new ApiResponse(
            200, 
            user[0].watchHistory[0],
            "watchHistory fetched succesfully"
         )
      )
})


export {userRegister, userLogin, logoutUser, changePassword, updateUserAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelDetails, getWatchHistory}