
/* ==========================================================
   JC NEON STUDIO – TWITCH CONNECTION FIX
   Jade & Clarke
   OAuth 2.0 PKCE | GitHub Pages
   ========================================================== */

(() => {
  "use strict";

  const CLIENT_ID = "kg0zc4v9bubqh0qacoup4tk6z1ceue";

  const REDIRECT_URI =
    "https://juliansickert8-pixel.github.io/jc-neon-studio/";

  const SCOPES = [
    "user:read:email",
    "user:read:chat",
    "user:bot",
    "channel:read:subscriptions",
    "bits:read",
    "moderator:read:followers"
  ];

  const STORAGE_KEY = "jc_neon_twitch_auth";
  const PKCE_KEY = "jc_neon_twitch_pkce";

  let auth = null;

  function findButton() {
    return (
      document.getElementById("twitchBtn") ||
      document.getElementById("twitchButton") ||
      document.getElementById("twitchConnect") ||
      document.getElementById("connectTwitch")
    );
  }

  function randomString(length = 64) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    return Array.from(bytes, b =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[
        b % 66
      ]
    ).join("");
  }

  function base64url(buffer) {
    return btoa(
      String.fromCharCode(...new Uint8Array(buffer))
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async function createChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64url(digest);
  }

  function saveAuth(value) {
    auth = value;

    if (value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    updateUI();
  }

  function loadAuth() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function updateUI() {
    const connected = Boolean(auth?.access_token);
    const button = findButton();

    if (button) {
      button.textContent = connected
        ? "Twitch trennen"
        : "Twitch verbinden ↗";
    }

    const badge =
      document.getElementById("twitchBadge") ||
      document.getElementById("twitchStatus");

    if (badge) {
      badge.textContent = connected
        ? "ONLINE 🟢 VERBUNDEN"
        : "OFFLINE 🟠 NICHT VERBUNDEN";
    }

    const username = auth?.login || auth?.display_name || "";

    for (const id of ["twitchUsername", "connectedUser"]) {
      const element = document.getElementById(id);
      if (element && username) element.textContent = username;
    }

    const info = document.getElementById("twitchInfo");

    if (info) {
      info.textContent = connected
        ? `Angemeldet als ${username}`
        : "Nicht verbunden";
    }

    window.dispatchEvent(
      new CustomEvent("jc:twitch-auth-changed", {
        detail: {
          connected,
          username
        }
      })
    );
  }

  async function connect() {
    const verifier = randomString(96);
    const state = randomString(48);
    const challenge = await createChallenge(verifier);

    sessionStorage.setItem(
      PKCE_KEY,
      JSON.stringify({ verifier, state })
    );

    const url = new URL("https://id.twitch.tv/oauth2/authorize");

    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");

    window.location.assign(url.toString());
  }

  async function exchangeCode(code, verifier) {
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier
    });

    const response = await fetch(
      "https://id.twitch.tv/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      throw new Error(
        data.message || "Twitch konnte den Code nicht einlösen."
      );
    }

    return {
      ...data,
      expires_at: Date.now() + data.expires_in * 1000
    };
  }

  async function refreshToken() {
    if (!auth?.refresh_token) return false;

    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: auth.refresh_token
    });

    const response = await fetch(
      "https://id.twitch.tv/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      }
    );

    if (!response.ok) return false;

    const data = await response.json();

    if (!data.access_token) return false;

    saveAuth({
      ...auth,
      ...data,
      refresh_token: data.refresh_token || auth.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000
    });

    return true;
  }

  async function validateToken() {
    if (!auth?.access_token) return false;

    let response;

    try {
      response = await fetch(
        "https://id.twitch.tv/oauth2/validate",
        {
          headers: {
            Authorization: `OAuth ${auth.access_token}`
          }
        }
      );

      if (response.status === 401) {
        if (!(await refreshToken())) return false;

        response = await fetch(
          "https://id.twitch.tv/oauth2/validate",
          {
            headers: {
              Authorization: `OAuth ${auth.access_token}`
            }
          }
        );
      }

      if (!response.ok) return false;

      const data = await response.json();

      if (data.client_id !== CLIENT_ID) return false;

      saveAuth({
        ...auth,
        login: data.login,
        user_id: data.user_id,
        scopes: data.scopes
      });

      return true;
    } catch (error) {
      console.warn("Twitch-Verbindung konnte nicht geprüft werden:", error);
      return null;
    }
  }

  async function handleCallback() {
    const url = new URL(window.location.href);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (!code && !error) return;

    const pending = JSON.parse(
      sessionStorage.getItem(PKCE_KEY) || "null"
    );

    if (error) {
      throw new Error(
        url.searchParams.get("error_description") || error
      );
    }

    if (!pending || pending.state !== state) {
      throw new Error("Twitch-Sicherheitsprüfung fehlgeschlagen.");
    }

    const result = await exchangeCode(code, pending.verifier);

    sessionStorage.removeItem(PKCE_KEY);

    saveAuth(result);

    window.history.replaceState(
      {},
      "",
      REDIRECT_URI
    );

    const valid = await validateToken();

    if (valid !== true) {
      throw new Error("Twitch-Token konnte nicht bestätigt werden.");
    }
  }

  async function disconnect() {
    const token = auth?.access_token;

    saveAuth(null);

    if (token) {
      try {
        await fetch(
          "https://id.twitch.tv/oauth2/revoke",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              client_id: CLIENT_ID,
              token
            })
          }
        );
      } catch (error) {
        console.warn("Token-Widerruf nicht bestätigt:", error);
      }
    }
  }

  async function init() {
    auth = loadAuth();

    try {
      await handleCallback();
    } catch (error) {
      console.error("Twitch OAuth:", error);
      alert("Twitch-Anmeldung fehlgeschlagen: " + error.message);
    }

    if (auth?.access_token) {
      const valid = await validateToken();

      if (valid === false) {
        saveAuth(null);
      }
    }

    updateUI();

    // Capture-Handler verhindert, dass der alte defekte
    // Button-Handler die Anmeldung blockiert.
    document.addEventListener(
      "click",
      async event => {
        const button = findButton();

        if (!button || !button.contains(event.target)) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        try {
          if (auth?.access_token) {
            await disconnect();
          } else {
            await connect();
          }
        } catch (error) {
          console.error("Twitch-Verbindungsfehler:", error);
          alert(error.message);
        }
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
