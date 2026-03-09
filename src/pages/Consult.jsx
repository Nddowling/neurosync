import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, History, X, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import MessageBubble from "../components/chat/MessageBubble";
import ChatInput from "../components/chat/ChatInput";
import PromptSuggestions from "../components/chat/PromptSuggestions";
import AgentStatusBar from "../components/chat/AgentStatusBar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Consult() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [agentStatus, setAgentStatus] = useState(null); // null | 'received' | 'thinking' | 'typing'
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [typewriterIdx, setTypewriterIdx] = useState(null); // index of msg being typewritten
  const [typewriterText, setTypewriterText] = useState("");
  const messagesEndRef = useRef(null);
  const prevMessagesRef = useRef([]);

  // Load conversations list and restore last active session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("sessionId");

    loadConversations().then((convs) => {
      if (sessionId) {
        const match = convs?.find(c => c.metadata?.session_id === sessionId);
        if (match) { loadConversation(match.id); return; }
      }
      // Restore last active conversation from localStorage
      const savedId = localStorage.getItem("neurosync_active_conv");
      if (savedId) {
        const match = convs?.find(c => c.id === savedId);
        if (match) loadConversation(match.id);
      }
    });
  }, []);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!activeConversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeConversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [activeConversation?.id]);

  // Detect new assistant messages and drive typewriter + status
  useEffect(() => {
    const prev = prevMessagesRef.current;
    const curr = messages;

    if (curr.length > prev.length) {
      const newest = curr[curr.length - 1];
      if (newest.role === "assistant" && newest.content) {
        const idx = curr.length - 1;
        prevMessagesRef.current = curr;
        
        // Start typewriter animation
        setAgentStatus("typing");
        setTypewriterIdx(idx);
        setTypewriterText("");
        setDisplayedMessages(curr.slice(0, idx));

        let i = 0;
        const full = newest.content;
        const speed = Math.max(4, Math.min(12, Math.round(8000 / full.length)));
        const interval = setInterval(() => {
          i++;
          setTypewriterText(full.slice(0, i));
          if (i >= full.length) {
            clearInterval(interval);
            setDisplayedMessages(curr);
            setTypewriterIdx(null);
            setTypewriterText("");
            setAgentStatus(null);
          }
        }, speed);
        return () => clearInterval(interval);
      }
    }

    prevMessagesRef.current = curr;
    setDisplayedMessages(curr);
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, typewriterText]);

  const loadConversations = async () => {
    setIsLoading(true);
    const convs = await base44.agents.listConversations({ agent_name: "clinicalAssistant" });
    setConversations(convs || []);
    setIsLoading(false);
    return convs;
  };

  const loadConversation = async (id) => {
    setIsLoading(true);
    const conv = await base44.agents.getConversation(id);
    setActiveConversation(conv);
    setMessages(conv.messages || []);
    localStorage.setItem("neurosync_active_conv", id);
    setIsLoading(false);
    setShowHistory(false);
  };

  const startNewConversation = async () => {
    setIsLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: "clinicalAssistant",
      metadata: {
        name: `Consult — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
      },
    });
    setActiveConversation(conv);
    setMessages([]);
    localStorage.setItem("neurosync_active_conv", conv.id);
    setIsLoading(false);
    setShowHistory(false);
    loadConversations();
  };

  const sendMessage = async (content) => {
    setAgentStatus("received");
    setTimeout(() => setAgentStatus("thinking"), 800);

    if (!activeConversation) {
      const conv = await base44.agents.createConversation({
        agent_name: "clinicalAssistant",
        metadata: {
          name: content.substring(0, 60) + (content.length > 60 ? "..." : ""),
        },
      });
      setActiveConversation(conv);
      setMessages([]);
      localStorage.setItem("neurosync_active_conv", conv.id);
      setIsSending(true);
      await base44.agents.addMessage(conv, { role: "user", content });
      setIsSending(false);
      loadConversations();
      return;
    }

    setIsSending(true);
    await base44.agents.addMessage(activeConversation, { role: "user", content });
    setIsSending(false);
  };

  const handleSuggestionSelect = (prompt) => {
    sendMessage(prompt);
  };

  const hasMessages = messages.length > 0 || displayedMessages.length > 0;

  return (
    <div className="flex h-full">
      {/* History Sidebar (mobile: overlay, desktop: side panel) */}
      {showHistory && (
        <>
          <div className="fixed inset-0 bg-black/10 z-30 lg:hidden" onClick={() => setShowHistory(false)} />
          <div className="fixed lg:static inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-100 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">History</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto py-2 px-2 space-y-1">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                    activeConversation?.id === conv.id
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <p className="font-medium truncate">{conv.metadata?.name || "Untitled"}</p>
                  <p className={`text-xs mt-0.5 ${activeConversation?.id === conv.id ? "text-gray-400" : "text-gray-400"}`}>
                    {new Date(conv.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </button>
              ))}
              {conversations.length === 0 && !isLoading && (
                <p className="text-xs text-gray-400 text-center py-8">No conversations yet</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(!showHistory)}>
              <History className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {activeConversation?.metadata?.name || "New Consultation"}
              </h2>
              <p className="text-[11px] text-gray-400">AI-powered clinical decision support</p>
            </div>
          </div>
          <Button
            onClick={startNewConversation}
            size="sm"
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-8 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Session
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : !hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-6 shadow-xl shadow-teal-500/20">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Clinical Assistant</h2>
              <p className="text-sm text-gray-400 mb-8 text-center max-w-md px-4">
                Describe a clinical scenario for differential diagnoses, treatment recommendations, medication guidance, or SOAP note generation.
              </p>
              <PromptSuggestions onSelect={handleSuggestionSelect} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {displayedMessages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} onSendMessage={sendMessage} />
              ))}
              {typewriterIdx !== null && (
                <MessageBubble
                  key="typewriter"
                  message={{ role: "assistant", content: typewriterText + "▍" }}
                />
              )}
              <AgentStatusBar status={typewriterIdx !== null ? null : agentStatus} />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={sendMessage} isLoading={isSending} />
      </div>
    </div>
  );
}