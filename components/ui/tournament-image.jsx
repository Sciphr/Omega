'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getDefaultTournamentImages } from '@/lib/storage'

export function TournamentImage({
  src,
  fallbackSrc,
  alt,
  game,
  type = 'thumbnail', // 'thumbnail' or 'banner'
  className,
  overlayContent,
  children,
  ...props
}) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Get default image based on game and type
  const getDefaultImage = () => {
    if (fallbackSrc) return fallbackSrc

    console.log('Getting default image for game:', game, 'type:', type)
    const defaultImages = getDefaultTournamentImages(game)
    console.log('Default images:', defaultImages)

    const defaultImageUrl = type === 'banner' ? defaultImages.bannerUrl : defaultImages.thumbnailUrl

    // If no default image exists for this game, return null (will show placeholder)
    return defaultImageUrl
  }

  // Determine which image to show
  const imageSrc = !src || imageError ? getDefaultImage() : src

  console.log('Tournament Image - src:', src, 'game:', game, 'type:', type, 'finalSrc:', imageSrc)

  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Tournament Image or Placeholder */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt || 'Tournament image'}
          className={cn(
            'w-full h-full object-cover transition-all duration-300',
            isLoading && 'opacity-0'
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            console.log('Image failed to load:', imageSrc)
            console.log('Tournament game:', game)
            console.log('Image type:', type)
            if (!imageError) {
              setImageError(true)
            }
            setIsLoading(false)
          }}
        />
      ) : (
        // Show placeholder when no image is available
        <div className="w-full h-full bg-muted/30 flex items-center justify-center border border-dashed border-muted-foreground/20">
          <div className="text-center text-muted-foreground">
            <div className="text-2xl mb-2">🎮</div>
            <div className="text-sm font-medium">No Image</div>
            <div className="text-xs">Upload an image</div>
          </div>
        </div>
      )}

      {/* Overlay content */}
      {overlayContent && (
        <div className="absolute inset-0">
          {overlayContent}
        </div>
      )}

      {/* Children content */}
      {children}
    </div>
  )
}

// Specific variants for common use cases
export function TournamentThumbnail({ tournament, className, ...props }) {
  return (
    <TournamentImage
      src={tournament.thumbnail_image_url}
      alt={tournament.name}
      game={tournament.game}
      type="thumbnail"
      className={cn('aspect-video', className)}
      {...props}
    />
  )
}

export function TournamentBanner({ tournament, className, children, ...props }) {
  return (
    <TournamentImage
      src={tournament.banner_image_url}
      alt={tournament.name}
      game={tournament.game}
      type="banner"
      className={cn('aspect-[2/1]', className)}
      {...props}
    >
      {children}
    </TournamentImage>
  )
}