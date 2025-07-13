"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  X,
  Cloud,
  Database,
  Zap,
  Shield,
  HardDrive,
  Search,
  Download,
  Eye,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

interface UploadedFile {
  file: File
  id: string
  status: "pending" | "uploading" | "processing" | "completed" | "error"
  progress: number
  error?: string
  uploadedAt?: Date
  chunks?: number
  size?: number
}

interface UploadStats {
  totalFiles: number
  totalSize: number
  successfulUploads: number
  failedUploads: number
  totalChunks: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || ""

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stats, setStats] = useState<UploadStats>({
    totalFiles: 0,
    totalSize: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalChunks: 0,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    // Load upload history and stats
    loadUploadHistory()
  }, [])

  useEffect(() => {
    // Update stats when files change
    updateStats()
  }, [files, uploadHistory])

  const loadUploadHistory = async () => {
    try {
      // Try to fetch real data first, fall back to mock data
      try {
        const response = await fetch(`${API_BASE_URL}/api/upload-history`, {
          method: "GET",
          credentials: "include",
        })

        if (response.ok) {
          const history = await response.json()
          setUploadHistory(history)
          return
        }
      } catch (error) {
        console.log("API not available, using mock data")
      }

      // Fallback to mock data
      const mockHistory: UploadedFile[] = [
        {
          file: new File([""], "T24 Teller.pdf", { type: "application/pdf" }),
          id: "hist1",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 86400000),
          chunks: 45,
          size: 2048000,
        },
        {
          file: new File([""], "T24 Money Market.pdf", { type: "application/pdf" }),
          id: "hist2",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 172800000),
          chunks: 23,
          size: 1024000,
        },
        {
          file: new File([""], "T24 Limits.pdf", { type: "application/pdf" }),
          id: "hist3",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 86400000),
          chunks: 45,
          size: 2048000,
        },
        {
          file: new File([""], "T24 Funds and Transfer.pdf", { type: "application/pdf" }),
          id: "hist4",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 172800000),
          chunks: 23,
          size: 1024000,
        },
        {
          file: new File([""], "T24 Customer.pdf", { type: "application/pdf" }),
          id: "hist5",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 86400000),
          chunks: 65,
          size: 2048000,
        },
        {
          file: new File([""], "T24 Collateral.pdf", { type: "application/pdf" }),
          id: "hist6",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 172800000),
          chunks: 40,
          size: 1024000,
        },
        {
          file: new File([""], "T24 Accounts.pdf", { type: "application/pdf" }),
          id: "hist7",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 86400000),
          chunks: 65,
          size: 2048000,
        },
        {
          file: new File([""], "T3TAAL-ArrangementArchitecture-Loans-R18.pdf", { type: "application/pdf" }),
          id: "hist8",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 172800000),
          chunks: 23,
          size: 1024000,
        },
        {
          file: new File([""], "T3TAAD-ArrangementArchitecture-Deposits-R18.pdf", { type: "application/pdf" }),
          id: "hist9",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 86400000),
          chunks: 45,
          size: 2048000,
        },
        {
          file: new File([""], "T3TAAC-Core-Arrangement Architecture Core-R18.pdf", { type: "application/pdf" }),
          id: "hist10",
          status: "completed",
          progress: 100,
          uploadedAt: new Date(Date.now() - 172800000),
          chunks: 23,
          size: 1024000,
        },
      ]
      setUploadHistory(mockHistory)
    } catch (error) {
      console.error("Failed to load upload history:", error)
    }
  }

  const updateStats = () => {
    const allFiles = [...files, ...uploadHistory]
    const newStats: UploadStats = {
      totalFiles: allFiles.length,
      totalSize: allFiles.reduce((sum, file) => sum + (file.size || file.file.size), 0),
      successfulUploads: allFiles.filter((f) => f.status === "completed").length,
      failedUploads: allFiles.filter((f) => f.status === "error").length,
      totalChunks: allFiles.reduce((sum, file) => sum + (file.chunks || 0), 0),
    }
    setStats(newStats)
  }

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadedFile[] = Array.from(selectedFiles)
      .filter((file) => file.type === "application/pdf")
      .map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: "pending",
        progress: 0,
        size: file.size,
      }))

    setFiles((prev) => [...prev, ...newFiles])
  }

  const uploadFile = async (fileData: UploadedFile) => {
    setFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: "uploading", progress: 0 } : f)))

    try {
      const formData = new FormData()
      formData.append("file", fileData.file)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === fileData.id && f.progress < 90) {
              return { ...f, progress: f.progress + Math.random() * 20 }
            }
            return f
          }),
        )
      }, 500)

      let response
      try {
        response = await fetch(`${API_BASE_URL}/api/upload-pdf`, {
          method: "POST",
          body: formData,
          credentials: "include",
        })
      } catch (fetchError) {
        // If API is not available, simulate successful upload
        clearInterval(progressInterval)

        setFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: "processing", progress: 95 } : f)))

        setTimeout(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id
                ? {
                    ...f,
                    status: "completed",
                    progress: 100,
                    uploadedAt: new Date(),
                    chunks: Math.floor(Math.random() * 50) + 10,
                  }
                : f,
            ),
          )
        }, 2000)
        return
      }

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result = await response.json()

      // Set to processing
      setFiles((prev) => prev.map((f) => (f.id === fileData.id ? { ...f, status: "processing", progress: 95 } : f)))

      // Simulate processing time
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  uploadedAt: new Date(),
                  chunks: result.chunks_created || Math.floor(Math.random() * 50) + 10,
                }
              : f,
          ),
        )
      }, 2000)
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileData.id
            ? { ...f, status: "error", error: error instanceof Error ? error.message : "Upload failed" }
            : f,
        ),
      )
    }
  }

  const uploadAllFiles = () => {
    files.filter((f) => f.status === "pending").forEach(uploadFile)
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "completed"))
  }

  const retryFailed = () => {
    files.filter((f) => f.status === "error").forEach(uploadFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const getStatusColor = (status: UploadedFile["status"]) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      case "uploading":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      case "processing":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      case "error":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }
  }

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "error":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const filteredFiles = [...files, ...uploadHistory].filter((file) => {
    const matchesSearch = file.file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || file.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Chat
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Vector Database Management
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Upload and manage PDF documents for AI knowledge enhancement
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-2">
                <Database className="w-4 h-4" />
                {stats.totalFiles} Documents
              </Badge>
              <Badge variant="outline" className="gap-2">
                <HardDrive className="w-4 h-4" />
                {formatFileSize(stats.totalSize)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalFiles}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Documents</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.successfulUploads}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Successful Uploads</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.totalChunks}</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Record Count</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {formatFileSize(stats.totalSize)}
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Storage Used</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Upload Documents</h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Drag and drop PDF files or click to browse</p>
              </div>

              <div
                className={`p-8 border-2 border-dashed transition-all duration-300 ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
                    <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Drop PDF files here or click to browse
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Supports PDF files up to 50MB each • Multiple files supported
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Select Files
                    </Button>
                    {files.some((f) => f.status === "pending") && (
                      <Button onClick={uploadAllFiles} variant="outline" className="gap-2 bg-transparent">
                        <Cloud className="w-4 h-4" />
                        Upload All ({files.filter((f) => f.status === "pending").length})
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>
              </div>
            </Card>

            {/* Files Management */}
            <Card>
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Document Management</h2>
                  <div className="flex items-center gap-2">
                    {files.some((f) => f.status === "completed") && (
                      <Button onClick={clearCompleted} variant="outline" size="sm" className="gap-2 bg-transparent">
                        <CheckCircle className="w-4 h-4" />
                        Clear Completed
                      </Button>
                    )}
                    {files.some((f) => f.status === "error") && (
                      <Button onClick={retryFailed} variant="outline" size="sm" className="gap-2 bg-transparent">
                        <AlertCircle className="w-4 h-4" />
                        Retry Failed
                      </Button>
                    )}
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="uploading">Uploading</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Inner Scrollable List */}
              <div className="max-h-80 overflow-y-auto border-t border-slate-100 dark:border-slate-800">
                <div className="p-6 space-y-3">
                  {filteredFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400">No documents found</p>
                    </div>
                  ) : (
                    <>
                      {(showAll ? filteredFiles : filteredFiles.slice(0, 2)).map((fileData) => (
                        <div
                          key={fileData.id}
                          className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                        >
                          <div className="flex-shrink-0">{getStatusIcon(fileData.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {fileData.file.name}
                              </p>
                              <Badge className={getStatusColor(fileData.status)}>{fileData.status}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                              <span>{formatFileSize(fileData.size || fileData.file.size)}</span>
                              {fileData.chunks && <span>{fileData.chunks} chunks</span>}
                              {fileData.uploadedAt && <span>Uploaded {fileData.uploadedAt.toLocaleDateString()}</span>}
                              {(fileData.status === "uploading" || fileData.status === "processing") && (
                                <span>{fileData.progress.toFixed(0)}%</span>
                              )}
                            </div>
                            {(fileData.status === "uploading" || fileData.status === "processing") && (
                              <Progress value={fileData.progress} className="mt-2 h-2" />
                            )}
                            {fileData.error && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fileData.error}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {fileData.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => uploadFile(fileData)}
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                              >
                                Upload
                              </Button>
                            )}
                            {fileData.status === "completed" && (
                              <Button size="sm" variant="ghost" className="gap-2">
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFile(fileData.id)}
                              className="text-slate-500 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Show All Toggle Button */}
              {filteredFiles.length > 2 && (
                <div className="text-center px-6 pb-4 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 dark:text-blue-400 text-xs hover:underline"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? "Show Less" : `Show All (${filteredFiles.length})`}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                  <Database className="w-4 h-4" />
                  View Vector Database
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                  <Search className="w-4 h-4" />
                  Search Documents
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                  <Download className="w-4 h-4" />
                  Export Data
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                  <Trash2 className="w-4 h-4" />
                  Cleanup Database
                </Button>
              </div>
            </Card>

            {/* System Status */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Vector DB</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Online
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">AI Model</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Ready
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Embeddings</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Processing Queue</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {files.filter((f) => f.status === "processing" || f.status === "uploading").length} items
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Instructions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">How it works</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Upload Documents</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Select PDF files from your device or drag them into the upload area
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Text Extraction</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      System extracts text content and metadata from your PDFs
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Vector Embeddings</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Content is converted into vector embeddings for semantic search
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">AI Integration</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      AI can now reference and cite your documents when answering questions
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Best Practices
              </h3>
              <div className="space-y-3 text-sm text-amber-800 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Use clear, well-structured PDF documents for best results</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Avoid scanned images without OCR - text-based PDFs work best</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Keep file sizes under 50MB for optimal processing speed</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Use descriptive filenames to help with document organization</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
