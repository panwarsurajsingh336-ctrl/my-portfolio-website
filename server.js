const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const pages = {
  home: { view: "index", title: "Suraj Singh - Full Stack Developer" },
  about: { view: "about", title: "About - Suraj Singh" },
  skills: { view: "skills", title: "Skills - Suraj Singh" },
  projects: { view: "projects", title: "Projects - Suraj Singh" },
  resume: { view: "resume", title: "Resume - Suraj Singh" },
  contact: { view: "contact", title: "Contact - Suraj Singh" },
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "static")));

app.get("/css/style.css", (_req, res) => {
  res.sendFile(path.join(__dirname, "style.css"));
});

app.get("/js/main.js", (_req, res) => {
  res.sendFile(path.join(__dirname, "main.js"));
});

function renderPage(res, page, locals = {}) {
  const config = pages[page];
  res.render(config.view, {
    title: config.title,
    page,
    success: false,
    error: false,
    formData: {},
    ...locals,
  });
}

function getEmailConfig() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, "") : "";
  const to = process.env.EMAIL_TO;
  const placeholderValues = new Set([
    "EMAIL_PASS",
    "password",
    "your_gmail_app_password",
    "your_16_character_gmail_app_password",
    "your_real_16_character_gmail_app_password",
    "app_password_here",
  ]);

  if (!user) {
    throw new Error("Missing EMAIL_USER in .env");
  }

  if (!pass) {
    throw new Error("Missing EMAIL_PASS in .env");
  }

  if (!to) {
    throw new Error("Missing EMAIL_TO in .env");
  }

  if (user === "yourgmail@gmail.com" || placeholderValues.has(pass.toLowerCase())) {
    throw new Error("Replace placeholder Gmail SMTP credentials in .env");
  }

  return { user, pass, to };
}

function createMailTransporter() {
  getEmailConfig();

  // Gmail SMTP uses an App Password, not your regular Google account password.
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.replace(/\s/g, ""),
    },
  });
}

async function verifySmtpConnection() {
  try {
    const transporter = createMailTransporter();
    await transporter.verify();
    console.log("SMTP server is ready to send emails");
  } catch (error) {
    console.error("SMTP connection failed:", error);
  }
}

function getContactErrorMessage(error) {
  if (error.message.includes("Missing EMAIL_")) {
    return "Email settings are missing. Please check your .env file.";
  }

  if (error.message.includes("placeholder Gmail SMTP credentials")) {
    return "Email is not configured yet. Replace EMAIL_PASS in .env with your Gmail App Password.";
  }

  if (error.code === "EAUTH" || error.responseCode === 535) {
    return "Gmail rejected the login. Use a Gmail App Password, not your normal Gmail password.";
  }

  return "Message could not be sent right now. Please try again later.";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendContactEmail({ name, email, subject, message }) {
  const sentAt = new Date();
  const formattedDate = sentAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  const transporter = createMailTransporter();
  const { user, to } = getEmailConfig();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  await transporter.sendMail({
    from: `"Portfolio Contact" <${user}>`,
    to,
    replyTo: email,
    subject: "New Portfolio Contact Message",
    text: [
      "New Portfolio Contact Message",
      "",
      `Sender Name: ${name}`,
      `Sender Email: ${email}`,
      `Subject: ${subject}`,
      `Message: ${message}`,
      `Date & Time: ${formattedDate}`,
    ].join("\n"),
    html: `
      <h2>New Portfolio Contact Message</h2>
      <p><strong>Sender Name:</strong> ${safeName}</p>
      <p><strong>Sender Email:</strong> ${safeEmail}</p>
      <p><strong>Subject:</strong> ${safeSubject}</p>
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
      <p><strong>Date &amp; Time:</strong> ${formattedDate}</p>
    `,
  });
}

app.get("/", (_req, res) => renderPage(res, "home"));
app.get("/about", (_req, res) => renderPage(res, "about"));
app.get("/skills", (_req, res) => renderPage(res, "skills"));
app.get("/projects", (_req, res) => renderPage(res, "projects"));
app.get("/resume", (_req, res) => renderPage(res, "resume"));
app.get("/contact", (_req, res) => renderPage(res, "contact"));

app.get("/contact/smtp-test", async (_req, res) => {
  try {
    const transporter = createMailTransporter();
    await transporter.verify();
    res.json({ success: true, message: "SMTP server is ready to send emails" });
  } catch (error) {
    console.error("SMTP connection failed:", error);
    res.status(500).json({
      success: false,
      message: getContactErrorMessage(error),
    });
  }
});

app.post("/contact", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const subject = String(req.body.subject || "").trim();
  const message = String(req.body.message || "").trim();
  const formData = { name, email, subject, message };

  if (!name || !email || !subject || !message) {
    renderPage(res, "contact", {
      error: "Please fill in all fields.",
      formData,
    });
    return;
  }

  if (!isValidEmail(email)) {
    renderPage(res, "contact", {
      error: "Please enter a valid email address.",
      formData,
    });
    return;
  }

  try {
    await sendContactEmail({
      name,
      email,
      subject,
      message,
    });

    renderPage(res, "contact", { success: true, formData: {} });
  } catch (error) {
    console.error("Contact email error:", error);
    renderPage(res, "contact", {
      error: getContactErrorMessage(error),
      formData,
    });
  }
});

app.use((_req, res) => {
  res.status(404).render("index", {
    title: "Page Not Found - Suraj Singh",
    page: "home",
  });
});

function startServer(port = PORT) {
  return app.listen(port, async () => {
    console.log(`Portfolio running at http://localhost:${port}`);
    await verifySmtpConnection();
  });
}

if (require.main === module) {
  startServer();
}

app.startServer = startServer;
module.exports = app;
