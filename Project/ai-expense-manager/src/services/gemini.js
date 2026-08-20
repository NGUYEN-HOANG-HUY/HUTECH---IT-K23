import { GoogleGenerativeAI } from '@google/generative-ai';

// Thay thế bằng Gemini API Key của bạn
const API_KEY = "YOUR_GEMINI_API_KEY";

const genAI = new GoogleGenerativeAI(API_KEY);

export const analyzeReceipt = async (base64Image, mimeType = "image/jpeg") => {
  try {
    // Sử dụng model gemini-1.5-flash (tối ưu tốc độ cho multimodal)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert expense analyzer. Analyze this receipt image and extract the following information in strict JSON format:
      {
        "totalAmount": number (the total amount on the receipt, e.g. 150000),
        "date": "YYYY-MM-DD" (the date of the purchase, if available, otherwise null),
        "merchantName": string (the name of the store or merchant),
        "category": string (e.g. "Food", "Transport", "Shopping", "Utilities", "Other"),
        "items": [
          {
            "name": string,
            "price": number
          }
        ]
      }
      Return ONLY the JSON. Do not include markdown formatting or any other text.
    `;

    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON (remove any markdown if Gemini accidentally includes it)
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
    
  } catch (error) {
    console.error("Error analyzing receipt with Gemini:", error);
    throw error;
  }
};
