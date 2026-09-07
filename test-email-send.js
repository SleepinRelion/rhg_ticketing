import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'rhgmu.support@gmail.com',
    pass: 'slmyeaaeljmkdbjp',
  },
});

async function run() {
  try {
    const info = await transporter.sendMail({
      from: 'RHG_MU Ticketing <ithelpdesk-mauritius@radissonblu.com>',
      to: 'm.sanmukhiya21@gmail.com',
      subject: 'Test',
      text: 'Test',
    });
    console.log("Success:", info.messageId);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
run();
