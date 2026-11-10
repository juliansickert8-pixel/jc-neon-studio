
'use strict';

/*
 * JC NEON STUDIO 2.1
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

  // ==========================================
  // STUDIO KONFIGURATION
  // ==========================================

  const STORAGE_KEY = 'jc_neon_studio_v2';
  const OLD_STORAGE_KEY = 'jc_streamtools_neon_v1';
  const OVERLAY_CHANNEL = 'jc_streamtools_neon';

  const defaults = {
    studioUsername: 'faulie_gamer',
    studioDisplayName: 'FAULIE_GAMER',
    testUser: 'FaulieFan',
    testMessage: 'Hey Faulie! Dein Stream sieht heute mega aus! 💜',
    alertUser: 'NeonSloth',
    chatInput: '',
    ttsEnabled: true,
    readNames: true,
    volume: 85,
    rate: 100,
    voiceName: '',
    followEnabled: true,
    subEnabled: true,
    bitsEnabled: true,
    duration: 6,
    accent: 'purple',
    motion: true
  };

  const soundFiles = {
    follow: 'assets/sounds/jc_alert_follower.m4a',
    sub: 'assets/sounds/jc_alert_sub.m4a',
    bits: 'assets/sounds/jc_alert_bits.m4a'
  };

  const alertInfo = {
    follow: {
      title: 'NEUER FOLLOWER',
      symbol: '♡',
      description: 'folgt deinem Kanal!'
    },
    sub: {
      title: 'NEUES ABO',
      symbol: '★',
      description: 'hat deinen Kanal abonniert!'
    },
    bits: {
      title: 'BITS CHEER',
      symbol: '◆',
      description: 'hat Bits gespendet!'
    }
  };

  const pages = {
    dashboard: 'Dein Stream. Deine Kontrolle.',
    tts: 'Chat & Sprachausgabe',
    alerts: 'Stream-Alerts',
    overlay: 'OBS-Overlays',
    settings: 'Dein Studio. Deine Regeln.'
  };

  // ==========================================
  // SPEICHER
  // ==========================================

  function readStorage(key, storage = localStorage) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      return parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
          ? parsed
          : null;
    } catch (error) {
      console.warn('Speicherfehler:', error);
      return null;
    }
  }

  const existingSettings =
    readStorage(STORAGE_KEY) ||
    readStorage(OLD_STORAGE_KEY) ||
    {};

  let settings = {
    ...defaults,
    ...existingSettings
  };

  let toastTimer;

  function toast(message) {
    const el = $('toast');

    if (!el) {
      console.info('[JC Neon Studio]', message);
      return;
    }

    el.textContent = message;
    el.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, 3500);
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.warn('Speichern fehlgeschlagen:', error);
      toast('Einstellungen konnten nicht gespeichert werden.');
    }
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  function navigate(page) {
    if (!pages[page]) return;

    document.querySelectorAll('.page').forEach(el => {
      el.classList.toggle('active', el.id === page);
    });

    document.querySelectorAll('.nav').forEach(el => {
      el.classList.toggle(
        'active',
        el.dataset.page === page
      );
    });

    setText('pageTitle', pages[page]);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  document.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('click', () => {
      navigate(button.dataset.page);
    });
  });

  document.querySelectorAll('[data-goto]').forEach(button => {
    button.addEventListener('click', () => {
      navigate(button.dataset.goto);
    });
  });

  // ==========================================
  // EINSTELLUNGEN
  // ==========================================

  const checkboxKeys = [
    'ttsEnabled',
    'readNames',
    'followEnabled',
    'subEnabled',
    'bitsEnabled',
    'motion'
  ];

  const rangeKeys = [
    'volume',
    'rate',
    'duration'
  ];

  const textKeys = [
    'studioUsername',
    'studioDisplayName',
    'testUser',
    'testMessage',
    'alertUser',
    'chatInput'
  ];

  function applySettings() {
    checkboxKeys.forEach(key => {
      if ($(key)) {
        $(key).checked = Boolean(settings[key]);
      }
    });

    rangeKeys.forEach(key => {
      if ($(key)) {
        $(key).value = settings[key];
      }
    });

    textKeys.forEach(key => {
      if ($(key)) {
        $(key).value = settings[key] ?? '';
      }
    });

    if ($('accent')) {
      $('accent').value = settings.accent;
    }

    setText('volumeValue', settings.volume + ' %');

    setText(
      'rateValue',
      (settings.rate / 100).toFixed(1) + '×'
    );

    setText(
      'durationValue',
      settings.duration + ' Sekunden'
    );

    setText(
      'ttsStatus',
      settings.ttsEnabled ? 'AKTIV' : 'AUS'
    );

    setText(
      'studioProfileName',
      settings.studioDisplayName || 'FAULIE_GAMER'
    );

    document.body.classList.toggle(
      'no-motion',
      !settings.motion
    );

    const accentColors = {
      purple: '#b43cff',
      cyan: '#00dfff',
      pink: '#ff3baf'
    };

    document.documentElement.style.setProperty(
      '--accent',
      accentColors[settings.accent] || accentColors.purple
    );
  }

  function bindSettings() {
    checkboxKeys.forEach(key => {
      $(key)?.addEventListener('change', event => {
        settings[key] = event.target.checked;
        persist();
        applySettings();
      });
    });

    rangeKeys.forEach(key => {
      $(key)?.addEventListener('input', event => {
        settings[key] = Number(event.target.value);
        persist();
        applySettings();
      });
    });

    textKeys.forEach(key => {
      $(key)?.addEventListener('input', event => {
        settings[key] = event.target.value;
        persist();

        if (key === 'studioDisplayName') {
          setText(
            'studioProfileName',
            settings.studioDisplayName || 'FAULIE_GAMER'
          );
        }
      });
    });

    $('accent')?.addEventListener('change', event => {
      settings.accent = event.target.value;
      persist();
      applySettings();
    });
  }

  bindSettings();
  applySettings();
  persist();

  // ==========================================
  // TEXT-TO-SPEECH
  // ==========================================

  let voices = [];
  let currentSpeech = null;
  let speaking = false;

  const speechQueue = [];

  function populateVoices() {
    if (!('speechSynthesis' in window)) return;

    const select = $('voiceSelect');
    if (!select) return;

    voices = speechSynthesis.getVoices();
    select.replaceChildren();

    if (!voices.length) {
      select.add(
        new Option('Stimmen werden geladen ...', '')
      );
      return;
    }

    voices.forEach((voice, index) => {
      select.add(
        new Option(
          `${voice.name} (${voice.lang})`,
          String(index)
        )
      );
    });

    let index = voices.findIndex(
      voice => voice.name === settings.voiceName
    );

    if (index < 0) {
      index = voices.findIndex(
        voice => voice.lang.toLowerCase().startsWith('de')
      );
    }

    select.value = String(Math.max(0, index));
  }

  if ('speechSynthesis' in window) {
    populateVoices();

    if (typeof speechSynthesis.addEventListener === 'function') {
      speechSynthesis.addEventListener(
        'voiceschanged',
        populateVoices
      );
    }
  }

  $('voiceSelect')?.addEventListener('change', event => {
    const voice = voices[Number(event.target.value)];

    if (voice) {
      settings.voiceName = voice.name;
      persist();
    }
  });

  // ==========================================
  // EMOJI-FILTER
  // ==========================================

  function cleanTTSMessage(message) {
    return String(message ?? '')
      .replace(/[0-9#*]\uFE0F?\u20E3/gu, ' ')
      .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, ' ')
      .replace(/\p{Extended_Pictographic}/gu, ' ')
      .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, ' ')
      .replace(/[\u200D\uFE0E\uFE0F\u20E3]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function processSpeechQueue() {
    if (speaking || !speechQueue.length) return;
    if (!('speechSynthesis' in window)) return;

    const text = speechQueue.shift();
    const utterance = new SpeechSynthesisUtterance(text);

    const selectedVoice =
      voices[Number($('voiceSelect')?.value)];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.lang = selectedVoice?.lang || 'de-DE';
    utterance.volume = Number(settings.volume) / 100;
    utterance.rate = Number(settings.rate) / 100;

    speaking = true;
    currentSpeech = utterance;

    function finish() {
      if (currentSpeech !== utterance) return;

      currentSpeech = null;
      speaking = false;
      processSpeechQueue();
    }

    utterance.onend = finish;
    utterance.onerror = finish;

    try {
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('TTS-Fehler:', error);
      finish();
    }
  }

  function speak(user, message, force = false) {
    if (!('speechSynthesis' in window)) return;
    if (!settings.ttsEnabled && !force) return;

    const cleanMessage = cleanTTSMessage(message);
    if (!cleanMessage) return;

    const cleanUser = cleanTTSMessage(user);

    const text =
      settings.readNames && cleanUser
        ? `${cleanUser} schreibt: ${cleanMessage}`
        : cleanMessage;

    if (speechQueue.length >= 30) {
      speechQueue.shift();
    }

    speechQueue.push(text);
    processSpeechQueue();
  }

  function stopSpeech() {
    speechQueue.length = 0;
    currentSpeech = null;
    speaking = false;

    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  $('testVoice')?.addEventListener('click', () => {
    speak(
      'JC Neon Studio',
      'Deine Sprachausgabe funktioniert. Willkommen im Neon Studio!',
      true
    );
  });

  $('stopVoice')?.addEventListener('click', stopSpeech);

  // ==========================================
  // OVERLAY-KOMMUNIKATION
  // ==========================================

  let overlayChannel = null;

  if ('BroadcastChannel' in window) {
    try {
      overlayChannel = new BroadcastChannel(
        OVERLAY_CHANNEL
      );
    } catch (error) {
      console.warn('Overlay-Kanal nicht verfügbar:', error);
    }
  }

  function sendOverlay(data) {
    try {
      overlayChannel?.postMessage(data);
    } catch (error) {
      console.warn('Overlay-Nachricht fehlgeschlagen:', error);
    }
  }

  // ==========================================
  // CHAT
  // ==========================================

  function addChat(user, message) {
    const username = String(user || 'Gast').slice(0, 50);
    const text = String(message || '').slice(0, 500);

    if (!text.trim()) return;

    const feed = $('chatFeed');

    if (feed) {
      const line = document.createElement('div');
      line.className = 'chat-line';

      const name = document.createElement('span');
      name.className = 'username';
      name.textContent = username;

      const content = document.createElement('span');
      content.textContent = text;

      line.append(name, content);
      feed.append(line);

      feed.scrollTop = feed.scrollHeight;

      while (feed.children.length > 45) {
        feed.firstElementChild.remove();
      }
    }

    sendOverlay({
      type: 'chat',
      user: username,
      message: text
    });

    window.JCOverlay?.sendChat?.(username, text);

    speak(username, text);
  }

  $('sendChat')?.addEventListener('click', () => {
    const input = $('chatInput');
    const message = input?.value.trim();

    if (!message) return;

    addChat(
      settings.testUser || 'FaulieFan',
      message
    );

    input.value = '';
    settings.chatInput = '';
    persist();
  });

  $('chatInput')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      $('sendChat')?.click();
    }
  });

  $('testMessageBtn')?.addEventListener('click', () => {
    const user =
      $('testUser')?.value.trim() || 'TestUser';

    const message =
      $('testMessage')?.value.trim() || '';

    if (!message) {
      toast('Bitte eine Nachricht eingeben.');
      return;
    }

    addChat(user, message);
    toast('Testnachricht gesendet.');
  });

  // ==========================================
  // UNSICHTBARE M4A-SOUNDS
  // ==========================================

  const audioQueue = [];
  let audioPlaying = false;
  let activeAudio = null;
  let audioUnlocked = false;

  function unlockAudio() {
    audioUnlocked = true;
    processAudioQueue();
  }

  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('keydown', unlockAudio);

  function processAudioQueue() {
    if (audioPlaying || !audioQueue.length) return;
    if (!audioUnlocked) return;

    const type = audioQueue.shift();
    const source = soundFiles[type];

    if (!source) {
      processAudioQueue();
      return;
    }

    const audio = new Audio(source);

    audio.preload = 'auto';
    audio.volume = 1;

    audioPlaying = true;
    activeAudio = audio;

    let finished = false;
    let watchdog = null;

    function finish() {
      if (finished) return;
      finished = true;

      clearTimeout(watchdog);

      audio.pause();
      audio.removeAttribute('src');

      activeAudio = null;
      audioPlaying = false;

      processAudioQueue();
    }

    audio.addEventListener(
      'ended',
      finish,
      { once: true }
    );

    audio.addEventListener(
      'error',
      () => {
        console.warn(
          'Sound konnte nicht geladen werden:',
          source
        );

        toast('Sounddatei konnte nicht geladen werden.');
        finish();
      },
      { once: true }
    );

    watchdog = setTimeout(() => {
      console.warn('Audio-Zeitüberschreitung:', source);
      finish();
    }, 60000);

    audio.play().catch(error => {
      console.warn('Audio blockiert:', error);

      toast(
        'Audiowiedergabe blockiert. Bitte das Dashboard anklicken.'
      );

      finish();
    });
  }

  function playAlertSound(type) {
    if (!soundFiles[type]) return false;

    if (audioQueue.length >= 50) {
      toast('Zu viele Sounds in der Warteschlange.');
      return false;
    }

    audioQueue.push(type);
    processAudioQueue();

    return true;
  }

  // ==========================================
  // ALERTS
  // ==========================================

  let alertPreviewTimer;

  function triggerAlert(type, user, amount = 100) {
    if (!alertInfo[type]) return false;

    if (!settings[type + 'Enabled']) {
      toast('Dieser Alert ist deaktiviert.');
      return false;
    }

    const info = alertInfo[type];

    const username = String(
      user || settings.alertUser || 'NeonSloth'
    ).slice(0, 50);

    playAlertSound(type);

    const preview = $('alertPreview');

    if (preview) {
      preview.replaceChildren();

      const symbol = document.createElement('div');
      symbol.className = 'placeholder-icon';
      symbol.textContent = info.symbol;

      const title = document.createElement('b');
      title.textContent = info.title;

      const name = document.createElement('strong');
      name.textContent = username;
      name.style.cssText =
        'font-size:26px;color:#e7b0ff;text-shadow:0 0 22px var(--accent)';

      const detail = document.createElement('small');

      detail.textContent =
        type === 'bits'
          ? `hat ${Math.max(1, Number(amount) || 1)} Bits gespendet!`
          : info.description;

      preview.append(
        symbol,
        title,
        name,
        detail
      );

      preview.classList.remove('alert-animation');
      void preview.offsetWidth;
      preview.classList.add('alert-animation');

      clearTimeout(alertPreviewTimer);

      alertPreviewTimer = setTimeout(() => {
        preview.replaceChildren();

        const placeholder = document.createElement('small');
        placeholder.textContent =
          'Bereit für den nächsten Alert.';

        preview.append(placeholder);
      }, Number(settings.duration) * 1000);
    }

    toast(info.title + ': Sound ausgelöst.');
    return true;
  }

  document.querySelectorAll('[data-test]').forEach(button => {
    button.addEventListener('click', () => {
      unlockAudio();

      triggerAlert(
        button.dataset.test,
        settings.alertUser
      );
    });
  });

  // ==========================================
  // TWITCH OAUTH MIT PKCE
  // ==========================================

  let twitchAuth = null;
  let twitchUser = null;
  let connectionStatus = 'disconnected';

  function base64url(bytes) {
    let binary = '';

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  function randomString(length = 32) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return base64url(bytes);
  }

  async function createCodeChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest(
      'SHA-256',
      data
    );

    return base64url(new Uint8Array(hash));
  }

  function saveAuth(auth) {
    twitchAuth = auth;

    if (auth) {
      sessionStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(auth)
      );
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  function setConnectionStatus(status) {
    const states = {
      disconnected: {
        label: 'NICHT VERBUNDEN',
        short: 'OFFLINE',
        detail: 'Twitch noch nicht verbunden',
        color: 'amber'
      },
      connecting: {
        label: 'VERBINDE ...',
        short: 'VERBINDET',
        detail: 'Twitch-Anmeldung wird geprüft',
        color: 'amber'
      },
      connected: {
        label: 'VERBUNDEN',
        short: 'ONLINE',
        detail: twitchUser
          ? `Angemeldet als ${twitchUser.display_name}`
          : 'Twitch-Konto angemeldet',
        color: 'green'
      }
    };

    if (!states[status]) return;

    connectionStatus = status;
    const state = states[status];

    const textValues = {
      connectionStatus: state.label,
      connectionStat: state.short,
      connectionStatDetail: state.detail,
      sideConnectionStatus: state.label,
      sideConnectionDetail: state.detail,
      settingsConnectionStatus: state.label,
      settingsConnectionDetail: state.detail
    };

    Object.entries(textValues).forEach(([id, value]) => {
      setText(id, value);
    });

    [
      'connectionDot',
      'sideConnectionDot',
      'profileConnectionDot',
      'settingsConnectionDot'
    ].forEach(id => {
      const dot = $(id);
      if (!dot) return;

      dot.classList.remove('amber', 'green');
      dot.classList.add(state.color);
    });

    document.querySelectorAll('.pill').forEach(pill => {
      if (!pill.querySelector('.dot')) return;

      const dot = pill.querySelector('.dot');
      dot.classList.remove('amber', 'green');
      dot.classList.add(state.color);

      const textNode = [...pill.childNodes].find(
        node => node.nodeType === Node.TEXT_NODE
      );

      if (textNode) {
        textNode.textContent = ' ' + state.short;
      }
    });

    document.querySelectorAll('.side-info').forEach(info => {
      const bold = info.querySelector('b');
      const small = info.querySelector('small');
      const dot = info.querySelector('.dot');

      if (bold) bold.textContent = state.label;
      if (small) small.textContent = state.detail;

      if (dot) {
        dot.classList.remove('amber', 'green');
        dot.classList.add(state.color);
      }
    });

    const stat = $('connectionStat');

    if (!stat) {
      document.querySelectorAll('.stat').forEach(card => {
        const label = card.querySelector('span');

        if (label?.textContent.trim() === 'VERBINDUNG') {
          const strong = card.querySelector('strong');
          const small = card.querySelector('small');

          if (strong) strong.textContent = state.short;
          if (small) small.textContent = state.detail;
        }
      });
    }

    const connectionPanels =
      document.querySelectorAll('.connection');

    connectionPanels.forEach(panel => {
      const bold = panel.querySelector('b');
      const small = panel.querySelector('small');
      const dot = panel.querySelector('.dot');

      if (bold) bold.textContent = state.label;
      if (small) small.textContent = state.detail;

      if (dot) {
        dot.classList.remove('amber', 'green');
        dot.classList.add(state.color);
      }
    });

    const button = $('twitchBtn');

    if (button) {
      button.textContent =
        status === 'connected'
          ? 'Twitch trennen'
          : status === 'connecting'
            ? 'Verbinde ...'
            : 'Twitch verbinden ↗';

      button.disabled = status === 'connecting';
    }
  }

  function clearOAuthURL() {
    const url = new URL(window.location.href);

    [
      'code',
      'state',
      'error',
      'error_description'
    ].forEach(key => url.searchParams.delete(key));

    history.replaceState(
      {},
      document.title,
      url.pathname + url.search + url.hash
    );
  }

  async function connectTwitch() {
    if (!window.isSecureContext || !crypto?.subtle) {
      toast('Twitch-Login benötigt eine sichere HTTPS-Webseite.');
      return;
    }

    try {
      const verifier = randomString(64);
      const challenge = await createCodeChallenge(verifier);
      const state = randomString(32);

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
        force_verify: 'true'
      });

      window.location.assign(
        'https://id.twitch.tv/oauth2/authorize?' +
        params.toString()
      );
    } catch (error) {
      console.error('Twitch-Login konnte nicht starten:', error);
      toast('Twitch-Anmeldung konnte nicht gestartet werden.');
    }
  }

  async function exchangeCode(code, verifier) {
    const body = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: TWITCH_REDIRECT_URI,
      code_verifier: verifier
    });

    const response = await fetch(
      'https://id.twitch.tv/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },
        body
      }
    );

    if (!response.ok) {
      throw new Error(
        'Twitch konnte den Autorisierungscode nicht einlösen.'
      );
    }

    return response.json();
  }

  async function validateToken(token) {
    const response = await fetch(
      'https://id.twitch.tv/oauth2/validate',
      {
        headers: {
          Authorization: 'OAuth ' + token
        }
      }
    );

    if (!response.ok) {
      throw new Error('Twitch-Sitzung ist nicht mehr gültig.');
    }

    const data = await response.json();

    if (data.client_id !== TWITCH_CLIENT_ID) {
      throw new Error('Die Twitch-Client-ID stimmt nicht überein.');
    }

    return data;
  }

  async function loadTwitchUser(token) {
    const response = await fetch(
      'https://api.twitch.tv/helix/users',
      {
        headers: {
          Authorization: 'Bearer ' + token,
          'Client-Id': TWITCH_CLIENT_ID
        }
      }
    );

    if (!response.ok) {
      throw new Error('Twitch-Benutzerprofil konnte nicht geladen werden.');
    }

    const result = await response.json();
    const user = result.data?.[0];

    if (!user) {
      throw new Error('Twitch-Benutzer nicht gefunden.');
    }

    return user;
  }

  async function activateTwitch(auth) {
    setConnectionStatus('connecting');

    const validation = await validateToken(
      auth.access_token
    );

    const user = await loadTwitchUser(
      auth.access_token
    );

    twitchUser = user;

    saveAuth({
      access_token: auth.access_token,
      refresh_token: auth.refresh_token || null,
      expires_at: auth.expires_at ||
        Date.now() + Math.max(
          0,
          Number(validation.expires_in || 0)
        ) * 1000,
      user_id: user.id,
      login: user.login,
      display_name: user.display_name
    });

    setConnectionStatus('connected');

    console.info(
      'JC Neon Studio: Twitch angemeldet als',
      user.display_name
    );

    toast('Twitch verbunden: ' + user.display_name);
  }

  async function handleOAuthCallback() {
    const url = new URL(window.location.href);

    const error = url.searchParams.get('error');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!error && !code) {
      return false;
    }

    const pending = readStorage(
      PKCE_STORAGE_KEY,
      sessionStorage
    );

    clearOAuthURL();
    sessionStorage.removeItem(PKCE_STORAGE_KEY);

    if (error) {
      toast('Twitch-Anmeldung abgebrochen oder abgelehnt.');
      console.warn(
        'Twitch OAuth:',
        error,
        url.searchParams.get('error_description')
      );
      return true;
    }

    if (
      !pending ||
      !pending.verifier ||
      !pending.state ||
      pending.state !== state ||
      !pending.createdAt ||
      Date.now() - pending.createdAt > 600000
    ) {
      toast('Twitch-Anmeldung ungültig. Bitte erneut verbinden.');
      return true;
    }

    try {
      setConnectionStatus('connecting');

      const tokens = await exchangeCode(
        code,
        pending.verifier
      );

      await activateTwitch({
        ...tokens,
        expires_at:
          Date.now() +
          Number(tokens.expires_in || 0) * 1000
      });
    } catch (error) {
      console.error('Twitch OAuth Fehler:', error);

      saveAuth(null);
      twitchUser = null;
      setConnectionStatus('disconnected');

      toast('Twitch-Anmeldung fehlgeschlagen.');
    }

    return true;
  }

  async function restoreTwitchSession() {
    const stored = readStorage(
      AUTH_STORAGE_KEY,
      sessionStorage
    );

    if (!stored?.access_token) {
      setConnectionStatus('disconnected');
      return;
    }

    if (
      stored.expires_at &&
      Date.now() >= stored.expires_at
    ) {
      saveAuth(null);
      setConnectionStatus('disconnected');
      return;
    }

    try {
      await activateTwitch(stored);
    } catch (error) {
      console.warn('Twitch-Sitzung abgelaufen:', error);

      saveAuth(null);
      twitchUser = null;
      setConnectionStatus('disconnected');
    }
  }

  function disconnectTwitch() {
    // Lokale Sitzung beenden.
    // Die Twitch-Autorisierung kann zusätzlich in den
    // Twitch-Kontoeinstellungen widerrufen werden.

    saveAuth(null);
    twitchUser = null;
    setConnectionStatus('disconnected');

    toast('Twitch-Verbindung lokal getrennt.');
  }

  async function initializeTwitch() {
    try {
      const handled = await handleOAuthCallback();

      if (!handled) {
        await restoreTwitchSession();
      }
    } catch (error) {
      console.error('Twitch-Initialisierung:', error);

      setConnectionStatus('disconnected');
      toast('Twitch-Verbindung konnte nicht geprüft werden.');
    }
  }

  $('twitchBtn')?.addEventListener('click', () => {
    if (connectionStatus === 'connected') {
      disconnectTwitch();
    } else {
      connectTwitch();
    }
  });

  $('twitchInfo')?.addEventListener('click', () => {
    if (connectionStatus === 'connected') {
      toast(
        'Twitch ist angemeldet. Live-Chat und EventSub folgen.'
      );
    } else {
      connectTwitch();
    }
  });

  setConnectionStatus('disconnected');
  initializeTwitch();

  // ==========================================
  // EINSTELLUNGEN EXPORTIEREN
  // ==========================================

  $('exportSettings')?.addEventListener('click', () => {
    const backup = {
      application: 'JC Neon Studio',
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      settings: { ...settings },
      overlaySettings:
        window.JCOverlay?.getSettings?.() || null
    };

    // Twitch-Tokens werden NICHT exportiert.

    const json = JSON.stringify(backup, null, 2);

    const blob = new Blob(
      [json],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'jc-neon-studio-backup.json';

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    toast('Studio- und Overlay-Einstellungen exportiert.');
  });

  // ==========================================
  // EINSTELLUNGEN IMPORTIEREN
  // ==========================================

  $('importSettings')?.addEventListener('click', () => {
    $('importSettingsFile')?.click();
  });

  $('importSettingsFile')?.addEventListener(
    'change',
    async event => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        if (file.size > 1024 * 1024) {
          throw new Error('Die Datei ist zu groß.');
        }

        const content = await file.text();
        const backup = JSON.parse(content);

        if (
          !backup ||
          backup.application !== 'JC Neon Studio' ||
          !backup.settings ||
          typeof backup.settings !== 'object' ||
          Array.isArray(backup.settings)
        ) {
          throw new Error('Ungültige Backup-Datei.');
        }

        const imported = {};

        for (const key of Object.keys(defaults)) {
          const value = backup.settings[key];
          const fallback = defaults[key];

          if (typeof value !== typeof fallback) {
            continue;
          }

          if (typeof fallback === 'string') {
            imported[key] = value.slice(0, 1000);
          } else if (typeof fallback === 'number') {
            if (Number.isFinite(value)) {
              imported[key] = value;
            }
          } else if (typeof fallback === 'boolean') {
            imported[key] = value;
          }
        }

        imported.volume = Math.max(
          0,
          Math.min(
            100,
            Number(imported.volume ?? defaults.volume)
          )
        );

        imported.rate = Math.max(
          50,
          Math.min(
            200,
            Number(imported.rate ?? defaults.rate)
          )
        );

        imported.duration = Math.max(
          3,
          Math.min(
            15,
            Number(imported.duration ?? defaults.duration)
          )
        );

        settings = {
          ...defaults,
          ...imported
        };

        persist();
        applySettings();
        populateVoices();

        if (
          backup.overlaySettings &&
          typeof backup.overlaySettings === 'object'
        ) {
          if (window.JCOverlay?.importSettings) {
            window.JCOverlay.importSettings(
              backup.overlaySettings
            );
          } else {
            toast(
              'Studio importiert. Overlay-Controller nicht verfügbar.'
            );
            return;
          }
        }

        toast('Studio- und Overlay-Einstellungen importiert.');
      } catch (error) {
        console.error('Import fehlgeschlagen:', error);
        toast('Import fehlgeschlagen: ' + error.message);
      } finally {
        event.target.value = '';
      }
    }
  );

  // ==========================================
  // EINSTELLUNGEN ZURÜCKSETZEN
  // ==========================================

  $('resetSettings')?.addEventListener('click', () => {
    const confirmed = window.confirm(
      'Möchtest du wirklich alle Studio-Einstellungen zurücksetzen?'
    );

    if (!confirmed) return;

    settings = { ...defaults };

    persist();
    applySettings();
    populateVoices();

    window.JCOverlay?.resetSettings?.();

    toast('Studio- und Overlay-Einstellungen zurückgesetzt.');
  });

  // ==========================================
  // ÖFFENTLICHE STUDIO-SCHNITTSTELLE
  // ==========================================

  window.JCStreamTools = Object.freeze({
    version: '2.1.0',

    addChat,
    triggerAlert,
    playAlertSound,
    stopSpeech,

    connectTwitch,
    disconnectTwitch,

    getSettings() {
      return { ...settings };
    },

    getAudioQueueLength() {
      return audioQueue.length;
    },

    getConnectionStatus() {
      return connectionStatus;
    },

    getTwitchUser() {
      return twitchUser
        ? {
            id: twitchUser.id,
            login: twitchUser.login,
            display_name: twitchUser.display_name
          }
        : null;
    }
  });

  // ==========================================
  // START
  // ==========================================

  console.log(
    '%c JC NEON STUDIO 2.1 ',
    'background:#9146ff;color:white;font-size:16px;padding:8px;'
  );

  console.log('Einstellungen: geladen');
  console.log('Automatisches Speichern: aktiv');
  console.log('Emoji-Filter: aktiv');
  console.log('Chat-TTS: bereit');
  console.log('Overlay-Backup: integriert');
  console.log('Follower-Sound:', soundFiles.follow);
  console.log('Abo-Sound:', soundFiles.sub);
  console.log('Bits-Sound:', soundFiles.bits);
  console.log('Twitch OAuth PKCE: eingerichtet');
})();
