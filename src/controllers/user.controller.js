import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/fileUploader.cloudnary.js";
import { log } from "console";

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

export {userRegister,}