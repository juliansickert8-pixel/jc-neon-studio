
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

    const sorted = [...german, ...other];

    sorted.forEach(voice => {
      const option = document.createElement('option');

      option.value = voice.voiceURI || voice.name;
      option.textContent =
        `${voice.name} (${voice.lang})`;

      select.appendChild(option);
    });

    const exists = sorted.some(voice =>
      (voice.voiceURI || voice.name) === previous
    );

    if (exists) {
      select.value = previous;
    } else {
      const preferred =
        german.find(voice =>
          /male|männ|stefan|markus|conrad|daniel/i.test(
            voice.name
          )
        ) ||
        german[0] ||
        sorted[0];

      if (preferred) {
        select.value =
          preferred.voiceURI || preferred.name;
      }
    }

    settings.voice = select.value;
    saveSettings();
  }

  function selectedVoice() {
    return availableVoices.find(voice =>
      (voice.voiceURI || voice.name) === settings.voice
    ) || null;
  }

  function stopSpeaking() {
    speechQueue = [];
    speaking = false;

    if (synth) {
      synth.cancel();
    }
  }

  function processSpeechQueue() {
    if (!synth || speaking || !speechQueue.length) {
      return;
    }

    const item = speechQueue.shift();
    if (!item) return;

    speaking = true;

    const utterance = new SpeechSynthesisUtterance(
      item.text
    );

    const voice = selectedVoice();

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'de-DE';
    }

    utterance.volume = Math.min(
      1,
      Math.max(0, settings.volume / 100)
    );

    utterance.rate = Math.min(
      2,
      Math.max(0.5, settings.rate / 100)
    );

    utterance.pitch = 1;

    utterance.onend = () => {
      speaking = false;
      processSpeechQueue();
    };

    utterance.onerror = () => {
      speaking = false;
      processSpeechQueue();
    };

    try {
      synth.speak(utterance);
    } catch (error) {
      console.error('TTS-Fehler:', error);
      speaking = false;
      processSpeechQueue();
    }
  }

  function speak(message, username = '') {
    if (!settings.ttsEnabled || !synth) {
      return;
    }

    const cleanedMessage = cleanTTSMessage(message);
    const cleanedUsername = cleanTTSMessage(username);

    if (!cleanedMessage) {
      return;
    }

    const text =
      settings.readNames && cleanedUsername
        ? `${cleanedUsername} schreibt: ${cleanedMessage}`
        : cleanedMessage;

    speechQueue.push({ text });

    if (speechQueue.length > 30) {
      speechQueue = speechQueue.slice(-30);
    }

    processSpeechQueue();
  }

  function updateTTSStatus() {
    setText(
      'ttsStatus',
      settings.ttsEnabled ? 'AKTIV' : 'AUS'
    );
  }

  function setupTTSControls() {
    const enabled = $('ttsEnabled');

    if (enabled) {
      enabled.addEventListener('change', () => {
        updateSetting('ttsEnabled', enabled.checked);

        if (!enabled.checked) {
          stopSpeaking();
        }

        updateTTSStatus();
      });
    }

    const voice = $('voiceSelect');

    if (voice) {
      voice.addEventListener('change', () => {
        updateSetting('voice', voice.value);
      });
    }

    const volume = $('volume');

    if (volume) {
      volume.addEventListener('input', () => {
        updateSetting(
          'volume',
          Number(volume.value)
        );

        setText(
          'volumeValue',
          formatPercent(settings.volume)
        );
      });
    }

    const rate = $('rate');

    if (rate) {
      rate.addEventListener('input', () => {
        updateSetting(
          'rate',
          Number(rate.value)
        );

        setText(
          'rateValue',
          `${(settings.rate / 100).toFixed(1)}×`
        );
      });
    }

    const readNames = $('readNames');

    if (readNames) {
      readNames.addEventListener('change', () => {
        updateSetting(
          'readNames',
          readNames.checked
        );
      });
    }

    $('testVoice')?.addEventListener('click', () => {
      speak(
        'Hallo Faulie! Willkommen in deinem JC Neon Studio.'
      );
    });

    $('stopVoice')?.addEventListener(
      'click',
      stopSpeaking
    );

    $('testMessageBtn')?.addEventListener(
      'click',
      () => {
        const username =
          $('testUser')?.value.trim() || 'FaulieFan';

        const message =
          $('testMessage')?.value.trim() || '';

        if (!message) {
          toast('Bitte gib eine Nachricht ein.');
          return;
        }

        updateSetting('testUser', username);
        updateSetting('testMessage', message);

        addChatMessage(username, message, true);
      }
    );

    $('testUser')?.addEventListener('input', event => {
      updateSetting(
        'testUser',
        event.target.value
      );
    });

    $('testMessage')?.addEventListener(
      'input',
      event => {
        updateSetting(
          'testMessage',
          event.target.value
        );
      }
    );
  }

  // ==========================================
  // CHAT / TESTNACHRICHTEN
  // ==========================================

  const chatHistory = [];
  const MAX_CHAT_HISTORY = 100;

  function addChatMessage(
    username,
    message,
    shouldSpeak = true,
    metadata = {}
  ) {
    const name = String(username || 'Unbekannt');
    const content = String(message || '');

    if (!content.trim()) return;

    const entry = {
      id: crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random()}`,
      username: name,
      message: content,
      timestamp: Date.now(),
      ...metadata
    };

    chatHistory.push(entry);

    if (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.shift();
    }

    const feed = $('chatFeed');

    if (feed) {
      const line = document.createElement('div');
      line.className = 'chat-line';

      const user = document.createElement('span');
      user.className = 'username';
      user.textContent = name;

      const text = document.createElement('span');
      text.textContent = content;

      line.appendChild(user);
      line.appendChild(text);
      feed.appendChild(line);

      while (feed.children.length > 100) {
        feed.firstElementChild?.remove();
      }

      feed.scrollTop = feed.scrollHeight;
    }

    if (shouldSpeak) {
      speak(content, name);
    }

    sendOverlayEvent({
      type: 'chat',
      data: entry
    });

    refreshOverlayPreview();
  }

  function setupChatControls() {
    const input = $('chatInput');

    const send = () => {
      const message = input?.value.trim();

      if (!message) return;

      addChatMessage(
        'FaulieFan',
        message,
        true
      );

      if (input) {
        input.value = '';
      }

      updateSetting('chatInput', '');
    };

    $('sendChat')?.addEventListener('click', send);

    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        send();
      }
    });

    input?.addEventListener('input', event => {
      updateSetting(
        'chatInput',
        event.target.value
      );
    });
  }

  // ==========================================
  // ALERT-SOUNDS
  // ==========================================

  const activeSounds = new Set();

  function playAlertSound(type) {
    if (!settings.soundEnabled) {
      return;
    }

    const file = SOUND_FILES[type];

    if (!file) return;

    const audio = new Audio(file);

    audio.volume = Math.min(
      1,
      Math.max(0, settings.soundVolume / 100)
    );

    activeSounds.add(audio);

    const cleanup = () => {
      activeSounds.delete(audio);
    };

    audio.addEventListener('ended', cleanup, {
      once: true
    });

    audio.addEventListener('error', cleanup, {
      once: true
    });

    audio.play().catch(error => {
      cleanup();

      console.warn(
        'Alert-Sound konnte nicht abgespielt werden:',
        error
      );
    });
  }

  function stopAllSounds() {
    activeSounds.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    activeSounds.clear();
  }

  function updateSoundStatus() {
    const enabled = [
      settings.followEnabled,
      settings.subEnabled,
      settings.bitsEnabled
    ].filter(Boolean).length;

    setText('soundCount', String(enabled));
  }

  // ==========================================
  // ALERTS
  // ==========================================

  let alertPreviewTimer = null;

  function isAlertEnabled(type) {
    if (type === 'follow') {
      return settings.followEnabled;
    }

    if (type === 'sub') {
      return settings.subEnabled;
    }

    if (type === 'bits') {
      return settings.bitsEnabled;
    }

    return false;
  }

  function showAlertPreview(type, username) {
    const preview = $('alertPreview');

    if (!preview) return;

    clearTimeout(alertPreviewTimer);

    const label = ALERT_LABELS[type] || 'NEUER ALERT';
    const icon = ALERT_ICONS[type] || '✦';

    preview.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = `neon-alert alert-${type}`;

    const iconElement = document.createElement('div');
    iconElement.className = 'neon-alert-icon';
    iconElement.textContent = icon;

    const title = document.createElement('div');
    title.className = 'neon-alert-title';
    title.textContent = label;

    const user = document.createElement('strong');
    user.className = 'neon-alert-user';
    user.textContent = username;

    wrapper.appendChild(iconElement);
    wrapper.appendChild(title);
    wrapper.appendChild(user);

    preview.appendChild(wrapper);

    alertPreviewTimer = setTimeout(() => {
      preview.innerHTML = `
        <div class="placeholder-icon">✦</div>
        <b>DEIN NEON ALERT</b>
        <small>Wähle links einen Test aus.</small>
      `;
    }, settings.duration * 1000);
  }

  function triggerAlert(
    type,
    username = 'NeonSloth',
    metadata = {}
  ) {
    if (!isAlertEnabled(type)) {
      toast('Dieser Alert ist deaktiviert.');
      return;
    }

    const event = {
      id: crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random()}`,
      type,
      username: String(username),
      duration: settings.duration,
      timestamp: Date.now(),
      ...metadata
    };

    showAlertPreview(type, event.username);

    if (settings.overlayAlertSound) {
      playAlertSound(type);
    }

    sendOverlayEvent({
      type: 'alert',
      data: event
    });

    refreshOverlayPreview();
  }

  function setupAlertControls() {
    const toggles = {
      followEnabled: 'followEnabled',
      subEnabled: 'subEnabled',
      bitsEnabled: 'bitsEnabled'
    };

    Object.entries(toggles).forEach(
      ([id, key]) => {
        const element = $(id);

        element?.addEventListener(
          'change',
          () => {
            updateSetting(key, element.checked);
            updateSoundStatus();
          }
        );
      }
    );

    const duration = $('duration');

    duration?.addEventListener('input', () => {
      updateSetting(
        'duration',
        Number(duration.value)
      );

      setText(
        'durationValue',
        `${settings.duration} Sekunden`
      );
    });

    $('alertUser')?.addEventListener(
      'input',
      event => {
        updateSetting(
          'alertUser',
          event.target.value
        );
      }
    );

    document.querySelectorAll('[data-test]').forEach(
      button => {
        button.addEventListener('click', () => {
          const type = button.dataset.test;

          const username =
            $('alertUser')?.value.trim() ||
            settings.alertUser ||
            'NeonSloth';

          triggerAlert(type, username);
        });
      }
    );
  }

  // ==========================================
  // OVERLAY-KOMMUNIKATION
  // ==========================================

  const OVERLAY_CHANNEL = 'jc_neon_studio_overlay';
  let overlayChannel = null;

  try {
    overlayChannel = new BroadcastChannel(
      OVERLAY_CHANNEL
    );
  } catch (error) {
    console.warn(
      'BroadcastChannel ist nicht verfügbar:',
      error
    );
  }

  function sendOverlayEvent(payload) {
    if (!payload || !overlayChannel) return;

    try {
      overlayChannel.postMessage({
        source: 'jc-neon-studio',
        timestamp: Date.now(),
        ...payload
      });
    } catch (error) {
      console.warn(
        'Overlay-Nachricht konnte nicht gesendet werden:',
        error
      );
    }
  }

  function syncOverlaySettings() {
    sendOverlayEvent({
      type: 'settings',
      data: {
        ...settings
      }
    });
  }

  function getOverlayURL() {
    return new URL(
      'overlay.html',
      window.location.href
    ).href;
  }

  function openOverlayWindow() {
    const url = getOverlayURL();

    const popup = window.open(
      url,
      'JCNeonStudioOverlay',
      'width=1280,height=720,resizable=yes,scrollbars=no'
    );

    if (!popup) {
      toast(
        'Popup blockiert. Bitte Popups für JC Neon Studio erlauben.'
      );
      return;
    }

    popup.focus();

    setTimeout(syncOverlaySettings, 700);
  }

  function copyOverlayURL() {
    const url = getOverlayURL();

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => {
          toast('OBS-Overlay-Link kopiert.');
        })
        .catch(() => {
          prompt('OBS-Overlay-Link:', url);
        });

      return;
    }

    prompt('OBS-Overlay-Link:', url);
  }

  function refreshOverlayPreview() {
    const preview = $('overlayPreview');

    if (!preview) return;

    preview.dataset.chat =
      settings.showChatOverlay ? 'on' : 'off';

    preview.dataset.alerts =
      settings.showAlertOverlay ? 'on' : 'off';

    preview.dataset.theme =
      settings.overlayTheme || 'neon';
  }

  // ==========================================
  // OVERLAY-EINSTELLUNGEN
  // ==========================================

  function bindOverlayCheckbox(id, key) {
    const element = $(id);

    if (!element) return;

    element.addEventListener('change', () => {
      updateSetting(key, element.checked);
      refreshOverlayPreview();
      syncOverlaySettings();
    });
  }

  function bindOverlayRange(id, key, outputId, suffix = '') {
    const element = $(id);

    if (!element) return;

    element.addEventListener('input', () => {
      updateSetting(key, Number(element.value));

      if (outputId) {
        setText(
          outputId,
          `${element.value}${suffix}`
        );
      }

      refreshOverlayPreview();
      syncOverlaySettings();
    });
  }

  function bindOverlaySelect(id, key) {
    const element = $(id);

    if (!element) return;

    element.addEventListener('change', () => {
      updateSetting(key, element.value);
      refreshOverlayPreview();
      syncOverlaySettings();
    });
  }

  function setupOverlayControls() {
    $('openOverlay')?.addEventListener(
      'click',
      openOverlayWindow
    );

    $('openCombinedOverlay')?.addEventListener(
      'click',
      openOverlayWindow
    );

    $('openChatOverlay')?.addEventListener(
      'click',
      openOverlayWindow
    );

    $('openAlertOverlay')?.addEventListener(
      'click',
      openOverlayWindow
    );

    $('copyOverlayURL')?.addEventListener(
      'click',
      copyOverlayURL
    );

    $('copyOverlayLink')?.addEventListener(
      'click',
      copyOverlayURL
    );

    bindOverlayCheckbox(
      'showChatOverlay',
      'showChatOverlay'
    );

    bindOverlayCheckbox(
      'showAlertOverlay',
      'showAlertOverlay'
    );

    bindOverlayCheckbox(
      'overlayShowAvatar',
      'overlayShowAvatar'
    );

    bindOverlayCheckbox(
      'overlayShowBadges',
      'overlayShowBadges'
    );

    bindOverlayCheckbox(
      'overlayChatBackground',
      'overlayChatBackground'
    );

    bindOverlayCheckbox(
      'overlayAlertBackground',
      'overlayAlertBackground'
    );

    bindOverlayCheckbox(
      'overlayChatSound',
      'overlayChatSound'
    );

    bindOverlayCheckbox(
      'overlayAlertSound',
      'overlayAlertSound'
    );

    bindOverlaySelect(
      'chatPosition',
      'chatPosition'
    );

    bindOverlaySelect(
      'alertPosition',
      'alertPosition'
    );

    bindOverlaySelect(
      'overlayChatAnimation',
      'overlayChatAnimation'
    );

    bindOverlaySelect(
      'overlayAlertAnimation',
      'overlayAlertAnimation'
    );

    bindOverlaySelect(
      'overlayTheme',
      'overlayTheme'
    );

    bindOverlayRange(
      'overlayScale',
      'overlayScale',
      'overlayScaleValue',
      '%'
    );

    bindOverlayRange(
      'overlayChatLimit',
      'overlayChatLimit',
      'overlayChatLimitValue'
    );

    bindOverlayRange(
      'overlayChatDuration',
      'overlayChatDuration',
      'overlayChatDurationValue',
      ' s'
    );

    bindOverlayRange(
      'overlayChatWidth',
      'overlayChatWidth',
      'overlayChatWidthValue',
      ' px'
    );

    bindOverlayRange(
      'overlayAlertWidth',
      'overlayAlertWidth',
      'overlayAlertWidthValue',
      ' px'
    );

    bindOverlayRange(
      'overlayFontSize',
      'overlayFontSize',
      'overlayFontSizeValue',
      ' px'
    );

    bindOverlayRange(
      'overlayOpacity',
      'overlayOpacity',
      'overlayOpacityValue',
      '%'
    );

    bindOverlayRange(
      'soundVolume',
      'soundVolume',
      'soundVolumeValue',
      '%'
    );

    bindOverlayCheckbox(
      'soundEnabled',
      'soundEnabled'
    );

    $('overlayTestChat')?.addEventListener(
      'click',
      () => {
        addChatMessage(
          settings.overlayTestUser,
          settings.overlayTestMessage,
          false
        );
      }
    );

    $('overlayTestFollow')?.addEventListener(
      'click',
      () => {
        triggerAlert(
          'follow',
          settings.overlayTestUser
        );
      }
    );

    $('overlayTestSub')?.addEventListener(
      'click',
      () => {
        triggerAlert(
          'sub',
          settings.overlayTestUser
        );
      }
    );

    $('overlayTestBits')?.addEventListener(
      'click',
      () => {
        triggerAlert(
          'bits',
          settings.overlayTestUser
        );
      }
    );

    $('overlayTestUser')?.addEventListener(
      'input',
      event => {
        updateSetting(
          'overlayTestUser',
          event.target.value
        );
      }
    );

    $('overlayTestMessage')?.addEventListener(
      'input',
      event => {
        updateSetting(
          'overlayTestMessage',
          event.target.value
        );
      }
    );
  }

  // ==========================================
  // TEIL 2 FOLGT DIREKT HIERUNTEN
  // ==========================================

  // ==========================================
  // JC NEON STUDIO 2.2 – TEIL 2 VON 2
  // TWITCH / EVENTSUB / INITIALISIERUNG
  // ==========================================

  const TWITCH_API = 'https://api.twitch.tv/helix';
  const TWITCH_EVENTSUB_URL =
    'wss://eventsub.wss.twitch.tv/ws';

  let twitchAuth = readStorage(AUTH_STORAGE_KEY);
  let twitchUser = null;
  let twitchSocket = null;
  let twitchSessionId = null;
  let twitchReconnectTimer = null;
  let twitchConnected = false;
  let twitchConnecting = false;
  let twitchGeneration = 0;

  let twitchEventIds = new Set();
  let twitchEventIdOrder = [];

  const TWITCH_SUBSCRIPTIONS = [
    {
      type: 'channel.chat.message',
      version: '1',
      condition: user => ({
        broadcaster_user_id: user.id,
        user_id: user.id
      })
    },
    {
      type: 'channel.follow',
      version: '2',
      condition: user => ({
        broadcaster_user_id: user.id,
        moderator_user_id: user.id
      })
    },
    {
      type: 'channel.subscribe',
      version: '1',
      condition: user => ({
        broadcaster_user_id: user.id
      })
    },
    {
      type: 'channel.subscription.gift',
      version: '1',
      condition: user => ({
        broadcaster_user_id: user.id
      })
    },
    {
      type: 'channel.subscription.message',
      version: '1',
      condition: user => ({
        broadcaster_user_id: user.id
      })
    },
    {
      type: 'channel.cheer',
      version: '1',
      condition: user => ({
        broadcaster_user_id: user.id
      })
    }
  ];

  // ==========================================
  // PKCE HILFSFUNKTIONEN
  // ==========================================

  function randomString(length = 64) {
    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
      'abcdefghijklmnopqrstuvwxyz' +
      '0123456789-._~';

    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    return Array.from(
      bytes,
      byte => alphabet[byte % alphabet.length]
    ).join('');
  }

  function base64url(bytes) {
    const binary = Array.from(
      bytes,
      byte => String.fromCharCode(byte)
    ).join('');

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  async function createCodeChallenge(verifier) {
    const bytes = new TextEncoder().encode(verifier);

    const hash = await crypto.subtle.digest(
      'SHA-256',
      bytes
    );

    return base64url(new Uint8Array(hash));
  }

  function getOAuthCallbackURL() {
    return TWITCH_REDIRECT_URI;
  }

  function removeOAuthParameters() {
    const url = new URL(window.location.href);

    [
      'code',
      'state',
      'scope',
      'error',
      'error_description'
    ].forEach(parameter => {
      url.searchParams.delete(parameter);
    });

    history.replaceState(
      {},
      document.title,
      url.pathname + url.search + url.hash
    );
  }

  // ==========================================
  // TWITCH ANMELDUNG
  // ==========================================

  async function connectTwitch() {
    if (twitchConnecting) return;

    twitchConnecting = true;

    try {
      const verifier = randomString(96);
      const challenge = await createCodeChallenge(verifier);
      const state = randomString(40);

      sessionStorage.setItem(
        PKCE_STORAGE_KEY,
        JSON.stringify({
          verifier,
          state,
          createdAt: Date.now()
        })
      );

      const url = new URL(
        'https://id.twitch.tv/oauth2/authorize'
      );

      url.searchParams.set(
        'client_id',
        TWITCH_CLIENT_ID
      );

      url.searchParams.set(
        'redirect_uri',
        getOAuthCallbackURL()
      );

      url.searchParams.set(
        'response_type',
        'code'
      );

      url.searchParams.set(
        'scope',
        TWITCH_SCOPES.join(' ')
      );

      url.searchParams.set(
        'state',
        state
      );

      url.searchParams.set(
        'code_challenge',
        challenge
      );

      url.searchParams.set(
        'code_challenge_method',
        'S256'
      );

      window.location.assign(url.toString());

    } catch (error) {
      twitchConnecting = false;

      console.error(
        'Twitch-Anmeldung fehlgeschlagen:',
        error
      );

      toast(
        'Twitch-Anmeldung konnte nicht gestartet werden.'
      );
    }
  }

  async function exchangeOAuthCode(code, verifier) {
    const body = new URLSearchParams();

    body.set('client_id', TWITCH_CLIENT_ID);
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', getOAuthCallbackURL());
    body.set('code_verifier', verifier);

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

    const result = await response.json();

    if (!response.ok || !result.access_token) {
      throw new Error(
        result.message ||
        'Twitch konnte den Zugangscode nicht bestätigen.'
      );
    }

    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token || '',
      token_type: result.token_type || 'bearer',
      scope: result.scope || [],
      expires_at:
        Date.now() + result.expires_in * 1000
    };
  }

  async function handleOAuthCallback() {
    const url = new URL(window.location.href);

    const error = url.searchParams.get('error');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (error) {
      const description =
        url.searchParams.get('error_description') ||
        error;

      removeOAuthParameters();

      toast(
        `Twitch-Anmeldung abgebrochen: ${description}`,
        6000
      );

      return;
    }

    if (!code) return;

    const saved = readStorage(
      PKCE_STORAGE_KEY,
      sessionStorage
    );

    removeOAuthParameters();

    if (
      !saved ||
      !saved.verifier ||
      !saved.state ||
      saved.state !== state ||
      Date.now() - saved.createdAt > 600000
    ) {
      toast(
        'Die Twitch-Anmeldung ist abgelaufen. Bitte erneut verbinden.',
        6000
      );
      return;
    }

    sessionStorage.removeItem(PKCE_STORAGE_KEY);

    try {
      twitchAuth = await exchangeOAuthCode(
        code,
        saved.verifier
      );

      writeStorage(
        AUTH_STORAGE_KEY,
        twitchAuth
      );

      toast(
        'Twitch-Anmeldung erfolgreich!'
      );

    } catch (error) {
      console.error(error);

      toast(
        `Twitch-Anmeldung fehlgeschlagen: ${error.message}`,
        6000
      );
    }
  }

  // ==========================================
  // TOKEN ERNEUERN / VALIDIEREN
  // ==========================================

  async function refreshTwitchToken() {
    if (
      !twitchAuth ||
      !twitchAuth.refresh_token
    ) {
      throw new Error(
        'Kein Refresh-Token vorhanden.'
      );
    }

    const body = new URLSearchParams();

    body.set('grant_type', 'refresh_token');
    body.set(
      'refresh_token',
      twitchAuth.refresh_token
    );
    body.set('client_id', TWITCH_CLIENT_ID);

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

    const result = await response.json();

    if (!response.ok || !result.access_token) {
      throw new Error(
        result.message ||
        'Twitch-Token konnte nicht erneuert werden.'
      );
    }

    twitchAuth = {
      access_token: result.access_token,
      refresh_token:
        result.refresh_token ||
        twitchAuth.refresh_token,
      token_type: result.token_type || 'bearer',
      scope: result.scope || twitchAuth.scope || [],
      expires_at:
        Date.now() + result.expires_in * 1000
    };

    writeStorage(
      AUTH_STORAGE_KEY,
      twitchAuth
    );

    return twitchAuth.access_token;
  }

  async function validateTwitchToken() {
    if (!twitchAuth?.access_token) {
      return null;
    }

    const response = await fetch(
      'https://id.twitch.tv/oauth2/validate',
      {
        headers: {
          Authorization:
            `OAuth ${twitchAuth.access_token}`
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (
      result.client_id !== TWITCH_CLIENT_ID
    ) {
      return null;
    }

    return result;
  }

  async function ensureTwitchToken() {
    if (!twitchAuth?.access_token) {
      throw new Error(
        'Twitch ist nicht angemeldet.'
      );
    }

    if (
      twitchAuth.expires_at &&
      Date.now() >
        twitchAuth.expires_at - 120000
    ) {
      await refreshTwitchToken();
    }

    let validation = await validateTwitchToken();

    if (!validation) {
      await refreshTwitchToken();
      validation = await validateTwitchToken();
    }

    if (!validation) {
      throw new Error(
        'Die Twitch-Anmeldung ist nicht mehr gültig.'
      );
    }

    return twitchAuth.access_token;
  }

  // ==========================================
  // TWITCH API
  // ==========================================

  async function twitchAPI(
    path,
    options = {},
    retry = true
  ) {
    const token = await ensureTwitchToken();

    const headers = new Headers(
      options.headers || {}
    );

    headers.set(
      'Authorization',
      `Bearer ${token}`
    );

    headers.set(
      'Client-Id',
      TWITCH_CLIENT_ID
    );

    const response = await fetch(
      `${TWITCH_API}${path}`,
      {
        ...options,
        headers
      }
    );

    if (response.status === 401 && retry) {
      await refreshTwitchToken();

      return twitchAPI(
        path,
        options,
        false
      );
    }

    const result = await response.json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message ||
        `Twitch API Fehler: ${response.status}`
      );
    }

    return result;
  }

  async function getTwitchUser() {
    const result = await twitchAPI('/users');

    const user = result.data?.[0];

    if (!user) {
      throw new Error(
        'Twitch-Benutzer konnte nicht geladen werden.'
      );
    }

    return user;
  }

  // ==========================================
  // VERBINDUNGSSTATUS
  // ==========================================

  function setTwitchStatus(
    connected,
    username = ''
  ) {
    twitchConnected = connected;

    const status =
      connected ? 'ONLINE' : 'OFFLINE';

    setText('twitchStatus', status);
    setText('connectionStatus', status);

    const badge =
      $('connectionBadge') ||
      $('twitchBadge');

    if (badge) {
      badge.classList.toggle(
        'connected',
        connected
      );

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

    if (connected && username) {
      setText(
        'twitchUsername',
        username
      );

      setText(
        'connectedUser',
        username
      );

      setText(
        'twitchInfo',
        `Angemeldet als ${username}`
      );
    } else if (!connected) {
      setText(
        'twitchInfo',
        'Nicht verbunden'
      );
    }
  }

  // ==========================================
  // EVENTSUB WEBSOCKET
  // ==========================================

  function rememberEventId(id) {
    if (!id) return true;

    if (twitchEventIds.has(id)) {
      return false;
    }

    twitchEventIds.add(id);
    twitchEventIdOrder.push(id);

    if (twitchEventIdOrder.length > 500) {
      const oldId = twitchEventIdOrder.shift();
      twitchEventIds.delete(oldId);
    }

    return true;
  }

  function closeTwitchSocket() {
    clearTimeout(twitchReconnectTimer);

    twitchGeneration++;

    const socket = twitchSocket;

    twitchSocket = null;
    twitchSessionId = null;

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      try {
        socket.close(1000, 'Studio geschlossen');
      } catch (error) {
        console.warn(error);
      }
    }
  }

  async function createEventSubSubscription(
    subscription,
    sessionId
  ) {
    const payload = {
      type: subscription.type,
      version: subscription.version,
      condition:
        subscription.condition(twitchUser),
      transport: {
        method: 'websocket',
        session_id: sessionId
      }
    };

    const result = await twitchAPI(
      '/eventsub/subscriptions',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    console.log(
      'EventSub registriert:',
      subscription.type,
      result
    );
  }

  async function registerEventSubSubscriptions(
    sessionId
  ) {
    for (const subscription of TWITCH_SUBSCRIPTIONS) {
      try {
        await createEventSubSubscription(
          subscription,
          sessionId
        );
      } catch (error) {
        console.warn(
          `EventSub ${subscription.type} fehlgeschlagen:`,
          error.message
        );
      }
    }
  }

  function handleTwitchNotification(
    type,
    event
  ) {
    if (!event) return;

    switch (type) {
      case 'channel.chat.message': {
        const username =
          event.chatter_user_name ||
          event.chatter_user_login ||
          'Unbekannt';

        const message =
          event.message?.text || '';

        if (!message) return;

        addChatMessage(
          username,
          message,
          true,
          {
            twitch: true,
            messageId: event.message_id
          }
        );

        break;
      }

      case 'channel.follow': {
        triggerAlert(
          'follow',
          event.user_name ||
          event.user_login ||
          'Neuer Follower'
        );

        break;
      }

      case 'channel.subscribe': {
        triggerAlert(
          'sub',
          event.user_name ||
          event.user_login ||
          'Neuer Abonnent',
          {
            tier: event.tier,
            isGift: event.is_gift
          }
        );

        break;
      }

      case 'channel.subscription.gift': {
        // Geschenk-Abos können zusätzliche
        // channel.subscribe-Events erzeugen.
        // Daher hier keine zweite Tonwiedergabe.
        console.log(
          'Geschenk-Abos:',
          event.total,
          event.user_name
        );

        break;
      }

      case 'channel.subscription.message': {
        // Verlängerungsnachricht im Log.
        // Kein zweiter Alert, damit keine
        // doppelten Abo-Sounds entstehen.
        console.log(
          'Abo-Nachricht:',
          event.user_name,
          event.cumulative_months
        );

        break;
      }

      case 'channel.cheer': {
        const bits = Number(
          event.bits || 0
        );

        if (bits <= 0) return;

        triggerAlert(
          'bits',
          event.is_anonymous
            ? 'Anonym'
            : (
                event.user_name ||
                event.user_login ||
                'Zuschauer'
              ),
          {
            bits
          }
        );

        break;
      }

      default:
        console.log(
          'Unbekanntes Twitch-Event:',
          type,
          event
        );
    }
  }

  function scheduleTwitchReconnect(
    generation
  ) {
    clearTimeout(twitchReconnectTimer);

    if (
      generation !== twitchGeneration ||
      !twitchAuth?.access_token
    ) {
      return;
    }

    setTwitchStatus(false);

    twitchReconnectTimer = setTimeout(
      async () => {
        if (
          generation !== twitchGeneration ||
          !twitchAuth?.access_token
        ) {
          return;
        }

        try {
          await ensureTwitchToken();

          openTwitchEventSubSocket();

        } catch (error) {
          console.error(
            'Twitch-Wiederverbindung fehlgeschlagen:',
            error
          );

          scheduleTwitchReconnect(
            generation
          );
        }
      },
      5000
    );
  }

  function openTwitchEventSubSocket(
    url = TWITCH_EVENTSUB_URL,
    isReconnect = false
  ) {
    if (!twitchUser || !twitchAuth) {
      return;
    }

    const generation = ++twitchGeneration;

    if (twitchSocket) {
      const oldSocket = twitchSocket;

      oldSocket.onclose = null;
      oldSocket.onmessage = null;
      oldSocket.onerror = null;

      try {
        oldSocket.close();
      } catch (_) {}
    }

    const socket = new WebSocket(url);

    twitchSocket = socket;

    socket.onopen = () => {
      if (generation !== twitchGeneration) {
        return;
      }

      console.log(
        'Twitch EventSub WebSocket geöffnet.'
      );
    };

    socket.onmessage = async message => {
      if (generation !== twitchGeneration) {
        return;
      }

      let packet;

      try {
        packet = JSON.parse(message.data);
      } catch (error) {
        console.warn(
          'Ungültige Twitch-Nachricht:',
          error
        );
        return;
      }

      const metadata = packet.metadata || {};
      const payload = packet.payload || {};

      const messageType =
        metadata.message_type;

      if (
        !rememberEventId(
          metadata.message_id
        )
      ) {
        return;
      }

      if (
        messageType ===
        'session_welcome'
      ) {
        twitchSessionId =
          payload.session?.id || null;

        if (!twitchSessionId) {
          console.warn(
            'Twitch hat keine Session-ID geliefert.'
          );
          return;
        }

        setTwitchStatus(
          true,
          twitchUser.display_name ||
          twitchUser.login
        );

        if (!isReconnect) {
          await registerEventSubSubscriptions(
            twitchSessionId
          );
        }

        return;
      }

      if (
        messageType ===
        'session_keepalive'
      ) {
        return;
      }

      if (
        messageType ===
        'session_reconnect'
      ) {
        const reconnectURL =
          payload.session?.reconnect_url;

        if (reconnectURL) {
          openTwitchEventSubSocket(
            reconnectURL,
            true
          );
        }

        return;
      }

      if (
        messageType ===
        'notification'
      ) {
        handleTwitchNotification(
          metadata.subscription_type,
          payload.event
        );

        return;
      }

      if (
        messageType ===
        'revocation'
      ) {
        console.warn(
          'EventSub-Berechtigung widerrufen:',
          payload.subscription
        );
      }
    };

    socket.onerror = error => {
      if (generation !== twitchGeneration) {
        return;
      }

      console.warn(
        'Twitch WebSocket Fehler:',
        error
      );
    };

    socket.onclose = event => {
      if (generation !== twitchGeneration) {
        return;
      }

      console.warn(
        'Twitch WebSocket geschlossen:',
        event.code,
        event.reason
      );

      twitchSocket = null;
      twitchSessionId = null;

      scheduleTwitchReconnect(
        generation
      );
    };
  }

  // ==========================================
  // TWITCH VERBINDEN / TRENNEN
  // ==========================================

  async function restoreTwitchConnection() {
    if (!twitchAuth?.access_token) {
      setTwitchStatus(false);
      return;
    }

    setText(
      'twitchInfo',
      'Twitch-Verbindung wird wiederhergestellt ...'
    );

    try {
      await ensureTwitchToken();

      twitchUser = await getTwitchUser();

      setText(
        'twitchUsername',
        twitchUser.display_name ||
        twitchUser.login
      );

      openTwitchEventSubSocket();

    } catch (error) {
      console.error(
        'Twitch-Wiederherstellung fehlgeschlagen:',
        error
      );

      setTwitchStatus(false);

      toast(
        'Twitch konnte nicht automatisch verbunden werden.',
        5000
      );
    }
  }

  async function disconnectTwitch() {
    closeTwitchSocket();
    stopSpeaking();

    const token =
      twitchAuth?.access_token;

    twitchAuth = null;
    twitchUser = null;
    twitchConnecting = false;

    localStorage.removeItem(
      AUTH_STORAGE_KEY
    );

    sessionStorage.removeItem(
      PKCE_STORAGE_KEY
    );

    setTwitchStatus(false);

    if (token) {
      try {
        const body = new URLSearchParams();

        body.set(
          'client_id',
          TWITCH_CLIENT_ID
        );

        body.set(
          'token',
          token
        );

        await fetch(
          'https://id.twitch.tv/oauth2/revoke',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded'
            },
            body
          }
        );

      } catch (error) {
        console.warn(
          'Token-Widerruf fehlgeschlagen:',
          error
        );
      }
    }

    toast(
      'Twitch wurde getrennt.'
    );
  }

  function setupTwitchControls() {
    const buttons = [
      'twitchConnect',
      'connectTwitch',
      'twitchButton'
    ];

    buttons.forEach(id => {
      const button = $(id);

      if (!button) return;

      button.addEventListener(
        'click',
        async () => {
          if (twitchAuth?.access_token) {
            await disconnectTwitch();
          } else {
            await connectTwitch();
          }
        }
      );
    });

    $('twitchDisconnect')?.addEventListener(
      'click',
      disconnectTwitch
    );
  }

  // ==========================================
  // EINSTELLUNGEN ANZEIGEN
  // ==========================================

  function applySettingsToUI() {
    setChecked(
      'ttsEnabled',
      settings.ttsEnabled
    );

    setChecked(
      'readNames',
      settings.readNames
    );

    setChecked(
      'followEnabled',
      settings.followEnabled
    );

    setChecked(
      'subEnabled',
      settings.subEnabled
    );

    setChecked(
      'bitsEnabled',
      settings.bitsEnabled
    );

    setChecked(
      'motion',
      settings.motion
    );

    setChecked(
      'soundEnabled',
      settings.soundEnabled
    );

    setChecked(
      'showChatOverlay',
      settings.showChatOverlay
    );

    setChecked(
      'showAlertOverlay',
      settings.showAlertOverlay
    );

    setChecked(
      'overlayShowAvatar',
      settings.overlayShowAvatar
    );

    setChecked(
      'overlayShowBadges',
      settings.overlayShowBadges
    );

    setChecked(
      'overlayChatBackground',
      settings.overlayChatBackground
    );

    setChecked(
      'overlayAlertBackground',
      settings.overlayAlertBackground
    );

    setChecked(
      'overlayChatSound',
      settings.overlayChatSound
    );

    setChecked(
      'overlayAlertSound',
      settings.overlayAlertSound
    );

    const values = {
      volume: settings.volume,
      rate: settings.rate,
      duration: settings.duration,
      accent: settings.accent,
      testUser: settings.testUser,
      testMessage: settings.testMessage,
      alertUser: settings.alertUser,
      chatInput: settings.chatInput,
      soundVolume: settings.soundVolume,
      chatPosition: settings.chatPosition,
      alertPosition: settings.alertPosition,
      overlayScale: settings.overlayScale,
      overlayChatLimit: settings.overlayChatLimit,
      overlayChatDuration:
        settings.overlayChatDuration,
      overlayChatWidth:
        settings.overlayChatWidth,
      overlayAlertWidth:
        settings.overlayAlertWidth,
      overlayChatAnimation:
        settings.overlayChatAnimation,
      overlayAlertAnimation:
        settings.overlayAlertAnimation,
      overlayTheme: settings.overlayTheme,
      overlayFontSize:
        settings.overlayFontSize,
      overlayOpacity:
        settings.overlayOpacity,
      overlayTestUser:
        settings.overlayTestUser,
      overlayTestMessage:
        settings.overlayTestMessage
    };

    Object.entries(values).forEach(
      ([id, value]) => {
        setValue(id, value);
      }
    );

    setText(
      'volumeValue',
      formatPercent(settings.volume)
    );

    setText(
      'rateValue',
      `${(settings.rate / 100).toFixed(1)}×`
    );

    setText(
      'durationValue',
      `${settings.duration} Sekunden`
    );

    setText(
      'soundVolumeValue',
      `${settings.soundVolume}%`
    );

    const overlayValues = {
      overlayScaleValue:
        `${settings.overlayScale}%`,
      overlayChatLimitValue:
        String(settings.overlayChatLimit),
      overlayChatDurationValue:
        `${settings.overlayChatDuration} s`,
      overlayChatWidthValue:
        `${settings.overlayChatWidth} px`,
      overlayAlertWidthValue:
        `${settings.overlayAlertWidth} px`,
      overlayFontSizeValue:
        `${settings.overlayFontSize} px`,
      overlayOpacityValue:
        `${settings.overlayOpacity}%`
    };

    Object.entries(overlayValues).forEach(
      ([id, value]) => {
        setText(id, value);
      }
    );

    updateTTSStatus();
    updateSoundStatus();
    updateOverlayStatus();
  }

  function updateOverlayStatus() {
    setText(
      'overlayCount',
      '1'
    );
  }

  // ==========================================
  // EINSTELLUNGEN IMPORT / EXPORT
  // ==========================================

  function exportSettings() {
    const backup = {
      application: 'JC Neon Studio',
      version: '2.2',
      exportedAt:
        new Date().toISOString(),
      settings: {
        ...settings
      }
    };

    // Zugangsdaten werden ausdrücklich
    // NICHT in das Backup aufgenommen.

    const blob = new Blob(
      [
        JSON.stringify(
          backup,
          null,
          2
        )
      ],
      {
        type: 'application/json'
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download =
      'JC-Neon-Studio-Backup.json';

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    toast(
      'Studio-Backup wurde erstellt.'
    );
  }

  async function importSettings(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (
        !backup ||
        typeof backup.settings !== 'object' ||
        Array.isArray(backup.settings) ||
        backup.settings === null
      ) {
        throw new Error(
          'Ungültige Backup-Datei.'
        );
      }

      const imported = {};

      Object.keys(DEFAULTS).forEach(key => {
        if (
          Object.prototype.hasOwnProperty.call(
            backup.settings,
            key
          )
        ) {
          imported[key] =
            backup.settings[key];
        }
      });

      settings = {
        ...DEFAULTS,
        ...imported
      };

      saveSettings();
      applySettingsToUI();
      applyTheme();
      applyMotion();
      populateVoices();
      refreshOverlayPreview();
      syncOverlaySettings();

      toast(
        'Studio-Einstellungen erfolgreich importiert.'
      );

    } catch (error) {
      console.error(
        'Backup-Import fehlgeschlagen:',
        error
      );

      toast(
        'Die Backup-Datei konnte nicht importiert werden.'
      );
    }
  }

  function setupBackupControls() {
    $('exportSettings')?.addEventListener(
      'click',
      exportSettings
    );

    $('importSettings')?.addEventListener(
      'change',
      event => {
        const file =
          event.target.files?.[0];

        importSettings(file);

        event.target.value = '';
      }
    );
  }

  // ==========================================
  // AUTOMATISCHE SPEICHERUNG
  // ==========================================

  function setupAutomaticSaving() {
    const ignored = new Set([
      'twitchConnect',
      'connectTwitch',
      'twitchButton',
      'twitchDisconnect',
      'resetSettings',
      'exportSettings',
      'importSettings'
    ]);

    document.querySelectorAll(
      'input[id], select[id], textarea[id]'
    ).forEach(element => {
      if (ignored.has(element.id)) {
        return;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          DEFAULTS,
          element.id
        )
      ) {
        return;
      }

      const key =
        element.dataset.setting;

      if (
        !key ||
        !Object.prototype.hasOwnProperty.call(
          DEFAULTS,
          key
        )
      ) {
        return;
      }

      const save = () => {
        let value;

        if (element.type === 'checkbox') {
          value = element.checked;
        } else if (
          element.type === 'range' ||
          element.type === 'number'
        ) {
          value = Number(element.value);
        } else {
          value = element.value;
        }

        updateSetting(key, value);
      };

      element.addEventListener(
        'input',
        save
      );

      element.addEventListener(
        'change',
        save
      );
    });
  }

  // ==========================================
  // BROWSER-SPRACHAUSGABE
  // ==========================================

  function initializeSpeech() {
    if (!synth) {
      console.warn(
        'Dieser Browser unterstützt keine Sprachausgabe.'
      );

      setText(
        'ttsStatus',
        'NICHT VERFÜGBAR'
      );

      return;
    }

    populateVoices();

    if (
      'onvoiceschanged' in synth
    ) {
      synth.onvoiceschanged =
        populateVoices;
    }

    // Browser verlangen häufig eine
    // Benutzerinteraktion, bevor Ton
    // automatisch abgespielt werden darf.
    document.addEventListener(
      'pointerdown',
      () => {
        getVoices();
      },
      {
        once: true
      }
    );
  }

  // ==========================================
  // TAB-SICHTBARKEIT
  // ==========================================

  function setupVisibilityHandling() {
    document.addEventListener(
      'visibilitychange',
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          if (
            twitchAuth?.access_token &&
            (!twitchSocket ||
              twitchSocket.readyState ===
              WebSocket.CLOSED)
          ) {
            restoreTwitchConnection();
          }
        }
      }
    );

    window.addEventListener(
      'online',
      () => {
        if (twitchAuth?.access_token) {
          restoreTwitchConnection();
        }
      }
    );
  }

  // ==========================================
  // STARTSEITE / STUDIO
  // ==========================================

  function initializeStudioBranding() {
    document.title =
      'JC Neon Studio | Jade & Clarke';

    setText(
      'studioVersion',
      '2.2'
    );

    setText(
      'studioName',
      'NEON STUDIO'
    );

    setText(
      'studioCompany',
      'JADE & CLARKE'
    );
  }

  // ==========================================
  // INITIALISIERUNG
  // ==========================================

  async function initializeApp() {
    console.log(
      '%c JC NEON STUDIO 2.2 ',
      'background:#8b2cff;color:white;' +
      'padding:8px 16px;font-weight:bold;'
    );

    initializeStudioBranding();

    applySettingsToUI();

    applyTheme();
    applyMotion();

    setupNavigation();
    setupThemeControls();
    setupTTSControls();
    setupChatControls();
    setupAlertControls();
    setupOverlayControls();
    setupTwitchControls();
    setupBackupControls();
    setupAutomaticSaving();
    setupVisibilityHandling();

    initializeSpeech();

    refreshOverlayPreview();
    syncOverlaySettings();

    setTwitchStatus(false);

    try {
      await handleOAuthCallback();

      if (twitchAuth?.access_token) {
        await restoreTwitchConnection();
      }

    } catch (error) {
      console.error(
        'Fehler beim Starten von Twitch:',
        error
      );

      setTwitchStatus(false);
    }

    console.log(
      'JC Neon Studio wurde gestartet.'
    );
  }

  // ==========================================
  // APP STARTEN
  // ==========================================

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initializeApp,
      {
        once: true
      }
    );
  } else {
    initializeApp();
  }

  // ==========================================
  // APP SCHLIESSEN
  // ==========================================

  window.addEventListener(
    'pagehide',
    () => {
      closeTwitchSocket();
      stopSpeaking();
      stopAllSounds();
    }
  );

})();


