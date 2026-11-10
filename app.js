
'use strict';

/*
 * JC NEON STUDIO 2.0
 * JADE & CLARKE
 *
 * Chat, TTS, Sounds, Einstellungen,
 * Backup, Overlay und Verbindungsstatus.
 */

(() => {
  const $ = id => document.getElementById(id);

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

  function readStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      return parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
          ? parsed
          : null;
    } catch (error) {
      console.warn('Speicher konnte nicht gelesen werden:', error);
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
    if ($(id)) {
      $(id).textContent = value;
    }
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

    // Zusätzlich an den eingebetteten Overlay-Controller.
    // Dadurch erreicht die Nachricht auch die Vorschau.
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

    // Nur die Dashboard-Vorschau aktualisieren.
    // Die Sounds benötigen keine Videoeinblendung.
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
  // TWITCH-VERBINDUNGSSTATUS
  // ==========================================

  let connectionStatus = 'disconnected';

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
        detail: 'Twitch-Verbindung wird aufgebaut',
        color: 'amber'
      },
      connected: {
        label: 'VERBUNDEN',
        short: 'ONLINE',
        detail: 'Twitch-Verbindung aktiv',
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
  }

  function twitchInfo() {
    toast(
      'Die Twitch-Anmeldung wird im nächsten Schritt eingerichtet.'
    );
  }

  $('twitchBtn')?.addEventListener('click', twitchInfo);
  $('twitchInfo')?.addEventListener('click', twitchInfo);

  setConnectionStatus('disconnected');

  // ==========================================
  // EINSTELLUNGEN EXPORTIEREN
  // ==========================================

  $('exportSettings')?.addEventListener('click', () => {
    const backup = {
      application: 'JC Neon Studio',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      settings: { ...settings },

      // NEU: Overlay-Einstellungen mit sichern.
      overlaySettings:
        window.JCOverlay?.getSettings?.() || null
    };

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

        // NEU: Overlay-Einstellungen wiederherstellen.
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

    // NEU: Overlay-Einstellungen ebenfalls zurücksetzen.
    window.JCOverlay?.resetSettings?.();

    toast('Studio- und Overlay-Einstellungen zurückgesetzt.');
  });

  // ==========================================
  // SCHNITTSTELLE FÜR SPÄTERE TWITCH-ANBINDUNG
  // ==========================================

  window.JCStreamTools = Object.freeze({
    version: '2.0.0',

    addChat,
    triggerAlert,
    playAlertSound,
    stopSpeech,

    getSettings() {
      return { ...settings };
    },

    getAudioQueueLength() {
      return audioQueue.length;
    },

    getConnectionStatus() {
      return connectionStatus;
    }
  });

  // ==========================================
  // START
  // ==========================================

  console.log(
    '%c JC NEON STUDIO 2.0 ',
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
  console.log('Twitch: noch nicht verbunden');
})();
