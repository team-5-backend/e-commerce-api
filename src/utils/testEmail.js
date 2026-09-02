import sendEmail from "./sendEmail.js";

const runTest = async () => {
  try {
    await sendEmail({
      to: "dev.backend.team@gmail.com",
      subject: "Test Brevo API",
      html: "<h1>Working</h1><p>Brevo API test</p>",
      text: "Working - Brevo API test",
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error:", error.message);
  }
};

runTest();