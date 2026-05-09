/**
 * Centralized S3 file service
 * Handles conversion of S3 keys to URLs and provides defaults
 */

const S3_BUCKET_URL = import.meta.env.VITE_BASE_S3;

const BADGE_EMOJIS = ['🏆', '⭐', '🎖️', '🥇', '🥈', '🥉', '🎗️', '✨', '🌟', '💎'];

/**
 * Convert S3 key to full URL
 * @param s3Key - S3 object key (e.g., "avatars/user123.jpg")
 * @returns Full S3 URL or null if no key provided
 */
export function getS3Url(s3Key: string | null | undefined): string | null {
    if (!s3Key) return null;
    return `${S3_BUCKET_URL}/${s3Key}`;
}

/**
 * Get avatar URL for user
 * @param s3Key - Avatar S3 key
 * @param userId - User ID for deterministic placeholder
 * @returns Avatar URL or default placeholder
 */
export function getAvatarUrl(s3Key: string | null | undefined, userId?: string): string {
    if (!s3Key) {
        const seed = userId || 'default';
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    }
    return getS3Url(s3Key) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId || 'default'}`;
}

/**
 * Get badge icon - uses emoji if S3 key is null, otherwise uses random emoji based on badge ID
 * @param s3Key - Badge icon S3 key
 * @param badgeId - Badge ID for deterministic emoji selection
 * @returns Badge emoji or icon
 */
export function getBadgeIcon(s3Key: string | null | undefined, badgeId?: string): string {
    if (!s3Key) {
        // deterministic emoji based on badge ID
        if (badgeId) {
            const hash = badgeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return BADGE_EMOJIS[hash % BADGE_EMOJIS.length];
        }
        return BADGE_EMOJIS[0];
    }
    return getS3Url(s3Key) || BADGE_EMOJIS[0];
}

/**
 * Get course thumbnail URL
 * @param s3Key - Thumbnail S3 key
 * @returns Thumbnail URL or default placeholder
 */
export function getCourseThumbUrl(s3Key: string | null | undefined): string {
    if (!s3Key) {
        return 'https://images.unsplash.com/photo-1516321318423-f06f70504504?w=500&h=300&fit=crop';
    }
    return getS3Url(s3Key) || 'https://images.unsplash.com/photo-1516321318423-f06f70504504?w=500&h=300&fit=crop';
}

/**
 * Generate a seeded color based on string (deterministic)
 * @param seed - String to base color on
 * @returns Hex color code
 */
export function getSeededColor(seed: string): string {
    const colors = [
        '#FF6B6B', // Red
        '#4ECDC4', // Teal
        '#45B7D1', // Blue
        '#FFA07A', // Salmon
        '#98D8C8', // Mint
        '#F7DC6F', // Yellow
        '#BB8FCE', // Purple
        '#85C1E2', // Light Blue
        '#F8B88B', // Peach
        '#ABEBC6', // Light Green
    ];

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}
