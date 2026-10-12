import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { useApp } from '../context/AppContext';
import { speakText, stopSpeech } from '../utils/voiceUtils';
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  HelpCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  cited?: Array<{ document_id: number; filename: string; date?: string }>;
  provider_used?: string;
  is_rule_based?: boolean;
}

export const AssistantPage: React.FC = () => {
  const { user, language } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${user?.full_name || 'Patient'}! I am your AI Personal Health Copilot.\n\nYou can ask me ANY medical or health question (for example: "What is high blood pressure and how to reduce it?", "Why is hemoglobin important?", or "What foods help lower cholesterol?"), as well as questions about your uploaded documents ("Summarize my latest blood test" or "What medications do I have?").\n\nYou can speak using your microphone 🎙️ or listen to any response using the voice audio button 🔊!`,
      is_rule_based: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Web Speech Recognition (Microphone Speech-to-Text)
  const handleToggleListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang =
        language === 'hi'
          ? 'hi-IN'
          : language === 'te'
          ? 'te-IN'
          : language === 'ta'
          ? 'ta-IN'
          : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      stopSpeech();
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(msgId);
    speakText(
      text,
      language,
      () => setSpeakingMsgId(null),
      () => setSpeakingMsgId(null)
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const query = input.trim();
    setInput('');
    const userMsgId = 'u_' + Date.now();
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: query }]);
    setLoading(true);

    try {
      const res = await apiClient.post('/health/assistant/qa', {
        question: query,
        language: language,
      });

      const assistantMsgId = 'a_' + Date.now();
      const newMsg: ChatMessage = {
        id: assistantMsgId,
        sender: 'assistant',
        text: res.data.answer,
        cited: res.data.cited_records,
        provider_used: res.data.provider_used,
        is_rule_based: res.data.is_rule_based,
      };

      setMessages((prev) => [...prev, newMsg]);

      // Automatically speak the new response
      setSpeakingMsgId(assistantMsgId);
      speakText(
        res.data.answer,
        language,
        () => setSpeakingMsgId(null),
        () => setSpeakingMsgId(null)
      );
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'assistant',
          text: 'I could not process that request. Please try again or check your connection.',
          is_rule_based: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 flex flex-col h-[calc(100vh-170px)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">AI Health Copilot Assistant</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ask any medical or healthcare question, or ask about your uploaded clinical records with voice synthesis.
          </p>
        </div>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setInput('What does a high fasting blood glucose level mean?')}
          className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-slate-200 text-slate-700 rounded-lg shadow-2xs transition"
        >
          💡 What does high fasting blood glucose mean?
        </button>
        <button
          onClick={() => setInput('Summarize my uploaded medical records and active medicines')}
          className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-slate-200 text-slate-700 rounded-lg shadow-2xs transition"
        >
          📄 Summarize my uploaded records
        </button>
        <button
          onClick={() => setInput('How can I naturally improve my hemoglobin?')}
          className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-slate-200 text-slate-700 rounded-lg shadow-2xs transition"
        >
          🩸 How to naturally improve hemoglobin?
        </button>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 overflow-y-auto space-y-4 shadow-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200/80 text-slate-800'
              }`}
            >
              {m.sender === 'assistant' && (
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2">
                  <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-teal-700">
                    <Bot className="w-3.5 h-3.5" />
                    <span>
                      {m.is_rule_based
                        ? 'Local Clinical Assistant'
                        : `AI Copilot (${m.provider_used?.toUpperCase()})`}
                    </span>
                  </div>

                  {/* Read Aloud Button */}
                  <button
                    onClick={() => handleToggleSpeak(m.id, m.text)}
                    className={`p-1 rounded-md text-[11px] flex items-center space-x-1 transition ${
                      speakingMsgId === m.id
                        ? 'bg-rose-100 text-rose-700'
                        : 'text-slate-500 hover:text-teal-700 hover:bg-slate-200/60'
                    }`}
                    title="Read out answer aloud"
                  >
                    {speakingMsgId === m.id ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Mute</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">Listen</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="whitespace-pre-line leading-relaxed">{m.text}</div>

              {m.cited && m.cited.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                  <span className="font-semibold block mb-0.5">Records Referenced:</span>
                  {m.cited.map((c, i) => (
                    <div key={i} className="flex items-center space-x-1 text-slate-600">
                      <FileText className="w-3 h-3 text-teal-600" />
                      <span>{c.filename} {c.date && `(${c.date})`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
              <span>Analyzing medical knowledge & formulating response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar with Voice Recognition & Audio buttons */}
      <form onSubmit={handleSend} className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleToggleListening}
          className={`p-3 rounded-xl border transition shadow-xs flex items-center justify-center ${
            isListening
              ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-teal-600'
          }`}
          title={isListening ? 'Listening... click to stop' : 'Click to speak via microphone'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening to your voice...' : "Ask any health question or ask about your records..."}
          className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden shadow-xs"
        />

        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl shadow-xs transition flex items-center space-x-1.5 text-xs font-semibold"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
