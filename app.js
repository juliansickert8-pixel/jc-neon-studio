
'use strict';

/*
 * JC NEON STUDIO 2.2
 * JADE & CLARKE
 *
 * Twitch OAuth 2.0 mit PKCE
 * Studio-Einstellungen, Chat-TTS, Emoji-Filter
 * M4A-Alerts, Overlay-Kommunikation und Backup
 *
 * GitHub Pages:
 * https://juliansickert8-pixel.github.io/jc-neon-studio/
 */

(() => {
  const $ = id => document.getElementById(id);

  // ==========================================
  // TWITCH KONFIGURATION
  // ==========================================

  const TWITCH_CLIENT_ID =
    'kg0zc4v9bubqh0qacoup4tk6z1ceue';

  const TWITCH_REDIRECT_URI =
    'https://juliansickert8-pixel.github.io/jc-neon-studio/';

  const TWITCH_SCOPES = [
    'user:read:email',
    'user:read:chat',
    'user:bot',
    'channel:read:subscriptions',
    'bits:read',
    'moderator:read:followers'
  ];

  const AUTH_STORAGE_KEY = 'jc_neon_twitch_auth';
  const PKCE_STORAGE_KEY = 'jc_neon_twitch_pkce';
  const STORAGE_KEY = 'jc_neon_studio_v2';
  const OLD_STORAGE_KEY = 'jc_streamtools_neon_v1';

  const DEFAULTS = {
    ttsEnabled: true,
    voice: '',
    volume: 85,
    rate: 100,
    readNames: true,
    followEnabled: true,
    subEnabled: true,
    bitsEnabled: true,
    duration: 6,
    accent: 'purple',
    motion: true,
    testUser: 'FaulieFan',
    testMessage:
      'Hey Faulie! Dein Stream sieht heute mega aus! 💜',
    alertUser: 'NeonSloth',
    chatInput: '',
    soundVolume: 80,
    soundEnabled: true,
    showChatOverlay: true,
    showAlertOverlay: true,
    chatPosition: 'bottom-left',
    alertPosition: 'top-center',
    overlayScale: 100,
    overlayChatLimit: 6,
    overlayChatDuration: 18,
    overlayChatWidth: 420,
    overlayAlertWidth: 500,
    overlayShowAvatar: true,
    overlayShowBadges: true,
    overlayChatAnimation: 'slide',
    overlayAlertAnimation: 'pop',
    overlayTheme: 'neon',
    overlayFontSize: 16,
    overlayOpacity: 100,
    overlayChatBackground: true,
    overlayAlertBackground: true,
    overlayChatSound: false,
    overlayAlertSound: true,
    overlayTestUser: 'NeonSloth',
    overlayTestMessage:
      'Moin Faulie! Das neue Studio sieht mega aus! 💜'
  };

  const SOUND_FILES = {
    follow: 'assets/sounds/jc_alert_follower.m4a',
    sub: 'assets/sounds/jc_alert_sub.m4a',
    bits: 'assets/sounds/jc_alert_bits.m4a'
  };

  const ALERT_LABELS = {
    follow: 'NEUER FOLLOWER',
    sub: 'NEUES ABONNEMENT',
    bits: 'BITS ERHALTEN'
  };

  const ALERT_ICONS = {
    follow: '♡',
    sub: '★',
    bits: '◆'
  };

  // ==========================================
  // SPEICHER / EINSTELLUNGEN
  // ==========================================

  function readStorage(key, storage = localStorage) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn(
        'Gespeicherte Daten konnten nicht gelesen werden:',
        key,
        error
      );
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(
        'Daten konnten nicht gespeichert werden:',
        key,
        error
      );
      return false;
    }
  }

  const storedSettings =
    readStorage(STORAGE_KEY) ||
    readStorage(OLD_STORAGE_KEY) ||
    {};

  let settings = {
    ...DEFAULTS,
    ...storedSettings
  };

  function saveSettings() {
    writeStorage(STORAGE_KEY, settings);
  }

  function updateSetting(key, value) {
    settings[key] = value;
    saveSettings();
  }

  function resetSettings() {
    const confirmed = confirm(
      'Möchtest du alle Studio-Einstellungen wirklich zurücksetzen? ' +
      'Deine Twitch-Verbindung bleibt dabei erhalten.'
    );

    if (!confirmed) return;

    settings = { ...DEFAULTS };
    saveSettings();

    applySettingsToUI();
    applyTheme();
    applyMotion();
    updateTTSStatus();
    updateSoundStatus();
    updateOverlayStatus();
    syncOverlaySettings();

    toast('Studio-Einstellungen wurden zurückgesetzt.');
  }

  // ==========================================
  // STATUS / TOAST
  // ==========================================

  let toastTimer = null;

  function toast(message, duration = 3500) {
    const element = $('toast');

    if (!element) {
      console.log(message);
      return;
    }

    element.textContent = message;
    element.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      element.classList.remove('show');
    }, duration);
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setValue(id, value) {
    const element = $(id);
    if (element) element.value = value;
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  function showPage(pageName) {
    const pages = document.querySelectorAll(
      '[data-page], .page'
    );

    pages.forEach(page => {
      const name =
        page.dataset.page ||
        page.id.replace(/^page-/, '');

      const active = name === pageName;

      page.classList.toggle('active', active);
      page.classList.toggle('hidden', !active);

      if (page.classList.contains('page')) {
        page.style.display = active ? '' : 'none';
      }
    });

    const navigation = document.querySelectorAll(
      '[data-nav], .nav-item'
    );

    navigation.forEach(item => {
      const name =
        item.dataset.nav ||
        item.dataset.target ||
        item.getAttribute('href')?.replace('#', '');

      const active = name === pageName;

      item.classList.toggle('active', active);

      if (active) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    try {
      sessionStorage.setItem(
        'jc_neon_active_page',
        pageName
      );
    } catch (error) {
      console.warn(error);
    }
  }

  function initNavigation() {
    document.querySelectorAll(
      '[data-nav], .nav-item'
    ).forEach(item => {
      item.addEventListener('click', event => {
        const pageName =
          item.dataset.nav ||
          item.dataset.target ||
          item.getAttribute('href')?.replace('#', '');

        if (!pageName) return;

        event.preventDefault();
        showPage(pageName);
      });
    });

    let initialPage = 'overview';

    try {
      initialPage =
        sessionStorage.getItem(
          'jc_neon_active_page'
        ) || 'overview';
    } catch (error) {
      console.warn(error);
    }

    showPage(initialPage);
  }

  // ==========================================
  // NEON FARBEN
  // ==========================================

  const THEMES = {
    purple: {
      primary: '#a855f7',
      secondary: '#7c3aed',
      glow: 'rgba(168,85,247,.45)'
    },

    pink: {
      primary: '#ff2bd6',
      secondary: '#e600a9',
      glow: 'rgba(255,43,214,.45)'
    },

    cyan: {
      primary: '#00e5ff',
      secondary: '#0891b2',
      glow: 'rgba(0,229,255,.45)'
    },

    red: {
      primary: '#ff304f',
      secondary: '#be123c',
      glow: 'rgba(255,48,79,.45)'
    },

    green: {
      primary: '#39ff88',
      secondary: '#059669',
      glow: 'rgba(57,255,136,.45)'
    },

    gold: {
      primary: '#d4af37',
      secondary: '#a16207',
      glow: 'rgba(212,175,55,.45)'
    }
  };

  function normalizeTheme(value) {
    const aliases = {
      'hot-pink': 'pink',
      hotpink: 'pink',
      'electric-cyan': 'cyan',
      electriccyan: 'cyan',
      turquoise: 'cyan',
      lila: 'purple'
    };

    const normalized = aliases[value] || value;

    return THEMES[normalized]
      ? normalized
      : 'purple';
  }

  function applyTheme() {
    const themeName = normalizeTheme(
      settings.accent
    );

    const theme = THEMES[themeName];

    const root = document.documentElement;

    root.style.setProperty(
      '--accent',
      theme.primary
    );

    root.style.setProperty(
      '--accent-2',
      theme.secondary
    );

    root.style.setProperty(
      '--accent-glow',
      theme.glow
    );

    root.style.setProperty(
      '--primary',
      theme.primary
    );

    root.style.setProperty(
      '--primary-color',
      theme.primary
    );

    root.style.setProperty(
      '--neon-primary',
      theme.primary
    );

    root.dataset.accent = themeName;
    document.body.dataset.accent = themeName;

    document.querySelectorAll(
      '[data-accent], [data-theme-choice]'
    ).forEach(button => {
      const value =
        button.dataset.accent ||
        button.dataset.themeChoice;

      button.classList.toggle(
        'active',
        normalizeTheme(value) === themeName
      );
    });

    syncOverlaySettings();
  }

  function initThemes() {
    document.querySelectorAll(
      '[data-accent], [data-theme-choice]'
    ).forEach(button => {
      button.addEventListener('click', () => {
        const theme =
          button.dataset.accent ||
          button.dataset.themeChoice;

        settings.accent = normalizeTheme(theme);

        saveSettings();
        applyTheme();

        toast('Neon-Farbe wurde gespeichert.');
      });
    });

    const accentSelect = $('accent');

    if (accentSelect) {
      accentSelect.addEventListener(
        'change',
        event => {
          settings.accent = normalizeTheme(
            event.target.value
          );

          saveSettings();
          applyTheme();
        }
      );
    }

    applyTheme();
  }

  // ==========================================
  // HINTERGRUNDANIMATIONEN
  // ==========================================

  function applyMotion() {
    const enabled = Boolean(settings.motion);

    document.documentElement.classList.toggle(
      'reduce-motion',
      !enabled
    );

    document.body.classList.toggle(
      'motion-disabled',
      !enabled
    );

    document.body.classList.toggle(
      'motion-enabled',
      enabled
    );

    document.documentElement.style.setProperty(
      '--motion-state',
      enabled ? 'running' : 'paused'
    );

    document.querySelectorAll(
      '[data-motion-animation]'
    ).forEach(element => {
      element.style.animationPlayState =
        enabled ? 'running' : 'paused';
    });

    const toggle = $('motion');

    if (toggle) {
      toggle.checked = enabled;
    }
  }

  function initMotion() {
    const toggle =
      $('motion') ||
      $('backgroundAnimation') ||
      $('enableAnimations');

    if (toggle) {
      toggle.addEventListener('change', () => {
        settings.motion = toggle.checked;

        saveSettings();
        applyMotion();
      });
    }

    applyMotion();
  }

  // ==========================================
  // FORMULARWERTE SYNCHRONISIEREN
  // ==========================================

  function applySettingsToUI() {
    const fields = {
      ttsEnabled: [
        'ttsEnabled',
        'enableTTS'
      ],

      readNames: [
        'readNames',
        'ttsReadNames'
      ],

      followEnabled: [
        'followEnabled',
        'enableFollowAlerts'
      ],

      subEnabled: [
        'subEnabled',
        'enableSubAlerts'
      ],

      bitsEnabled: [
        'bitsEnabled',
        'enableBitsAlerts'
      ],

      soundEnabled: [
        'soundEnabled',
        'enableSounds'
      ],

      motion: [
        'motion',
        'backgroundAnimation'
      ],

      volume: [
        'volume',
        'ttsVolume'
      ],

      rate: [
        'rate',
        'ttsRate'
      ],

      soundVolume: [
        'soundVolume',
        'alertVolume'
      ],

      duration: [
        'duration',
        'alertDuration'
      ],

      testUser: [
        'testUser'
      ],

      testMessage: [
        'testMessage'
      ],

      alertUser: [
        'alertUser'
      ]
    };

    Object.entries(fields).forEach(
      ([settingKey, ids]) => {
        ids.forEach(id => {
          const element = $(id);

          if (!element) return;

          const value = settings[settingKey];

          if (
            element.type === 'checkbox'
          ) {
            element.checked = Boolean(value);
          } else {
            element.value = value ?? '';
          }
        });
      }
    );

    updateSettingLabels();
  }

  function updateSettingLabels() {
    const labels = {
      volumeValue: `${settings.volume}%`,
      rateValue: `${settings.rate}%`,
      soundVolumeValue:
        `${settings.soundVolume}%`,
      durationValue:
        `${settings.duration}s`
    };

    Object.entries(labels).forEach(
      ([id, value]) => setText(id, value)
    );
  }

  function initSettingsControls() {
    const controls = [
      ['ttsEnabled', 'ttsEnabled', 'checked'],
      ['enableTTS', 'ttsEnabled', 'checked'],
      ['readNames', 'readNames', 'checked'],
      ['followEnabled', 'followEnabled', 'checked'],
      ['subEnabled', 'subEnabled', 'checked'],
      ['bitsEnabled', 'bitsEnabled', 'checked'],
      ['soundEnabled', 'soundEnabled', 'checked'],
      ['volume', 'volume', 'number'],
      ['rate', 'rate', 'number'],
      ['soundVolume', 'soundVolume', 'number'],
      ['duration', 'duration', 'number'],
      ['testUser', 'testUser', 'value'],
      ['testMessage', 'testMessage', 'value'],
      ['alertUser', 'alertUser', 'value']
    ];

    controls.forEach(
      ([id, settingKey, type]) => {
        const element = $(id);

        if (!element) return;

        const eventName =
          type === 'value'
            ? 'change'
            : 'input';

        element.addEventListener(
          eventName,
          () => {
            let value;

            if (type === 'checked') {
              value = element.checked;
            } else if (type === 'number') {
              value = Number(element.value);
            } else {
              value = element.value;
            }

            updateSetting(settingKey, value);

            updateSettingLabels();
            updateTTSStatus();
            updateSoundStatus();
            syncOverlaySettings();
          }
        );
      }
    );

    applySettingsToUI();
  }

  // ==========================================
  // OVERLAY KOMMUNIKATION
  // ==========================================

  let overlayChannel = null;

  try {
    if ('BroadcastChannel' in window) {
      overlayChannel = new BroadcastChannel(
        'jc_streamtools_neon'
      );
    }
  } catch (error) {
    console.warn(
      'Overlay-Kommunikation nicht verfügbar:',
      error
    );
  }

  function sendOverlayMessage(type, payload = {}) {
    if (!overlayChannel) return;

    try {
      overlayChannel.postMessage({
        source: 'jc-neon-studio',
        type,
        payload,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn(
        'Overlay-Nachricht fehlgeschlagen:',
        error
      );
    }
  }

  function syncOverlaySettings() {
    sendOverlayMessage('settings', {
      ...settings,
      accent: normalizeTheme(settings.accent)
    });
  }

  function updateOverlayStatus() {
    setText(
      'overlayStatus',
      overlayChannel
        ? 'BEREIT'
        : 'NICHT VERFÜGBAR'
    );
  }

  // ==========================================
  // TWITCH OAUTH 2.0 + PKCE
  // ==========================================

  let twitchAuth = null;
  let twitchUser = null;
  let twitchConnecting = false;

  function base64UrlEncode(bytes) {
    return btoa(
      Array.from(bytes, byte =>
        String.fromCharCode(byte)
      ).join('')
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  function createRandomString(length = 64) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
  }

  async function createCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);

    const hash = await crypto.subtle.digest(
      'SHA-256',
      data
    );

    return base64UrlEncode(
      new Uint8Array(hash)
    );
  }

  function getSavedTwitchAuth() {
    return readStorage(AUTH_STORAGE_KEY);
  }

  function saveTwitchAuth(auth) {
    twitchAuth = auth;
    writeStorage(AUTH_STORAGE_KEY, auth);
  }

  function clearTwitchAuth() {
    twitchAuth = null;
    twitchUser = null;

    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.warn(error);
    }
  }

  function getTwitchAccessToken() {
    return twitchAuth?.access_token || null;
  }

  function isTwitchConnected() {
    return Boolean(
      twitchAuth?.access_token &&
      twitchUser?.id
    );
  }

  function getTwitchUsername() {
    return twitchUser?.display_name ||
      twitchUser?.login ||
      null;
  }

  // ==========================================
  // TWITCH API REQUEST
  // ==========================================

  async function twitchApiRequest(
    endpoint,
    options = {}
  ) {
    const token = getTwitchAccessToken();

    if (!token) {
      throw new Error(
        'Kein Twitch-Zugriffstoken vorhanden.'
      );
    }

    const url = endpoint.startsWith('https://')
      ? endpoint
      : `https://api.twitch.tv/helix/${endpoint.replace(/^\//, '')}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Twitch API ${response.status}: ${body}`
      );
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // ==========================================
  // TOKEN VALIDIEREN
  // ==========================================

  async function validateTwitchToken(token) {
    const response = await fetch(
      'https://id.twitch.tv/oauth2/validate',
      {
        method: 'GET',
        headers: {
          Authorization: `OAuth ${token}`
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (
      data.client_id !== TWITCH_CLIENT_ID
    ) {
      return null;
    }

    return data;
  }

  // ==========================================
  // TOKEN ERNEUERN
  // ==========================================

  async function refreshTwitchToken() {
    if (!twitchAuth?.refresh_token) {
      return false;
    }

    try {
      const params = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token:
          twitchAuth.refresh_token
      });

      const response = await fetch(
        'https://id.twitch.tv/oauth2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded'
          },
          body: params
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      saveTwitchAuth({
        ...twitchAuth,
        access_token: data.access_token,
        refresh_token:
          data.refresh_token ||
          twitchAuth.refresh_token,
        expires_at:
          Date.now() +
          data.expires_in * 1000,
        scope: data.scope ||
          twitchAuth.scope
      });

      return true;
    } catch (error) {
      console.warn(
        'Twitch Token Refresh fehlgeschlagen:',
        error
      );

      return false;
    }
  }

  // ==========================================
  // TWITCH BENUTZER LADEN
  // ==========================================

  async function loadTwitchUser() {
    const result = await twitchApiRequest(
      'users'
    );

    const user = result?.data?.[0];

    if (!user?.id) {
      throw new Error(
        'Twitch-Benutzer konnte nicht geladen werden.'
      );
    }

    twitchUser = user;

    return user;
  }

  // ==========================================
  // TWITCH ANMELDUNG STARTEN
  // ==========================================

  async function connectTwitch() {
    if (twitchConnecting) return;

    twitchConnecting = true;

    try {
      if (
        !window.crypto?.subtle ||
        !window.crypto?.getRandomValues
      ) {
        throw new Error(
          'Für die Twitch-Anmeldung wird HTTPS benötigt.'
        );
      }

      const verifier = createRandomString(64);
      const state = createRandomString(32);

      const challenge = await createCodeChallenge(
        verifier
      );

      sessionStorage.setItem(
        PKCE_STORAGE_KEY,
        JSON.stringify({
          verifier,
          state,
          created_at: Date.now()
        })
      );

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: TWITCH_CLIENT_ID,
        redirect_uri: TWITCH_REDIRECT_URI,
        scope: TWITCH_SCOPES.join(' '),
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256'
      });

      window.location.assign(
        'https://id.twitch.tv/oauth2/authorize?' +
        params.toString()
      );
    } catch (error) {
      console.error(error);

      toast(
        'Twitch-Anmeldung konnte nicht gestartet werden: ' +
        error.message,
        6000
      );

      twitchConnecting = false;
    }
  }

  // ==========================================
  // TWITCH CALLBACK VERARBEITEN
  // ==========================================

  async function handleTwitchCallback() {
    const url = new URL(window.location.href);

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (!code && !error) {
      return false;
    }

    // OAuth-Parameter aus der Adresszeile entfernen.
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('scope');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');

    history.replaceState(
      {},
      document.title,
      url.pathname + url.search + url.hash
    );

    if (error) {
      toast(
        'Twitch-Anmeldung abgebrochen: ' +
        error,
        6000
      );

      return false;
    }

    const pending = readStorage(
      PKCE_STORAGE_KEY,
      sessionStorage
    );

    sessionStorage.removeItem(
      PKCE_STORAGE_KEY
    );

    if (
      !pending?.verifier ||
      !pending?.state ||
      pending.state !== state ||
      Date.now() - pending.created_at >
        10 * 60 * 1000
    ) {
      toast(
        'Die Twitch-Anmeldung ist ungültig oder abgelaufen. Bitte erneut verbinden.',
        6000
      );

      return false;
    }

    try {
      const params = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: TWITCH_REDIRECT_URI,
        code_verifier: pending.verifier
      });

      const response = await fetch(
        'https://id.twitch.tv/oauth2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded'
          },
          body: params
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
          `Token-Austausch fehlgeschlagen (${response.status}): ${errorBody}`
        );
      }

      const data = await response.json();

      saveTwitchAuth({
        access_token: data.access_token,
        refresh_token:
          data.refresh_token || null,
        expires_at:
          Date.now() +
          data.expires_in * 1000,
        scope: data.scope ||
          TWITCH_SCOPES
      });

      await loadTwitchUser();

      setTwitchStatus(
        true,
        getTwitchUsername()
      );

      toast(
        `Twitch verbunden: ${getTwitchUsername()}`
      );

      return true;
    } catch (error) {
      console.error(
        'Twitch Callback Fehler:',
        error
      );

      clearTwitchAuth();
      setTwitchStatus(false);

      toast(
        'Twitch-Anmeldung fehlgeschlagen. ' +
        error.message,
        7000
      );

      return false;
    }
  }

  // ==========================================
  // BESTEHENDE ANMELDUNG WIEDERHERSTELLEN
  // ==========================================

  async function restoreTwitchSession() {
    const saved = getSavedTwitchAuth();

    if (!saved?.access_token) {
      setTwitchStatus(false);
      return false;
    }

    twitchAuth = saved;

    try {
      let validation = await validateTwitchToken(
        twitchAuth.access_token
      );

      if (!validation) {
        const refreshed = await refreshTwitchToken();

        if (!refreshed) {
          throw new Error(
            'Twitch-Sitzung ist abgelaufen.'
          );
        }

        validation = await validateTwitchToken(
          twitchAuth.access_token
        );
      }

      if (!validation) {
        throw new Error(
          'Twitch-Token ist ungültig.'
        );
      }

      await loadTwitchUser();

      setTwitchStatus(
        true,
        getTwitchUsername()
      );

      return true;
    } catch (error) {
      console.warn(
        'Twitch-Sitzung konnte nicht wiederhergestellt werden:',
        error
      );

      clearTwitchAuth();
      setTwitchStatus(false);

      return false;
    }
  }

  // ==========================================
  // TWITCH TRENNEN
  // ==========================================

  async function disconnectTwitch() {
    const token = getTwitchAccessToken();

    if (token) {
      try {
        await fetch(
          'https://id.twitch.tv/oauth2/revoke',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              client_id: TWITCH_CLIENT_ID,
              token
            })
          }
        );
      } catch (error) {
        console.warn(
          'Twitch-Token konnte nicht widerrufen werden:',
          error
        );
      }
    }

    clearTwitchAuth();
    setTwitchStatus(false);

    toast('Twitch wurde getrennt.');
  }

  // ==========================================
  // TWITCH STATUS ANZEIGEN
  // ==========================================

  function setTwitchStatus(
    connected,
    username = null
  ) {
    const badge =
      $('twitchStatus') ||
      $('twitchBadge') ||
      $('connectionStatus');

    if (badge) {
      badge.classList.toggle(
        'online',
        connected
      );

      badge.classList.toggle(
        'offline',
        !connected
      );

      badge.textContent = connected
        ? 'ONLINE 🟢 VERBUNDEN'
        : 'OFFLINE 🟠 NICHT VERBUNDEN';
    }

    const button =
      $('twitchConnect') ||
      $('connectTwitch') ||
      $('twitchButton');

    if (button) {
      button.textContent = connected
        ? 'Twitch trennen'
        : 'Twitch verbinden ↗';
    }

    setText(
      'twitchInfo',
      connected && username
        ? `Angemeldet als ${username}`
        : 'Nicht verbunden'
    );

    setText(
      'twitchUsername',
      connected
        ? username || 'Twitch'
        : 'Nicht verbunden'
    );

    setText(
      'connectedUser',
      connected
        ? username || 'Twitch'
        : 'Nicht verbunden'
    );

    const connectionCards =
      document.querySelectorAll(
        '[data-twitch-status]'
      );

    connectionCards.forEach(card => {
      card.dataset.twitchStatus =
        connected ? 'online' : 'offline';
    });
  }

  // ==========================================
  // TWITCH BUTTON VERBINDEN
  // ==========================================

  function initTwitchButtons() {
    const ids = [
      'twitchConnect',
      'connectTwitch',
      'twitchButton'
    ];

    const buttons = new Set();

    ids.forEach(id => {
      const button = $(id);

      if (button) {
        buttons.add(button);
      }
    });

    document.querySelectorAll(
      '[data-action="twitch-connect"]'
    ).forEach(button => buttons.add(button));

    buttons.forEach(button => {
      button.addEventListener(
        'click',
        async event => {
          event.preventDefault();

          if (isTwitchConnected()) {
            await disconnectTwitch();
          } else {
            await connectTwitch();
          }
        }
      );
    });
  }

  // ==========================================
  // TWITCH INITIALISIEREN
  // ==========================================

  async function initTwitch() {
    initTwitchButtons();

    const url = new URL(window.location.href);

    const hasCallback =
      url.searchParams.has('code') ||
      url.searchParams.has('error');

    if (hasCallback) {
      const connected =
        await handleTwitchCallback();

      if (connected) {
        return;
      }
    }

    await restoreTwitchSession();
  }

  // ==========================================
  // TEIL 4 - TWITCH CHAT + TTS
  // ==========================================

  let twitchChatSocket = null;
  let twitchChatSessionId = null;
  let twitchChatReconnectTimer = null;
  let twitchChatShouldRun = false;
  let twitchChatGeneration = 0;

  const twitchChatSubscriptions = new Set();
  const twitchChatSeenMessages = new Set();

  const TWITCH_EVENTSUB_URL =
    'wss://eventsub.wss.twitch.tv/ws';

  // ==========================================
  // EMOJI FILTER
  // ==========================================

  function cleanTTSMessage(input) {
    let text = String(input ?? '');

    // Twitch-Emotes in Textform entfernen.
    text = text.replace(
      /(?:^|\s)(?:Kappa|PogChamp|LUL|BibleThump|DansGame|HeyGuys|NotLikeThis|VoHiYo|ResidentSleeper|Kreygasm|CoolCat|SeemsGood|TriHard|4Head|Pog|OMEGALUL|KEKW)(?=\s|$)/gi,
      ' '
    );

    // Links nicht vorlesen.
    text = text.replace(
      /https?:\/\/[^\s]+/gi,
      ' '
    );

    // Unicode-Emojis und verbundene Emoji-Sequenzen.
    text = text.replace(
      /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E|\p{Emoji_Modifier})?)*/gu,
      ' '
    );

    // Länderflaggen.
    text = text.replace(
      /[\u{1F1E6}-\u{1F1FF}]{2}/gu,
      ' '
    );

    // Keycap-Emojis.
    text = text.replace(
      /[0-9#*]\uFE0F?\u20E3/gu,
      ' '
    );

    // Einzelne unsichtbare Emoji-Steuerzeichen.
    text = text.replace(
      /[\u200D\uFE0E\uFE0F\u20E3]/g,
      ''
    );

    return text.replace(/\s+/g, ' ').trim();
  }

  // ==========================================
  // TWITCH EMOTES AUS NACHRICHT ENTFERNEN
  // ==========================================

  function removeTwitchEmotes(message, fragments) {
    if (!Array.isArray(fragments) || !fragments.length) {
      return String(message ?? '');
    }

    return fragments
      .filter(fragment => fragment.type !== 'emote')
      .map(fragment => fragment.text || '')
      .join('');
  }

  // ==========================================
  // TTS SPRACHEN
  // ==========================================

  let availableVoices = [];
  let ttsQueue = [];
  let ttsSpeaking = false;
  let ttsCurrentUtterance = null;
  let ttsWatchdog = null;

  function loadTTSVoices() {
    if (!('speechSynthesis' in window)) return;

    availableVoices =
      window.speechSynthesis.getVoices();

    const select =
      $('voice') ||
      $('ttsVoice') ||
      $('voiceSelect');

    if (!select) return;

    const currentValue =
      settings.voice || select.value;

    select.innerHTML = '';

    const automatic = document.createElement('option');
    automatic.value = '';
    automatic.textContent =
      'Automatische deutsche Stimme';

    select.appendChild(automatic);

    availableVoices.forEach(voice => {
      const option = document.createElement('option');

      option.value = voice.name;
      option.textContent =
        `${voice.name} (${voice.lang})`;

      select.appendChild(option);
    });

    select.value = currentValue;

    if (select.value !== currentValue) {
      select.value = '';
    }
  }

  function getTTSVoice() {
    if (!availableVoices.length) {
      availableVoices =
        speechSynthesis.getVoices();
    }

    if (settings.voice) {
      const selected = availableVoices.find(
        voice => voice.name === settings.voice
      );

      if (selected) return selected;
    }

    // Bevorzugt deutsche Stimmen.
    const germanVoices = availableVoices.filter(
      voice => voice.lang.toLowerCase().startsWith('de')
    );

    // Bestehende männliche Stimme nach Möglichkeit behalten.
    const preferred = germanVoices.find(
      voice => /conrad|stefan|markus|male|daniel|florian/i.test(
        voice.name
      )
    );

    return preferred ||
      germanVoices[0] ||
      availableVoices[0] ||
      null;
  }

  function initTTSVoices() {
    if (!('speechSynthesis' in window)) {
      setText('ttsStatus', 'NICHT VERFÜGBAR');
      return;
    }

    loadTTSVoices();

    speechSynthesis.addEventListener?.(
      'voiceschanged',
      loadTTSVoices
    );

    const select =
      $('voice') ||
      $('ttsVoice') ||
      $('voiceSelect');

    if (select) {
      select.addEventListener('change', () => {
        settings.voice = select.value;
        saveSettings();
      });
    }
  }

  // ==========================================
  // TTS WARTESCHLANGE
  // ==========================================

  function updateTTSStatus() {
    const enabled =
      settings.ttsEnabled &&
      'speechSynthesis' in window;

    setText(
      'ttsStatus',
      enabled ? 'AKTIV' : 'INAKTIV'
    );
  }

  function clearTTSWatchdog() {
    if (ttsWatchdog) {
      clearTimeout(ttsWatchdog);
      ttsWatchdog = null;
    }
  }

  function playNextTTS() {
    if (ttsSpeaking || !ttsQueue.length) return;

    if (!settings.ttsEnabled) {
      ttsQueue = [];
      return;
    }

    if (!('speechSynthesis' in window)) return;

    const next = ttsQueue.shift();

    if (!next) return;

    const utterance = new SpeechSynthesisUtterance(
      next.text
    );

    const voice = getTTSVoice();

    if (voice) utterance.voice = voice;

    utterance.lang = voice?.lang || 'de-DE';
    utterance.volume = Math.min(
      1,
      Math.max(0, Number(settings.volume) / 100)
    );
    utterance.rate = Math.min(
      2,
      Math.max(0.5, Number(settings.rate) / 100)
    );

    ttsSpeaking = true;
    ttsCurrentUtterance = utterance;

    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;

      clearTTSWatchdog();
      ttsSpeaking = false;
      ttsCurrentUtterance = null;

      setTimeout(playNextTTS, 150);
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    ttsWatchdog = setTimeout(() => {
      if (ttsCurrentUtterance === utterance) {
        speechSynthesis.cancel();
        finish();
      }
    }, Math.max(20000, next.text.length * 300));

    try {
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('TTS Fehler:', error);
      finish();
    }
  }

  function speak(message, username = '') {
    if (!settings.ttsEnabled) return;

    const cleanMessage = cleanTTSMessage(message);

    // Emoji-only-Nachrichten nicht vorlesen.
    if (!cleanMessage) return;

    let text = cleanMessage;

    if (settings.readNames && username) {
      const cleanName = cleanTTSMessage(username);

      if (cleanName) {
        text = `${cleanName} schreibt: ${cleanMessage}`;
      }
    }

    ttsQueue.push({
      text,
      createdAt: Date.now()
    });

    // Warteschlange begrenzen.
    if (ttsQueue.length > 30) {
      ttsQueue.splice(0, ttsQueue.length - 30);
    }

    playNextTTS();
  }

  function stopTTS() {
    ttsQueue = [];
    clearTTSWatchdog();

    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    ttsSpeaking = false;
    ttsCurrentUtterance = null;
  }

  // ==========================================
  // CHAT-NACHRICHT ANZEIGEN
  // ==========================================

  function addChat(username, message, options = {}) {
    const user = String(username || 'Unbekannt');
    const content = String(message || '');

    const container =
      $('chatMessages') ||
      $('chatList') ||
      $('chatFeed');

    if (container) {
      const item = document.createElement('div');
      item.className = 'chat-message';

      const name = document.createElement('span');
      name.className = 'chat-username';
      name.textContent = user;

      const text = document.createElement('span');
      text.className = 'chat-text';
      text.textContent = content;

      item.appendChild(name);
      item.appendChild(
        document.createTextNode(': ')
      );
      item.appendChild(text);

      container.appendChild(item);

      while (container.children.length > 100) {
        container.firstElementChild.remove();
      }

      container.scrollTop = container.scrollHeight;
    }

    sendOverlayMessage('chat', {
      username: user,
      message: content,
      color: options.color || '',
      badges: options.badges || [],
      timestamp: Date.now()
    });

    if (!options.skipTTS) {
      speak(
        options.ttsMessage ?? content,
        user
      );
    }
  }

  // ==========================================
  // TWITCH CHAT STATUS
  // ==========================================

  function setChatConnectionStatus(connected) {
    setText(
      'chatConnectionStatus',
      connected ? 'VERBUNDEN' : 'GETRENNT'
    );

    setText(
      'twitchChatStatus',
      connected ? 'LIVE-CHAT AKTIV' : 'CHAT OFFLINE'
    );

    const indicator = $('chatStatusIndicator');

    if (indicator) {
      indicator.classList.toggle(
        'online',
        connected
      );
      indicator.classList.toggle(
        'offline',
        !connected
      );
    }
  }

  // ==========================================
  // EVENTSUB WEBSOCKET
  // ==========================================

  function stopTwitchChat() {
    twitchChatShouldRun = false;
    twitchChatGeneration++;

    if (twitchChatReconnectTimer) {
      clearTimeout(twitchChatReconnectTimer);
      twitchChatReconnectTimer = null;
    }

    if (twitchChatSocket) {
      const socket = twitchChatSocket;
      twitchChatSocket = null;

      try {
        socket.close(1000, 'Studio geschlossen');
      } catch (error) {
        console.warn(error);
      }
    }

    twitchChatSessionId = null;
    twitchChatSubscriptions.clear();
    setChatConnectionStatus(false);
  }

  function scheduleTwitchChatReconnect() {
    if (!twitchChatShouldRun) return;
    if (twitchChatReconnectTimer) return;

    twitchChatReconnectTimer = setTimeout(() => {
      twitchChatReconnectTimer = null;
      connectTwitchChatSocket();
    }, 5000);
  }

  function connectTwitchChatSocket(url = TWITCH_EVENTSUB_URL) {
    if (!isTwitchConnected()) return;

    twitchChatShouldRun = true;

    const generation = ++twitchChatGeneration;

    if (twitchChatSocket) {
      try {
        twitchChatSocket.close();
      } catch (error) {
        console.warn(error);
      }
    }

    const socket = new WebSocket(url);
    twitchChatSocket = socket;

    socket.onopen = () => {
      console.log('JC Twitch EventSub WebSocket geöffnet.');
    };

    socket.onmessage = async event => {
      if (generation !== twitchChatGeneration) return;

      let packet;

      try {
        packet = JSON.parse(event.data);
      } catch {
        return;
      }

      const messageType =
        packet.metadata?.message_type;

      const payload = packet.payload || {};

      if (messageType === 'session_welcome') {
        twitchChatSessionId =
          payload.session?.id || null;

        if (!twitchChatSessionId) return;

        setChatConnectionStatus(true);

        try {
          await subscribeTwitchChatEvents(
            twitchChatSessionId
          );
        } catch (error) {
          console.error(
            'EventSub Registrierung fehlgeschlagen:',
            error
          );

          setChatConnectionStatus(false);

          toast(
            'Twitch-Chat konnte nicht aktiviert werden: ' +
            error.message,
            6000
          );
        }
      }

      if (messageType === 'session_reconnect') {
        const reconnectUrl =
          payload.session?.reconnect_url;

        if (reconnectUrl) {
          connectTwitchChatSocket(reconnectUrl);
        }
      }

      if (messageType === 'notification') {
        handleTwitchChatNotification(packet);
      }

      if (messageType === 'revocation') {
        console.warn(
          'Twitch EventSub Berechtigung widerrufen:',
          payload
        );
      }
    };

    socket.onerror = error => {
      console.warn(
        'Twitch WebSocket Fehler:',
        error
      );
    };

    socket.onclose = () => {
      if (generation !== twitchChatGeneration) return;

      setChatConnectionStatus(false);
      scheduleTwitchChatReconnect();
    };
  }

  // ==========================================
  // EVENTSUB CHAT SUBSCRIPTION
  // ==========================================

  async function subscribeTwitchChatEvents(sessionId) {
    const broadcasterId = twitchUser?.id;

    if (!broadcasterId) {
      throw new Error(
        'Twitch-Broadcaster-ID fehlt.'
      );
    }

    const subscription = {
      type: 'channel.chat.message',
      version: '1',
      condition: {
        broadcaster_user_id: broadcasterId,
        user_id: broadcasterId
      },
      transport: {
        method: 'websocket',
        session_id: sessionId
      }
    };

    const result = await twitchApiRequest(
      'eventsub/subscriptions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      }
    );

    for (const entry of result?.data || []) {
      twitchChatSubscriptions.add(entry.id);
    }

    console.log(
      'JC Twitch Chat EventSub registriert.'
    );
  }

  // ==========================================
  // EINGEHENDE CHAT-NACHRICHTEN
  // ==========================================

  function handleTwitchChatNotification(packet) {
    const subscriptionType =
      packet.payload?.subscription?.type;

    if (subscriptionType !== 'channel.chat.message') {
      return;
    }

    const event = packet.payload?.event;

    if (!event) return;

    const messageId =
      event.message_id ||
      packet.metadata?.message_id;

    if (messageId) {
      if (twitchChatSeenMessages.has(messageId)) {
        return;
      }

      twitchChatSeenMessages.add(messageId);

      if (twitchChatSeenMessages.size > 500) {
        const oldest =
          twitchChatSeenMessages.values().next().value;

        twitchChatSeenMessages.delete(oldest);
      }
    }

    const username =
      event.chatter_user_name ||
      event.chatter_user_login ||
      'Unbekannt';

    const message =
      event.message?.text || '';

    const fragments =
      event.message?.fragments || [];

    const withoutEmotes = removeTwitchEmotes(
      message,
      fragments
    );

    addChat(username, message, {
      ttsMessage: withoutEmotes,
      color: event.color || '',
      badges: event.badges || []
    });
  }

  // ==========================================
  // TWITCH CHAT STARTEN
  // ==========================================

  function startTwitchChat() {
    if (!isTwitchConnected()) {
      setChatConnectionStatus(false);
      return;
    }

    if (
      twitchChatSocket &&
      (
        twitchChatSocket.readyState === WebSocket.OPEN ||
        twitchChatSocket.readyState === WebSocket.CONNECTING
      )
    ) {
      return;
    }

    connectTwitchChatSocket();
  }

  // ==========================================
  // CHAT-TEST UND TTS-TEST
  // ==========================================

  function initChatTests() {
    const testChatButton =
      $('testChat') ||
      $('sendTestChat') ||
      $('chatTestButton');

    if (testChatButton) {
      testChatButton.addEventListener(
        'click',
        () => {
          const username =
            $('testUser')?.value ||
            settings.testUser ||
            'FaulieFan';

          const message =
            $('testMessage')?.value ||
            settings.testMessage ||
            'Hallo Faulie! 💜';

          addChat(username, message);
        }
      );
    }

    const testTTSButton =
      $('testTTS') ||
      $('ttsTestButton');

    if (testTTSButton) {
      testTTSButton.addEventListener(
        'click',
        () => {
          speak(
            'Hallo Faulie. Dein Text zu Sprache System funktioniert.',
            'JC StreamTools'
          );
        }
      );
    }

    const stopButton =
      $('stopTTS') ||
      $('ttsStopButton');

    if (stopButton) {
      stopButton.addEventListener(
        'click',
        stopTTS
      );
    }
  }

  // ==========================================
  // TEIL 5 - TWITCH ALERTS
  // JADE & CLARKE
  // ==========================================

  const alertAudio = {
    follow: new Audio(SOUND_FILES.follow),
    sub: new Audio(SOUND_FILES.sub),
    bits: new Audio(SOUND_FILES.bits)
  };

  let alertQueue = [];
  let alertPlaying = false;
  let alertTimer = null;

  const alertEventIds = new Set();

  // ==========================================
  // SOUND SYSTEM
  // ==========================================

  function getAlertVolume() {
    return Math.max(
      0,
      Math.min(
        1,
        Number(settings.soundVolume ?? 80) / 100
      )
    );
  }

  function updateSoundStatus() {
    setText(
      'soundStatus',
      settings.soundEnabled
        ? 'AKTIV'
        : 'DEAKTIVIERT'
    );
  }

  async function playAlertSound(type) {
    if (!settings.soundEnabled) return;

    const audio = alertAudio[type];

    if (!audio) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = getAlertVolume();

      await audio.play();
    } catch (error) {
      console.warn(
        'Alert-Sound konnte nicht abgespielt werden:',
        error
      );
    }
  }

  function stopAlertSounds() {
    Object.values(alertAudio).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  // ==========================================
  // ALERTS AKTIVIERT?
  // ==========================================

  function isAlertEnabled(type) {
    if (type === 'follow') {
      return Boolean(settings.followEnabled);
    }

    if (type === 'sub') {
      return Boolean(settings.subEnabled);
    }

    if (type === 'bits') {
      return Boolean(settings.bitsEnabled);
    }

    return false;
  }

  // ==========================================
  // ALERT TEXT
  // ==========================================

  function getAlertText(type, username, amount = 0) {
    const name = String(username || 'Unbekannt');

    switch (type) {
      case 'follow':
        return `${name} folgt jetzt deinem Kanal!`;

      case 'sub':
        return `${name} hat deinen Kanal abonniert!`;

      case 'bits':
        return `${name} hat ${amount} Bits gespendet!`;

      default:
        return name;
    }
  }

  // ==========================================
  // ALERT WARTESCHLANGE
  // ==========================================

  function queueAlert(
    type,
    username,
    amount = 0,
    options = {}
  ) {
    if (!isAlertEnabled(type) && !options.force) {
      return;
    }

    alertQueue.push({
      type,
      username: String(username || 'Unbekannt'),
      amount: Number(amount) || 0,
      timestamp: Date.now()
    });

    if (alertQueue.length > 30) {
      alertQueue.splice(0, alertQueue.length - 30);
    }

    playNextAlert();
  }

  function playNextAlert() {
    if (alertPlaying || !alertQueue.length) {
      return;
    }

    const alert = alertQueue.shift();

    if (!alert) return;

    alertPlaying = true;

    showAlert(alert);

    const duration = Math.max(
      1000,
      Number(settings.duration || 6) * 1000
    );

    clearTimeout(alertTimer);

    alertTimer = setTimeout(() => {
      hideAlert();
      alertPlaying = false;
      playNextAlert();
    }, duration);
  }

  // ==========================================
  // ALERT ANZEIGEN
  // ==========================================

  function showAlert(alert) {
    const {
      type,
      username,
      amount
    } = alert;

    const title =
      ALERT_LABELS[type] || 'TWITCH ALERT';

    const icon =
      ALERT_ICONS[type] || '★';

    const message = getAlertText(
      type,
      username,
      amount
    );

    const container =
      $('alertPreview') ||
      $('alertContainer') ||
      $('streamAlert');

    if (container) {
      container.classList.add('active');
      container.classList.add('show');

      container.dataset.alertType = type;

      const titleElement =
        container.querySelector(
          '[data-alert-title], .alert-title'
        );

      const messageElement =
        container.querySelector(
          '[data-alert-message], .alert-message'
        );

      const iconElement =
        container.querySelector(
          '[data-alert-icon], .alert-icon'
        );

      if (titleElement) {
        titleElement.textContent = title;
      }

      if (messageElement) {
        messageElement.textContent = message;
      }

      if (iconElement) {
        iconElement.textContent = icon;
      }
    }

    setText('lastAlert', message);
    setText('alertLastEvent', message);

    // Overlay-Nachricht senden.
    sendOverlayMessage('alert', {
      type,
      username,
      amount,
      title,
      icon,
      message,
      duration: Number(settings.duration || 6),
      timestamp: Date.now()
    });

    // Sound abspielen.
    playAlertSound(type);
  }

  function hideAlert() {
    const container =
      $('alertPreview') ||
      $('alertContainer') ||
      $('streamAlert');

    if (!container) return;

    container.classList.remove('active');
    container.classList.remove('show');
  }

  // ==========================================
  // ALERT TESTS
  // ==========================================

  function testAlert(type) {
    const username =
      $('alertUser')?.value ||
      settings.alertUser ||
      'NeonSloth';

    const amount = type === 'bits' ? 100 : 0;

    queueAlert(
      type,
      username,
      amount,
      { force: true }
    );

    toast(
      `${ALERT_LABELS[type] || 'Alert'} wird getestet.`
    );
  }

  function initAlertTests() {
    const testButtons = {
      follow: [
        'testFollow',
        'testFollower',
        'testFollowAlert'
      ],
      sub: [
        'testSub',
        'testSubscription',
        'testSubAlert'
      ],
      bits: [
        'testBits',
        'testBitsAlert'
      ]
    };

    Object.entries(testButtons).forEach(
      ([type, ids]) => {
        ids.forEach(id => {
          const button = $(id);

          if (!button) return;

          button.addEventListener('click', () => {
            testAlert(type);
          });
        });
      }
    );

    document.querySelectorAll(
      '[data-test-alert]'
    ).forEach(button => {
      button.addEventListener('click', () => {
        const type = button.dataset.testAlert;

        if (ALERT_LABELS[type]) {
          testAlert(type);
        }
      });
    });
  }

  // ==========================================
  // EVENTSUB SUBSCRIPTIONS
  // ==========================================

  async function createAlertSubscription(
    type,
    version,
    condition,
    sessionId
  ) {
    const subscription = {
      type,
      version,
      condition,
      transport: {
        method: 'websocket',
        session_id: sessionId
      }
    };

    const response = await twitchApiRequest(
      'eventsub/subscriptions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      }
    );

    for (const entry of response?.data || []) {
      twitchChatSubscriptions.add(entry.id);
    }

    return response;
  }

  // ==========================================
  // FOLLOWER, SUBS UND BITS REGISTRIEREN
  // ==========================================

  async function subscribeTwitchAlertEvents(
    sessionId
  ) {
    const broadcasterId = twitchUser?.id;

    if (!broadcasterId) {
      throw new Error(
        'Twitch Broadcaster-ID fehlt.'
      );
    }

    const subscriptions = [
      {
        type: 'channel.follow',
        version: '2',
        condition: {
          broadcaster_user_id: broadcasterId,
          moderator_user_id: broadcasterId
        }
      },
      {
        type: 'channel.subscribe',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId
        }
      },
      {
        type: 'channel.subscription.gift',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId
        }
      },
      {
        type: 'channel.subscription.message',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId
        }
      },
      {
        type: 'channel.cheer',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId
        }
      }
    ];

    const results = await Promise.allSettled(
      subscriptions.map(subscription =>
        createAlertSubscription(
          subscription.type,
          subscription.version,
          subscription.condition,
          sessionId
        )
      )
    );

    results.forEach((result, index) => {
      const type = subscriptions[index].type;

      if (result.status === 'fulfilled') {
        console.log(
          'EventSub Alert aktiviert:',
          type
        );
      } else {
        console.warn(
          'EventSub Alert fehlgeschlagen:',
          type,
          result.reason
        );
      }
    });

    return results;
  }

  // ==========================================
  // ECHTE TWITCH ALERT EVENTS
  // ==========================================

  function handleTwitchAlertNotification(packet) {
    const type =
      packet.payload?.subscription?.type;

    const event =
      packet.payload?.event;

    if (!type || !event) return;

    const eventId =
      packet.metadata?.message_id;

    if (eventId) {
      if (alertEventIds.has(eventId)) {
        return;
      }

      alertEventIds.add(eventId);

      if (alertEventIds.size > 500) {
        const oldest =
          alertEventIds.values().next().value;

        alertEventIds.delete(oldest);
      }
    }

    switch (type) {
      case 'channel.follow': {
        queueAlert(
          'follow',
          event.user_name ||
          event.user_login ||
          'Neuer Follower'
        );
        break;
      }

      case 'channel.subscribe': {
        queueAlert(
          'sub',
          event.user_name ||
          event.user_login ||
          'Neuer Abonnent'
        );
        break;
      }

      case 'channel.subscription.gift': {
        const username = event.is_anonymous
          ? 'Anonym'
          : event.user_name ||
            event.user_login ||
            'Unbekannt';

        const amount =
          Number(event.total) || 1;

        queueAlert(
          'sub',
          `${username} (${amount} Geschenk-Abos)`
        );
        break;
      }

      case 'channel.subscription.message': {
        // Verlängerungen als Abo-Alert anzeigen.
        queueAlert(
          'sub',
          event.user_name ||
          event.user_login ||
          'Abonnent'
        );
        break;
      }

      case 'channel.cheer': {
        const username = event.is_anonymous
          ? 'Anonym'
          : event.user_name ||
            event.user_login ||
            'Unbekannt';

        queueAlert(
          'bits',
          username,
          Number(event.bits) || 0
        );
        break;
      }
    }
  }

  // ==========================================
  // ALLE EVENTSUB BENACHRICHTIGUNGEN
  // ==========================================

  function handleAllTwitchNotifications(packet) {
    const type =
      packet.payload?.subscription?.type;

    if (type === 'channel.chat.message') {
      handleTwitchChatNotification(packet);
      return;
    }

    if (
      type === 'channel.follow' ||
      type === 'channel.subscribe' ||
      type === 'channel.subscription.gift' ||
      type === 'channel.subscription.message' ||
      type === 'channel.cheer'
    ) {
      handleTwitchAlertNotification(packet);
    }
  }

  // ==========================================
  // EVENTSUB KOMPLETT AKTIVIEREN
  // ==========================================

  async function subscribeAllTwitchEvents(
    sessionId
  ) {
    const results = await Promise.allSettled([
      subscribeTwitchChatEvents(sessionId),
      subscribeTwitchAlertEvents(sessionId)
    ]);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(
          index === 0
            ? 'Twitch Chat konnte nicht registriert werden.'
            : 'Twitch Alerts konnten nicht registriert werden.',
          result.reason
        );
      }
    });

    return results;
  }

  // ==========================================
  // ALERT INITIALISIERUNG
  // ==========================================

  function initAlerts() {
    initAlertTests();
    updateSoundStatus();

    Object.values(alertAudio).forEach(audio => {
      audio.preload = 'auto';
      audio.volume = getAlertVolume();
    });
  }

  // ==========================================
  // TEIL 6 - OBS, BACKUP, SETTINGS & START
  // JC NEON STUDIO 2.2
  // JADE & CLARKE
  // ==========================================

  // ==========================================
  // OBS OVERLAY URLS
  // ==========================================

  const JC_OVERLAY_BASE =
    'https://juliansickert8-pixel.github.io/jc-neon-studio/';

  function getOverlayURL(type = 'all') {
    const url = new URL(
      'overlay.html',
      JC_OVERLAY_BASE
    );

    url.searchParams.set('type', type);

    return url.toString();
  }

  function openOBSOverlay(type = 'all') {
    const url = getOverlayURL(type);

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }

  async function copyOBSOverlay(type = 'all') {
    const url = getOverlayURL(type);

    try {
      await navigator.clipboard.writeText(url);
      toast('OBS-Overlay-Link kopiert!');
    } catch (error) {
      console.warn('Kopieren fehlgeschlagen:', error);
      window.prompt(
        'Kopiere diesen OBS-Link:',
        url
      );
    }
  }

  function initOBSOverlays() {
    const overlayButtons = [
      ['openOverlay', 'all'],
      ['openChatOverlay', 'chat'],
      ['openAlertOverlay', 'alerts'],
      ['openAlertsOverlay', 'alerts']
    ];

    overlayButtons.forEach(([id, type]) => {
      const button = $(id);

      if (!button) return;

      button.addEventListener('click', () => {
        openOBSOverlay(type);
      });
    });

    const copyButtons = [
      ['copyOverlay', 'all'],
      ['copyOverlayUrl', 'all'],
      ['copyChatOverlay', 'chat'],
      ['copyAlertOverlay', 'alerts']
    ];

    copyButtons.forEach(([id, type]) => {
      const button = $(id);

      if (!button) return;

      button.addEventListener('click', () => {
        copyOBSOverlay(type);
      });
    });

    document.querySelectorAll(
      '[data-open-overlay]'
    ).forEach(button => {
      button.addEventListener('click', () => {
        openOBSOverlay(
          button.dataset.openOverlay || 'all'
        );
      });
    });

    document.querySelectorAll(
      '[data-copy-overlay]'
    ).forEach(button => {
      button.addEventListener('click', () => {
        copyOBSOverlay(
          button.dataset.copyOverlay || 'all'
        );
      });
    });

    setText(
      'overlayURL',
      getOverlayURL('all')
    );

    const overlayInput = $('overlayUrl');

    if (overlayInput) {
      overlayInput.value = getOverlayURL('all');
    }
  }

  // ==========================================
  // SETTINGS - STORAGE
  // ==========================================

  const JC_BACKUP_VERSION = '2.2';

  function saveJCSettings() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(settings)
      );

      return true;
    } catch (error) {
      console.error(
        'Einstellungen konnten nicht gespeichert werden:',
        error
      );

      return false;
    }
  }

  function updateJCSetting(name, value) {
    settings[name] = value;

    saveJCSettings();

    if (name === 'soundVolume') {
      Object.values(alertAudio).forEach(audio => {
        audio.volume = getAlertVolume();
      });
    }

    if (name === 'soundEnabled') {
      updateSoundStatus();

      if (!value) {
        stopAlertSounds();
      }
    }
  }

  // ==========================================
  // SETTINGS - BEDIENELEMENTE
  // ==========================================

  function initJCSettings() {
    document.querySelectorAll(
      '[data-setting]'
    ).forEach(element => {
      const name = element.dataset.setting;

      if (!name) return;

      if (!Object.prototype.hasOwnProperty.call(
        settings,
        name
      )) {
        return;
      }

      const value = settings[name];

      if (element.type === 'checkbox') {
        element.checked = Boolean(value);
      } else {
        element.value = value;
      }

      const eventName =
        element.type === 'range'
          ? 'input'
          : 'change';

      element.addEventListener(
        eventName,
        () => {
          let nextValue;

          if (element.type === 'checkbox') {
            nextValue = element.checked;
          } else if (
            element.type === 'range' ||
            element.type === 'number'
          ) {
            nextValue = Number(element.value);
          } else {
            nextValue = element.value;
          }

          updateJCSetting(name, nextValue);
        }
      );
    });

    const saveButton =
      $('saveSettings') ||
      $('saveSettingsBtn');

    if (saveButton) {
      saveButton.addEventListener(
        'click',
        () => {
          saveJCSettings();
          toast('Einstellungen gespeichert!');
        }
      );
    }
  }

  // ==========================================
  // BACKUP EXPORT
  // ==========================================

  function exportJCBackup() {
    const backup = {
      application: 'JC Neon Studio',
      version: JC_BACKUP_VERSION,
      developer: 'Jade & Clarke',
      createdAt: new Date().toISOString(),
      settings: { ...settings }
    };

    const json = JSON.stringify(
      backup,
      null,
      2
    );

    const blob = new Blob(
      [json],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);

    const date = new Date()
      .toISOString()
      .slice(0, 10);

    const link = document.createElement('a');

    link.href = url;

    link.download =
      `JC-Neon-Studio-Backup-${date}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    toast('Backup wurde erstellt!');
  }

  // ==========================================
  // BACKUP IMPORT
  // ==========================================

  async function importJCBackup(file) {
    if (!file) return;

    try {
      if (file.size > 1024 * 1024) {
        throw new Error(
          'Die Backup-Datei ist zu groß.'
        );
      }

      const content = await file.text();
      const backup = JSON.parse(content);

      if (
        backup.application !== 'JC Neon Studio' ||
        !backup.settings ||
        typeof backup.settings !== 'object' ||
        Array.isArray(backup.settings)
      ) {
        throw new Error(
          'Ungültige JC Neon Studio Backup-Datei.'
        );
      }

      const importedSettings = {};

      for (const [key, value] of Object.entries(
        backup.settings
      )) {
        if (
          Object.prototype.hasOwnProperty.call(
            settings,
            key
          ) &&
          ['string', 'number', 'boolean'].includes(
            typeof value
          )
        ) {
          importedSettings[key] = value;
        }
      }

      Object.assign(
        settings,
        importedSettings
      );

      if (!saveJCSettings()) {
        throw new Error(
          'Das Backup konnte nicht gespeichert werden.'
        );
      }

      toast(
        'Backup importiert! Die Seite wird neu geladen.'
      );

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error(error);

      toast(
        'Backup-Import fehlgeschlagen: ' +
        error.message
      );
    }
  }

  // ==========================================
  // BACKUP BUTTONS
  // ==========================================

  function initJCBackup() {
    const exportButtons = [
      'exportBackup',
      'backupExport',
      'downloadBackup'
    ];

    exportButtons.forEach(id => {
      const button = $(id);

      if (!button) return;

      button.addEventListener(
        'click',
        exportJCBackup
      );
    });

    const importButtons = [
      'importBackup',
      'backupImport',
      'restoreBackup'
    ];

    let fileInput =
      $('backupFile') ||
      $('backupInput');

    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,application/json';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }

    fileInput.addEventListener(
      'change',
      async () => {
        const file = fileInput.files?.[0];

        await importJCBackup(file);

        fileInput.value = '';
      }
    );

    importButtons.forEach(id => {
      const button = $(id);

      if (!button) return;

      button.addEventListener('click', () => {
        fileInput.click();
      });
    });
  }

  // ==========================================
  // RESET SETTINGS
  // ==========================================

  function resetJCSettings() {
    const confirmed = window.confirm(
      'Möchtest du alle JC Neon Studio ' +
      'Einstellungen zurücksetzen?'
    );

    if (!confirmed) return;

    localStorage.removeItem(KEY);

    toast(
      'Einstellungen zurückgesetzt!'
    );

    setTimeout(() => {
      window.location.reload();
    }, 600);
  }

  function initJCReset() {
    [
      'resetSettings',
      'resetAllSettings',
      'factoryReset'
    ].forEach(id => {
      const button = $(id);

      if (!button) return;

      button.addEventListener(
        'click',
        resetJCSettings
      );
    });
  }

  // ==========================================
  // CONNECTION STATUS
  // ==========================================

  function updateJCConnectionStatus() {
    const connected = Boolean(
      twitchUser &&
      twitchAccessToken
    );

    const username =
      twitchUser?.display_name ||
      twitchUser?.login ||
      '';

    setTwitchStatus(
      connected,
      username
    );
  }

  // ==========================================
  // INITIALISIERUNG
  // ==========================================

  let jcStudioInitialized = false;

  async function initJCNeonStudio() {
    if (jcStudioInitialized) return;

    jcStudioInitialized = true;

    console.log(
      '%cJC NEON STUDIO 2.2',
      'color:#c084fc;font-size:20px;font-weight:bold'
    );

    console.log(
      'Developed by Jade & Clarke'
    );

    try {
      // OBS
      initOBSOverlays();

      // Einstellungen
      initJCSettings();

      // Backup
      initJCBackup();

      // Reset
      initJCReset();

      // Alerts und Sounds
      initAlerts();

      // Twitch-Verbindungsstatus
      updateJCConnectionStatus();

      // Twitch OAuth Callback
      if (
        typeof handleTwitchOAuthCallback ===
        'function'
      ) {
        await handleTwitchOAuthCallback();
      }

      // Gespeicherte Twitch-Anmeldung prüfen
      if (
        typeof restoreTwitchSession ===
        'function'
      ) {
        await restoreTwitchSession();
      }

      // Twitch Button aktivieren
      if (
        typeof initTwitchConnection ===
        'function'
      ) {
        initTwitchConnection();
      }

      // Twitch-Status aktualisieren
      updateJCConnectionStatus();

      console.log(
        'JC Neon Studio initialisiert.'
      );
    } catch (error) {
      console.error(
        'JC Neon Studio Startfehler:',
        error
      );

      toast(
        'Ein Teil der Anwendung konnte nicht gestartet werden.'
      );
    }
  }

  // ==========================================
  // START NACH DEM LADEN
  // ==========================================

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initJCNeonStudio,
      { once: true }
    );
  } else {
    initJCNeonStudio();
  }

})(); // ENDE DER APP.JS
