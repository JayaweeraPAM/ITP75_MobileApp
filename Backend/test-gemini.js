import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
try {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const SYSTEM_PROMPT = 'You are the TutorHub Assistant. Be concise.';
  const contents = [
    {
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\nUser Question:\nHow do I book a tutor?` }]
    }
  ];

  const result = await model.generateContent({ contents });
  console.log('Success:', result.response.text());
} catch (err) {
  console.error('Error occurred:', err);
}
