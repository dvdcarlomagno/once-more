export type Event = {
  id: string;
  created_at: string;
  ambassador_id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  cover_url: string | null;
  luma_url: string | null;
  shots_per_person: number;
  film_filter: boolean;
  watermark_path: string | null;
  revealed: boolean;
  revealed_at: string | null;
};

export type Participant = {
  id: string;
  created_at: string;
  event_id: string;
  display_name: string;
  token: string;
};

export type Photo = {
  id: string;
  created_at: string;
  event_id: string;
  participant_id: string;
  original_path: string;
  blurred_path: string;
  revealed_path: string | null;
};
