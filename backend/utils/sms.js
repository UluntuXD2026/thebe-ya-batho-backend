async function getSmsPortalToken() {
  const credentials = Buffer.from(
    `${process.env.SMSPORTAL_CLIENT_ID}:${process.env.SMSPORTAL_API_SECRET}`
  ).toString("base64");

  const res = await fetch("https://rest.smsportal.com/Authentication", {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token error: ${err}`);
  }

  const data = await res.json();
  return data.token;
}

async function sendSMS(number, message) {
  const smsToken = await getSmsPortalToken();

  const res = await fetch("https://rest.smsportal.com/bulkmessages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${smsToken}`,
    },
    body: JSON.stringify({
      messages: [
        {
          content: message,
          destination: number,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SMS send error: ${err}`);
  }

  return res.json();
}

module.exports = { sendSMS, getSmsPortalToken };