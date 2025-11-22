
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles, Minimize2, ChevronUp } from 'lucide-react';
import { ChatMessage } from '../types';
import { sendMessageToLLM } from '../services/chatService';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm the Hive AI. Ask me about your Sales, ACOS, or specific ASIN performance.",
        timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        const response = await sendMessageToLLM(messages, userMsg.content);
        
        const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botMsg]);
    } catch (error) {
        console.error("Chat Error", error);
    } finally {
        setIsTyping(false);
    }
  };

  // Floating Button (When Closed)
  if (!isOpen) {
    return (
        <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center transition-all hover:scale-110 z-50 group"
        >
            <MessageSquare className="w-6 h-6 group-hover:hidden" />
            <Sparkles className="w-6 h-6 hidden group-hover:block animate-pulse" />
            
            {/* Notification Dot */}
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950"></span>
        </button>
    );
  }

  // Chat Window
  return (
    <div 
        className={`fixed right-6 z-50 transition-all duration-300 ease-in-out bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden
        ${isMinimized ? 'bottom-6 w-72 h-14' : 'bottom-6 w-[380px] h-[600px]'}`}
    >
        {/* Header */}
        <div 
            className="p-4 bg-slate-800/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between cursor-pointer"
            onClick={() => setIsMinimized(!isMinimized)}
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-100 text-sm">Hive Intelligence</h3>
                    {!isMinimized && <p className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Online</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} 
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                >
                    {isMinimized ? <ChevronUp className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                    className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>

        {!isMinimized && (
            <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30 scrollbar-hide">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'assistant' ? 'bg-indigo-600/20' : 'bg-slate-700'}`}>
                                {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-indigo-400" /> : <span className="text-xs font-bold text-slate-300">U</span>}
                            </div>
                            <div className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                                    : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex-shrink-0 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-sm border border-slate-700 flex gap-1 items-center">
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about trends, sales..."
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl pl-4 pr-12 py-3 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                        />
                        <button 
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </>
        )}
    </div>
  );
};
