/**
 * Email - Enviar via Gmail/SMTP
 */

require("dotenv").config();
const nodemailer = require("nodemailer");

let transporter = null;

function initTransporter() {
  if (transporter) return transporter;

  // Gmail SMTP
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "seu-email@gmail.com",
      pass: process.env.EMAIL_PASSWORD || "sua-senha-app",
    },
  });

  return transporter;
}

async function sendEmail(to, subject, message) {
  try {
    const transport = initTransporter();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log("\n📧 [SIMULADO] Email:");
      console.log(`Para: ${to}`);
      console.log(`Assunto: ${subject}`);
      console.log(`Mensagem:\n${message}\n`);
      return { success: true };
    }

    console.log(`📤 Enviando email para ${to}...`);

    const info = await transport.sendMail({
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: `<pre>${message}</pre>`,
      text: message,
    });

    console.log(`✅ Email enviado! ID: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao enviar email:", error.message);
    return { success: false };
  }
}

module.exports = {
  sendEmail,
};
