require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();
const bcrypt = require("bcrypt");
const normalizeSouthAfricanNumber = require("../utils/phone");
const { sendSMS } = require("../utils/sms");

const authenticateToken = require("../middleware/auth");

const jwtKey = process.env.JWTKEY;
const refreshKey = process.env.REFRESH_SECRET;

//function to see if the phone number is correctly formatted
function validateNumber(num) {
  const normalized = normalizeSouthAfricanNumber(num);

  if (!normalized) {
    return { valid: false, message: "Number is required" };
  }

  const regex = /^\+27[6-8][0-9]{8}$/;

  if (!regex.test(normalized)) {
    return { valid: false, message: "Invalid SA number" };
  }

  return { valid: true, number: normalized };
}

// async function getSmsPortalToken() {
//   const credentials = Buffer.from(
//     `${process.env.SMSPORTAL_CLIENT_ID}:${process.env.SMSPORTAL_API_SECRET}`
//   ).toString("base64");

//   const res = await fetch("https://rest.smsportal.com/Authentication", {
//     method: "GET",
//     headers: {
//       Authorization: `Basic ${credentials}`,
//       "Content-Type": "application/json",
//     },
//   });

//   if (!res.ok) {
//     const err = await res.text();
//     throw new Error(`Token error: ${err}`);
//   }

//   const data = await res.json();
//   return data.token;
// }

// async function sendSMS(number, message) {
//   const smsToken = await getSmsPortalToken();

//   const res = await fetch("https://rest.smsportal.com/bulkmessages", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${smsToken}`,
//     },
//     body: JSON.stringify({
//       messages: [
//         {
//           content: message,
//           destination: number,
//         },
//       ],
//     }),
//   });

//   if (!res.ok) {
//     const err = await res.text();
//     throw new Error(`SMS send error: ${err}`);
//   }

//   return res.json();
// }

//route to create an account
router.post("/register", async (req, res) => {
  try {
    const { number } = req.body;

    const validation = validateNumber(number);

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const normalizedNumber = validation.number;

    const user = await User.findOne({ number: normalizedNumber });

    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expires = new Date(Date.now() + 10 * 60 * 1000);

    //code to send sms goes here
    await sendSMS(normalizedNumber, `Your verification code is ${code}`);

    //the code is stored as a hashed code for security safety
    // const hashedCode = await bcrypt.hash(code, 10);

    const newUser = new User({
      number: normalizedNumber,
      verificationCode: code,
      verificationCodeExpires: expires,
    });

    await newUser.save();

    //code is temporarily revealed in the response message just for testing
    res
      .status(201)
      .json({ message: `verification code ${code} sent to ${number}` });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

//route to verify your code and on verification get a jwt token
router.post("/verify", async (req, res) => {
  try {
    const { number, code } = req.body;

    const normalized = normalizeSouthAfricanNumber(number);

    const user = await User.findOne({ number: normalized });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ message: "code expired" });
    }

    // const isMatch = await bcrypt.compare(code, user.verificationCode);
    const isMatch = code === user.verificationCode

    if (!isMatch) {
      return res.status(400).json({ message: "invalid code" });
    }

    //create an access token and refresh token for in case access token expires
    const token = jwt.sign({ userid: user._id }, jwtKey, { expiresIn: "30d" });
    const refreshToken = jwt.sign({ userid: user._id }, refreshKey, {
      expiresIn: "90d",
    });

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    user.refreshToken = refreshToken;

    await user.save();

    res
      .status(200)
      .json({
        message: "user logged in successfully",
        token,
        refreshToken,
        firstName: user.firstName,
      });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

//route for logging in
router.post("/login", async (req, res) => {
  try {
    const { number } = req.body;

    const normalized = normalizeSouthAfricanNumber(number);

    const user = await User.findOne({ number: normalized });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // const hashedCode = await bcrypt.hash(code, 10);

    //code to send sms goes here
    await sendSMS(normalized, `Your verification code is ${code}`);

    //get a new verification code and code expiry
    user.verificationCode = code;
    user.verificationCodeExpires = expires;

    await user.save();

    res
      .status(201)
      .json({ message: `verification code ${code} sent to ${number}` });

    console.log(code);
  } catch (err) {
    res.status(500).json({ message: "internal server error", err: err.message });
  }
});

//route to logout
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userid);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    //remove refresh token
    user.refreshToken = undefined;

    await user.save();

    res.status(200).json({ message: "user has been logged out" });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

//route to refresh access token using refresh token
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.sendStatus(401);
  }

  const user = await User.findOne({ refreshToken });

  if (!user) {
    return res.sendStatus(403);
  }

  jwt.verify(refreshToken, refreshKey, (err, decoded) => {
    if (err) {
      return res.sendStatus(403);
    }

    const accessToken = jwt.sign({ userid: user._id }, jwtKey, {
      expiresIn: "30d",
    });

    res.status(200).json({ accessToken });
  });
});

//route to complete profile with name and surname
router.post("/complete-profile", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    const user = await User.findById(req.user.userid);

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "missing fields" });
    }

    user.firstName = firstName;
    user.lastName = lastName;

    await user.save();

    res.status(200).json({ message: "profile completed" });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

module.exports = router;
