'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxSize = 5 * 1024 * 1024, // 5MB default
  maxWidth = 800,
  maxHeight = 600,
  label = 'Upload Image',
  description = 'Choose an image file',
  className,
  aspectRatio, // 'square', 'video' (16:9), 'banner' (2:1), or custom like '4:3'
  showPreview = true
}) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)

  const validateFile = (file) => {
    setError(null)

    // Convert acceptedTypes to array if it's a string
    const typesArray = Array.isArray(acceptedTypes) ? acceptedTypes : [acceptedTypes]

    if (!typesArray.includes(file.type) && !typesArray.includes('image/*')) {
      const error = `Invalid file type. Accepted: ${typesArray.map(type => type.split('/')[1]).join(', ')}`
      setError(error)
      return false
    }

    if (file.size > maxSize) {
      const error = `File too large. Maximum size: ${(maxSize / (1024 * 1024)).toFixed(1)}MB`
      setError(error)
      return false
    }

    return true
  }

  const handleFileSelect = async (file) => {
    if (!validateFile(file)) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 100)

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)

      // Complete progress
      setTimeout(() => {
        setUploadProgress(100)
        onChange?.({
          file,
          preview: previewUrl,
          name: file.name,
          size: file.size,
          type: file.type
        })
        setUploading(false)
        clearInterval(progressInterval)
      }, 1000)

    } catch (error) {
      console.error('File processing error:', error)
      setError('Failed to process file')
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemove = () => {
    if (value?.preview) {
      URL.revokeObjectURL(value.preview)
    }
    onRemove?.()
    setError(null)
    setUploadProgress(0)
  }

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square'
      case 'video':
        return 'aspect-video'
      case 'banner':
        return 'aspect-[2/1]'
      case '4:3':
        return 'aspect-[4/3]'
      case '3:4':
        return 'aspect-[3/4]'
      default:
        return 'aspect-video'
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={Array.isArray(acceptedTypes) ? acceptedTypes.join(',') : acceptedTypes}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Area */}
      {!value && (
        <Card
          className={cn(
            'border-2 border-dashed transition-all duration-200 cursor-pointer',
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5',
            aspectRatio && getAspectRatioClass()
          )}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center justify-center p-2 text-center min-h-0">
            {uploading ? (
              <div className="w-full space-y-4">
                <div className="animate-pulse">
                  <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Uploading...</p>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                <div className="space-y-0">
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {(maxSize / (1024 * 1024)).toFixed(0)}MB max
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {value && showPreview && (
        <Card className="relative overflow-hidden">
          <CardContent className="p-0">
            <div className={cn('relative', aspectRatio && getAspectRatioClass())}>
              <img
                src={value.preview || value.url}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="bg-red-500/80 hover:bg-red-600/80"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">
              {value.name || 'Image'}
            </Badge>
          </div>
        </Card>
      )}

      {/* Image Info (without preview) */}
      {value && !showPreview && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{value.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(value.size / (1024 * 1024)).toFixed(2)}MB
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Replace Button (when image exists) */}
      {value && !uploading && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={disabled}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Replace Image
        </Button>
      )}
    </div>
  )
}