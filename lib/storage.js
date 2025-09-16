import { createClient } from '@/lib/supabase'

// Storage bucket names
export const STORAGE_BUCKETS = {
  TOURNAMENT_IMAGES: 'tournament-images',
  USER_AVATARS: 'user-avatars' // For future use
}

// Image types and configurations
export const IMAGE_CONFIG = {
  TOURNAMENT_THUMBNAIL: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 800,
    maxHeight: 600,
    folder: 'thumbnails'
  },
  TOURNAMENT_BANNER: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 1920,
    maxHeight: 1080,
    folder: 'banners'
  }
}

/**
 * Upload tournament image to Supabase storage
 * @param {File} file - The image file to upload
 * @param {string} tournamentId - Tournament ID for file organization
 * @param {string} imageType - 'thumbnail' or 'banner'
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export async function uploadTournamentImage(file, tournamentId, imageType) {
  try {
    const supabase = createClient()

    // Validate image type
    const config = imageType === 'thumbnail' ? IMAGE_CONFIG.TOURNAMENT_THUMBNAIL : IMAGE_CONFIG.TOURNAMENT_BANNER

    if (!config.allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`
      }
    }

    if (file.size > config.maxSize) {
      return {
        success: false,
        error: `File too large. Maximum size: ${config.maxSize / (1024 * 1024)}MB`
      }
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${config.folder}/${tournamentId}_${imageType}_${Date.now()}.${fileExtension}`

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.TOURNAMENT_IMAGES)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true // Replace if file exists
      })

    if (error) {
      console.error('Storage upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKETS.TOURNAMENT_IMAGES)
      .getPublicUrl(fileName)

    return {
      success: true,
      url: publicUrl,
      path: fileName
    }
  } catch (error) {
    console.error('Image upload error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Delete tournament image from storage
 * @param {string} imagePath - The storage path of the image to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteTournamentImage(imagePath) {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.TOURNAMENT_IMAGES)
      .remove([imagePath])

    if (error) {
      console.error('Storage delete error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Image delete error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get default tournament images based on game type
 * @param {string} game - Game identifier
 * @returns {{thumbnailUrl: string|null, bannerUrl: string|null}}
 */
export function getDefaultTournamentImages(game) {
  // Map game identifiers to default image filenames and handle naming inconsistencies
  const gameImageMap = {
    // League of Legends
    'league_of_legends': { base: 'default_league_of_legends', thumbSuffix: 'thumbnail' },
    'League of Legends': { base: 'default_league_of_legends', thumbSuffix: 'thumbnail' },

    // Valorant
    'valorant': { base: 'default_valorant', thumbSuffix: 'thumbnail' },
    'Valorant': { base: 'default_valorant', thumbSuffix: 'thumbnail' },

    // Super Smash Bros (using short file names)
    'smash_bros': { base: 'default_smash', thumbSuffix: 'thumb' },
    'Super Smash Bros': { base: 'default_smash', thumbSuffix: 'thumb' },

    // Counter-Strike 2 (mapped to counterstrike files)
    'cs2': { base: 'default_counterstrike', thumbSuffix: 'thumb' },
    'Counter-Strike 2': { base: 'default_counterstrike', thumbSuffix: 'thumb' },
  }

  const imageConfig = gameImageMap[game]

  // If no default image exists for this game, return null
  if (!imageConfig) {
    return { thumbnailUrl: null, bannerUrl: null }
  }

  // Return paths to actual default images with correct naming
  const thumbnailUrl = `/images/tournaments/${imageConfig.base}_${imageConfig.thumbSuffix}.webp`
  const bannerUrl = `/images/tournaments/${imageConfig.base}_banner.webp`

  return { thumbnailUrl, bannerUrl }
}

/**
 * Resize image using canvas (client-side)
 * @param {File} file - Original image file
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - Image quality (0-1)
 * @returns {Promise<File>} - Resized image file
 */
export function resizeImage(file, maxWidth, maxHeight, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          resolve(resizedFile)
        },
        file.type,
        quality
      )
    }

    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}