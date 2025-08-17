const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const GROQ_API_URL = "https://api.groq.com/v1/your-endpoint"; // Replace with actual Groq endpoint
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/summarize', async (req, res) => {
  const { transcript, prompt } = req.body;

  if (!transcript) return res.status(400).json({ error: "Transcript is required" });

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",  // Groq's model name as per docs
        messages: [
          {
            role: "system",
            content: "You are an expert meeting notes summarizer."
          },
          {
            role: "user",
            content: `Instruction: ${prompt}\nTranscript: ${transcript}`
          }
        ],
        max_tokens: 512
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const summary = response.data.choices?.[0]?.message?.content || "No summary returned";
    res.json({ summary });

  } catch (error) {
    console.error("Groq API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

app.post('/share', async (req, res) => {
  const { summary, emails } = req.body;
  if (!summary || !emails) return res.status(400).json({ error: "Summary and emails are required" });

  try {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: emails.split(',').map(email => email.trim()),
      subject: 'AI Meeting Notes Summary',
      text: summary,
    });

    res.json({ message: "Email(s) sent successfully" });

  } catch (error) {
    console.error("Email sending error:", error.message);
    res.status(500).json({ error: "Failed to send email" });
  }
});
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
