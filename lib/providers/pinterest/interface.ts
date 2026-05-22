export interface RemotePin {
  pinterest_pin_id: string;
  image_url: string;
  source_url?: string | null;
  pinterest_description?: string | null;
  pinterest_board_name?: string | null;
  saved_at?: string | null;
}

export interface RemoteBoard {
  pinterest_board_id: string;
  name: string;
}

export interface PinterestTokens {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  pinterest_user_id: string;
}

export interface PinterestProvider {
  exchangeCode(code: string, redirectUri: string): Promise<PinterestTokens>;
  fetchBoards(accessToken: string): Promise<RemoteBoard[]>;
  // Yields pages of pins so callers can stream progress.
  fetchAllPins(accessToken: string): AsyncIterable<RemotePin[]>;
  revoke(accessToken: string): Promise<void>;
}
