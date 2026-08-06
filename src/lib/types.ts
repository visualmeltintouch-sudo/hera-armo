export type AgeGroup = "young" | "classic";
export type ProfileKey = "ambiente" | "acqua" | "energia" | "hera";
export type CodeStatus = "generated" | "redeemed" | "expired";
export type SelectedOption = "a" | "b";

export interface ArmoEvent {
  id: string;
  name: string;
  location: string | null;
  code_letter: string;
  date_start: string;
  date_end: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ArmoSettings {
  id: string;
  event_id: string;
  year_cutoff: number;
  hera_threshold: number;
  questions_per_session: number;
  created_at: string;
}

export interface ArmoQuestion {
  id: string;
  event_id: string;
  age_group: AgeGroup;
  sort_order: number;
  question_text: string;
  option_a_text: string;
  option_a_verde: number;
  option_a_ciano: number;
  option_a_magenta: number;
  option_b_text: string;
  option_b_verde: number;
  option_b_ciano: number;
  option_b_magenta: number;
  is_active: boolean;
  created_at: string;
}

export interface ArmoProfile {
  id: string;
  event_id: string;
  profile_key: ProfileKey;
  age_group: AgeGroup;
  name: string;
  claim: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ArmoSession {
  id: string;
  event_id: string;
  age_group: AgeGroup;
  birth_year: number;
  score_verde: number;
  score_ciano: number;
  score_magenta: number;
  profile_key: ProfileKey;
  played_at: string;
}

export interface ArmoAnswer {
  id: string;
  session_id: string;
  question_id: string;
  selected_option: SelectedOption;
  verde_earned: number;
  ciano_earned: number;
  magenta_earned: number;
}

export interface ArmoPrize {
  id: string;
  event_id: string;
  name: string;
  label: string;
  image_url: string | null;
  weight: number;
  stock_total: number | null;
  stock_remaining: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ArmoCode {
  id: string;
  event_id: string;
  code: string;
  prize_id: string;
  session_id: string | null;
  status: CodeStatus;
  redeemed_at: string | null;
  created_at: string;
}

export interface ArmoOperator {
  id: string;
  name: string;
  access_code: string;
  event_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PlayResult {
  session_id: string;
  profile_key: ProfileKey;
  age_group: AgeGroup;
  score_verde: number;
  score_ciano: number;
  score_magenta: number;
  prize: { name: string; image_url: string | null } | null;
  code: string | null;
}

export interface RedeemResult {
  success: boolean;
  prize?: string;
  event?: string;
  error?: string;
  redeemed_at?: string;
}

export interface QuizAnswer {
  question_id: string;
  selected_option: SelectedOption;
}

export interface ColorScores {
  verde: number;
  ciano: number;
  magenta: number;
}
