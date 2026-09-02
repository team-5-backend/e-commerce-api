import { config } from "dotenv";
import axios from "axios";

config({ path: "../../.env" });

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",

      {
        sender: {
          name: process.env.EMAIL_FROM_NAME,
          email: process.env.EMAIL_FROM,
        },

        to: [
          {
            email: to,
          },
        ],

        subject: subject,

        htmlContent: html,

        ...(text && {
          textContent: text,
        }),
      },

      {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    console.log("Email sent successfully:", response.data);

    return response.data;
  } catch (error) {
    const errorMessage = error.response
      ? error.response.data
      : error.message;

    console.error("Brevo API Error:", errorMessage);

    throw error;
  }
};

export default sendEmail;