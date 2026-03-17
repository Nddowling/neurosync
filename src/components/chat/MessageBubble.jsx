import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock, Zap, Stethoscope, BookOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Parse ---SOURCES--- block out of message content
function parseSources(content) {
  if (!content) return { body: content, sources: [] };
  const match = content.match(/---SOURCES---([\s\S]*?)---END SOURCES---/);
  if (!match) return { body: content, sources: [] };
  const body = content.replace(/---SOURCES---([\s\S]*?)---END SOURCES---/, "").trim();
  const sources = match[1]
    .split("\n")
    .map(l => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  return { body, sources };
}

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || "Function";
  const status = toolCall?.status || "pending";
  const results = toolCall?.results;

  const parsedResults = (() => {
    if (!results) return null;
    try {
      return typeof results === "string" ? JSON.parse(results) : results;
    } catch {
      return results;
    }
  })();

  const isError = results && (
    (typeof results === "string" && /error|failed/i.test(results)) ||
    (parsedResults?.success === false)
  );

  const statusConfig = {
    pending: { icon: Clock, color: "text-slate-400", text: "Pending" },
    running: { icon: Loader2, color: "text-teal-500", text: "Processing...", spin: true },
    in_progress: { icon: Loader2, color: "text-teal-500", text: "Processing...", spin: true },
    completed: isError
      ? { icon: AlertCircle, color: "text-red-500", text: "Failed" }
      : { icon: CheckCircle2, color: "text-teal-600", text: "Done" },
    success: { icon: CheckCircle2, color: "text-teal-600", text: "Done" },
    failed: { icon: AlertCircle, color: "text-red-500", text: "Failed" },
    error: { icon: AlertCircle, color: "text-red-500", text: "Failed" }
  }[status] || { icon: Zap, color: "text-slate-500", text: "" };

  const Icon = statusConfig.icon;
  const formattedName = name.split(".").reverse().join(" ").toLowerCase();

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
          "hover:bg-gray-50",
          expanded ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100"
        )}
      >
        <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
        <span className="text-gray-600">{formattedName}</span>
        {statusConfig.text && (
          <span className={cn("text-gray-400", isError && "text-red-500")}>• {statusConfig.text}</span>
        )}
        {!statusConfig.spin && (toolCall.arguments_string || results) && (
          <ChevronRight className={cn("h-3 w-3 text-gray-300 transition-transform ml-auto", expanded && "rotate-90")} />
        )}
      </button>
      {expanded && !statusConfig.spin && (
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-gray-100 space-y-2">
          {toolCall.arguments_string && (
            <div>
              <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Parameters</div>
              <pre className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-32">
                {(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Result</div>
              <pre className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600 whitespace-pre-wrap max-h-48 overflow-auto">
                {typeof parsedResults === "object" ? JSON.stringify(parsedResults, null, 2) : parsedResults}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Detect if a message body is itself a SOAP note
function isSoapNote(body) {
  if (!body) return false;
  const lower = body.toLowerCase();
  return (lower.includes("subjective") && lower.includes("objective") && lower.includes("assessment") && lower.includes("plan"));
}

const SourcesPanel = ({ sources }) => {
  const [open, setOpen] = useState(false);

  if (!sources?.length) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="rounded-xl border border-teal-100 bg-teal-50/60 overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100/50 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5 text-teal-500" />
          <span>{sources.length} Annotated Source{sources.length !== 1 ? "s" : ""}</span>
          <ChevronRight className={cn("h-3.5 w-3.5 ml-auto text-teal-400 transition-transform", open && "rotate-90")} />
        </button>
        {open && (
          <div className="px-3 pb-3 space-y-2 border-t border-teal-100">
            {sources.map((src, i) => {
              const urlMatch = src.match(/https?:\/\/[^\s)>\]"]+/);
              const url = urlMatch?.[0];
              const text = src.replace(urlMatch?.[0] || "", "").trim();
              const [citation, ...annotParts] = text.split(" — ");
              const citationText = citation?.trim();
              const annotation = annotParts.join(" — ");
              // Extract first author + year for cleaner search, or use google scholar
              const authorYearMatch = citationText?.match(/^([A-Za-z\s&]+)\s*(?:\((\d{4})\)|(\d{4}))/);
              const author = authorYearMatch?.[1]?.trim();
              const year = authorYearMatch?.[2] || authorYearMatch?.[3];
              const searchTerm = author && year ? `${author} ${year}` : citationText;
              const searchUrl = url || (searchTerm ? `https://scholar.google.com/scholar?q=${encodeURIComponent(searchTerm)}` : null);
              return (
                <div key={i} className="flex gap-2 pt-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{citationText}</p>
                    {annotation && <p className="text-[11px] text-teal-700 mt-0.5 leading-relaxed">{annotation.trim()}</p>}
                    {searchUrl && (
                      <a
                        href={searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-800 underline underline-offset-2 mt-0.5"
                      >
                        {url ? "Read more →" : "Search Scholar →"}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const mdComponents = {
  strong: ({ children }) => <strong className="text-gray-900 font-semibold">{children}</strong>,
  a: ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 underline underline-offset-2">{children}</a>
  ),
  p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
  h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mt-3 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 mt-2.5 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-1">{children}</h3>,
  code: ({ inline, children }) =>
    inline ? (
      <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono">{children}</code>
    ) : (
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto my-2 text-xs"><code>{children}</code></pre>
    ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-teal-400 pl-3 my-2 text-gray-600 bg-teal-50/50 rounded-r-lg py-2 pr-3">{children}</blockquote>
  ),
};

export default function MessageBubble({ message, isLastAssistant, onGenerateSoap, isGeneratingSoap }) {
  const isUser = message.role === "user";
  const { body, sources } = isUser ? { body: message.content, sources: [] } : parseSources(message.content);
  const isSoap = isSoapNote(body);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className={cn("flex gap-3 group", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mt-0.5 flex-shrink-0 shadow-sm">
          <Stethoscope className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={cn("max-w-[85%] relative", isUser && "flex flex-col items-end")}>
        {!isUser && !message.content && !message.tool_calls?.length && (
          <div className="rounded-2xl px-4 py-3 bg-white border border-gray-100 shadow-sm rounded-tl-md">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        {message.content && (message.content.replace("▍", "").length >= 1 || isUser) && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 relative",
              isUser
                ? "bg-gray-900 text-white rounded-tr-md"
                : isSoap
                  ? "bg-violet-50 border border-violet-100 shadow-sm rounded-tl-md"
                  : "bg-white border border-gray-100 shadow-sm rounded-tl-md"
            )}
          >
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
            ) : (
              <>
                {isSoap && (
                  <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-violet-200">
                    <FileText className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">SOAP Note</span>
                  </div>
                )}
                <div className="prose-clinical">
                  <ReactMarkdown className="text-sm text-gray-700 leading-relaxed" components={mdComponents}>
                    {body}
                  </ReactMarkdown>
                </div>
                {!isSoap && <SourcesPanel sources={sources} />}
              </>
            )}
            {!isUser && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-10 top-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500"
                onClick={handleCopy}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
        {message.tool_calls?.length > 0 && (
          <div className="space-y-1 mt-1">
            {message.tool_calls.map((tc, idx) => (
              <FunctionDisplay key={idx} toolCall={tc} />
            ))}
          </div>
        )}
        {/* SOAP button only on last assistant response (non-SOAP) */}
        {isLastAssistant && !isUser && !isSoap && onGenerateSoap && (
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateSoap}
            disabled={isGeneratingSoap}
            className="mt-2 text-xs text-violet-600 border-violet-200 hover:bg-violet-50"
          >
            {isGeneratingSoap ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating SOAP...</>
            ) : (
              <><FileText className="h-3.5 w-3.5 mr-1.5" />Generate SOAP Note</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}