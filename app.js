
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

  function setChecked(id, value) {
    const element = $(id);
    if (element) element.checked = Boolean(value);
  }

  function getNumber(id, fallback = 0) {
    const element = $(id);
    if (!element) return fallback;

    const value = Number(element.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

      .replace(/'/g, '&#039;');
  }

  function formatPercent(value) {
    return `${Math.round(Number(value) || 0)} %`;
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  const PAGE_TITLES = {
    dashboard: 'Dein Stream. Deine Kontrolle.',
    tts: 'Chat & Text-to-Speech',
    alerts: 'Stream-Alerts',
    overlay: 'OBS-Overlays',
    settings: 'Studio-Einstellungen'
  };

  function showPage(pageId) {
    const page = $(pageId);
    if (!page) return;

    document.querySelectorAll('.page').forEach(element => {
      element.classList.toggle(
        'active',
        element.id === pageId
      );
    });

    document.querySelectorAll('.nav').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.page === pageId
      );
    });

    setText(
      'pageTitle',
      PAGE_TITLES[pageId] || 'JC Neon Studio'
    );

    if (pageId === 'overlay') {
      refreshOverlayPreview();
    }
  }

  function setupNavigation() {
    document.querySelectorAll('[data-page]').forEach(button => {
      button.addEventListener('click', () => {
        showPage(button.dataset.page);
      });
    });

    document.querySelectorAll('[data-goto]').forEach(button => {
      button.addEventListener('click', () => {
        showPage(button.dataset.goto);
      });
    });
  }

  // ==========================================
  // DESIGN / THEME
  // ==========================================

  function applyTheme() {
    document.documentElement.dataset.accent =
      settings.accent || 'purple';

    document.body.dataset.accent =
      settings.accent || 'purple';
  }

  function applyMotion() {
    document.documentElement.classList.toggle(
      'reduce-motion',
      !settings.motion
    );

    document.body.classList.toggle(
      'reduce-motion',
      !settings.motion
    );
  }

  function setupThemeControls() {
    const accent = $('accent');

    if (accent) {
      accent.addEventListener('change', () => {
        updateSetting('accent', accent.value);
        applyTheme();
        syncOverlaySettings();
      });
    }

    const motion = $('motion');

    if (motion) {
      motion.addEventListener('change', () => {
        updateSetting('motion', motion.checked);
        applyMotion();
        syncOverlaySettings();
      });
    }

    $('resetSettings')?.addEventListener(
      'click',
      resetSettings
    );
  }

  // ==========================================
  // EMOJI-FILTER FÜR TTS
  // ==========================================

  function cleanTTSMessage(value) {
    let text = String(value ?? '');

    text = text.replace(
      /https?:\/\/\S+/gi,
      ''
    );

    text = text.replace(
      /www\.\S+/gi,
      ''
    );

    text = text.replace(
      /[\u{1F1E6}-\u{1F1FF}]{2}/gu,
      ''
    );

    text = text.replace(
      /[0-9#*]\uFE0F?\u20E3/gu,
      ''
    );

    text = text.replace(
      /[\u{1F3FB}-\u{1F3FF}]/gu,
      ''
    );

    text = text.replace(
      /[\uFE0E\uFE0F\u200D]/gu,
      ''
    );

    text = text.replace(
      /\p{Extended_Pictographic}/gu,
      ''
    );

    text = text.replace(
      /[\u{E0020}-\u{E007F}]/gu,
      ''
    );

    text = text.replace(
      /\s+/g,
      ' '
    );

    return text.trim();
  }

  // ==========================================
  // TEXT-TO-SPEECH
  // ==========================================

  const synth = window.speechSynthesis;
  let availableVoices = [];
  let speechQueue = [];
  let speaking = false;

  function getVoices() {
    if (!synth) return [];

    availableVoices = synth.getVoices() || [];

    return availableVoices;
  }

  function populateVoices() {
    const select = $('voiceSelect');
    if (!select) return;

    const previous = settings.voice || select.value;

    select.innerHTML = '';

    const voices = getVoices();

    if (!voices.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Browser-Standardstimme';
      select.appendChild(option);
      return;
    }

    const german = voices.filter(voice =>
      voice.lang?.toLowerCase().startsWith('de')
    );

    const other = voices.filter(voice =>
      !voice.lang?.toLowerCase().startsWith('de')
    );

    const sortedVoices = [...german, ...other];

    sortedVoices.forEach(voice => {
      const option = document.createElement('option');

      option.value = voice.name;
      option.textContent =
        `${voice.name} (${voice.lang})`;

      select.appendChild(option);
    });

    const preferredVoice =
      sortedVoices.find(voice =>
        voice.name === previous
      ) ||
      sortedVoices.find(voice =>
        voice.name.includes('Microsoft Stefan')
      ) ||
      german.find(voice =>
        /male|männlich|stefan/i.test(voice.name)
      ) ||
      german[0] ||
      sortedVoices[0];

    if (preferredVoice) {
      select.value = preferredVoice.name;

      if (settings.voice !== preferredVoice.name) {
        updateSetting('voice', preferredVoice.name);
      }
    }
  }

  function getSelectedVoice() {
    const voices = getVoices();

    return (
      voices.find(voice =>
        voice.name === settings.voice
      ) ||
      voices.find(voice =>
        voice.name.includes('Microsoft Stefan')
      ) ||
      voices.find(voice =>
        voice.lang?.toLowerCase().startsWith('de')
      ) ||
      null
    );
  }

  function updateTTSStatus() {
    const enabled = Boolean(settings.ttsEnabled);

    setText(
      'ttsStatus',
      enabled ? 'AKTIV' : 'DEAKTIVIERT'
    );

    setText(
      'ttsInfo',
      enabled
        ? 'Browser-Sprachausgabe aktiviert'
        : 'Browser-Sprachausgabe deaktiviert'
    );

    setText(
      'ttsVolumeValue',
      formatPercent(settings.volume)
    );

    setText(
      'ttsRateValue',
      formatPercent(settings.rate)
    );
  }

  function stopTTS() {
    speechQueue = [];
    speaking = false;

    if (synth) {
      synth.cancel();
    }

    updateSpeechQueueStatus();
  }

  function updateSpeechQueueStatus() {
    setText(
      'ttsQueueCount',
      String(speechQueue.length)
    );
  }

  function speakNext() {
    if (!synth || speaking) return;

    if (!speechQueue.length) {
      updateSpeechQueueStatus();
      return;
    }

    const next = speechQueue.shift();

    updateSpeechQueueStatus();

    if (!next || !settings.ttsEnabled) {
      speakNext();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      next.text
    );

    const selectedVoice = getSelectedVoice();

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'de-DE';
    }

    utterance.volume = Math.min(
      1,
      Math.max(0, Number(settings.volume) / 100)
    );

    utterance.rate = Math.min(
      2,
      Math.max(0.1, Number(settings.rate) / 100)
    );

    speaking = true;

    utterance.onend = () => {
      speaking = false;
      speakNext();
    };

    utterance.onerror = event => {
      console.warn(
        'TTS-Wiedergabefehler:',
        event.error
      );

      speaking = false;
      speakNext();
    };

    try {
      synth.speak(utterance);
    } catch (error) {
      console.error(
        'TTS konnte nicht gestartet werden:',
        error
      );

      speaking = false;
      speakNext();
    }
  }

  function speakMessage(username, message) {
    if (!settings.ttsEnabled || !synth) return;

    const cleanMessage = cleanTTSMessage(message);

    if (!cleanMessage) return;

    const cleanUsername = cleanTTSMessage(username);

    const spokenText =
      settings.readNames && cleanUsername
        ? `${cleanUsername} schreibt: ${cleanMessage}`
        : cleanMessage;

    speechQueue.push({
      text: spokenText,
      timestamp: Date.now()
    });

    updateSpeechQueueStatus();
    speakNext();
  }

  function setupTTSControls() {
    populateVoices();

    if (synth) {
      synth.addEventListener?.(
        'voiceschanged',
        populateVoices
      );
    }

    const enabled = $('ttsEnabled');

    if (enabled) {
      enabled.checked = Boolean(settings.ttsEnabled);

      enabled.addEventListener('change', () => {
        updateSetting(
          'ttsEnabled',
          enabled.checked
        );

        if (!enabled.checked) {
          stopTTS();
        }

        updateTTSStatus();
      });
    }

    const readNames = $('readNames');

    if (readNames) {
      readNames.checked = Boolean(settings.readNames);

      readNames.addEventListener('change', () => {
        updateSetting(
          'readNames',
          readNames.checked
        );
      });
    }

    const voiceSelect = $('voiceSelect');

    if (voiceSelect) {
      voiceSelect.addEventListener('change', () => {
        updateSetting(
          'voice',
          voiceSelect.value
        );
      });
    }

    const volume = $('ttsVolume');

    if (volume) {
      volume.value = settings.volume;

      volume.addEventListener('input', () => {
        updateSetting(
          'volume',
          Number(volume.value)
        );

        updateTTSStatus();
      });
    }

    const rate = $('ttsRate');

    if (rate) {
      rate.value = settings.rate;

      rate.addEventListener('input', () => {
        updateSetting(
          'rate',
          Number(rate.value)
        );

        updateTTSStatus();
      });
    }

    $('stopTTS')?.addEventListener(
      'click',
      stopTTS
    );

    $('testTTS')?.addEventListener('click', () => {
      speakMessage(
        settings.testUser || 'Faulie_Gamer',
        settings.testMessage ||
          'Hallo Faulie! Dein Text-to-Speech funktioniert.'
      );
    });

    updateTTSStatus();
  }

  // ==========================================
  // CHAT / TESTNACHRICHTEN
  // ==========================================

  const chatMessages = [];
  const MAX_CHAT_MESSAGES = 100;

  function addChatMessage(username, message, options = {}) {
    const user = String(username || 'Unbekannt');
    const text = String(message || '');

    if (!text.trim()) return;

    const chatMessage = {
      id: crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random()}`,
      username: user,
      message: text,
      timestamp: Date.now(),
      source: options.source || 'local'
    };

    chatMessages.push(chatMessage);

    if (chatMessages.length > MAX_CHAT_MESSAGES) {
      chatMessages.shift();
    }

    renderChatMessage(chatMessage);

    if (options.tts !== false) {
      speakMessage(user, text);
    }

    if (options.overlay !== false) {
      broadcastOverlayEvent({
        type: 'chat',
        username: user,
        message: text,
        timestamp: chatMessage.timestamp
      });
    }
  }

  function renderChatMessage(item) {
    const container =
      $('chatMessages') ||
      $('chatFeed') ||
      $('chatList');

    if (!container) return;

    const row = document.createElement('div');
    row.className = 'chat-message';

    const username = document.createElement('strong');
    username.className = 'chat-username';
    username.textContent = `${item.username}: `;

    const message = document.createElement('span');
    message.className = 'chat-text';
    message.textContent = item.message;

    row.append(username, message);
    container.appendChild(row);

    while (
      container.children.length > MAX_CHAT_MESSAGES
    ) {
      container.firstElementChild.remove();
    }

    container.scrollTop = container.scrollHeight;
  }

  function sendTestChatMessage() {
    const userInput =
      $('testUser') ||
      $('chatTestUser');

    const messageInput =
      $('testMessage') ||
      $('chatInput');

    const username =
      userInput?.value.trim() ||
      settings.testUser ||
      'Faulie_Gamer';

    const message =
      messageInput?.value.trim() || '';

    if (!message) {
      toast('Bitte zuerst eine Nachricht eingeben.');
      return;
    }

    updateSetting('testUser', username);
    updateSetting('testMessage', message);

    addChatMessage(username, message, {
      source: 'test'
    });

    if (messageInput) {
      messageInput.value = '';
      messageInput.focus();
    }

    toast('Testnachricht gesendet.');
  }

  function setupChatControls() {
    const sendButton =
      $('sendTestChat') ||
      $('sendChat') ||
      $('testChatButton');

    sendButton?.addEventListener(
      'click',
      sendTestChatMessage
    );

    const messageInput =
      $('testMessage') ||
      $('chatInput');

    messageInput?.addEventListener(
      'keydown',
      event => {
        if (
          event.key === 'Enter' &&
          !event.shiftKey
        ) {
          event.preventDefault();
          sendTestChatMessage();
        }
      }
    );

    $('clearChat')?.addEventListener('click', () => {
      chatMessages.length = 0;

      const container =
        $('chatMessages') ||
        $('chatFeed') ||
        $('chatList');

      if (container) {
        container.replaceChildren();
      }

      toast('Chatverlauf geleert.');
    });
  }

  // ==========================================
  // ENDE TEIL 3
  // ==========================================

  // ==========================================
  // TEIL 4 - TWITCH OAUTH 2.0 / PKCE
  // JADE & CLARKE - JC NEON STUDIO
  // ==========================================

  let twitchAuth = null;
  let twitchUser = null;
  let twitchTokenCheckTimer = null;

  // ==========================================
  // PKCE HILFSFUNKTIONEN
  // ==========================================

  function generateRandomString(length = 64) {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
      'abcdefghijklmnopqrstuvwxyz' +
      '0123456789-._~';

    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    return Array.from(
      bytes,
      byte => characters[byte % characters.length]
    ).join('');
  }

  function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);

    let binary = '';

    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  async function createCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);

    const digest = await crypto.subtle.digest(
      'SHA-256',
      data
    );

    return base64UrlEncode(digest);
  }

  // ==========================================
  // TWITCH AUTH SPEICHERN
  // ==========================================

  function saveTwitchAuth(auth) {
    twitchAuth = auth;

    if (!auth) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    writeStorage(AUTH_STORAGE_KEY, auth);
  }

  function loadTwitchAuth() {
    const saved = readStorage(AUTH_STORAGE_KEY);

    if (!saved || !saved.accessToken) {
      return null;
    }

    twitchAuth = saved;
    return saved;
  }

  function isTwitchConnected() {
    return Boolean(
      twitchAuth &&
      twitchAuth.accessToken &&
      twitchUser &&
      twitchUser.id
    );
  }

  function getTwitchUsername() {
    return (
      twitchUser?.display_name ||
      twitchUser?.login ||
      ''
    );
  }

  // ==========================================
  // TWITCH STATUS ANZEIGEN
  // ==========================================

  function setTwitchStatus(
    connected = false,
    username = ''
  ) {
    const badge =
      $('twitchStatus') ||
      $('connectionStatus') ||
      $('twitchBadge');

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
      connected
        ? `Angemeldet als ${username}`
        : 'Nicht verbunden'
    );

    setText(
      'twitchUsername',
      connected ? username : ''
    );

    setText(
      'connectedUser',
      connected ? username : ''
    );

    const connectionCard =
      $('twitchConnection') ||
      $('twitchConnectionStatus');

    if (connectionCard) {
      connectionCard.textContent = connected
        ? 'ONLINE'
        : 'OFFLINE';
    }

    const connectionIndicator =
      $('connectionIndicator');

    if (connectionIndicator) {
      connectionIndicator.classList.toggle(
        'connected',
        connected
      );
    }
  }

  // ==========================================
  // TWITCH LOGIN STARTEN
  // ==========================================

  async function connectTwitch() {
    if (!window.crypto?.subtle) {
      toast(
        'Sichere HTTPS-Verbindung für Twitch erforderlich.',
        6000
      );
      return;
    }

    try {
      const verifier = generateRandomString(96);
      const challenge =
        await createCodeChallenge(verifier);

      const state = generateRandomString(48);

      sessionStorage.setItem(
        PKCE_STORAGE_KEY,
        JSON.stringify({
          verifier,
          state,
          createdAt: Date.now()
        })
      );

      const params = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        redirect_uri: TWITCH_REDIRECT_URI,
        response_type: 'code',
        scope: TWITCH_SCOPES.join(' '),
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        force_verify: 'false'
      });

      const authorizeURL =
        'https://id.twitch.tv/oauth2/authorize?' +
        params.toString();

      window.location.assign(authorizeURL);

    } catch (error) {
      console.error(
        'Twitch Login konnte nicht gestartet werden:',
        error
      );

      toast(
        'Twitch-Anmeldung konnte nicht gestartet werden.',
        6000
      );
    }
  }

  // ==========================================
  // OAUTH CALLBACK VERARBEITEN
  // ==========================================

  async function handleTwitchOAuthCallback() {
    const params = new URLSearchParams(
      window.location.search
    );

    const code = params.get('code');
    const state = params.get('state');

    const oauthError = params.get('error');

    if (oauthError) {
      const description =
        params.get('error_description') ||
        oauthError;

      console.error(
        'Twitch OAuth Fehler:',
        description
      );

      toast(
        'Twitch-Anmeldung abgebrochen: ' + description,
        7000
      );

      cleanOAuthURL();
      return false;
    }

    if (!code) {
      return false;
    }

    let pkce = null;

    try {
      pkce = JSON.parse(
        sessionStorage.getItem(PKCE_STORAGE_KEY)
      );
    } catch (error) {
      console.warn(
        'PKCE-Daten konnten nicht gelesen werden:',
        error
      );
    }

    if (
      !pkce ||
      !pkce.verifier ||
      !pkce.state ||
      pkce.state !== state ||
      Date.now() - pkce.createdAt > 600000
    ) {
      console.error(
        'Twitch OAuth State oder PKCE ungültig.'
      );

      toast(
        'Twitch-Anmeldung abgelaufen. Bitte erneut verbinden.',
        7000
      );

      sessionStorage.removeItem(PKCE_STORAGE_KEY);
      cleanOAuthURL();
      return false;
    }

    try {
      const body = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: TWITCH_REDIRECT_URI,
        code_verifier: pkce.verifier
      });

      const response = await fetch(
        'https://id.twitch.tv/oauth2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded'
          },
          body: body.toString()
        }
      );

      const data = await response.json();

      if (!response.ok || !data.access_token) {
        throw new Error(
          data.message ||
          'Twitch hat kein Access Token zurückgegeben.'
        );
      }

      saveTwitchAuth({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        tokenType: data.token_type || 'bearer',
        scopes: data.scope || [],
        expiresAt:
          Date.now() +
          Number(data.expires_in || 0) * 1000,
        createdAt: Date.now()
      });

      sessionStorage.removeItem(PKCE_STORAGE_KEY);

      cleanOAuthURL();

      const user = await fetchTwitchUser();

      if (!user) {
        throw new Error(
          'Twitch-Benutzer konnte nicht geladen werden.'
        );
      }

      twitchUser = user;

      setTwitchStatus(
        true,
        getTwitchUsername()
      );

      toast(
        `Twitch erfolgreich verbunden: ${getTwitchUsername()}`,
        5000
      );

      console.log(
        'Twitch OAuth erfolgreich:',
        getTwitchUsername()
      );

      return true;

    } catch (error) {
      console.error(
        'Twitch OAuth Callback Fehler:',
        error
      );

      saveTwitchAuth(null);
      twitchUser = null;

      sessionStorage.removeItem(PKCE_STORAGE_KEY);
      cleanOAuthURL();

      setTwitchStatus(false);

      toast(
        'Twitch-Anmeldung fehlgeschlagen: ' +
        error.message,
        7000
      );

      return false;
    }
  }

  function cleanOAuthURL() {
    const cleanURL =
      window.location.origin +
      window.location.pathname;

    window.history.replaceState(
      {},
      document.title,
      cleanURL
    );
  }

  // ==========================================
  // TWITCH BENUTZER LADEN
  // ==========================================

  async function fetchTwitchUser() {
    if (!twitchAuth?.accessToken) {
      return null;
    }

    const response = await fetch(
      'https://api.twitch.tv/helix/users',
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization':
            `Bearer ${twitchAuth.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        'Twitch Benutzerabfrage fehlgeschlagen: ' +
        response.status
      );
    }

    const data = await response.json();

    return data.data?.[0] || null;
  }

  // ==========================================
  // TOKEN VALIDIEREN
  // ==========================================

  async function validateTwitchToken() {
    if (!twitchAuth?.accessToken) {
      return false;
    }

    try {
      const response = await fetch(
        'https://id.twitch.tv/oauth2/validate',
        {
          headers: {
            Authorization:
              `OAuth ${twitchAuth.accessToken}`
          }
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      if (
        data.client_id !== TWITCH_CLIENT_ID
      ) {
        return false;
      }

      return true;

    } catch (error) {
      console.error(
        'Twitch Token Validierung fehlgeschlagen:',
        error
      );

      return false;
    }
  }

  // ==========================================
  // TOKEN ERNEUERN
  // ==========================================

  async function refreshTwitchToken() {
    if (!twitchAuth?.refreshToken) {
      return false;
    }

    try {
      const body = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: twitchAuth.refreshToken
      });

      const response = await fetch(
        'https://id.twitch.tv/oauth2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded'
          },
          body: body.toString()
        }
      );

      const data = await response.json();

      if (!response.ok || !data.access_token) {
        return false;
      }

      saveTwitchAuth({
        ...twitchAuth,
        accessToken: data.access_token,
        refreshToken:
          data.refresh_token ||
          twitchAuth.refreshToken,
        expiresAt:
          Date.now() +
          Number(data.expires_in || 0) * 1000,
        scopes:
          data.scope ||
          twitchAuth.scopes
      });

      return true;

    } catch (error) {
      console.error(
        'Twitch Token Refresh Fehler:',
        error
      );

      return false;
    }
  }

  // ==========================================
  // GESPEICHERTE SITZUNG WIEDERHERSTELLEN
  // ==========================================

  async function restoreTwitchSession() {
    loadTwitchAuth();

    if (!twitchAuth?.accessToken) {
      setTwitchStatus(false);
      return false;
    }

    try {
      let valid = await validateTwitchToken();

      if (!valid) {
        const refreshed =
          await refreshTwitchToken();

        if (refreshed) {
          valid = await validateTwitchToken();
        }
      }

      if (!valid) {
        saveTwitchAuth(null);
        twitchUser = null;

        setTwitchStatus(false);
        return false;
      }

      twitchUser = await fetchTwitchUser();

      if (!twitchUser) {
        throw new Error(
          'Benutzerdaten fehlen.'
        );
      }

      setTwitchStatus(
        true,
        getTwitchUsername()
      );

      console.log(
        'Twitch Sitzung wiederhergestellt:',
        getTwitchUsername()
      );

      return true;

    } catch (error) {
      console.error(
        'Twitch Wiederherstellung fehlgeschlagen:',
        error
      );

      setTwitchStatus(false);
      return false;
    }
  }

  // ==========================================
  // TWITCH TRENNEN
  // ==========================================

  async function disconnectTwitch() {
    try {
      if (typeof stopTwitchChat === 'function') {
        stopTwitchChat();
      }

      if (twitchAuth?.accessToken) {
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
              token: twitchAuth.accessToken
            })
          }
        ).catch(error => {
          console.warn(
            'Twitch Token konnte nicht widerrufen werden:',
            error
          );
        });
      }

    } finally {
      saveTwitchAuth(null);
      twitchUser = null;

      clearInterval(twitchTokenCheckTimer);
      twitchTokenCheckTimer = null;

      setTwitchStatus(false);

      toast('Twitch wurde getrennt.');
    }
  }

  // ==========================================
  // TWITCH BUTTON EINRICHTEN
  // ==========================================

  function setupTwitchButton() {
    const button =
      $('twitchConnect') ||
      $('connectTwitch') ||
      $('twitchButton');

    if (!button) {
      console.warn(
        'Twitch Button nicht gefunden.'
      );
      return;
    }

    if (button.dataset.jcTwitchBound === '1') {
      return;
    }

    button.dataset.jcTwitchBound = '1';

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
  }

  // ==========================================
  // TWITCH INITIALISIEREN
  // ==========================================

  async function initTwitch() {
    setupTwitchButton();

    const params = new URLSearchParams(
      window.location.search
    );

    if (
      params.has('code') ||
      params.has('error')
    ) {
      await handleTwitchOAuthCallback();
    } else {
      await restoreTwitchSession();
    }

    setTwitchStatus(
      isTwitchConnected(),
      getTwitchUsername()
    );

    if (twitchTokenCheckTimer) {
      clearInterval(twitchTokenCheckTimer);
    }

    twitchTokenCheckTimer = setInterval(
      async () => {
        if (!twitchAuth?.accessToken) {
          return;
        }

        const valid =
          await validateTwitchToken();

        if (!valid) {
          const refreshed =
            await refreshTwitchToken();

          if (!refreshed) {
            saveTwitchAuth(null);
            twitchUser = null;

            setTwitchStatus(false);

            toast(
              'Twitch-Sitzung abgelaufen. Bitte erneut verbinden.',
              6000
            );
          }
        }
      },
      10 * 60 * 1000
    );

    return isTwitchConnected();
  }

  // ==========================================
  // ENDE TEIL 4
  // ==========================================

  // ==========================================
  // TEIL 5 - TWITCH EVENTSUB / LIVE EVENTS
  // JADE & CLARKE - JC NEON STUDIO
  // ==========================================

  const TWITCH_EVENTSUB_URL =
    'wss://eventsub.wss.twitch.tv/ws';

  const TWITCH_EVENTSUB_API =
    'https://api.twitch.tv/helix/eventsub/subscriptions';

  let twitchSocket = null;
  let twitchSessionId = null;
  let twitchReconnectTimer = null;
  let twitchKeepaliveTimer = null;
  let twitchEventSubRunning = false;
  let twitchReconnectAttempts = 0;
  let twitchEventSubGeneration = 0;
  let twitchSocketConnectedAt = 0;

  const twitchSeenMessageIds = new Set();
  const TWITCH_SEEN_LIMIT = 500;

  const TWITCH_EVENTSUB_EVENTS = [
    {
      type: 'channel.chat.message',
      version: '1',
      scope: 'user:read:chat'
    },
    {
      type: 'channel.follow',
      version: '2',
      scope: 'moderator:read:followers'
    },
    {
      type: 'channel.subscribe',
      version: '1',
      scope: 'channel:read:subscriptions'
    },
    {
      type: 'channel.subscription.gift',
      version: '1',
      scope: 'channel:read:subscriptions'
    },
    {
      type: 'channel.subscription.message',
      version: '1',
      scope: 'channel:read:subscriptions'
    },
    {
      type: 'channel.cheer',
      version: '1',
      scope: 'bits:read'
    }
  ];

  // ==========================================
  // EVENTSUB STATUS
  // ==========================================

  function setTwitchChatStatus(status, description = '') {
    const text = String(status || 'OFFLINE');

    setText('chatConnectionStatus', text);
    setText('twitchChatStatus', text);
    setText('eventSubStatus', text);

    if (description) {
      setText('chatConnectionInfo', description);
      setText('eventSubInfo', description);
    }

    const indicator = $('chatConnectionIndicator');

    if (indicator) {
      indicator.classList.toggle(
        'connected',
        text === 'VERBUNDEN'
      );
    }
  }

  // ==========================================
  // NACHRICHTEN DOPPELT VERHINDERN
  // ==========================================

  function rememberTwitchMessageId(messageId) {
    if (!messageId) return true;

    if (twitchSeenMessageIds.has(messageId)) {
      return false;
    }

    twitchSeenMessageIds.add(messageId);

    if (twitchSeenMessageIds.size > TWITCH_SEEN_LIMIT) {
      const oldest =
        twitchSeenMessageIds.values().next().value;

      twitchSeenMessageIds.delete(oldest);
    }

    return true;
  }

  // ==========================================
  // EVENTSUB API ANFRAGE
  // ==========================================

  async function createTwitchEventSubSubscription(
    type,
    version,
    condition,
    sessionId
  ) {
    if (!twitchAuth?.accessToken) {
      throw new Error('Kein Twitch Access Token vorhanden.');
    }

    const response = await fetch(
      TWITCH_EVENTSUB_API,
      {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization':
            `Bearer ${twitchAuth.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          version,
          condition,
          transport: {
            method: 'websocket',
            session_id: sessionId
          }
        })
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch (error) {
      console.warn(
        'EventSub Antwort konnte nicht gelesen werden:',
        error
      );
    }

    if (!response.ok) {
      const message =
        data.message ||
        `HTTP ${response.status}`;

      throw new Error(
        `${type}: ${message}`
      );
    }

    console.log(
      'Twitch EventSub registriert:',
      type
    );

    return data;
  }

  // ==========================================
  // EVENTSUB SUBSCRIPTIONS REGISTRIEREN
  // ==========================================

  async function registerTwitchEventSubEvents(sessionId) {
    if (!twitchUser?.id) {
      throw new Error(
        'Twitch Benutzer-ID fehlt.'
      );
    }

    const broadcasterId = String(twitchUser.id);
    const userId = String(twitchUser.id);

    const subscriptions = [
      {
        type: 'channel.chat.message',
        version: '1',
        condition: {
          broadcaster_user_id: broadcasterId,
          user_id: userId
        }
      },
      {
        type: 'channel.follow',
        version: '2',
        condition: {
          broadcaster_user_id: broadcasterId,
          moderator_user_id: userId
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

    let successful = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      if (
        !twitchEventSubRunning ||
        sessionId !== twitchSessionId
      ) {
        return;
      }

      try {
        await createTwitchEventSubSubscription(
          subscription.type,
          subscription.version,
          subscription.condition,
          sessionId
        );

        successful++;

      } catch (error) {
        failed++;

        console.warn(
          'EventSub Registrierung fehlgeschlagen:',
          error.message
        );
      }
    }

    console.log(
      `EventSub: ${successful} erfolgreich, ${failed} fehlgeschlagen.`
    );

    if (successful > 0) {
      setTwitchChatStatus(
        'VERBUNDEN',
        `${successful} Twitch-Ereignisse aktiv`
      );
    } else {
      setTwitchChatStatus(
        'FEHLER',
        'Keine Twitch-Ereignisse konnten registriert werden.'
      );

      toast(
        'Twitch verbunden, aber Live-Events konnten nicht aktiviert werden.',
        7000
      );
    }
  }

  // ==========================================
  // TWITCH CHAT NACHRICHT
  // ==========================================

  function handleTwitchChatMessage(event) {
    if (!event) return;

    const username =
      event.chatter_user_name ||
      event.chatter_user_login ||
      'TwitchUser';

    const message =
      event.message?.text ||
      '';

    if (!message.trim()) return;

    const messageId =
      event.message_id ||
      `${event.chatter_user_id}:${message}`;

    if (!rememberTwitchMessageId(messageId)) {
      return;
    }

    console.log(
      `[TWITCH CHAT] ${username}: ${message}`
    );

    addChatMessage(
      username,
      message,
      {
        source: 'twitch',
        tts: true,
        overlay: true
      }
    );
  }

  // ==========================================
  // TWITCH FOLLOWER EVENT
  // ==========================================

  function handleTwitchFollow(event) {
    if (!event) return;

    const username =
      event.user_name ||
      event.user_login ||
      'Neuer Follower';

    console.log(
      '[TWITCH FOLLOW]',
      username
    );

    if (!settings.followEnabled) return;

    if (typeof showStreamAlert === 'function') {
      showStreamAlert(
        'follow',
        username,
        {
          source: 'twitch'
        }
      );
    }
  }

  // ==========================================
  // TWITCH ABO EVENT
  // ==========================================

  function handleTwitchSubscription(event, eventType) {
    if (!event) return;

    if (!settings.subEnabled) return;

    let username =
      event.user_name ||
      event.user_login ||
      'Twitch-Abonnent';

    let message = '';
    let amount = 1;

    if (eventType === 'channel.subscription.gift') {
      username =
        event.user_name ||
        (event.is_anonymous
          ? 'Anonymer Gifter'
          : 'TwitchUser');

      amount = Number(event.total || 1);

      message =
        `${amount} Geschenk-Abos`;
    }

    if (eventType === 'channel.subscription.message') {
      const months =
        Number(event.cumulative_months || 1);

      message =
        `${months} Monate abonniert`;
    }

    console.log(
      '[TWITCH SUB]',
      username,
      message
    );

    if (typeof showStreamAlert === 'function') {
      showStreamAlert(
        'sub',
        username,
        {
          source: 'twitch',
          message,
          amount,
          tier: event.tier || '1000'
        }
      );
    }
  }

  // ==========================================
  // TWITCH BITS EVENT
  // ==========================================

  function handleTwitchBits(event) {
    if (!event) return;

    if (!settings.bitsEnabled) return;

    const username =
      event.user_name ||
      event.user_login ||
      (event.is_anonymous
        ? 'Anonym'
        : 'TwitchUser');

    const bits = Number(event.bits || 0);

    if (bits <= 0) return;

    console.log(
      '[TWITCH BITS]',
      username,
      bits
    );

    if (typeof showStreamAlert === 'function') {
      showStreamAlert(
        'bits',
        username,
        {
          source: 'twitch',
          amount: bits,
          message: `${bits} Bits`
        }
      );
    }
  }

  // ==========================================
  // EVENTSUB NOTIFICATIONS VERARBEITEN
  // ==========================================

  function handleTwitchEventSubNotification(payload) {
    const subscription =
      payload.subscription || {};

    const event = payload.event || {};

    const type = subscription.type || '';

    switch (type) {
      case 'channel.chat.message':
        handleTwitchChatMessage(event);
        break;

      case 'channel.follow':
        handleTwitchFollow(event);
        break;

      case 'channel.subscribe':
      case 'channel.subscription.gift':
      case 'channel.subscription.message':
        handleTwitchSubscription(event, type);
        break;

      case 'channel.cheer':
        handleTwitchBits(event);
        break;

      default:
        console.log(
          'Unbekanntes Twitch EventSub Event:',
          type
        );
    }
  }

  // ==========================================
  // KEEPALIVE ÜBERWACHUNG
  // ==========================================

  function resetTwitchKeepalive(timeoutSeconds = 30) {
    if (twitchKeepaliveTimer) {
      clearTimeout(twitchKeepaliveTimer);
    }

    const timeout =
      Math.max(10, Number(timeoutSeconds) || 30);

    twitchKeepaliveTimer = setTimeout(() => {
      if (!twitchEventSubRunning) return;

      console.warn(
        'Twitch EventSub Keepalive Timeout.'
      );

      setTwitchChatStatus(
        'VERBINDUNG UNTERBROCHEN',
        'Twitch WebSocket wird neu verbunden.'
      );

      try {
        twitchSocket?.close();
      } catch (error) {
        console.warn(error);
      }

      scheduleTwitchReconnect();

    }, (timeout + 10) * 1000);
  }

  // ==========================================
  // RECONNECT
  // ==========================================

  function scheduleTwitchReconnect() {
    if (!twitchEventSubRunning) return;

    if (twitchReconnectTimer) return;

    twitchReconnectAttempts++;

    const delay = Math.min(
      30000,
      1000 * Math.pow(
        2,
        Math.min(twitchReconnectAttempts, 5)
      )
    );

    console.log(
      `Twitch EventSub Reconnect in ${delay} ms`
    );

    twitchReconnectTimer = setTimeout(() => {
      twitchReconnectTimer = null;

      if (twitchEventSubRunning) {
        openTwitchEventSubSocket();
      }
    }, delay);
  }

  // ==========================================
  // EVENTSUB WEBSOCKET ÖFFNEN
  // ==========================================

  function openTwitchEventSubSocket(
    url = TWITCH_EVENTSUB_URL,
    isReconnect = false
  ) {
    if (!twitchEventSubRunning) return;

    const generation = ++twitchEventSubGeneration;

    if (!isReconnect && twitchSocket) {
      try {
        twitchSocket.onclose = null;
        twitchSocket.close();
      } catch (error) {
        console.warn(error);
      }
    }

    const socket = new WebSocket(url);

    twitchSocket = socket;

    setTwitchChatStatus(
      'VERBINDET',
      'Verbindung zum Twitch EventSub WebSocket wird hergestellt.'
    );

    socket.onopen = () => {
      if (
        generation !== twitchEventSubGeneration ||
        !twitchEventSubRunning
      ) {
        socket.close();
        return;
      }

      twitchSocketConnectedAt = Date.now();

      console.log(
        'Twitch EventSub WebSocket geöffnet.'
      );
    };

    socket.onmessage = async messageEvent => {
      if (
        generation !== twitchEventSubGeneration ||
        !twitchEventSubRunning
      ) {
        return;
      }

      let payload;

      try {
        payload = JSON.parse(messageEvent.data);
      } catch (error) {
        console.warn(
          'Ungültige Twitch EventSub Nachricht:',
          error
        );
        return;
      }

      const metadata = payload.metadata || {};

      const messageType =
        metadata.message_type || '';

      const messageId =
        metadata.message_id || '';

      if (
        messageType === 'notification' &&
        !rememberTwitchMessageId(messageId)
      ) {
        return;
      }

      switch (messageType) {
        case 'session_welcome': {
          const session =
            payload.payload?.session || {};

          twitchSessionId = session.id || null;

          twitchReconnectAttempts = 0;

          resetTwitchKeepalive(
            session.keepalive_timeout_seconds || 30
          );

          console.log(
            'Twitch EventSub Session:',
            twitchSessionId
          );

          if (
            twitchSessionId &&
            !isReconnect
          ) {
            await registerTwitchEventSubEvents(
              twitchSessionId
            );
          } else if (isReconnect) {
            setTwitchChatStatus(
              'VERBUNDEN',
              'Twitch EventSub Verbindung wiederhergestellt.'
            );
          }

          break;
        }

        case 'session_keepalive': {
          resetTwitchKeepalive();
          break;
        }

        case 'notification': {
          resetTwitchKeepalive();

          handleTwitchEventSubNotification(
            payload.payload || {}
          );

          break;
        }

        case 'session_reconnect': {
          const reconnectURL =
            payload.payload?.session?.reconnect_url;

          if (!reconnectURL) {
            scheduleTwitchReconnect();
            break;
          }

          console.log(
            'Twitch fordert WebSocket Reconnect an.'
          );

          openTwitchEventSubSocket(
            reconnectURL,
            true
          );

          break;
        }

        case 'revocation': {
          const type =
            payload.payload?.subscription?.type;

          const reason =
            payload.payload?.subscription?.status;

          console.warn(
            'Twitch EventSub Subscription widerrufen:',
            type,
            reason
          );

          toast(
            `Twitch Event deaktiviert: ${type}`,
            6000
          );

          break;
        }

        default:
          console.log(
            'Twitch EventSub Nachricht:',
            messageType
          );
      }
    };

    socket.onerror = error => {
      if (
        generation !== twitchEventSubGeneration
      ) {
        return;
      }

      console.warn(
        'Twitch EventSub WebSocket Fehler:',
        error
      );
    };

    socket.onclose = event => {
      if (
        generation !== twitchEventSubGeneration
      ) {
        return;
      }

      console.warn(
        'Twitch EventSub WebSocket geschlossen:',
        event.code,
        event.reason
      );

      if (twitchKeepaliveTimer) {
        clearTimeout(twitchKeepaliveTimer);
        twitchKeepaliveTimer = null;
      }

      twitchSessionId = null;

      if (twitchEventSubRunning) {
        setTwitchChatStatus(
          'GETRENNT',
          'Twitch WebSocket getrennt. Neuer Versuch läuft.'
        );

        scheduleTwitchReconnect();
      }
    };
  }

  // ==========================================
  // TWITCH CHAT STARTEN
  // ==========================================

  function startTwitchChat() {
    if (!isTwitchConnected()) {
      setTwitchChatStatus(
        'OFFLINE',
        'Bitte zuerst mit Twitch verbinden.'
      );

      return false;
    }

    if (twitchEventSubRunning) {
      console.log(
        'Twitch EventSub läuft bereits.'
      );

      return true;
    }

    twitchEventSubRunning = true;
    twitchReconnectAttempts = 0;

    twitchSeenMessageIds.clear();

    openTwitchEventSubSocket();

    return true;
  }

  // ==========================================
  // TWITCH CHAT STOPPEN
  // ==========================================

  function stopTwitchChat() {
    twitchEventSubRunning = false;

    twitchEventSubGeneration++;

    if (twitchReconnectTimer) {
      clearTimeout(twitchReconnectTimer);
      twitchReconnectTimer = null;
    }

    if (twitchKeepaliveTimer) {
      clearTimeout(twitchKeepaliveTimer);
      twitchKeepaliveTimer = null;
    }

    if (twitchSocket) {
      try {
        twitchSocket.onclose = null;
        twitchSocket.close(
          1000,
          'JC Neon Studio disconnect'
        );
      } catch (error) {
        console.warn(
          'Twitch Socket konnte nicht geschlossen werden:',
          error
        );
      }
    }

    twitchSocket = null;
    twitchSessionId = null;

    setTwitchChatStatus(
      'OFFLINE',
      'Twitch Chat ist nicht verbunden.'
    );

    console.log(
      'Twitch EventSub gestoppt.'
    );
  }

  // ==========================================
  // ENDE TEIL 5
  // ==========================================
})();
