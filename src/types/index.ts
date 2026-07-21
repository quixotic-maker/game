export interface ScenePair {
  theme?: string;
  normal: string;
  spy: string;
}

export interface GeneratePairRequest {
  theme?: string;
  passcode: string;
}

export interface GeneratePairResponse {
  ok: boolean;
  normal?: string;
  spy?: string;
  error?: 'passcode_incorrect' | 'ai_failed' | 'rate_limited' | 'invalid_response';
}

export interface WheelTopic {
  id: string;
  label: string;
  color: string;
  emoji: string;
  prompt: string;
}

export type GameTab = 'spin' | 'spy';
