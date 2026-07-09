require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ContactRequest = require("../models/ContactRequest");
const router = express.Router();
const normalizeSouthAfricanNumber = require("../utils/phone");
const { sendSMS } = require("../utils/sms");
const { sendNotification } = require("../services/notificationService");

const authenticateToken = require("../middleware/auth");

const jwtKey = process.env.JWTKEY;

// async function getSmsPortalToken() {
//   const credentials = Buffer.from(
//     `${process.env.SMSPORTAL_CLIENT_ID}:${process.env.SMSPORTAL_API_SECRET}`,
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

//find matches from your contacts
router.post("/matches", authenticateToken, async (req, res) => {
  try {
    const { numbers } = req.body;

    const normalizedNumbers = numbers
      .map(normalizeSouthAfricanNumber)
      .filter(Boolean);

    const users = await User.find({
      number: { $in: normalizedNumbers },
      isVerified: true,
    }).select("firstName lastName number");

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

//send request to be an emergency contact
router.post("/request", authenticateToken, async (req, res) => {
  try {
    const { number } = req.body;

    const normalized = normalizeSouthAfricanNumber(number);

    if (!normalized) {
      return res.status(400).json({ message: "Invalid number" });
    }

    const targetUser = await User.findOne({
      number: normalized,
      isVerified: true,
    });

    if (!targetUser) {
      const user = await User.findById(req.user.userid);

      const request = await ContactRequest.create({
        from: req.user.userid,
        toNumber: normalized,
        appUser: false,
        status: "accepted", // no login = no accept step, so this is the relationship
      });

      await sendSMS(
        normalized,
        `${user.firstName} would like you to be their emergency contact for thebe-ya-batho. Reply STOP to opt out.`,
      );

      return res.status(200).json({
        message: `${user.firstName} would like you to be their emergency contact for thebe-ya-batho`,
        request,
      });
    }

    if (targetUser._id.toString() === req.user.userid) {
      return res.status(400).json({ message: "cannot add yourself" });
    }

    const existing = await ContactRequest.findOne({
      from: req.user.userid,
      to: targetUser._id,
      status: "pending",
    });

    if (existing) {
      return res.status(400).json({ message: "Request already sent" });
    }

    const request = await ContactRequest.create({
      from: req.user.userid,
      to: targetUser._id,
      appUser: true,
    });

    const requester = await User.findById(req.user.userid);
    await sendNotification(targetUser._id, {
      title: "New contact request",
      body: `${requester.firstName} wants to add you as an emergency contact`,
      data: { type: "contact-request", requestId: request._id },
    });

    res
      .status(201)
      .json({ message: "Emergency contact request sent", request });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

//see all requests you've received
router.get("/see-requests-received", authenticateToken, async (req, res) => {
  const requests = await ContactRequest.find({
    to: req.user.userid,
    status: "pending",
  }).populate("from", "firstName lastName number");

  res.json(requests);
});

//see all requests you've sent
router.get("/see-requests-sent", authenticateToken, async (req, res) => {
  const requests = await ContactRequest.find({
    from: req.user.userid,
  }).populate("to", "firstName lastName number");

  res.json(requests);
});

//accept a request to be an emergency contact
router.post("/request/:id/accept", authenticateToken, async (req, res) => {
  try {
    const request = await ContactRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.to.toString() !== req.user.userid) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Request already processed",
      });
    }

    request.status = "accepted";
    await request.save();

    const accepter = await User.findById(req.user.userid);
    await sendNotification(request.from, {
      title: "Request accepted",
      body: `${accepter.firstName} accepted your contact request`,
      data: { type: "contact-accepted", requestId: request._id },
    });

    res.status(200).json({ message: "Contact added" });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

//reject a request to be an emergency contact
router.post("/request/:id/reject", authenticateToken, async (req, res) => {
  try {
    const request = await ContactRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.to.toString() !== req.user.userid) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Request already processed",
      });
    }

    request.status = "rejected";
    await request.save();

    const rejecter = await User.findById(req.user.userid);
    await sendNotification(request.from, {
      title: "Request declined",
      body: `${rejecter.firstName} declined your contact request`,
      data: { type: "contact-rejected", requestId: request._id },
    });

    res.status(200).json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

//view all your emergency contacts
router.get("/emergency-contacts", authenticateToken, async (req, res) => {
  try {
    const contacts = await ContactRequest.find({
      from: req.user.userid,
      status: "accepted",
    }).populate("to", "firstName lastName number");

    res.status(200).json(contacts);
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

//view all ppl who you're an emergency contact for
router.get("/emergency-contact-for", authenticateToken, async (req, res) => {
  try {
    const contacts = await ContactRequest.find({
      to: req.user.userid,
      status: "accepted",
    }).populate("from", "firstName lastName number");

    res.status(200).json(contacts);
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

//delete an emergency contact
router.delete(
  "/emergency-contact-remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const contact = await ContactRequest.findById(req.params.id);

      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      if (contact.from.toString() !== req.user.userid) {
        return res.status(403).json({
          message: "not allowed",
        });
      }

      await contact.deleteOne();

      res.status(200).json({
        message: "Emergency contact removed",
      });
    } catch (err) {
      res.status(500).json({ message: "internal server error", err });
    }
  },
);

router.get("/get-name/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "no user found" });
    }

    res.status(200).json({ name: `${user.firstName} ${user.lastName}` });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

router.post("/push-token", authenticateToken, async (req, res) => {
  try {
    const { pushToken } = req.body;
    await User.findByIdAndUpdate(req.user.userid, { pushToken });
    res.status(200).json({ message: "push token saved" });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

router.post("/set-contact-name/:id", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }

    const contact = await ContactRequest.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: "contact not found" });
    }

    if (contact.from.toString() !== req.user.userid) {
      return res.status(403).json({ message: "not allowed" });
    }

    contact.contactName = name.trim();
    await contact.save();

    res
      .status(200)
      .json({ message: "name saved", contactName: contact.contactName });
  } catch (err) {
    res.status(500).json({ message: "internal server error", err });
  }
});

module.exports = router;
