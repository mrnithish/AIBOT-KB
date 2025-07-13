"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ChevronLeft, ChevronRight, FileText, X, Tag, ExternalLink } from "lucide-react"

interface ReasonChunk {
  text: string
  full_text?: string
  score: number
  source?: string
  source_document?: string
  page_range?: string
  page?: string | number
  chunk_index?: number
  upload_date?: string
  created_at?: string
  summary?: string
  tags?: string[]
  token_count?: number
  document?: string
  document_name?: string
  file_name?: string
}

interface ReasoningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reasonChunks: ReasonChunk[]
  currentIndex: number
  onIndexChange: (index: number) => void
}

export function ReasoningDialog({
  open,
  onOpenChange,
  reasonChunks,
  currentIndex,
  onIndexChange,
}: ReasoningDialogProps) {
  const currentChunk = reasonChunks[currentIndex]

  const nextSource = () => {
    onIndexChange((currentIndex + 1) % reasonChunks.length)
  }

  const prevSource = () => {
    onIndexChange((currentIndex - 1 + reasonChunks.length) % reasonChunks.length)
  }

  const copySourceInfo = () => {
    if (!currentChunk) return
    const sourceInfo = `Source: ${getSourceName(currentChunk)}\nPage: ${getPageRange(currentChunk)}\nRelevance: ${(currentChunk.score * 100).toFixed(1)}%\n\nContent:\n${currentChunk.full_text || currentChunk.text || ""}`
    navigator.clipboard.writeText(sourceInfo)
  }

  const getRelevanceColor = (score: number) => {
    if (score > 0.8) return "green"
    if (score > 0.6) return "blue"
    return "orange"
  }

  const getRelevanceLabel = (score: number) => {
    if (score > 0.8) return "High Relevance"
    if (score > 0.6) return "Medium Relevance"
    return "Low Relevance"
  }

  const getSourceName = (chunk: ReasonChunk) => {
    return (
      chunk.source ||
      chunk.source_document ||
      chunk.document ||
      chunk.document_name ||
      chunk.file_name ||
      "Unknown Document"
    )
  }

  const getPageRange = (chunk: ReasonChunk) => {
    if (chunk.page_range) return chunk.page_range
    if (chunk.page) return `Page ${chunk.page}`
    return "N/A"
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return null
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    } catch (error) {
      return null
    }
  }

  if (!currentChunk) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden p-0 border rounded-2xl">
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b px-6 py-4">
          <DialogHeader className="flex justify-between items-center">
            <div className="flex gap-3 items-start sm:items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Source {currentIndex + 1}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge className={`text-xs ${getRelevanceColor(currentChunk.score) === "green"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : getRelevanceColor(currentChunk.score) === "blue"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"}`}>
                    {(currentChunk.score * 100).toFixed(1)}% Match
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getRelevanceLabel(currentChunk.score)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {reasonChunks.length > 1 && (
                <>
                  <Button onClick={prevSource} size="sm" variant="outline" className="rounded-full h-8 w-8 p-0">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button onClick={nextSource} size="sm" variant="outline" className="rounded-full h-8 w-8 p-0">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button onClick={() => onOpenChange(false)} size="icon" variant="ghost" className="rounded-full border">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            <Card className="border p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="truncate">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Document</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {getSourceName(currentChunk)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Page</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {getPageRange(currentChunk)}
                  </p>
                </div>
              </div>
              {(currentChunk.upload_date || currentChunk.created_at) && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Date</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatDate(currentChunk.upload_date || currentChunk.created_at)}
                  </p>
                </div>
              )}
              {currentChunk.summary && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Summary</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentChunk.summary}
                  </p>
                </div>
              )}
              {Array.isArray(currentChunk.tags) && currentChunk.tags.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase">Tags</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {currentChunk.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs whitespace-nowrap">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="border p-5">
              <div className="mb-4 flex justify-between items-center">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Document Content</h4>
                <div className="text-sm text-muted-foreground">
                  <span>{(currentChunk.full_text || currentChunk.text).length} chars</span>
                  <span className="mx-2">•</span>
                  <span>{(currentChunk.full_text || currentChunk.text).split(" ").length} words</span>
                </div>
              </div>
              <ScrollArea className="h-80 rounded-md border p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed text-slate-800 dark:text-slate-300">
                  {currentChunk.full_text || currentChunk.text}
                </pre>
              </ScrollArea>
            </Card>
          </div>
        </ScrollArea>

        <div className="sticky bottom-0 z-10 border-t bg-white dark:bg-slate-900 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copySourceInfo}>Copy Source</Button>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
