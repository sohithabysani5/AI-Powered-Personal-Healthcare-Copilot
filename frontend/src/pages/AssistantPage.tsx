import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useApp } from '../context/AppContext';
import { speakText, stopSpeech } from '../utils/voiceUtils';
import { ReadableAnswer } from '../components/ReadableAnswer';
import {
  Activity,
  ArrowUp,
  Bot,
  FileText,
  HeartPulse,
  LoaderCircle,
  Menu,
  MessageCircle,
  MessagesSquare,
  Mic,
  MicOff,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  cited?: Array<{ document_id: number; filename: string; date?: string }>;
  provider_used?: string;
  is_rule_based?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface VoiceRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const suggestions = [
  { icon: FileText, label: 'Explain my latest report', prompt: 'Please summarize and explain my latest uploaded medical report in simple language.' },
  { icon: Activity, label: 'Understand my lab values', prompt: 'Review my recorded lab results. Which values are outside the ranges printed on my reports?' },
  { icon: HeartPulse, label: 'Prepare for my appointment', prompt: 'Based on my uploaded health records, suggest a few questions I can ask my doctor.' },
];

export const AssistantPage: React.FC = () => {
  const { user, language } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const response = await apiClient.get<Conversation[]>('/assistant/conversations');
    setConversations(response.data);
    return response.data;
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    const response = await apiClient.get(`/assistant/conversations/${conversationId}/messages`);
    setMessages(response.data.map((message: {
      id: number;
      role: 'user' | 'assistant';
      content: string;
      provider_used?: string;
      is_rule_based?: boolean;
      cited_records?: ChatMessage['cited'];
    }) => ({
      id: String(message.id),
      sender: message.role,
      text: message.content,
      provider_used: message.provider_used,
      is_rule_based: message.is_rule_based,
      cited: message.cited_records,
    })));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restoreHistory = async () => {
      try {
        const saved = await loadConversations();
        if (!cancelled && saved.length > 0) {
          setActiveConversationId(saved[0].id);
          await loadMessages(saved[0].id);
        }
      } catch (error) {
        console.error('Could not load assistant history.', error);
        if (!cancelled) setErrorMessage('Chat history could not be loaded. Please refresh and try again.');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };
    void restoreHistory();
    return () => {
      cancelled = true;
      stopSpeech();
    };
  }, [loadConversations, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const startNewConversation = () => {
    stopSpeech();
    setSpeakingMsgId(null);
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    setErrorMessage(null);
    setShowMobileHistory(false);
  };

  const openConversation = async (conversationId: number) => {
    try {
      setErrorMessage(null);
      setActiveConversationId(conversationId);
      setShowMobileHistory(false);
      setMessages([]);
      await loadMessages(conversationId);
    } catch (error) {
      console.error('Could not open assistant conversation.', error);
      setErrorMessage('This conversation could not be opened. Please try again.');
    }
  };

  const deleteConversation = async (conversation: Conversation) => {
    if (!window.confirm(`Delete "${conversation.title}" and its messages? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/assistant/conversations/${conversation.id}`);
      const remaining = await loadConversations();
      if (activeConversationId === conversation.id) {
        setActiveConversationId(null);
        setMessages([]);
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
          await loadMessages(remaining[0].id);
        }
      }
    } catch (error) {
      console.error('Could not delete assistant conversation.', error);
      setErrorMessage('The conversation could not be deleted. Please try again.');
    }
  };

  const handleToggleListening = () => {
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => VoiceRecognition;
      webkitSpeechRecognition?: new () => VoiceRecognition;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setErrorMessage('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : language === 'ta' ? 'ta-IN' : 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onerror = () => setErrorMessage('Voice input did not work. You can type your question instead.');
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      stopSpeech();
      setSpeakingMsgId(null);
      return;
    }
    setSpeakingMsgId(msgId);
    speakText(text, language, () => setSpeakingMsgId(null), () => setSpeakingMsgId(null));
  };

  const sendQuestion = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setErrorMessage(null);
    setMessages((current) => [...current, {
      id: `pending-${Date.now()}`,
      sender: 'user',
      text: question,
    }]);
    setLoading(true);

    try {
      const response = await apiClient.post('/health/assistant/qa', {
        question,
        language,
        conversation_id: activeConversationId,
      });
      const answer = response.data;
      setActiveConversationId(answer.conversation_id);
      setMessages((current) => [
        ...current.filter((message) => !message.id.startsWith('pending-')),
        { id: `user-${answer.message_id}`, sender: 'user', text: question },
        {
          id: String(answer.message_id),
          sender: 'assistant',
          text: answer.answer,
          cited: answer.cited_records,
          provider_used: answer.provider_used,
          is_rule_based: answer.is_rule_based,
        },
      ]);
      await loadConversations();
    } catch (error) {
      console.error('Assistant request failed.', error);
      setMessages((current) => current.filter((message) => !message.id.startsWith('pending-')));
      setInput(question);
      setErrorMessage('Your question could not be sent. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    void sendQuestion();
  };

  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <section className="mx-auto flex h-[calc(100vh-148px)] min-h-[570px] max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <aside className={`${showMobileHistory ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 md:flex md:w-72`}>
        <div className="border-b border-slate-200 p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm shadow-teal-900/15">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Health assistant</h2>
              <p className="text-xs text-slate-500">Your private chat history</p>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileHistory(false)}
              aria-label="Close chat history"
              className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-white md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={startNewConversation}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> New conversation
          </button>
          <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-400 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a conversation"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Recent chats</p>
          {loadingHistory ? (
            <div className="flex items-center gap-2 px-2 py-4 text-xs text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your history…
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-2 py-4 text-xs leading-5 text-slate-500">
              {search ? 'No chats match that search.' : 'Your conversations will appear here.'}
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredConversations.map((conversation) => (
                <li key={conversation.id} className="group">
                  <div className={`flex items-center gap-1 rounded-xl transition ${
                    activeConversationId === conversation.id ? 'bg-teal-50 text-teal-900' : 'text-slate-600 hover:bg-white'
                  }`}>
                    <button
                      type="button"
                      onClick={() => void openConversation(conversation.id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
                      title={conversation.title}
                    >
                      <MessageCircle className={`h-4 w-4 shrink-0 ${
                        activeConversationId === conversation.id ? 'text-teal-600' : 'text-slate-400'
                      }`} />
                      <span className="truncate text-xs font-medium">{conversation.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteConversation(conversation)}
                      aria-label={`Delete ${conversation.title}`}
                      className="mr-1 rounded-lg p-2 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="m-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-3.5">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-teal-900">
            <HeartPulse className="h-4 w-4 text-teal-600" /> A note about your health
          </div>
          <p className="text-[11px] leading-4 text-teal-900/75">
            Answers help explain your records. They do not replace a clinician’s advice.
          </p>
        </div>
      </aside>

      <div className={`${showMobileHistory ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col bg-white md:flex`}>
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileHistory(true)}
              aria-label="Open chat history"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-900">
                {activeConversationId
                  ? conversations.find((item) => item.id === activeConversationId)?.title || 'Health conversation'
                  : `Hello, ${user?.full_name?.split(' ')[0] || 'there'}`}
              </h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Personalized explanations, grounded in your records</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Private health chat
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/70 to-white px-4 py-5 sm:px-8 sm:py-7">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center py-5">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-600/20">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Your health, explained</p>
              <h2 className="max-w-xl text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                What would you like to understand today?
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
                Ask about a report, a lab result, or a general health topic. I’ll keep the explanation clear and separate what your records say from general information.
              </p>

              <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
                {suggestions.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="group rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
                  >
                    <Icon className="mb-3 h-4 w-4 text-teal-600 transition group-hover:scale-110" />
                    <span className="text-xs font-semibold leading-5 text-slate-700">{label}</span>
                  </button>
                ))}
              </div>

              <Link to="/upload" className="mt-5 inline-flex w-fit items-center gap-2 text-xs font-semibold text-teal-700 hover:text-teal-800">
                <FileText className="h-4 w-4" /> Upload a report to discuss
              </Link>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    message.sender === 'assistant' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {message.sender === 'assistant' ? <Bot className="h-4 w-4" /> : <span className="text-[10px] font-bold">YOU</span>}
                  </div>
                  <div className={`min-w-0 max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[82%] ${
                    message.sender === 'user'
                      ? 'rounded-tr-md bg-teal-600 text-white shadow-sm'
                      : 'rounded-tl-md border border-slate-200/80 bg-white shadow-sm'
                  }`}>
                    {message.sender === 'assistant' && (
                      <div className="mb-2.5 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-teal-800">
                          <Sparkles className="h-3.5 w-3.5" />
                          {message.is_rule_based ? 'On-device style explanation' : `${message.provider_used || 'AI'} health assistant`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(message.id, message.text)}
                          aria-label={speakingMsgId === message.id ? 'Stop reading answer' : 'Read answer aloud'}
                          className="rounded-lg p-1 text-slate-400 transition hover:bg-teal-50 hover:text-teal-700"
                        >
                          {speakingMsgId === message.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                    {message.sender === 'assistant'
                      ? <ReadableAnswer text={message.text} />
                      : <p className="whitespace-pre-wrap text-sm leading-6 text-white">{message.text}</p>}

                    {message.cited && message.cited.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                        {message.cited.map((citation) => (
                          <span key={citation.document_id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600 ring-1 ring-slate-200">
                            <FileText className="h-3 w-3 text-teal-600" />
                            {citation.filename}{citation.date ? ` · ${citation.date}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {loading && (
                <div className="flex items-center gap-2 pl-11 text-xs text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin text-teal-600" />
                  Reviewing your question and records…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-3.5 sm:px-6">
          {errorMessage && (
            <div role="alert" className="mx-auto mb-2 flex max-w-3xl items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <span>{errorMessage}</span>
              <button type="button" onClick={() => setErrorMessage(null)} aria-label="Dismiss message">
                <span aria-hidden="true">×</span>
              </button>
            </div>
          )}
          <form onSubmit={handleSend} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition focus-within:border-teal-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-50">
              <button
                type="button"
                onClick={handleToggleListening}
                title={isListening ? 'Stop voice input' : 'Ask with your voice'}
                aria-label={isListening ? 'Stop voice input' : 'Ask with your voice'}
                className={`mb-0.5 rounded-xl p-2.5 transition ${
                  isListening ? 'animate-pulse bg-rose-100 text-rose-700' : 'text-slate-400 hover:bg-white hover:text-teal-700'
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendQuestion();
                  }
                }}
                placeholder={isListening ? 'Listening…' : 'Ask about a report, result, or health topic…'}
                aria-label="Your health question"
                className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-1 py-3 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send question"
                className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Educational information only · For urgent symptoms, seek medical care
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};
