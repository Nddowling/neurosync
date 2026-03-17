import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, Upload, BookOpen, FileText, Loader2, Search, Tag, CheckCircle2, AlertCircle, X } from "lucide-react";

const CATEGORY_COLORS = {
  cpt_codes: "bg-violet-100 text-violet-700 border-violet-200",
  clinical_reference: "bg-teal-100 text-teal-700 border-teal-200",
  protocol: "bg-blue-100 text-blue-700 border-blue-200",
  medication: "bg-orange-100 text-orange-700 border-orange-200",
  billing: "bg-amber-100 text-amber-700 border-amber-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

const CATEGORY_LABELS = {
  cpt_codes: "CPT Codes",
  clinical_reference: "Clinical Reference",
  protocol: "Protocol",
  medication: "Medication",
  billing: "Billing",
  other: "Other",
};

export default function KnowledgeBase() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "other", tags: "", source: "" });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["knowledge_base"],
    queryFn: () => base44.entities.KnowledgeBase.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeBase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge_base"] });
      setShowAddDialog(false);
      setForm({ title: "", content: "", category: "other", tags: "", source: "" });
      toast.success("Entry added to Knowledge Base");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgeBase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge_base"] });
      toast.success("Entry deleted");
    },
  });

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Document title or best-guess title" },
            content: { type: "string", description: "Full extracted text content" },
            summary: { type: "string", description: "Brief 1-2 sentence summary" },
            category: { type: "string", description: "One of: cpt_codes, clinical_reference, protocol, medication, billing, other" },
            tags: { type: "string", description: "Comma-separated relevant tags" },
          },
        },
      });
      if (extracted.status === "success" && extracted.output) {
        const data = extracted.output;
        await base44.entities.KnowledgeBase.create({
          title: data.title || file.name.replace(/\.pdf$/i, ""),
          content: data.content || data.summary || "Extracted from PDF",
          category: data.category || "other",
          tags: data.tags || "",
          source: file.name,
          file_url,
        });
        queryClient.invalidateQueries({ queryKey: ["knowledge_base"] });
        toast.success(`"${data.title || file.name}" added to Knowledge Base`);
      } else {
        toast.error("Could not extract content from PDF");
      }
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const filtered = entries.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title?.toLowerCase().includes(q) ||
      e.content?.toLowerCase().includes(q) ||
      e.tags?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-0.5">Clinical references, CPT codes, and protocols available to the AI assistant during consultations.</p>
        </div>
        <div className="flex gap-2">
          <label>
            <Button
              variant="outline"
              className="gap-1.5 cursor-pointer"
              asChild
              disabled={isUploading}
            >
              <span>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? "Uploading..." : "Upload PDF"}
              </span>
            </Button>
            <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
          </label>
          <Button onClick={() => setShowAddDialog(true)} className="bg-gray-900 hover:bg-gray-800 text-white gap-1.5">
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by title, content, or tags..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = entries.filter(e => e.category === key).length;
          if (count === 0) return null;
          return (
            <div key={key} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <BookOpen className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-600">
            {searchQuery ? "No matching entries" : "Knowledge Base is empty"}
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {searchQuery ? "Try a different search term." : "Add clinical references, CPT codes, or upload PDFs to enrich your AI consultations."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <div key={entry.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">{entry.title}</h3>
                    <Badge className={`text-[10px] border ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other}`}>
                      {CATEGORY_LABELS[entry.category] || entry.category}
                    </Badge>
                    {entry.file_url && (
                      <Badge className="text-[10px] bg-gray-100 text-gray-500 border-gray-200 gap-1">
                        <FileText className="h-2.5 w-2.5" /> PDF
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-3 leading-relaxed">{entry.content}</p>
                  <div className="flex items-center gap-3 mt-2.5">
                    {entry.tags && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Tag className="h-3 w-3" />
                        {entry.tags}
                      </div>
                    )}
                    {entry.source && (
                      <span className="text-[11px] text-gray-400">Source: {entry.source}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  onClick={() => deleteMutation.mutate(entry.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Knowledge Base Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Title *</Label>
              <Input
                placeholder="e.g. CPT Code 99214 — Moderate Complexity E&M"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Content *</Label>
              <Textarea
                placeholder="Enter the full text content for this entry..."
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                className="min-h-[140px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Tags</Label>
                <Input
                  placeholder="billing, psychiatry, E&M"
                  value={form.tags}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1.5 block">Source</Label>
                <Input
                  placeholder="APA Guidelines 2023"
                  value={form.source}
                  onChange={e => setForm({ ...form, source: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.title || !form.content || createMutation.isPending}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Add Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}