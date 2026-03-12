import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, History, X, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import MessageBubble from "../components/chat/MessageBubble";
import ChatInput from "../components/chat/ChatInput";
import PromptSuggestions from "../components/chat/PromptSuggestions";
import AgentStatusBar from "../components/chat/AgentStatusBar";
import CPTCodeSelector from "../components/soap/CPTCodeSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function Consult() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [agentStatus, setAgentStatus] = useState(null); // null | 'received' | 'thinking' | 'typing'
  const [isGeneratingSoap, setIsGeneratingSoap] = useState(false);
  const [soapBubble, setSoapBubble] = useState(null); // injected SOAP message bubble
  const [showCptSelector, setShowCptSelector] = useState(false);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [typewriterIdx, setTypewriterIdx] = useState(null); // index of msg being typewritten
  const [typewriterText, setTypewriterText] = useState("");
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const userScrolledUp = useRef(false);
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

  // Detect manual scroll up
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = distanceFromBottom > 80;
  };

  // Auto-scroll only if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayedMessages, typewriterText]);

  // When a new message is sent, force scroll to bottom and reset flag
  const scrollToBottom = () => {
    userScrolledUp.current = false;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
    setSoapBubble(null);
    scrollToBottom();
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

  // Opens the CPT selector dialog first
  const handleGenerateSoap = () => {
    if (!messages.length) return;
    setShowCptSelector(true);
  };

  // Called after CPT codes are selected
  const handleGenerateSoapWithCodes = async (selectedCodes) => {
    setIsGeneratingSoap(true);
    setSoapBubble(null);
    try {
      const transcript = messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => `${m.role === "user" ? "Clinician" : "Assistant"}: ${m.content}`)
        .join("\n\n");

      const hasCodes = selectedCodes.length > 0;
      const codeList = selectedCodes.map(c => `${c.code} (${c.label})`).join(", ");

      // Detect note type from selected codes
      const codes = selectedCodes.map(c => c.code);
      const hasEM = codes.some(c => ["99211","99212","99213","99214","99215"].includes(c));
      const hasAddOn = codes.some(c => ["90833","90836","90838"].includes(c));
      const hasStandaloneTherapy = codes.some(c => ["90832","90834","90837","90839","90847"].includes(c));
      const hasCrisis = codes.includes("90839");

      let billingContext = "";
      let planStructure = "";
      let subjectiveGuidance = "";
      let objectiveGuidance = "";

      if (!hasCodes) {
        billingContext = "Infer the session type from the transcript and format the SOAP note appropriately.";
        planStructure = "1. Medications, 2. Therapy, 3. Labs, 4. Patient Education, 5. Coordination of Care, 6. Follow-Up";
        subjectiveGuidance = "CC in patient's words, HPI, symptoms, functional impact, psychosocial stressors, medication adherence, substance use.";
        objectiveGuidance = "Full MSE as a Markdown table (Domain | Findings) covering: Appearance, Behavior, Speech, Mood, Affect, Thought Process, Thought Content (SI/HI), Perceptual, Cognition, Insight, Judgment. End with bulleted current medications.";
      } else if (hasEM && hasAddOn) {
        billingContext = `BILLING CODES: ${codeList}. This is a COMBINED E&M + Psychotherapy visit. Documentation MUST satisfy BOTH the E&M complexity requirements AND the psychotherapy time threshold. The note must clearly delineate the E&M portion from the psychotherapy portion.`;
        planStructure = "1. Medications (with dosing rationale and monitoring), 2. Psychotherapy (modality, goals, time spent, patient response), 3. Labs/Monitoring, 4. Patient Education, 5. Coordination of Care, 6. Follow-Up timeline";
        subjectiveGuidance = "CC, HPI with duration and severity, medication adherence, side effects, psychotherapy engagement and progress, psychosocial stressors, substance use, functional impact.";
        objectiveGuidance = "Full MSE table AND separate Time Documentation box (e.g. 'Total face-to-face time: 40 min. E&M time: ~10 min. Psychotherapy time: 30 min.'). Include current medications.";
      } else if (hasEM && !hasAddOn) {
        billingContext = `BILLING CODES: ${codeList}. This is a MEDICATION MANAGEMENT / E&M visit. Documentation must support the level of medical decision-making complexity. Focus on medication review, side effects, adherence, and clinical response.`;
        planStructure = "1. Medication Changes (specific drug, dose, rationale), 2. Monitoring Requirements (labs, ECG, metabolic), 3. Patient Education (medication education), 4. Coordination of Care, 5. Follow-Up";
        subjectiveGuidance = "CC focused on medication response and symptom trajectory, HPI, current medications and adherence, side effects, functional status, and pertinent review of systems.";
        objectiveGuidance = "Focused MSE table relevant to medication monitoring. Include vital signs if relevant. Current medication list with doses.";
      } else if (hasStandaloneTherapy && !hasEM) {
        billingContext = `BILLING CODES: ${codeList}. This is a STANDALONE PSYCHOTHERAPY visit. No E&M component — do NOT include medication management as a primary plan element. Documentation should support psychotherapy time and medical necessity.`;
        planStructure = "1. Psychotherapy (modality, session goals, techniques used, patient response, homework), 2. Progress Toward Treatment Goals, 3. Risk Assessment and Safety Planning, 4. Coordination of Care (if applicable), 5. Next Session Plan";
        subjectiveGuidance = "CC in patient's own words, presenting concerns, mood/affect report, progress since last session, psychotherapy goals, relevant psychosocial context.";
        objectiveGuidance = "Focused MSE with emphasis on affect, thought content, insight, and therapeutic alliance. Note session modality and approximate time.";
      } else if (hasCrisis) {
        billingContext = `BILLING CODES: ${codeList}. This is a CRISIS PSYCHOTHERAPY encounter. Documentation must establish the psychiatric crisis nature, safety assessment, and acute stabilization interventions.`;
        planStructure = "1. Crisis Stabilization Interventions, 2. Safety Plan (detailed), 3. Disposition (outpatient, higher level of care, ED referral), 4. Medications (if applicable), 5. Coordination with supports/emergency contacts, 6. Follow-Up (urgent)";
        subjectiveGuidance = "Nature of crisis, precipitating events, current suicidal/homicidal ideation with specifics, coping attempts, support system, prior crisis history.";
        objectiveGuidance = "Full MSE with emphasis on safety indicators. Note patient's presentation at arrival vs. end of session. Include any collateral obtained.";
      } else {
        billingContext = `BILLING CODES: ${codeList}. Format the SOAP note to support the documentation requirements for these codes.`;
        planStructure = "1. Medications, 2. Therapy, 3. Labs, 4. Patient Education, 5. Coordination of Care, 6. Follow-Up";
        subjectiveGuidance = "CC in patient's words, HPI, symptoms, functional impact, psychosocial stressors, medication adherence, substance use.";
        objectiveGuidance = "Full MSE as a Markdown table (Domain | Findings). Include current medications.";
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a board-certified psychiatrist generating a clinical SOAP note for billing and documentation compliance.

${billingContext}

TRANSCRIPT:
${transcript}

Generate structured Markdown for each field. The note structure and depth MUST align with the billing code documentation requirements above.

**subjective:** ${subjectiveGuidance}

**objective:** ${objectiveGuidance}

**assessment:** Clinical formulation paragraph then ICD-10 table (ICD-10 | Diagnosis) including Z-codes. End with severity statement.

**risk_assessment:** Markdown table (Domain | Finding): Suicidal Ideation, Plan, Intent, Means/Access, Homicidal Ideation, Self-Harm History, Protective Factors, Risk Level. One sentence on safety plan.

**plan:** Numbered sections: ${planStructure}. Include specific dosing rationale and follow-up timeline.

**icd_codes:** Comma-separated ICD-10 codes only.

**cpt_codes:** Comma-separated CPT codes that were applied: ${hasCodes ? codeList : "auto-detected from session type"}`,
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            subjective: { type: "string" },
            objective: { type: "string" },
            assessment: { type: "string" },
            risk_assessment: { type: "string" },
            plan: { type: "string" },
            icd_codes: { type: "string" },
            cpt_codes: { type: "string" },
          }
        }
      });

      const cptHeader = result.cpt_codes ? `**CPT Codes:** ${result.cpt_codes}\n\n` : "";
      const soapContent = `${cptHeader}## SUBJECTIVE\n${result.subjective}\n\n## OBJECTIVE\n${result.objective}\n\n## ASSESSMENT\n${result.assessment}\n\n## RISK ASSESSMENT\n${result.risk_assessment}\n\n## PLAN\n${result.plan}\n\n---\n**ICD-10 Codes:** ${result.icd_codes}`;

      setSoapBubble({ role: "assistant", content: soapContent });

      await base44.entities.ClinicalNote.create({
        note_type: "soap",
        subjective: result.subjective,
        objective: result.objective,
        assessment: result.assessment,
        risk_assessment: result.risk_assessment,
        plan: result.plan,
        icd_codes: result.icd_codes,
        cpt_code: result.cpt_codes,
        status: "draft",
        session_id: activeConversation?.id,
      });

      toast.success("SOAP note generated and saved");
    } catch (e) {
      toast.error("Failed to generate SOAP note");
    } finally {
      setIsGeneratingSoap(false);
    }
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
        <div className="flex-1 overflow-auto" ref={scrollContainerRef} onScroll={handleScroll}>
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
              {displayedMessages.map((msg, idx) => {
                const isLastAssistant =
                  !soapBubble &&
                  typewriterIdx === null &&
                  msg.role === "assistant" &&
                  idx === displayedMessages.length - 1;
                return (
                  <MessageBubble
                    key={idx}
                    message={msg}
                    isLastAssistant={isLastAssistant}
                    onGenerateSoap={isLastAssistant ? handleGenerateSoap : undefined}
                    isGeneratingSoap={isGeneratingSoap}
                  />
                );
              })}
              {typewriterIdx !== null && (
                <MessageBubble
                  key="typewriter"
                  message={{ role: "assistant", content: typewriterText + "▍" }}
                />
              )}
              {soapBubble && (
                <MessageBubble key="soap" message={soapBubble} />
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