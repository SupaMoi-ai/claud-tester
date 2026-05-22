import type {
  PinterestProvider,
  PinterestTokens,
  RemoteBoard,
  RemotePin,
} from "./interface";

// Skeleton real implementation. Activated when PROVIDER_MODE=real and the
// Pinterest credentials are present. Pinterest API v5 docs:
// https://developers.pinterest.com/docs/api/v5/

const PINTEREST_API = "https://api.pinterest.com/v5";

export const pinterestReal: PinterestProvider = {
  async exchangeCode(code, redirectUri): Promise<PinterestTokens> {
    const clientId = requireEnv("PINTEREST_CLIENT_ID");
    const clientSecret = requireEnv("PINTEREST_CLIENT_SECRET");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch(`${PINTEREST_API}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Pinterest token exchange failed: ${res.status}`);
    }
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // Fetch user id with the new token
    const meRes = await fetch(`${PINTEREST_API}/user_account`, {
      headers: { Authorization: `Bearer ${json.access_token}` },
    });
    if (!meRes.ok) throw new Error("Failed to fetch Pinterest user account");
    const me = (await meRes.json()) as { username: string };

    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? null,
      expires_at: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
      pinterest_user_id: me.username,
    };
  },

  async fetchBoards(accessToken): Promise<RemoteBoard[]> {
    const res = await fetch(`${PINTEREST_API}/boards?page_size=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Failed to fetch Pinterest boards");
    const json = (await res.json()) as {
      items: { id: string; name: string }[];
    };
    return json.items.map((b) => ({
      pinterest_board_id: b.id,
      name: b.name,
    }));
  },

  async *fetchAllPins(accessToken): AsyncIterable<RemotePin[]> {
    let bookmark: string | undefined;
    do {
      const url = new URL(`${PINTEREST_API}/pins`);
      url.searchParams.set("page_size", "50");
      if (bookmark) url.searchParams.set("bookmark", bookmark);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch Pinterest pins");
      const json = (await res.json()) as {
        items: Array<{
          id: string;
          media?: { images?: { "600x"?: { url: string } } };
          link?: string | null;
          description?: string | null;
          board_id?: string;
          created_at?: string;
        }>;
        bookmark?: string;
      };

      const page: RemotePin[] = json.items.map((p) => ({
        pinterest_pin_id: p.id,
        image_url: p.media?.images?.["600x"]?.url ?? "",
        source_url: p.link ?? null,
        pinterest_description: p.description ?? null,
        pinterest_board_name: null,
        saved_at: p.created_at ?? null,
      }));

      yield page;
      bookmark = json.bookmark;
    } while (bookmark);
  },

  async revoke(_accessToken): Promise<void> {
    // Pinterest doesn't expose a public revoke endpoint as of v5;
    // disconnect is enforced by deleting the local connection row.
  },
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (PROVIDER_MODE=real)`);
  return v;
}