/* =====================================================
   JC NEON STUDIO – DESIGN REPAIR 2.3
   Jade & Clarke
   ===================================================== */

(() => {
  "use strict";

  const STORAGE_KEY = "jc_neon_studio_v2";

  const THEMES = {
    purple: {
      accent: "#b43cff",
      accent2: "#00dfff",
      glow: "180, 60, 255"
    },
    pink: {
      accent: "#ff1493",
      accent2: "#ff69b4",
      glow: "255, 20, 147"
    },
    cyan: {
      accent: "#00e5ff",
      accent2: "#00b8ff",
      glow: "0, 229, 255"
    },
    red: {
      accent: "#ff334f",
      accent2: "#ff8092",
      glow: "255, 51, 79"
    }
  };

  function readSettings() {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );
    } catch {
      return {};
    }
  }

  function saveSettings(changes) {
    const settings = {
      ...readSettings(),
      ...changes
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );
  }

  function normalizeTheme(value) {
    const name = String(value || "purple")
      .toLowerCase()
      .trim();

    const aliases = {
      "hot-pink": "pink",
      "hotpink": "pink",
      "electric-cyan": "cyan",
      "electric cyan": "cyan",
      "electriccan": "cyan",
      "neon-pink": "pink",
      "neon-cyan": "cyan"
    };

    const normalized = aliases[name] || name;

    return THEMES[normalized]
      ? normalized
      : "purple";
  }

  function applyTheme(value) {
    const themeName = normalizeTheme(value);
    const theme = THEMES[themeName];

    const root = document.documentElement;

    root.style.setProperty(
      "--accent",
      theme.accent
    );

    root.style.setProperty(
      "--accent2",
      theme.accent2
    );

    root.style.setProperty(
      "--jc-glow-rgb",
      theme.glow
    );

    root.dataset.accent = themeName;
    document.body.dataset.accent = themeName;

    saveSettings({
      accent: themeName
    });

    console.log(
      "[JC Neon Studio] Theme:",
      themeName
    );
  }

  function applyMotion(enabled) {
    const active = Boolean(enabled);

    document.body.classList.toggle(
      "no-motion",
      !active
    );

    document.body.classList.toggle(
      "reduce-motion",
      !active
    );

    document.documentElement.classList.toggle(
      "reduce-motion",
      !active
    );

    saveSettings({
      motion: active
    });
  }

  function initializeDesign() {
    const settings = readSettings();

    const accentSelect =
      document.getElementById("accent");

    const motionToggle =
      document.getElementById("motion");

    applyTheme(settings.accent || "purple");

    applyMotion(settings.motion !== false);

    if (accentSelect) {
      const current = normalizeTheme(
        settings.accent
      );

      const matchingOption = Array.from(
        accentSelect.options
      ).find(option =>
        normalizeTheme(option.value) === current
      );

      if (matchingOption) {
        accentSelect.value = matchingOption.value;
      }

      accentSelect.addEventListener(
        "change",
        () => {
          applyTheme(accentSelect.value);
        }
      );
    }

    if (motionToggle) {
      motionToggle.checked =
        settings.motion !== false;

      motionToggle.addEventListener(
        "change",
        () => {
          applyMotion(motionToggle.checked);
        }
      );
    }

    console.log(
      "[JC Neon Studio] Design bereit."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeDesign,
      { once: true }
    );
  } else {
    initializeDesign();
  }

})();
