export const AVATAR_SLUGS = [
  'fox', 'owl', 'cat', 'raccoon', 'frog', 'bear', 'hedgehog', 'penguin'
] as const;
export type AvatarSlug = (typeof AVATAR_SLUGS)[number];

export type MessagePayload =
  | { id: number; created_at: number; sender_name: string; sender_avatar: AvatarSlug;
      kind: 'text'; body: string }
  | { id: number; created_at: number; sender_name: string; sender_avatar: AvatarSlug;
      kind: 'image'; body: string | null;
      image_url: string; thumb_url: string;
      image_width: number; image_height: number; image_bytes: number };

export interface PresencePayload {
  connected: Array<{ name: string; avatar: AvatarSlug }>;
}
