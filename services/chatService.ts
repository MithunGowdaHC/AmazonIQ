
import { ChatMessage } from '../types';

// --- MOCK CONTEXT KNOWLEDGE ---
// In a real app, this would be RAG (Retrieval Augmented Generation) 
// querying your database before sending to the LLM.
const KNOWLEDGE_BASE = {
    sales: "Stahl's total sales for the last 30 days are approximately ₹4.2 Lakhs, with a healthy mix of 60% paid and 40% organic.",
    acos: "Your ACOS is currently trending around 28%, which is slightly above the target of 25%. Consider optimizing bids on 'Hybrid Frypan' campaigns.",
    trend: "We are seeing a 12% increase in Glance Views week-over-week, likely due to the recent seasonal sale.",
    performance: "The top performing ASIN is B08XYZ1234 (Hybrid Frypan). It contributes nearly 35% of total revenue.",
    optimization: "I recommend shifting budget from broad match keywords in the 'Kitchen' portfolio to exact match to improve ROAS.",
    hello: "Hello! I am the Hive AI Assistant. I can help you analyze sales, check ACOS trends, or deep dive into specific ASINs. What would you like to know?",
    default: "I can certainly help with that. Could you specify if you want to analyze a specific ASIN or get an account-level overview?"
};

export const sendMessageToLLM = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    // Simulate Network Delay for "Thinking" effect
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lowerMsg = newMessage.toLowerCase();

    // Simple keyword matching to simulate intelligence
    // TO MAKE REAL: Replace this logic with a fetch() call to your backend 
    // which forwards to OpenAI/Gemini API.
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) return KNOWLEDGE_BASE.hello;
    if (lowerMsg.includes('sale') || lowerMsg.includes('revenue')) return KNOWLEDGE_BASE.sales;
    if (lowerMsg.includes('acos') || lowerMsg.includes('spend')) return KNOWLEDGE_BASE.acos;
    if (lowerMsg.includes('trend') || lowerMsg.includes('growth')) return KNOWLEDGE_BASE.trend;
    if (lowerMsg.includes('best') || lowerMsg.includes('top')) return KNOWLEDGE_BASE.performance;
    if (lowerMsg.includes('optimi') || lowerMsg.includes('suggest')) return KNOWLEDGE_BASE.optimization;

    return KNOWLEDGE_BASE.default;
};
