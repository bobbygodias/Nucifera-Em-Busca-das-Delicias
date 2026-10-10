/* Nucífera — idealizado e desenvolvido por Bobby Dias Developer.
 * Developer ID: 36e3b89c-2939-5565-a551-83d310ac8c6f
 */
(() => {
  const $ = (s) => document.querySelector(s);
  const canvas = $('#jumpCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const MAX_PHASE = 10, MAX_LOSSES = 10, MAX_CONTINUES = 3;
  const directRace = new URLSearchParams(window.location.search).get('fase') === '6';
  const racePreviewStorage = {};
  const OUTPUT_VOLUME = 0.915; // Reduce all game and video audio by 8.5%.
  const phaseNames = ['', 'Jardim dos Morangos', 'Salão da Confeitaria', 'Caminho dos Folhados', 'Cozinha de Cacau', 'Balcão das Bebidas', 'Rota das Delícias', 'Varanda das Delícias', 'Caminho dos Pães', 'Festa dos Sabores', 'O Brinde Final'];
  const images = {};
  const files = {
    background: 'assets/cafe-parallax-bg-small.jpg', kitchen: 'assets/kitchen-parallax-bg-small.jpg', drinks: 'assets/drinks-parallax-bg-small.jpg',
    peter: 'assets/peter-sprites-small.png', peterAttack: 'assets/peter-sprites-small-ataque-transparent.png', toastPeter: 'assets/peter-toast-small.png',
    sarinha: 'assets/sarinha-npc.png', saraToast: 'assets/sarinha-toast-small.png', logo: 'logo-nucifera.jpg',
    food: 'assets/menu-collectibles-small.png', berry: 'assets/strawberry-small.png', hazards: 'assets/bakery-hazards-small.png',
    tiles: 'assets/platform-tiles-small.png', door: 'assets/lotus-door-small.png', props: 'assets/celebration-props-small.png',
    raceScenery: 'assets/race-coast.png', raceBike: 'assets/vmax-empty.png', raceSaraFinish: 'assets/sarinha-finish-flag.png',
    raceRear: 'assets/peter-vmax-rear.png?v=20261008-4', raceRight: 'assets/peter-vmax-right.png', raceLeft: 'assets/peter-vmax-left.png',
    raceRearWind: 'assets/peter-vmax-rear-wind.png?v=20261008-4', raceRightWind: 'assets/peter-vmax-right-wind.png', raceLeftWind: 'assets/peter-vmax-left-wind.png'
  };
  Object.keys(files).forEach((key) => {
    const img = new Image(); images[key] = img;
    img.src = files[key];
  });
  const nativeOpeningPlayer = window.NuciferaStory && typeof window.NuciferaStory.play === 'function';
  const nativeFinalPlayer = window.NuciferaStory && typeof window.NuciferaStory.playEnding === 'function';
  let nativeFinalActive = false, nativeFinalFinished = false, nativeFinalFailed = false;
  const finaleVideos = nativeFinalPlayer ? {} : {
    baixa: makeFinaleVideo('assets/ending-low.mp4?v=20261009-10', true),
    media: makeFinaleVideo('assets/ending-medium.mp4?v=20261009-11', true),
    alta: makeFinaleVideo('assets/ending-high.mp4?v=20261009-12', true)
  };
  const openingVideo = $('#storyVideo');
  let openingVideoActive = false, openingVideoAttempt = 0, openingVideoFinished = false;
  const coverScreen = $('#storyScreen');
  const introScreen = $('#intro');
  const reducedCoverMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LOGO_INTRO_MS = 3400, COVER_INTRO_MS = 7600;
  let openingPresentationFrame = 0, openingPresentationLast = 0, openingPresentationElapsed = 0;
  let openingPresentationStage = 'loading';
  function fitCoverCard() {
    if (coverScreen.hidden) return;
    const card = $('.cover-card'), stage = $('.cover-stage'), actions = $('.cover-actions');
    const style = getComputedStyle(coverScreen);
    const availableWidth = coverScreen.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2;
    const availableHeight = coverScreen.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 2;
    const aspect = 1080 / 1611;
    const overlap = 30;
    let width = Math.min(538, availableWidth);
    // The lower overlay rests on the bakery floor; leave the faces above it.
    // Re-measure because the caption wraps differently on narrow/rotated screens.
    for (let i = 0; i < 6; i++) {
      card.style.width = Math.max(1, Math.floor(width)) + 2 + 'px';
      const reserve = Math.max(0, actions.offsetHeight - overlap);
      width = Math.min(538, availableWidth, Math.max(1, availableHeight - reserve) * aspect);
    }
    const innerWidth = Math.max(1, Math.floor(width));
    card.style.width = innerWidth + 2 + 'px';
    const artHeight = innerWidth / aspect;
    stage.style.height = artHeight + 'px';
    $('.cover-floor').style.top = Math.max(0, artHeight - overlap) + 'px';
    card.style.height = Math.ceil(artHeight + Math.max(0, actions.offsetHeight - overlap)) + 2 + 'px';
  }
  window.addEventListener('resize', fitCoverCard);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitCoverCard);
  function waitForCoverImage(image) {
    return new Promise(resolve => {
      if (image.complete) { resolve(image.naturalWidth > 0); return; }
      image.addEventListener('load', () => resolve(true), { once: true });
      image.addEventListener('error', () => resolve(false), { once: true });
    });
  }
  const openingImages = Array.from(document.querySelectorAll('#intro .logo-art, .cover-layer'));
  const coverElements = {
    background: $('.cover-background'), floor: $('.cover-floor'), sara: $('.cover-sarinha'),
    peter: $('.cover-peterzinho'), ant: $('.cover-formiguinha'), logo: $('.cover-logotipo'),
    title: $('.cover-titulo'), actions: $('.cover-actions'), button: $('#startAdventure'), caption: $('.story-foot')
  };
  function openingProgress(time, start, duration) {
    const p = Math.max(0, Math.min(1, (time - start) / duration));
    return p * p * (3 - 2 * p);
  }
  function revealCoverElement(element, time, start, duration, x = 0, y = 0, scale = 1) {
    const p = openingProgress(time, start, duration);
    element.style.opacity = p;
    element.style.transform = reducedCoverMotion ? 'none'
      : `translate(${x * (1 - p)}px,${y * (1 - p)}px) scale(${1 + (scale - 1) * (1 - p)})`;
  }
  function paintOpeningPresentation() {
    const elapsed = openingPresentationElapsed;
    if (elapsed < LOGO_INTRO_MS) {
      // Restore the original logo's fade in, hold and fade out before the cover.
      const background = openingProgress(elapsed, 0, 476) * (1 - openingProgress(elapsed, 2584, 816));
      const fadeIn = openingProgress(elapsed, 760, 480);
      const fadeOut = openingProgress(elapsed, 2500, 900);
      introScreen.style.opacity = background;
      $('#intro .logo-art').style.opacity = fadeIn * (1 - fadeOut);
      $('#intro .cinema-caption').style.opacity = fadeIn * (1 - fadeOut);
      $('#intro .logo-art').style.transform = reducedCoverMotion ? 'none'
        : `scale(${.96 + .04 * fadeIn + .025 * fadeOut})`;
      return;
    }
    if (openingPresentationStage === 'logo') {
      openingPresentationStage = 'cover';
      introScreen.classList.add('hide'); introScreen.hidden = true;
      coverScreen.hidden = false;
      fitCoverCard();
      coverScreen.classList.remove('hide');
    }
    const time = elapsed - LOGO_INTRO_MS;
    // Each arrival finishes before the next begins. Peter, ant and sweet arrive together.
    revealCoverElement(coverElements.background, time, 0, 1100);
    revealCoverElement(coverElements.floor, time, 0, 1100);
    revealCoverElement(coverElements.sara, time, 1300, 1000, 0, 18);
    revealCoverElement(coverElements.peter, time, 2700, 1100, -26);
    revealCoverElement(coverElements.ant, time, 2700, 1100, 26);
    revealCoverElement(coverElements.logo, time, 4200, 1000, 0, -16);
    revealCoverElement(coverElements.title, time, 5400, 1000, 0, 0, 1.05);
    if (time >= 6800) coverScreen.classList.add('ready');
    revealCoverElement(coverElements.actions, time, 6800, 550);
    revealCoverElement(coverElements.button, time, 6800, 550, 0, 8);
    revealCoverElement(coverElements.caption, time, 7050, 550, 0, 6);
    if (time >= COVER_INTRO_MS) {
      openingPresentationStage = 'complete';
      coverElements.button.disabled = false;
    }
  }
  function openingPresentationTick(now) {
    openingPresentationFrame = 0;
    if (suspended || document.hidden || openingVideoActive) { openingPresentationLast = 0; return; }
    // Count only displayed foreground frames, so loading or a stalled frame cannot skip arrivals.
    if (openingPresentationLast) openingPresentationElapsed += Math.min(100, Math.max(0, now - openingPresentationLast));
    openingPresentationLast = now;
    paintOpeningPresentation();
    if (openingPresentationStage !== 'complete') openingPresentationFrame = requestAnimationFrame(openingPresentationTick);
    else openingPresentationLast = 0;
  }
  function scheduleOpeningPresentation() {
    if (suspended || document.hidden || openingPresentationFrame || !['logo', 'cover'].includes(openingPresentationStage)) return;
    openingPresentationLast = 0;
    openingPresentationFrame = requestAnimationFrame(openingPresentationTick);
  }
  function prepareOpeningPresentation() {
    return Promise.all(openingImages.map(waitForCoverImage)).then(loaded => {
      if (directRace || openingPresentationStage !== 'loading') return;
      if (!loaded.every(Boolean)) {
        // Never replace a staged opening with the complete static cover on a load error.
        introScreen.hidden = true;
        $('#openingLoadError').hidden = false;
        return;
      }
      $('#openingLoadError').hidden = true;
      introScreen.hidden = false; introScreen.classList.remove('hide');
      openingPresentationStage = 'logo'; openingPresentationElapsed = 0;
      paintOpeningPresentation();
      scheduleOpeningPresentation();
    });
  }
  function makeFinaleVideo(src, hasSound = false) {
    const video = document.createElement('video');
    video.src = src; video.muted = !hasSound; video.volume = OUTPUT_VOLUME; video.playsInline = true; video.preload = 'auto';
    video.__nuciHasSound = hasSound;
    video.addEventListener('playing', () => { video.__nuciUnavailable = false; });
    video.addEventListener('error', () => { video.__nuciUnavailable = true; });
    video.addEventListener('ended', () => {
      if (mode === 'celebrate' && phase >= MAX_PHASE && finaleVideos[celebrationTier] === video && !suspended) finishCelebration();
    });
    video.load();
    return video;
  }

  function read(key, fallback) {
    if (directRace) return Object.prototype.hasOwnProperty.call(racePreviewStorage, key) ? racePreviewStorage[key] : fallback;
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch (e) { return window.__nuciTemp && window.__nuciTemp[key] !== undefined ? window.__nuciTemp[key] : fallback; }
  }
  function write(key, value) {
    if (directRace) { racePreviewStorage[key] = String(value); return; }
    window.__nuciTemp = window.__nuciTemp || {};
    window.__nuciTemp[key] = String(value);
    try { localStorage.setItem(key, String(value)); } catch (e) { /* local-only fallback */ }
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
  }

  let phase = directRace ? 6 : Math.max(1, Math.min(MAX_PHASE, +(read('nuciCampaignPhase', 1)) || 1));
  let score = +(read('nuciRunScore', 0)) || 0, phaseEarned = +(read('nuciPhaseEarned', 0)) || 0;
  function readObject(key, fallback) { try { return JSON.parse(read(key, JSON.stringify(fallback))) || fallback; } catch (e) { return fallback; } }
  let rewards = readObject('nuciRewards', {}), rewardPhase = +read('nuciRewardPhase', phase);
  let raceSave = readObject('nuciRaceSave', null), suspended = false, suspendedAt = 0;
  let userPaused = false, lifecycleSuspended = false;
  let losses = Math.max(0, +(read('nuciRunLosses', 0)) || 0);
  let continues = Math.max(0, Math.min(MAX_CONTINUES, +(read('nuciContinues', MAX_CONTINUES))));
  let campaignId = read('nuciCampaignId', '') || Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  let runRecorded = read('nuciRunRecorded', '0') === '1';
  write('nuciCampaignId', campaignId);
  let mode = 'climb', state = null, resumeState = null, raf = 0, lastFrame = 0;
  let celebrationStart = 0, celebrationNext = 0, celebrationDuration = 4200, celebrationTier = 'baixa', celebrationTimer = 0, celebrationToken = 0, toastChimePlayed = false;

  function saveRun() {
    write('nuciCampaignPhase', phase); write('nuciRunScore', score); write('nuciRunLosses', losses); write('nuciContinues', continues);
    write('nuciPhaseEarned', phaseEarned); write('nuciRewardPhase', rewardPhase); write('nuciRewards', JSON.stringify(rewards));
    if (mode === 'race' && state) raceSave = state.race;
    write('nuciRaceSave', JSON.stringify(raceSave));
  }
  function awardOnce(id, points) {
    if (rewards[id]) return false;
    rewards[id] = true; score += points; phaseEarned += points; saveRun(); return true;
  }
  function clearPhaseRewards() {
    rewards = {}; rewardPhase = phase; phaseEarned = 0; raceSave = null;
  }
  function say(text) {
    const el = $('#toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(say.timer); say.timer = setTimeout(() => el.classList.remove('show'), 1650);
  }
  function setHud(points, treats, progress, goal) {
    $('#round').textContent = phase + '/10';
    $('#moves').textContent = points;
    $('#streak').textContent = treats;
    $('#progressFill').style.width = Math.max(0, Math.min(100, progress)) + '%';
    if ($('#goal').textContent !== goal) { $('#goal').textContent = goal; schedulePlayfieldFit(); }
  }
  function setPageForPhase() {
    $('#jumpAction').disabled = false;
    $('#gameTitle').textContent = phase === 1 ? 'Pulos na confeitaria' : phaseNames[phase];
    $('#gameSub').textContent = phase === 1 ? 'A primeira aventura da flor começa no jardim.' : 'Atravesse a confeitaria, desvie dos perigos e siga até a saída.';
    $('#movesLabel').textContent = 'pontos';
    $('#streakLabel').textContent = phase === 1 ? 'impulsos' : 'guloseimas';
    $('#gameHint').textContent = phase === 1
      ? 'No notebook, clique ◀/▶ para guiar a flor (clique de novo para parar). No celular, segure o botão.'
      : 'Notebook: ◀/▶ anda, Espaço pula e X bate o paninho. No celular, use os botões abaixo.';
    $('#jumpAction').textContent = phase === 1 ? 'IMPULSO ×3' : 'PULAR';
    const cloth = $('#clothAction'); if (cloth) cloth.hidden = phase === 1 || phase === 6;
    canvas.setAttribute('aria-label', phase === 6 ? 'Corrida da Vmax: três faixas, veículos e doces' : 'Aventura de plataforma vertical');
    if (phase === 6) {
      $('#gameSub').textContent = 'Uma Vmax roxa, uma estrada e 60 segundos para recuperar delícias.';
      $('#gameHint').textContent = 'Toque ◀/▶ ou deslize para mudar de faixa. A moto avança sozinha; ACELERAR dá um impulso. Evite os veículos!';
      $('#jumpAction').textContent = 'ACELERAR';
    }
    $('#pauseAction').disabled = false;
    schedulePlayfieldFit();
  }
  function showModal(title, text, rows) {
    $('#modalTitle').textContent = title; $('#modalText').textContent = text;
    $('#scoreList').innerHTML = rows;
    $('#close').textContent = 'Continuar';
    const isResult = mode === 'complete' || (mode === 'over' && continues <= 0);
    $('.nickBox').hidden = !isResult;
    $('#visitMessage').hidden = !isResult;
    $('#mapLink').hidden = !isResult;
    $('#nicknameInput').value = read('nuciPlayerName', '');
    setVisitMessage();
    $('#modal').classList.remove('hide');
  }
  function hideModal() { $('#modal').classList.add('hide'); }
  const visitMessages = [
    'Que tal uma fatia de Torta Alemã feita com carinho? A Sara te espera na Nucífera!',
    'Uma pausa com cinnamon roll pode deixar o dia mais doce. Vem provar na Nucífera!',
    'Bateu vontade de pão de queijo quentinho? A Sara tem um lugar à mesa para você.',
    'Que tal um pedaço de bolo chocolatudo? Passe na Nucífera e escolha o seu!',
    'Uma soda italiana geladinha combina com a próxima pausa. Venha experimentar!',
    'Banoffee pie e café são um convite para desacelerar. A Sara te espera!',
    'Um croissant recheado pode ser sua próxima descoberta. Vem se deliciar na Nucífera!',
    'Que tal cheesecake de Oreo para adoçar o passeio? O caminho até a Sara está aqui.'
  ];
  function setVisitMessage() {
    const index = ((+read('nuciPromoIndex', 0) || 0) % visitMessages.length + visitMessages.length) % visitMessages.length;
    $('#visitMessage').textContent = visitMessages[index];
    write('nuciPromoIndex', (index + 1) % visitMessages.length);
  }

  // Original Web Audio themes: an opening loop, one motif per phase, and short game cues.
  // Match the supplied opening video's perceived level (about -12.9 LUFS).
  // Individual gains account for each melody's waveform and the short effect envelopes.
  const musicLevels = { opening: 18.526, 'phase-1': 34.825, 'phase-2': 37.456, 'phase-3': 33.58, 'phase-4': 39.8, 'phase-5': 33.175, 'phase-6': 40.777, 'phase-7': 32.379, 'phase-8': 41.78, 'phase-9': 33.58, 'phase-10': 41.78 };
  const effectLevels = { startClick: 13.512, jump: 27.319, collect: 18.082, hit: 25.71, bonus: 14.357, toast: 17.863, phaseComplete: 8.417 };
  let audio = null, master = null, outputGuard = null, musicTimer = 0, musicStep = 0, currentTheme = '', nextMusicAt = 0;
  const musicVoices = new Set();
  function stopMusicVoices() {
    const now = audio ? audio.currentTime : 0;
    for (const voice of musicVoices) {
      try {
        const envelope = voice.__nuciEnvelope;
        if (envelope && audio.state === 'running') {
          // Fade interrupted notes instead of cutting a nonzero wave at a screen change.
          const elapsed = Math.max(0, now - envelope.start);
          const value = elapsed < .025 ? envelope.peak * elapsed / .025
            : elapsed < envelope.duration ? envelope.peak * Math.pow(envelope.floor / envelope.peak, (elapsed - .025) / (envelope.duration - .025))
            : envelope.floor * Math.max(0, 1 - (elapsed - envelope.duration) / .015);
          if (typeof envelope.gain.cancelAndHoldAtTime === 'function') {
            envelope.gain.cancelAndHoldAtTime(now);
          } else {
            envelope.gain.cancelScheduledValues(now);
            // Preserve the unfinished ramp up to now on older audio implementations.
            if (elapsed >= .025 && elapsed < envelope.duration) envelope.gain.exponentialRampToValueAtTime(Math.max(1e-7, value), now);
            else envelope.gain.linearRampToValueAtTime(value, now);
          }
          envelope.gain.linearRampToValueAtTime(0, now + .012);
          voice.stop(now + .015);
        } else voice.stop();
      } catch (e) { try { voice.stop(); } catch (_) {} }
    }
    musicVoices.clear();
  }
  let openingActive = true, openingMusicStartedAt = 0;
  function startAudio() {
    if (suspended) return Promise.resolve(false);
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return Promise.resolve(false);
    if (!audio || audio.state === 'closed') {
      try {
        if (musicTimer) window.clearInterval(musicTimer);
        audio = new AC(); master = audio.createGain(); master.gain.value = 1;
        // Control the mix's envelope before output; a WaveShaper clipped summed signals
        // above ±1 and changed their timbre even when the final volume was reduced.
        outputGuard = audio.createDynamicsCompressor();
        outputGuard.threshold.value = -6;
        outputGuard.knee.value = 2;
        outputGuard.ratio.value = 20;
        outputGuard.attack.value = 0;
        outputGuard.release.value = .05;
        const outputLevel = audio.createGain(); outputLevel.gain.value = OUTPUT_VOLUME;
        master.connect(outputGuard); outputGuard.connect(outputLevel); outputLevel.connect(audio.destination);
        musicTimer = window.setInterval(playMusicStep, 55);
      } catch (error) { audio = null; master = null; return Promise.resolve(false); }
    }
    const resumed = audio.state !== 'running' ? audio.resume().catch(() => {}) : Promise.resolve();
    return resumed.then(() => {
      const ready = !!audio && audio.state === 'running';
      if (ready) playMusicStep();
      return ready;
    });
  }
  function tone(freq, duration, wave, volume, slide, isMusic = true, effectLevel = 1) {
    if (!audio || audio.state !== 'running' || suspended) return;
    const osc = audio.createOscillator(), amp = audio.createGain(), filter = audio.createBiquadFilter();
    const now = audio.currentTime;
    osc.type = wave || 'sine'; osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(70, freq * slide), now + duration);
    filter.type = 'lowpass'; filter.frequency.value = 1450;
    const level = isMusic ? (musicLevels[currentTheme] || 1) : effectLevel;
    const peak = (volume || 0.035) * level, floor = 0.0001 * level;
    amp.gain.setValueAtTime(0, now); amp.gain.linearRampToValueAtTime(peak, now + 0.025);
    amp.gain.exponentialRampToValueAtTime(floor, now + duration);
    amp.gain.linearRampToValueAtTime(0, now + duration + .015);
    osc.__nuciEnvelope = { gain: amp.gain, start: now, duration, peak, floor };
    osc.connect(filter); filter.connect(amp); amp.connect(master); osc.start(now); osc.stop(now + duration + .02);
    if (isMusic) musicVoices.add(osc);
    osc.onended = () => { musicVoices.delete(osc); osc.disconnect(); filter.disconnect(); amp.disconnect(); };
  }
  function effectTone(freq, duration, wave, volume, slide, level = 1) {
    tone(freq, duration, wave, Math.min(1, (volume || 0.035) * 1.15), slide, false, level);
  }
  let towelNoise = null, towelNoiseContext = null;
  function playTowelEffect() {
    if (!audio || audio.state !== 'running' || suspended) return;
    // Original cloth foley: filtered air, then a soft fabric flap; no jump melody.
    if (!towelNoise || towelNoiseContext !== audio) {
      towelNoise = audio.createBuffer(1, Math.ceil(audio.sampleRate * .36), audio.sampleRate);
      const samples = new Float32Array(towelNoise.length);
      let seed = 0x6e756369;
      for (let i = 0; i < samples.length; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        samples[i] = (seed >>> 0) / 2147483648 - 1;
      }
      towelNoise.copyToChannel(samples, 0);
      towelNoiseContext = audio;
    }
    const now = audio.currentTime;
    const air = audio.createBufferSource(), sweep = audio.createBiquadFilter(), airGain = audio.createGain();
    air.buffer = towelNoise;
    sweep.type = 'bandpass'; sweep.Q.value = .65;
    sweep.frequency.setValueAtTime(420, now);
    sweep.frequency.exponentialRampToValueAtTime(2800, now + .11);
    sweep.frequency.exponentialRampToValueAtTime(850, now + .30);
    airGain.gain.setValueAtTime(0, now);
    airGain.gain.linearRampToValueAtTime(.62, now + .055);
    airGain.gain.linearRampToValueAtTime(.48, now + .14);
    airGain.gain.exponentialRampToValueAtTime(.018, now + .28);
    airGain.gain.linearRampToValueAtTime(0, now + .32);
    air.connect(sweep); sweep.connect(airGain); airGain.connect(master);
    air.start(now); air.stop(now + .33);
    air.onended = () => { air.disconnect(); sweep.disconnect(); airGain.disconnect(); };
    const flap = audio.createBufferSource(), fabric = audio.createBiquadFilter(), flapGain = audio.createGain();
    flap.buffer = towelNoise; fabric.type = 'bandpass'; fabric.Q.value = .6;
    fabric.frequency.setValueAtTime(1500, now + .10);
    fabric.frequency.exponentialRampToValueAtTime(600, now + .17);
    flapGain.gain.setValueAtTime(0, now + .10);
    flapGain.gain.linearRampToValueAtTime(.32, now + .117);
    flapGain.gain.exponentialRampToValueAtTime(.006, now + .17);
    flapGain.gain.linearRampToValueAtTime(0, now + .19);
    flap.connect(fabric); fabric.connect(flapGain); flapGain.connect(master);
    flap.start(now + .10, .11); flap.stop(now + .20);
    flap.onended = () => { flap.disconnect(); fabric.disconnect(); flapGain.disconnect(); };
  }
  let boostNoise = null, boostNoiseContext = null;
  const boostVoices = new Set();
  function stopBoostEffect() {
    if (!audio) return;
    const now = audio.currentTime;
    for (const voice of boostVoices) {
      if (typeof voice.gain.cancelAndHoldAtTime === 'function') voice.gain.cancelAndHoldAtTime(now);
      else voice.gain.cancelScheduledValues(now);
      voice.gain.setTargetAtTime(0, now, .007);
      try { voice.source.stop(now + .025); } catch (error) { /* Already finished. */ }
    }
    boostVoices.clear();
  }
  function playBoostEffect() {
    if (!audio || audio.state !== 'running' || suspended || mode !== 'race') return;
    stopBoostEffect();
    const now = audio.currentTime, duration = NuciferaRace.BOOST_DURATION;
    const connectVoice = (source, filter, amp) => {
      source.connect(filter); filter.connect(amp); amp.connect(master);
      const voice = { source, gain: amp.gain }; boostVoices.add(voice);
      source.onended = () => { boostVoices.delete(voice); source.disconnect(); filter.disconnect(); amp.disconnect(); };
      source.start(now); source.stop(now + duration + .02);
    };
    // A rounded rising motor tone and soft air rush, routed through the existing peak guard.
    const motor = audio.createOscillator(), motorFilter = audio.createBiquadFilter(), motorGain = audio.createGain();
    motor.type = 'triangle';
    motor.frequency.setValueAtTime(86, now);
    motor.frequency.exponentialRampToValueAtTime(250, now + .35);
    motor.frequency.linearRampToValueAtTime(280, now + duration - .4);
    motor.frequency.exponentialRampToValueAtTime(130, now + duration);
    motorFilter.type = 'lowpass'; motorFilter.frequency.value = 980; motorFilter.Q.value = .65;
    motorGain.gain.setValueAtTime(0, now);
    motorGain.gain.linearRampToValueAtTime(.20, now + .07);
    motorGain.gain.linearRampToValueAtTime(.14, now + duration - .35);
    motorGain.gain.linearRampToValueAtTime(0, now + duration);
    connectVoice(motor, motorFilter, motorGain);
    if (!boostNoise || boostNoiseContext !== audio) {
      boostNoise = audio.createBuffer(1, Math.ceil(audio.sampleRate * (duration + .04)), audio.sampleRate);
      const samples = new Float32Array(boostNoise.length); let seed = 0x766d6178;
      for (let i = 0; i < samples.length; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        samples[i] = (seed >>> 0) / 2147483648 - 1;
      }
      boostNoise.copyToChannel(samples, 0); boostNoiseContext = audio;
    }
    const wind = audio.createBufferSource(), windFilter = audio.createBiquadFilter(), windGain = audio.createGain();
    wind.buffer = boostNoise; windFilter.type = 'bandpass'; windFilter.Q.value = .55;
    windFilter.frequency.setValueAtTime(600, now);
    windFilter.frequency.exponentialRampToValueAtTime(2100, now + .4);
    windFilter.frequency.exponentialRampToValueAtTime(900, now + duration);
    windGain.gain.setValueAtTime(0, now);
    windGain.gain.linearRampToValueAtTime(.13, now + .18);
    windGain.gain.linearRampToValueAtTime(.10, now + duration - .4);
    windGain.gain.linearRampToValueAtTime(0, now + duration);
    connectVoice(wind, windFilter, windGain);
  }
  const openingTheme = { root: 392, beat: 300, wave: 'sine', notes: [0,2,4,2,5,4,2,1,0,2,4,7,5,4,2,4,5,7,9,7,5,4,2,0], bass: [0,0,5,4,0,0,3,4] };
  const phaseThemes = {
    1:{root:392,beat:285,wave:'sine',notes:[0,2,4,5,4,2,0,2,4,7,5,4,2,1,0,2],bass:[0,0,4,5,0,0,5,4]},
    2:{root:349.23,beat:270,wave:'triangle',notes:[0,3,5,3,2,5,7,5,0,3,5,8,7,5,3,2],bass:[0,0,5,3,0,0,7,5]},
    3:{root:329.63,beat:245,wave:'sine',notes:[0,2,5,7,5,2,4,2,0,2,5,9,7,5,2,4],bass:[0,0,7,5,0,0,4,5]},
    4:{root:293.66,beat:260,wave:'triangle',notes:[0,2,3,7,5,3,2,0,3,5,7,10,7,5,3,2],bass:[0,0,3,5,0,0,7,5]},
    5:{root:369.99,beat:235,wave:'sine',notes:[0,4,7,9,7,4,2,4,0,4,7,11,9,7,4,2],bass:[0,0,7,4,0,0,2,7]},
    6:{root:311.13,beat:175,wave:'triangle',notes:[0,2,5,7,9,7,5,2,0,2,5,10,9,7,5,2],bass:[0,0,5,7,0,0,9,5]},
    7:{root:392,beat:255,wave:'sine',notes:[0,2,4,7,9,7,4,2,0,4,7,11,9,7,4,2],bass:[0,0,4,7,0,0,9,7]},
    8:{root:329.63,beat:225,wave:'triangle',notes:[0,4,5,7,5,4,2,0,4,5,7,9,7,5,4,2],bass:[0,0,5,7,0,0,4,5]},
    9:{root:349.23,beat:245,wave:'sine',notes:[0,2,5,7,10,7,5,2,0,5,7,12,10,7,5,2],bass:[0,0,5,7,0,0,10,7]},
    10:{root:261.63,beat:290,wave:'triangle',notes:[0,4,7,11,9,7,4,2,0,4,7,12,11,9,7,0],bass:[0,0,7,4,0,0,11,7]}
  };
  function musicThemeNow() {
    if (suspended) return ['', null];
    // Stop the opening theme immediately on Start, even while its screen fades away.
    if (mode === 'story-video' || mode === 'transition') return ['', null];
    const inOpening = openingActive || !$('#intro').classList.contains('hide') || !$('#storyScreen').classList.contains('hide');
    if (inOpening) return ['opening', openingTheme];
    if (mode === 'celebrate' || mode === 'transition' || mode === 'complete' || mode === 'over' || mode === 'phase-error') return ['', null];
    if (mode === 'climb' || mode === 'runner' || mode === 'bonus' || mode === 'race') return ['phase-' + phase, phaseThemes[phase] || phaseThemes[10]];
    return ['', null];
  }
  function playMusicStep() {
    if (!audio || audio.state !== 'running') return;
    const [themeName, theme] = musicThemeNow();
    if (!theme) { stopMusicVoices(); currentTheme = ''; musicStep = 0; return; }
    if (themeName !== currentTheme) { stopMusicVoices(); currentTheme = themeName; musicStep = 0; nextMusicAt = 0; }
    const now = performance.now();
    if (now < nextMusicAt) return;
    if (themeName === 'opening' && !openingMusicStartedAt) openingMusicStartedAt = now;
    const melodyStep = musicStep % theme.notes.length, bassStep = musicStep % theme.bass.length;
    const note = theme.notes[melodyStep];
    if (note !== null && note !== undefined && note >= 0) {
      const frequency = theme.root * Math.pow(2, note / 12);
      tone(frequency, theme.beat / 1000 * .82, theme.wave, themeName === 'opening' ? .041 : .021);
      if (melodyStep % 4 === 2) tone(frequency / 2, theme.beat / 1000 * 1.15, 'triangle', themeName === 'opening' ? .018 : .012);
    }
    if (melodyStep % 3 === 0) {
      const bass = theme.root / 2 * Math.pow(2, theme.bass[bassStep] / 12);
      tone(bass, theme.beat / 1000 * 1.45, 'triangle', themeName === 'opening' ? .022 : .013);
    }
    musicStep++;
    nextMusicAt = now + theme.beat;
  }
  function playEffect(kind) {
    if (!audio || audio.state !== 'running') return;
    if (kind === 'towel') { playTowelEffect(); return; }
    if (kind === 'accelerate') { playBoostEffect(); return; }
    const cueTone = (freq, duration, wave, volume, slide) => effectTone(freq, duration, wave, volume, slide, effectLevels[kind] || 1);
    if (kind === 'startClick') { cueTone(659.25, .095, 'sine', .055); setTimeout(() => cueTone(880, .13, 'sine', .045), 60); }
    if (kind === 'jump') cueTone(360, 0.16, 'sine', 0.035, 0.72);
    if (kind === 'collect') { cueTone(520, 0.13, 'sine', 0.045, 1.25); setTimeout(() => cueTone(660, 0.12, 'sine', 0.028, 1.08), 65); }
    if (kind === 'hit') cueTone(210, 0.2, 'triangle', 0.045, 0.72);
    if (kind === 'bonus') { cueTone(392, 0.2, 'sine', 0.04); setTimeout(() => cueTone(494, 0.24, 'sine', 0.04), 110); setTimeout(() => cueTone(587.33, 0.32, 'sine', 0.035), 230); }
    if (kind === 'toast') { cueTone(392, 0.32, 'sine', 0.035); setTimeout(() => cueTone(523.25, 0.36, 'sine', 0.032), 160); }
    if (kind === 'phaseComplete') {
      [[523.25, 0, .2], [659.25, 145, .2], [783.99, 290, .22], [1046.5, 450, .36], [783.99, 700, .2], [1046.5, 870, .46]].forEach(([hz, delay, duration], index) =>
        setTimeout(() => cueTone(hz, duration, index === 5 ? 'triangle' : 'sine', index === 5 ? 0.068 : 0.055), delay));
      setTimeout(() => { cueTone(523.25, .42, 'triangle', .034); cueTone(659.25, .42, 'sine', .034); }, 880);
    }
  }
  function fx(kind) {
    startAudio().then((ready) => { if (ready) playEffect(kind); }).catch(() => {});
  }
  function preventGameTextMenu(event) {
    const element = event.target instanceof Element ? event.target : event.target.parentElement;
    // Nickname editing keeps the native selection and clipboard tools.
    if (element && (element.closest('input, textarea') || element.isContentEditable)) return;
    event.preventDefault();
  }
  document.addEventListener('selectstart', preventGameTextMenu, true);
  document.addEventListener('contextmenu', preventGameTextMenu, true);
  document.addEventListener('pointerdown', () => { startAudio(); }, { passive: true });
  document.addEventListener('keydown', () => { startAudio(); });
  startAudio();

  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function imageReady(key) { const im = images[key]; return !!im && (typeof im.getContext === 'function' ? im.width > 0 && im.height > 0 : im.complete && im.naturalWidth > 0); }
  function drawAtlas(key, index, columns, rows, x, y, w, h) {
    if (!imageReady(key)) return;
    const im = images[key], cw = im.width / columns, ch = im.height / rows;
    const sx = (index % columns) * cw, sy = Math.floor(index / columns) * ch;
    ctx.drawImage(im, sx, sy, cw, ch, x, y, w, h);
  }
  function bgFor(currentPhase) {
    if (currentPhase <= 3 || currentPhase >= 8) return 'background';
    if (currentPhase <= 5) return 'kitchen';
    return 'drinks';
  }
  function drawBackground(camera, currentPhase) {
    const key = bgFor(currentPhase), im = images[key];
    ctx.fillStyle = '#f6ead2'; ctx.fillRect(0, 0, W, H);
    if (!imageReady(key)) return;
    const drawW = H * im.width / im.height, shift = (camera * 0.23) % drawW;
    ctx.save();
    ctx.filter = 'blur(2.5px) saturate(.68) brightness(1.08)';
    for (let x = -shift; x < W; x += drawW) ctx.drawImage(im, x - 4, -4, drawW + 8, H + 8);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,248,232,.34)'; ctx.fillRect(0, 0, W, H);
    const shade = (currentPhase % 3 === 0) ? 'rgba(233,160,138,.08)' : (currentPhase % 3 === 2 ? 'rgba(132,148,107,.06)' : 'rgba(255,244,220,.03)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);
  }
  function drawCharacter(frame, x, feet, width, height, facing) {
    ctx.save();
    if (facing === -1) { ctx.translate(x, 0); ctx.scale(-1, 1); x = 0; }
    ctx.shadowColor = 'rgba(61,42,26,.72)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    // The sprite sheet has transparent padding under Peter's shoes; extend the source draw
    // box slightly so the visible soles meet the collision baseline instead of hovering.
    const visualHeight = height * 1.067;
    drawAtlas('peter', frame, 4, 2, x - width / 2, feet - height, width, visualHeight);
    ctx.restore();
  }
  function drawAttackCharacter(x, feet, facing) {
    const im = images.peterAttack;
    if (!imageReady('peterAttack')) return false;
    const height = 72, width = height * im.width / im.height;
    ctx.save(); ctx.translate(x, 0);
    if (facing === -1) ctx.scale(-1, 1);
    ctx.shadowColor = 'rgba(61,42,26,.72)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    // Anchor Peter's torso (left of center in this swinging pose) to his normal game position.
    ctx.drawImage(im, -width * .34, feet - height, width, height);
    ctx.restore(); return true;
  }
  function drawWoodFloor(y, camera) {
    const face = ctx.createLinearGradient(0, y, 0, H);
    face.addColorStop(0, '#a9784e'); face.addColorStop(.12, '#855b3b'); face.addColorStop(1, '#5c3e2b');
    ctx.fillStyle = face; ctx.fillRect(0, y, W, H - y);
    ctx.fillStyle = '#d9b17d'; ctx.fillRect(0, y, W, 7);
    ctx.fillStyle = '#f0d4a6'; ctx.fillRect(0, y, W, 2);
    const plankH = 22, offset = -((camera || 0) % 86);
    for (let row = 0; y + row * plankH < H; row++) {
      const py = y + row * plankH;
      ctx.strokeStyle = 'rgba(57,36,23,.48)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, py + plankH); ctx.lineTo(W, py + plankH); ctx.stroke();
      const shift = offset + (row % 2 ? -43 : 0);
      for (let px = shift; px < W + 86; px += 86) {
        ctx.beginPath(); ctx.moveTo(px, py + 2); ctx.lineTo(px, py + plankH); ctx.stroke();
        ctx.fillStyle = 'rgba(255,225,177,.18)'; ctx.fillRect(px + 3, py + 4, 34, 1);
      }
    }
    ctx.fillStyle = 'rgba(53,34,22,.16)'; ctx.fillRect(0, y + 7, W, 2);
  }
  function drawPit(pit, camera, groundY) {
    const x = pit.x - camera, width = pit.w;
    if (x > W || x + width < 0) return;
    const depth = H - groundY;
    const voidFill = ctx.createLinearGradient(0, groundY, 0, H);
    voidFill.addColorStop(0, '#49392f'); voidFill.addColorStop(.45, '#2f2925'); voidFill.addColorStop(1, '#191918');
    ctx.fillStyle = voidFill; ctx.fillRect(x, groundY, width, depth);
    ctx.fillStyle = '#d4ac79'; ctx.fillRect(x - 2, groundY - 1, 3, 8); ctx.fillRect(x + width - 1, groundY - 1, 3, 8);
    ctx.fillStyle = 'rgba(28,22,17,.58)'; ctx.fillRect(x, groundY, 3, depth); ctx.fillRect(x + width - 3, groundY, 3, depth);
    ctx.strokeStyle = 'rgba(255,223,177,.38)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, groundY + 13); ctx.lineTo(x + width - 4, groundY + 13); ctx.stroke();
  }
  function drawTile(index, x, y, width, height, route, floorY) {
    const kind = (index + (state && state.surfaceOffset || 0)) % 6;
    if (route === 'ground') return;
    if (route === 'barrel') { drawBarrel(x + width / 2, y + height, Math.min(width, 52), height); return; }
    if (route === 'saucer') { drawSaucer(x + width / 2, y + height, width, floorY); return; }
    const palette = [['#9c633d','#70462e','#d6a36c'],['#bb8b57','#815735','#f2d2a0'],['#8c6749','#61472f','#c99a65'],['#b69b72','#756047','#ead7b3'],['#a66d4c','#6f4935','#dfad7a'],['#b28a57','#74522f','#e8c58d']][kind];
    ctx.save(); ctx.shadowColor = 'rgba(53,35,22,.22)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    const plank = ctx.createLinearGradient(x, y, x, y + height + 8); plank.addColorStop(0, palette[2]); plank.addColorStop(.25, palette[0]); plank.addColorStop(1, palette[1]);
    ctx.fillStyle = plank; ctx.beginPath(); ctx.moveTo(x + 5, y); ctx.quadraticCurveTo(x, y, x, y + 5); ctx.lineTo(x, y + height - 4); ctx.quadraticCurveTo(x, y + height, x + 5, y + height); ctx.lineTo(x + width - 5, y + height); ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - 5); ctx.lineTo(x + width, y + 5); ctx.quadraticCurveTo(x + width, y, x + width - 5, y); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(62,39,24,.74)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,228,185,.58)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 5, y + 3); ctx.lineTo(x + width - 5, y + 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(66,42,26,.3)'; ctx.lineWidth = 1;
    for (let i = 0; i < Math.floor(width / 40); i++) { const gx = x + 17 + i * 40; ctx.beginPath(); ctx.moveTo(gx, y + 8); ctx.bezierCurveTo(gx + 8, y + 11, gx + 12, y + 8, Math.min(x + width - 8, gx + 20), y + 11); ctx.stroke(); }
    ctx.fillStyle = '#e2bc86'; ctx.beginPath(); ctx.arc(x + 9, y + height / 2, 1.6, 0, Math.PI * 2); ctx.arc(x + width - 9, y + height / 2, 1.6, 0, Math.PI * 2); ctx.fill();
    if (route === 'upper' || route === 'upper-step' || route === 'summit') {
      const supportY = y + height;
      ctx.fillStyle = '#67462d'; ctx.beginPath(); ctx.moveTo(x + 19, supportY); ctx.lineTo(x + 28, supportY + 9); ctx.lineTo(x + 28, supportY + 19); ctx.lineTo(x + 24, supportY + 19); ctx.lineTo(x + 24, supportY + 13); ctx.lineTo(x + 13, supportY + 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + width - 19, supportY); ctx.lineTo(x + width - 28, supportY + 9); ctx.lineTo(x + width - 28, supportY + 19); ctx.lineTo(x + width - 24, supportY + 19); ctx.lineTo(x + width - 24, supportY + 13); ctx.lineTo(x + width - 13, supportY + 2); ctx.closePath(); ctx.fill();
    }
    if (route === 'stair') {
      const base = Number.isFinite(floorY) ? floorY : y + height + 20;
      const riser = ctx.createLinearGradient(x, y + height, x + width, base);
      riser.addColorStop(0, '#a87449'); riser.addColorStop(1, '#68452e');
      ctx.fillStyle = riser; ctx.fillRect(x + 3, y + height - 1, width - 6, Math.max(0, base - y - height + 1));
      ctx.strokeStyle = 'rgba(65,42,27,.48)'; ctx.lineWidth = 1;
      for (let yy = y + height + 16; yy < base; yy += 18) { ctx.beginPath(); ctx.moveTo(x + 5, yy); ctx.lineTo(x + width - 5, yy); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,224,180,.28)'; ctx.fillRect(x + 5, y + height + 3, width - 10, 2);
    }
    ctx.restore();
  }
  function drawBarrel(cx, baseY, width, height) {
    const x = cx - width / 2, top = baseY - height;
    ctx.save(); ctx.shadowColor = 'rgba(47,32,21,.25)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
    const wood = ctx.createLinearGradient(x, top, x + width, top); wood.addColorStop(0, '#70452c'); wood.addColorStop(.2, '#b77a49'); wood.addColorStop(.55, '#d49a5e'); wood.addColorStop(.82, '#a66c40'); wood.addColorStop(1, '#633f2a');
    ctx.fillStyle = wood; ctx.strokeStyle = '#563822'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 6, top + 3); ctx.quadraticCurveTo(cx, top - 2, x + width - 6, top + 3); ctx.lineTo(x + width - 2, baseY - 5); ctx.quadraticCurveTo(cx, baseY + 2, x + 2, baseY - 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(67,40,24,.48)';
    for (let i = 1; i < 5; i++) { const px = x + i * width / 5; ctx.beginPath(); ctx.moveTo(px, top + 4); ctx.quadraticCurveTo(px - 3, baseY / 2 + top / 2, px, baseY - 5); ctx.stroke(); }
    ctx.fillStyle = '#514239'; ctx.strokeStyle = '#302820'; ctx.lineWidth = 1.2;
    [top + 8, top + height * .5, baseY - 8].forEach((by) => { ctx.beginPath(); ctx.moveTo(x + 3, by - 3); ctx.quadraticCurveTo(cx, by - 7, x + width - 3, by - 3); ctx.lineTo(x + width - 3, by + 3); ctx.quadraticCurveTo(cx, by + 7, x + 3, by + 3); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    ctx.fillStyle = '#e8c89c'; ctx.beginPath(); ctx.ellipse(cx, top + 2, width * .42, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#63432c'; ctx.stroke(); ctx.restore();
  }
  function drawSaucer(cx, baseY, width, floorY) {
    const w = width || 104;
    ctx.save();
    if (Number.isFinite(floorY)) { ctx.fillStyle = 'rgba(61,43,29,.12)'; ctx.beginPath(); ctx.ellipse(cx, floorY - 1, w * .43, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(61,43,29,.15)'; ctx.beginPath(); ctx.ellipse(cx, baseY + 3, w * .48, 6, 0, 0, Math.PI * 2); ctx.fill();
    const glaze = ctx.createLinearGradient(cx, baseY - 17, cx, baseY + 3); glaze.addColorStop(0, '#fffdf5'); glaze.addColorStop(1, '#d9c39e'); ctx.fillStyle = glaze; ctx.strokeStyle = '#8a6947'; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.ellipse(cx, baseY - 6, w * .5, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.56)'; ctx.beginPath(); ctx.ellipse(cx, baseY - 10, w * .39, 6, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b58e63'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, baseY - 8, w * .37, 7, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e9a08a'; ctx.beginPath(); ctx.arc(cx, baseY - 7, 2.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function drawCoffeeMaker(cx, floorY, timer) {
    if (!Number.isFinite(cx) || !Number.isFinite(floorY)) return;
    const active = Number.isFinite(timer) && timer > 3000, beat = performance.now() / 240;
    const bob = Math.abs(Math.sin(beat)) * 3, sway = Math.sin(beat) * .075;
    ctx.save(); ctx.fillStyle = 'rgba(50,35,24,.2)'; ctx.beginPath(); ctx.ellipse(cx, floorY + 2, 31, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(cx, floorY - bob); ctx.rotate(sway);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 3;
    // Little dancing arms, attached to the coffee maker's carafe body.
    ctx.strokeStyle = '#51404b'; ctx.beginPath(); ctx.moveTo(-20, -38); ctx.quadraticCurveTo(-37, -48 - Math.sin(beat) * 4, -32, -59); ctx.stroke();
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#81727a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-32, -60, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#51404b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, -38); ctx.quadraticCurveTo(37, -48 + Math.sin(beat) * 4, 32, -59); ctx.stroke();
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#81727a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(32, -60, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Legs and shoes keep the animated brewer planted on the floor.
    ctx.strokeStyle = '#51404b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-9, -15); ctx.lineTo(-10, -5); ctx.moveTo(9, -15); ctx.lineTo(10, -5); ctx.stroke();
    ctx.fillStyle = '#9a5842'; ctx.beginPath(); ctx.ellipse(-15, -4, 11, 5, -.12, 0, Math.PI * 2); ctx.ellipse(15, -4, 11, 5, .12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4b3028'; ctx.lineWidth = 1.5; ctx.stroke();
    // Carafe silhouette with a friendly face; no separate cup is attached.
    ctx.fillStyle = '#554652'; ctx.strokeStyle = '#302a34'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-21, -67); ctx.lineTo(21, -67); ctx.lineTo(18, -21); ctx.quadraticCurveTo(0, -13, -18, -21); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8b4938'; ctx.beginPath(); ctx.moveTo(-17, -49); ctx.lineTo(17, -49); ctx.lineTo(15, -23); ctx.quadraticCurveTo(0, -18, -15, -23); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#59d2e8'; ctx.strokeStyle = '#3c6870'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-20, -68); ctx.quadraticCurveTo(-17, -105, 0, -107); ctx.quadraticCurveTo(17, -105, 20, -68); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#51404b'; ctx.beginPath(); ctx.roundRect(-23, -110, 46, 8, 4); ctx.fill(); ctx.beginPath(); ctx.arc(0, -113, 5, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.roundRect(-13, -101, 10, 4, 2); ctx.roundRect(1, -101, 8, 4, 2); ctx.fill();
    // Eyes and grin sit on the coffee colored glass.
    ctx.fillStyle = '#201b20'; ctx.beginPath(); ctx.ellipse(-8, -57, 4.2, 7, 0, 0, Math.PI * 2); ctx.ellipse(8, -57, 4.2, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-9, -60, 1.5, 0, Math.PI * 2); ctx.arc(7, -60, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#30201c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-7, -45); ctx.quadraticCurveTo(0, -38, 8, -45); ctx.stroke();
    ctx.fillStyle = '#f08080'; ctx.beginPath(); ctx.ellipse(0, -42, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#55332c'; ctx.beginPath(); ctx.roundRect(-4, -19, 8, 5, 2); ctx.fill();
    // Side handle is part of the pot silhouette.
    ctx.strokeStyle = '#665665'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(18, -91); ctx.bezierCurveTo(43, -90, 44, -61, 20, -59); ctx.stroke();
    ctx.strokeStyle = '#bfacbd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(19, -88); ctx.bezierCurveTo(36, -86, 37, -66, 20, -63); ctx.stroke();
    // Steam and a small sparkle dance above the lid while it works.
    if (active) { ctx.strokeStyle = 'rgba(255,248,224,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -115); ctx.quadraticCurveTo(-10, -122 + Math.sin(beat) * 2, -4, -128); ctx.stroke(); ctx.fillStyle = '#f5d890'; ctx.beginPath(); ctx.arc(0, -124, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawCritter(enemy, screenX) {
    if (enemy.kind < 3) { drawAtlas('hazards', enemy.kind, 4, 2, screenX - 19, enemy.y - 34, 38, 35); return; }
    if (enemy.kind === 4 || enemy.kind === 5) {
      const hop = enemy.hop || 0; ctx.save(); ctx.translate(screenX, enemy.y - 8 - hop);
      const ant = enemy.kind === 4, shell = ant ? '#9b4b2d' : '#68412f';
      ctx.strokeStyle = '#38281e'; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
      ctx.beginPath();
      if (ant) {
        ctx.moveTo(-4, 2); ctx.lineTo(-12, -1); ctx.lineTo(-16, -8); ctx.moveTo(1, 2); ctx.lineTo(8, -2); ctx.lineTo(13, -8);
        ctx.moveTo(-2, 4); ctx.lineTo(-10, 9); ctx.moveTo(3, 4); ctx.lineTo(9, 10);
      } else {
        ctx.moveTo(-5, 4); ctx.lineTo(-12, 9); ctx.moveTo(0, 4); ctx.lineTo(-2, 11); ctx.moveTo(5, 4); ctx.lineTo(12, 9);
        ctx.moveTo(-6, -4); ctx.lineTo(-11, -10); ctx.moveTo(2, -5); ctx.lineTo(5, -12);
      }
      ctx.stroke();
      ctx.fillStyle = shell; ctx.strokeStyle = '#38281e'; ctx.lineWidth = 1.4;
      if (ant) { ctx.beginPath(); ctx.ellipse(-7, 1, 6, 5, -.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(1, 1, 5, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(10, -1, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, -.08, Math.PI, Math.PI * 2); ctx.lineTo(10, 3); ctx.quadraticCurveTo(0, 8, -10, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d7b48a'; ctx.beginPath(); ctx.arc(11, -1, 1.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(11, -2, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#241c18'; ctx.beginPath(); ctx.arc(11.4, -2, .6, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return;
    }
    const hop = enemy.hop || 0; ctx.save(); ctx.translate(screenX, enemy.y - 20 - hop);
    ctx.fillStyle = 'rgba(60,39,25,.18)'; ctx.beginPath(); ctx.ellipse(0, 20 + hop, 15, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8b563b'; ctx.strokeStyle = '#563723'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 5, 11, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -8, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6e0bf'; ctx.beginPath(); ctx.ellipse(0, -5, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4, -10, 3, 0, Math.PI * 2); ctx.arc(4, -10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c211b'; ctx.beginPath(); ctx.arc(-4, -10, 1.2, 0, Math.PI * 2); ctx.arc(4, -10, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#563723'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, 14); ctx.lineTo(-11, 19 + hop * .3); ctx.moveTo(7, 14); ctx.lineTo(11, 19 + hop * .3); ctx.moveTo(10, 5); ctx.bezierCurveTo(22, 2, 17, -8, 13, -5); ctx.stroke(); ctx.restore();
  }
  function drawFloorPlant(x, floorY, variant) {
    ctx.save(); ctx.fillStyle = 'rgba(54,39,25,.16)'; ctx.beginPath(); ctx.ellipse(x, floorY + 2, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
    const pot = ['#bb7652','#d49b65','#8c7655'][variant % 3]; ctx.fillStyle = pot; ctx.strokeStyle = '#65472f'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - 14, floorY - 22); ctx.lineTo(x + 14, floorY - 22); ctx.lineTo(x + 10, floorY - 3); ctx.quadraticCurveTo(x, floorY + 1, x - 10, floorY - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#61452e'; ctx.fillRect(x - 15, floorY - 24, 30, 4);
    ctx.strokeStyle = '#59734b'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(x, floorY - 24); ctx.quadraticCurveTo(x - 1, floorY - 42, x, floorY - 52);
    ctx.moveTo(x, floorY - 40); ctx.quadraticCurveTo(x - 13, floorY - 53, x - 20, floorY - 45);
    ctx.moveTo(x, floorY - 37); ctx.quadraticCurveTo(x + 13, floorY - 52, x + 20, floorY - 44);
    ctx.moveTo(x, floorY - 33); ctx.quadraticCurveTo(x - 10, floorY - 43, x - 14, floorY - 34); ctx.stroke();
    const flower = variant % 3 === 0 ? '#e9a08a' : variant % 3 === 1 ? '#f5d890' : '#f6f0e2';
    ctx.fillStyle = flower; ctx.strokeStyle = '#a85f55'; ctx.lineWidth = .8;
    for (let petal = 0; petal < 5; petal++) { const a = petal * Math.PI * 2 / 5; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 5, floorY - 52 + Math.sin(a) * 5, 3, 4, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#f5d890'; ctx.beginPath(); ctx.arc(x, floorY - 52, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#efc8ad'; ctx.beginPath(); ctx.arc(x - 7, floorY - 13, 1.5, 0, Math.PI * 2); ctx.arc(x + 7, floorY - 13, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  const stageDesign = {
    2: {surface: 0, gap: 26, rise: 0, upper: [2, 6], doubles: [], stairsAt: [2], cupsAt: [4], shelfLift: 68, shelfWidth: 126, shelfX: 105, opening: 'Leve as delícias da vitrine até o balcão, Peter!'},
    3: {surface: 4, gap: 33, rise: 8, upper: [1, 3, 5], doubles: [5], stairsAt: [1, 5], cupsAt: [3], shelfLift: 70, shelfWidth: 126, shelfX: 92, bonusAt: 5, opening: 'Os folhados se espalharam. Vamos encontrá-los?'},
    4: {surface: 3, gap: 35, rise: 13, upper: [2, 5], doubles: [5], stairsAt: [2], cupsAt: [5], shelfLift: 66, shelfWidth: 138, shelfX: 118, recoveryAt: 5, opening: 'A bancada de cacau escorrega. Vamos com cuidado!'},
    5: {surface: 1, gap: 38, rise: 10, upper: [1, 4, 6, 7], doubles: [4, 6, 7], stairsAt: [4, 7], cupsAt: [2, 6], shelfLift: 72, shelfWidth: 118, shelfX: 82, bonusAt: 7, opening: 'Os copos se espalharam. Vamos reuni-los?'},
    6: {surface: 2, gap: 40, rise: 16, upper: [2, 4, 7], doubles: [4, 7], stairsAt: [2, 7], cupsAt: [3, 6], summitAt: 7, shelfLift: 76, shelfWidth: 132, shelfX: 108, recoveryAt: 7, opening: 'Há docinhos nas prateleiras. Qual caminho vamos tomar?'},
    7: {surface: 5, gap: 42, rise: 12, upper: [1, 4, 6], doubles: [6], stairsAt: [1, 6], cupsAt: [3, 7], shelfLift: 68, shelfWidth: 142, shelfX: 88, bonusAt: 6, opening: 'A varanda guarda delícias. Vamos dar uma olhada?'},
    8: {surface: 2, gap: 45, rise: 18, upper: [2, 5, 7], doubles: [5], stairsAt: [2, 5], cupsAt: [4, 7], summitAt: 5, shelfLift: 74, shelfWidth: 124, shelfX: 120, recoveryAt: 5, opening: 'Os pãezinhos estão na estante. Siga as bandejas!'},
    9: {surface: 4, gap: 47, rise: 15, upper: [1, 3, 5, 7], doubles: [3, 7], stairsAt: [1, 7], cupsAt: [4, 8], summitAt: 7, shelfLift: 72, shelfWidth: 132, shelfX: 94, bonusAt: 7, opening: 'A festa vai começar! Vamos reunir as delícias?'},
    10: {surface: 5, gap: 49, rise: 18, upper: [2, 4, 6, 8], doubles: [4, 8], stairsAt: [2, 8], cupsAt: [5, 9], summitAt: 8, shelfLift: 78, shelfWidth: 145, shelfX: 112, recoveryAt: 8, opening: 'Última etapa, Peter! A varanda nos espera.'}
  };
  Object.entries({2:[5], 3:[2], 4:[1,4], 5:[3,8], 6:[5], 7:[2,5], 8:[3,6], 9:[2,6], 10:[3,7]}).forEach(([stage, indices]) => { stageDesign[stage].boxAt = indices; });
  function sarinhaCue(currentPhase) {
    return ({3:'Pssst… repare nas bandejas mais altas. Talvez haja um atalho por ali!',5:'Uma soda italiana geladinha está esperando depois das mesas.',7:'Que vista bonita! Tem um caminho tranquilo um pouco acima.',9:'Você já está quase lá. As últimas delícias estão pertinho!'})[currentPhase] || '';
  }
  function drawSarinha(x, feet, scale) {
    if (!imageReady('sarinha')) return;
    const h = 78 * scale, w = h * images.sarinha.width / images.sarinha.height;
    ctx.drawImage(images.sarinha, x - w / 2, feet - h, w, h);
  }
  function drawSarinhaBubble(text, x, y, width) {
    if (!text) return;
    ctx.save(); ctx.font = '12px system-ui'; ctx.shadowColor = 'rgba(67,45,26,.16)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    const maxWidth = width || 300, words = text.split(' '), lines = []; let line = '';
    for (const word of words) { const next = line ? line + ' ' + word : word; if (ctx.measureText(next).width > maxWidth - 44 && line) { lines.push(line); line = word; } else line = next; }
    if (line) lines.push(line);
    const boxH = lines.length * 16 + 16, bx = Math.max(8, Math.min(W - maxWidth - 8, x - maxWidth / 2)), by = Math.max(38, y - boxH);
    const tailX = Math.max(bx + 22, Math.min(bx + maxWidth - 22, x));
    const bubbleFill = ctx.createLinearGradient(0, by, 0, by + boxH);
    bubbleFill.addColorStop(0, '#fffdf7'); bubbleFill.addColorStop(1, '#fff2ef');
    ctx.fillStyle = bubbleFill; ctx.strokeStyle = '#e7a08e'; ctx.lineWidth = 1.7;
    // Soft hand-drawn oval with a curved, integrated tail pointing toward Sarinha.
    ctx.beginPath(); ctx.moveTo(bx + 19, by + 1);
    ctx.bezierCurveTo(bx + 8, by - 1, bx, by + 6, bx, by + 18);
    ctx.lineTo(bx, by + boxH - 17); ctx.quadraticCurveTo(bx + 1, by + boxH, bx + 19, by + boxH);
    ctx.lineTo(tailX - 10, by + boxH); ctx.quadraticCurveTo(tailX - 6, by + boxH + 2, x, by + boxH + 10);
    ctx.quadraticCurveTo(tailX + 6, by + boxH + 2, tailX + 10, by + boxH);
    ctx.lineTo(bx + maxWidth - 19, by + boxH); ctx.quadraticCurveTo(bx + maxWidth, by + boxH, bx + maxWidth, by + boxH - 18);
    ctx.lineTo(bx + maxWidth, by + 18); ctx.bezierCurveTo(bx + maxWidth, by + 5, bx + maxWidth - 8, by - 1, bx + maxWidth - 20, by + 1);
    ctx.quadraticCurveTo(bx + maxWidth / 2, by - 3, bx + 19, by + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    // A tiny peach heart gives the greeting a warm, personal touch without crowding the words.
    const hx = bx + maxWidth - 14, hy = by + 15;
    ctx.shadowColor = 'transparent'; ctx.fillStyle = '#e9a08a'; ctx.beginPath();
    ctx.moveTo(hx, hy + 4); ctx.bezierCurveTo(hx - 9, hy - 1, hx - 5, hy - 5, hx, hy - 1);
    ctx.bezierCurveTo(hx + 5, hy - 5, hx + 9, hy - 1, hx, hy + 4); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.fillStyle = '#624322'; ctx.textAlign = 'center'; lines.forEach((s, i) => ctx.fillText(s, bx + maxWidth / 2 - 6, by + 18 + i * 16)); ctx.textAlign = 'left'; ctx.restore();
  }
  function drawNuciferaSign(x, groundY) {
    const postX = x + 8, armY = groundY - 128, signX = postX + 43, signY = groundY - 91, radius = 34;
    ctx.save();
    ctx.fillStyle = 'rgba(66,47,30,.16)'; ctx.beginPath(); ctx.ellipse(postX + 13, groundY + 2, 25, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Fall back to a solid wood tone if an embedded canvas rejects gradient creation.
    let wood = '#79532f';
    try {
      const gradient = ctx.createLinearGradient(postX - 8, 0, postX + 8, 0);
      gradient.addColorStop(0, '#56391f'); gradient.addColorStop(.45, '#8a6137'); gradient.addColorStop(1, '#5b3c21');
      wood = gradient;
    } catch (error) { /* Keep the sign drawable without gradients. */ }
    ctx.fillStyle = wood; ctx.fillRect(postX - 7, armY, 14, groundY - armY);
    ctx.fillStyle = '#54391f'; ctx.fillRect(postX - 8, armY - 4, 78, 13);
    ctx.fillStyle = '#d2b483'; ctx.fillRect(postX - 2, armY - 1, 65, 2);
    ctx.fillStyle = '#73502d'; ctx.fillRect(signX - 2, armY + 8, 4, signY - radius - armY + 1);
    ctx.fillStyle = '#583a20'; ctx.beginPath(); ctx.arc(signX, signY, radius + 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fbf4e2'; ctx.beginPath(); ctx.arc(signX, signY, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b58d5d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(signX, signY, radius - 3, 0, Math.PI * 2); ctx.stroke();
    if (imageReady('logo')) {
      ctx.save(); ctx.beginPath(); ctx.arc(signX, signY, radius - 4, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(images.logo, signX - radius + 4, signY - radius + 4, (radius - 4) * 2, (radius - 4) * 2); ctx.restore();
    } else {
      ctx.fillStyle = '#e9a08a'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.arc(signX + Math.cos(a) * 6, signY - 9 + Math.sin(a) * 6, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#70502a'; ctx.font = '7px Georgia'; ctx.textAlign = 'center'; ctx.fillText('Nucífera', signX, signY + 14); ctx.textAlign = 'left';
    }
    ctx.restore();
  }
  function drawRecovery(x, y, size) {
    const cx = x, cy = y - size * .52;
    ctx.save(); const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * .74);
    glow.addColorStop(0, 'rgba(255,238,174,.82)'); glow.addColorStop(1, 'rgba(255,238,174,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, size * .74, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9a08a'; ctx.strokeStyle = '#fff9e9'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(cx, cy + 8); ctx.bezierCurveTo(cx - 17, cy - 2, cx - 8, cy - 14, cx, cy - 6);
    ctx.bezierCurveTo(cx + 8, cy - 14, cx + 17, cy - 2, cx, cy + 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5d890'; ctx.beginPath(); ctx.arc(cx + 10, cy - 9, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function drawCupShelter(x, groundY, hidden) {
    const top = groundY - 44;
    ctx.save();
    ctx.fillStyle = 'rgba(67,45,26,.2)'; ctx.beginPath(); ctx.ellipse(x, groundY + 1, 28, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eee2cc'; ctx.strokeStyle = '#826449'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, groundY - 4, 25, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#9b7650';
    ctx.beginPath(); ctx.moveTo(x - 21, top + 6); ctx.quadraticCurveTo(x - 20, top + 2, x - 15, top + 3); ctx.lineTo(x - 11, groundY - 9); ctx.quadraticCurveTo(x, groundY - 3, x + 11, groundY - 9); ctx.lineTo(x + 16, top + 3); ctx.quadraticCurveTo(x + 21, top + 2, x + 21, top + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b98d64'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x + 23, top + 23, 11, 13, 0, -1.2, 1.2); ctx.stroke();
    ctx.fillStyle = '#8c603e'; ctx.beginPath(); ctx.ellipse(x, top + 6, 21, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6d472e'; ctx.beginPath(); ctx.ellipse(x, top + 6, 17, 4.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(233,160,138,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 11, top + 18); ctx.quadraticCurveTo(x, top + 22, x + 11, top + 18); ctx.stroke();
    if (hidden) {
      ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#9b7650'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 18, top + 15); ctx.lineTo(x - 13, groundY - 2); ctx.quadraticCurveTo(x, groundY + 4, x + 14, groundY - 2); ctx.lineTo(x + 19, top + 15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8c603e'; ctx.beginPath(); ctx.ellipse(x, top + 15, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawShelfSupports(plat, screenX) {
    if (plat.route === 'upper' || plat.route === 'upper-step' || plat.route === 'summit') {
      ctx.fillStyle = 'rgba(89,59,34,.55)'; ctx.fillRect(screenX + 9, plat.y + 8, 5, 16); ctx.fillRect(screenX + plat.w - 14, plat.y + 8, 5, 16);
      ctx.fillStyle = 'rgba(255,247,224,.46)'; ctx.fillRect(screenX + 15, plat.y + 9, Math.max(0, plat.w - 30), 2);
    }
  }
  function drawCakeBoxes(plat, screenX) {
    if (plat.route !== 'box-stack') return;
    const baseY = plat.y + plat.h;
    ctx.save(); ctx.fillStyle = '#bd8c65'; ctx.strokeStyle = '#80583b'; ctx.lineWidth = 1.2;
    ctx.fillRect(screenX + 1, baseY - 9, 30, 9); ctx.strokeRect(screenX + 1, baseY - 9, 30, 9);
    ctx.fillRect(screenX + 28, baseY - 19, 28, 19); ctx.strokeRect(screenX + 28, baseY - 19, 28, 19);
    ctx.fillStyle = '#f7e8ca'; ctx.fillRect(screenX + 4, baseY - 7, 24, 3); ctx.fillRect(screenX + 31, baseY - 17, 22, 3);
    ctx.fillStyle = '#e9a08a'; ctx.beginPath(); ctx.arc(screenX + 42, baseY - 10, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function drawPickup(type, x, y, size) { drawAtlas('food', type % 8, 4, 2, x - size / 2, y - size, size, size); }
  function drawBerry(x, y, size) {
    if (imageReady('berry')) ctx.drawImage(images.berry, x - size / 2, y - size, size, size);
    else drawPickup(2, x, y, size);
  }

  function startPhase() {
    $('#intro').hidden = true;
    $('#storyScreen').hidden = true;
    $('#storyVideoScreen').hidden = true;
    $('.app').hidden = false;
    schedulePlayfieldFit();
    stopBoostEffect();
    stopLoop(); state = null;
    if (rewardPhase !== phase) { clearPhaseRewards(); losses = 0; }
    mode = phase === 1 ? 'climb' : phase === 6 ? 'race' : 'runner'; saveRun();
    try {
      setPageForPhase(); $('#platform').hidden = false;
      if (losses >= MAX_LOSSES) { gameOver('Esta tentativa chegou ao limite de tropeços.'); return; }
      if (phase === 1) startClimb(); else if (phase === 6) startRace(); else startRunner(phase);
    } catch (error) { showPhaseError(error); }
  }
  function showPhaseError(error) {
    stopLoop(); mode = 'phase-error';
    if (state) state.running = false;
    const message = error && error.message ? error.name + ': ' + error.message : String(error);
    const origin = error && error.stack ? '\n' + error.stack.split('\n').slice(0, 2).join(' · ') : '';
    const detail = (message + origin).slice(0, 220);
    $('#goal').textContent = 'A fase ' + phase + ' pausou: ' + detail;
    showModal('Vamos tentar novamente?', 'A fase foi interrompida. Toque em Continuar para tentar novamente.', '');
    console.error('Falha na fase ' + phase, error);
  }
  function newCampaign() {
    if (mode === 'over' && !runRecorded) recordRun();
    phase = 1; score = 0; losses = 0; continues = MAX_CONTINUES; phaseEarned = 0; resumeState = null; runRecorded = false;
    campaignId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    write('nuciCampaignId', campaignId); write('nuciRunRecorded', '0');
    clearPhaseRewards(); saveRun();
    write('nuciCampaignPhase', phase); write('nuciRunScore', score); write('nuciRunLosses', losses); write('nuciContinues', continues);
    hideModal(); startPhase();
  }
  function recordRun() {
    if (runRecorded) return;
    const board = readObject('nuciLocalBoard', []);
    const playerName = (read('nuciPlayerName', '') || '').slice(0, 20);
    const runId = campaignId;
    if (!board.some(entry => entry.id === runId)) board.push({ id: runId, name: playerName, score, phase, date: new Date().toISOString() });
    board.sort((a, b) => b.score - a.score);
    write('nuciLocalBoard', JSON.stringify(board.slice(0, 10)));
    write('nuciLastRunId', runId); write('nuciLastRunNeedsName', playerName ? '0' : '1');
    write('nuciBest', Math.max(+(read('nuciBest', 0)) || 0, score));
    runRecorded = true; write('nuciRunRecorded', '1');
  }
  function rankingRows() {
    const board = JSON.parse(read('nuciLocalBoard', '[]') || '[]');
    return board.length ? board.slice(0, 5).map((r, i) => '<li><span>' + (i + 1) + 'º · ' + escapeHtml(r.name || 'Visitante') + ' · fase ' + (+r.phase || 1) + '</span><b>' + (+r.score || 0) + '</b></li>').join('') : '<li><span>Seu melhor resultado</span><b>' + (read('nuciBest', 0)) + '</b></li>';
  }
  function gameOver(reason) {
    stopLoop(); mode = 'over';
    if (continues <= 0 && !runRecorded) recordRun();
    saveRun();
    const finalScore = score;
    if (continues <= 0) {
      showModal('Seu ranking pessoal', reason + ' Sua aventura terminou na fase ' + phase + ', com ' + finalScore + ' pontos. Resultado salvo neste aparelho. Digite seu apelido para identificá-lo.', rankingRows(), 'Recomeçar jogo');
      $('#close').textContent = 'Continuar';
      return;
    }
    showModal('Mais uma chance?', reason + ' Você chegou à fase ' + phase + ' com ' + finalScore + ' pontos. Restam ' + continues + ' continuaç' + (continues === 1 ? 'ão' : 'ões') + '. Você pode tentar esta fase novamente.',
      '<li><span>Continuações restantes</span><b>' + continues + '</b></li><li><span>Pontuação desta aventura</span><b>' + finalScore + '</b></li>', 'Recomeçar do jardim');
    $('#close').textContent = 'Continuar (' + continues + ')';
  }
  function continueRun() {
    if (continues <= 0) { newCampaign(); return; }
    continues--; losses = 0; resumeState = null;
    if (phase === 6 && raceSave) { raceSave.status = 'running'; raceSave.immuneUntil = raceSave.elapsed + 2.5; }
    saveRun(); hideModal();
    startPhase(); say('Mais uma chance! Fase ' + phase + ' · continuações: ' + continues);
  }
  function loseAttempt(reason) {
    losses++; saveRun(); fx('hit');
    if (losses >= MAX_LOSSES) { gameOver('Você chegou ao limite de tropeços desta tentativa.'); return true; }
    say(reason + ' · tentativa ' + losses + ' de 10');
    if (mode === 'climb') startClimb();
    else if (mode === 'runner' && state) {
      const safe = state.safeCheckpoint || { x: state.checkpoint, y: state.groundY };
      state.player.x = safe.x; state.player.y = safe.y;
      state.player.vy = 0; state.player.grounded = true; state.player.invulnerable = performance.now() + 1450;
      state.player.dir = 0; state.camera = Math.max(0, state.checkpoint - 145); state.shots = [];
      updateRunHud(); stopLoop(); state.running = true; raf = requestAnimationFrame(loopRunner);
    }
    return false;
  }

  function startClimb() {
    mode = 'climb';
    const platforms = [];
    for (let i = 0; i <= 10; i++) platforms.push({ x: i === 10 ? 145 : (i * 83 + 35) % 285, y: 452 - i * 67, w: i === 10 ? 150 : 74, tile: i % 4, route: i === 10 ? 'summit' : undefined });
    const summitGoalX = platforms[10].x + 10 + 51;
    state = { platforms, x: 180, y: 420, vy: -10.5, dir: 0, cam: 0, items: [], score: 0, boosts: 3, running: true, last: 0, target: 6, summitY: -218, summitReached: false, summitGoalX, introUntil: performance.now() + 5600 };
    platforms.forEach((p, i) => {
      if (i % 2 === 0 || i === 7 || i === 9) {
        const summitBerry = p.route === 'summit';
        state.items.push({ id: 'garden-' + i, x: summitBerry ? summitGoalX : p.x + 35, y: summitBerry ? p.y - 14 : p.y - 22, got: !!rewards['garden-' + i], type: i % 8 });
      }
    });
    state.score = state.items.filter(it => it.got).length;
    $('#streak').textContent = state.boosts;
    $('#jumpAction').textContent = 'IMPULSO ×' + state.boosts;
    setHud(score, state.boosts, 0, 'Colete 6 morangos e alcance o poste no topo!');
    raf = requestAnimationFrame(loopClimb);
  }
  function loopClimb(ts) {
    if (mode !== 'climb' || !state || !state.running) return;
    const j = state, dt = Math.min((ts - (j.last || ts)) / 16.67 || 1, 2); j.last = ts;
    const oldY = j.y; j.vy += 0.42 * dt; j.y += j.vy * dt; j.x += j.dir * 3.6 * dt;
    if (j.x < 10) j.x = 350; if (j.x > 350) j.x = 10;
    if (j.vy > 0) for (const p of j.platforms) if (oldY + 14 <= p.y && j.y + 14 >= p.y && j.x > p.x - 12 && j.x < p.x + p.w + 12) { j.y = p.y - 14; j.vy = -10.5; if (p.route === 'summit') j.summitReached = true; break; }
    if (j.y - j.cam < 170) j.cam = j.y - 170;
    for (const it of j.items) if (!it.got && Math.abs(j.x - it.x) < 24 && Math.abs(j.y - it.y) < 26) {
      it.got = true; j.score++; awardOnce(it.id, 100); fx('collect');
      setHud(score, j.boosts, j.score / j.target * 100, 'Colete ' + Math.max(0, j.target - j.score) + ' morangos e alcance o poste no topo!');
    }
    if (j.y - j.cam > 535) { loseAttempt('Quase!'); return; }
    drawClimb();
    if (j.score >= j.target && j.summitReached && Math.abs(j.x - j.summitGoalX) < 34 && j.y <= j.summitY + 36) { setHud(score, j.boosts, 100, 'Chegada da Nucífera alcançada!'); phaseFinish(); return; }
    raf = requestAnimationFrame(loopClimb);
  }
  function drawFlower(x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale || 1, scale || 1);
    ctx.lineWidth = 1.25; ctx.strokeStyle = '#a85f55'; ctx.fillStyle = '#e9a08a';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 6, 10, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#f5d890'; ctx.strokeStyle = '#bd8d4e'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#49381f'; ctx.beginPath(); ctx.arc(-2, -1, 1, 0, Math.PI * 2); ctx.arc(2, -1, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawClimb() {
    const j = state; drawBackground(0, 1);
    ctx.fillStyle = '#70502a'; ctx.font = 'bold 13px system-ui'; ctx.fillText('FASE 1 · JARDIM DE MORANGOS', 14, 27);
    const summit = j.platforms.find(p => p.route === 'summit');
    if (summit) drawNuciferaSign(summit.x + 10, summit.y - j.cam + 28);
    for (const p of j.platforms) { const y = p.y - j.cam; if (y > -45 && y < H + 5) drawTile(p.tile, p.x, y, p.w, 28); }
    for (const it of j.items) if (!it.got) drawBerry(it.x, it.y - j.cam, 28);
    const saraY = 476 - j.cam;
    if (saraY > -90 && saraY < H + 90) {
      drawSarinha(300, saraY, .92);
      drawSarinhaBubble('Oi, florzinha! Acompanhe os morangos até o alto do jardim.', 300, Math.max(145, Math.min(410, saraY - 78 * .92 - 22)), 246);
    }
    drawFlower(j.x, j.y - j.cam, 1.1);
    ctx.font = '11px system-ui'; ctx.fillStyle = '#70502a'; ctx.fillText('A flor pula sozinha; guie para os lados', 44, 481);
  }
  function useAction() {
    if (suspended || !$('#modal').classList.contains('hide')) return;
    startAudio();
    if (mode === 'climb' && state && state.boosts > 0) { state.boosts--; state.vy = -12; $('#streak').textContent = state.boosts; $('#jumpAction').textContent = state.boosts ? 'IMPULSO ×' + state.boosts : 'SEM IMPULSOS'; fx('jump'); }
    else if (mode === 'runner' && state) { state.player.jumpBufferUntil = performance.now() + 240; }
    else if (mode === 'bonus' && state && state.grounded) { state.vy = -10.5; state.grounded = false; fx('jump'); }
    else if (mode === 'race' && state && NuciferaRace.boost(state.race)) { updateRaceHud(); drawRace(); fx('accelerate'); }
  }
  function useTowel() {
    if (suspended || !$('#modal').classList.contains('hide')) return;
    startAudio();
    if (mode !== 'runner' || !state || !state.player) return;
    const p = state.player, now = performance.now();
    if (now < (p.clothCooldown || 0)) return;
    p.clothUntil = now + 300; p.clothCooldown = now + 620;
    fx('towel');
  }

  const itemNames = ['croissant', 'cinnamon roll', 'pão de queijo', 'bolo chocolatudo', 'brigadeiro', 'macaron', 'soda italiana', 'cappuccino'];
  function makeLevel(currentPhase) {
    const design = stageDesign[currentPhase] || stageDesign[10];
    const groundY = 438, platforms = [], items = [], enemies = [], machines = [], shelters = [], pits = [], decorations = [];
    const gap = design.gap;
    const len = 370 - Math.min(95, (currentPhase - 2) * 9);
    const enemyLimit = Math.min(5, 2 + Math.floor((currentPhase - 2) / 2));
    // Include every designed shelf/bonus before adding the empty stretches for props.
    const lastFeature = Math.max(...design.upper, ...design.stairsAt, ...design.boxAt, design.bonusAt || 0, design.recoveryAt || 0);
    let segmentCount = Math.max(8, lastFeature + 2);
    const hasFeature = (index) => design.upper.includes(index) || design.stairsAt.includes(index) || design.boxAt.includes(index);
    const clearFeatureSegments = [];
    for (let candidate = 2; candidate < segmentCount - 1; candidate++) if (!hasFeature(candidate)) clearFeatureSegments.push(candidate);
    while (clearFeatureSegments.length < 3) { clearFeatureSegments.push(segmentCount - 1); segmentCount++; }
    const cupTarget = design.cupsAt && design.cupsAt.length ? design.cupsAt[0] : Math.floor(segmentCount / 2);
    const cupIndex = clearFeatureSegments.slice().sort((a, b) => Math.abs(a - cupTarget) - Math.abs(b - cupTarget))[0] ?? -1;
    const saucerIndex = clearFeatureSegments.find(candidate => candidate !== cupIndex);
    const pitIndex = clearFeatureSegments.find(candidate => candidate !== cupIndex && candidate !== saucerIndex), pitOffset = .30;
    // If a phase has no safe empty stretch, leave it without a pit instead of cutting
    // the starting floor where Sarinha and Peter appear.
    let x = 0, index = 0;
    while (index < segmentCount) {
      const width = index === cupIndex ? 440 : len - (index % 3) * 18;
      const groundOffset = 0;
      if (index === pitIndex) {
        const pitX = x + width * pitOffset, pitW = 64;
        platforms.push({ x, y: groundY, w: pitX - x, h: H - groundY, tile: index % 4, surface: design.surface, route: 'ground' });
        platforms.push({ x: pitX + pitW, y: groundY, w: x + width + gap - (pitX + pitW), h: H - groundY, tile: index % 4, surface: design.surface, route: 'ground' });
        pits.push({ x: pitX, w: pitW });
      } else platforms.push({ x, y: groundY, w: width + gap, h: H - groundY, tile: index % 4, surface: design.surface, route: 'ground' });
      if (index !== pitIndex && index !== cupIndex && index !== saucerIndex) {
        const decoX = design.stairsAt.includes(index) ? x + width * .88 : x + width * .14;
        decorations.push({ x: decoX, variant: index % 3 });
        if (!hasFeature(index) && index !== cupIndex && index !== saucerIndex && index !== pitIndex && index % 3 === 0 && width > 250) {
          decorations.push({ x: x + width * .84, variant: (index + 1) % 3 });
        }
      }
      if (design.upper.includes(index)) {
        const shelfX = x + design.shelfX + (index % 3 === 0 ? 12 : 0);
        const elevatedY = groundY - design.shelfLift - (index % 3) * 5 - (index % 4 === 0 ? design.rise * .35 : 0);
        platforms.push({ x: shelfX, y: elevatedY, w: design.shelfWidth, h: 25, tile: (index + 1) % 4, surface: (design.surface + 2) % 6, route: 'upper' });
        if (design.stairsAt.includes(index)) {
          const shelfRise = groundY - elevatedY;
          for (let step = 0; step < 4; step++) {
            const stepY = groundY - (shelfRise * (step + 1) / 4);
            const stepX = shelfX - 162 + step * 38;
            const faceY = step === 0 ? groundY : groundY - (shelfRise * step / 4);
            platforms.push({ x: stepX, y: stepY, w: 48, h: 10, faceY, tile: (index + step + 2) % 4, surface: (design.surface + 1) % 6, route: 'stair' });
          }
        }
        // A few broad, low-rise steps make an optional upper route feel like connected shelving.
        if (design.doubles.includes(index)) {
          const stepX = shelfX + Math.min(112, design.shelfWidth - 28);
          platforms.push({ x: stepX, y: elevatedY - 52, w: 94, h: 25, tile: (index + 2) % 4, surface: (design.surface + 1) % 6, route: 'upper-step' });
          items.push({ x: stepX + 48, y: elevatedY - 82, type: (index + currentPhase + 3) % 8, got: false, recovery: design.recoveryAt === index });
          if (design.summitAt === index) {
            const summitX = stepX + 72, summitY = elevatedY - 102;
            platforms.push({ x: summitX, y: summitY, w: 88, h: 24, tile: (index + 3) % 4, surface: (design.surface + 3) % 6, route: 'summit' });
            items.push({ x: summitX + 45, y: summitY - 25, type: (index + currentPhase + 5) % 8, got: false });
          }
        }
      }
      // Keep ground sweets clear of the wooden stair footprint so each one can be reached.
      const groundSweetX = x + (design.stairsAt.includes(index) ? width * .88 : index === cupIndex ? width * .09 : index === saucerIndex ? width * .12 : index === pitIndex ? width * .80 : width * .34);
      items.push({ x: groundSweetX, y: groundY + groundOffset - 28, type: (index + currentPhase) % 8, got: false });
      if (design.upper.includes(index)) {
        const upperY = groundY - design.shelfLift - (index % 3) * 5 - (index % 4 === 0 ? design.rise * .35 : 0);
        items.push({ x: x + design.shelfX + (index % 3 === 0 ? 12 : 0) + design.shelfWidth * .55, y: upperY - 30, type: (index + currentPhase + 2) % 8, got: false });
      }
      if (design.bonusAt === index && design.upper.includes(index)) {
        const bonusPlatform = platforms.find(plat => plat.route === 'upper-step' && plat.x > x);
        const bonusX = bonusPlatform ? bonusPlatform.x + bonusPlatform.w * .58 : x + design.shelfX + design.shelfWidth * .6;
        const bonusY = bonusPlatform ? bonusPlatform.y - 29 : groundY - design.shelfLift - 35;
        items.push({ x: bonusX, y: bonusY, type: 8, got: false, bonus: true });
      }
      if (index === cupIndex) {
        shelters.push({ x: x + width * .28, groundY, w: 58 });
        if (currentPhase >= 5) machines.push({ x: x + width * .74, y: groundY, timer: 700 });
        else enemies.push({ x: x + width * .76, home: x + width * .76, y: groundY, dir: -1, kind: currentPhase % 6, alive: true, range: 32, pause: 0, anim: 0, hop: 0, hopAt: performance.now() + 1600 });
      }
      if (design.boxAt.includes(index)) platforms.push({ x: x + width * .59, y: groundY - 62, w: 54, h: 62, tile: (index + 2) % 4, surface: design.surface, route: 'barrel' });
      if (index === saucerIndex)
        platforms.push({ x: x + width * .55 - 52, y: groundY - 28, w: 104, h: 20, tile: (index + 3) % 4, surface: design.surface, route: 'saucer' });
      if (currentPhase >= 2 && index > 0 && !design.stairsAt.includes(index) && !design.boxAt.includes(index) && index !== cupIndex && index !== saucerIndex && index !== pitIndex && enemies.length < enemyLimit) {
        // Enemy y is the ground foot baseline; the sprite atlas itself has transparent padding above.
        let enemyX = x + width * 0.55;
        const cup = shelters.find(item => Math.abs(item.x - enemyX) < 72);
        if (cup) enemyX = Math.min(x + width - 42, x + 42);
        enemies.push({ x: enemyX, home: enemyX, y: groundY, dir: index % 2 ? 1 : -1, kind: (currentPhase + enemies.length) % 6, alive: true, range: 40 + (index % 2) * 8, pause: 0, anim: index * .8, hop: 0, hopAt: performance.now() + 700 + index * 210 });
      }
      x += width + gap; index++;
    }
    // Move any ground collectible clear of stairs, barrels, cups, and pits before play begins.
    const stairPlatforms = platforms.filter(plat => plat.route === 'stair');
    const barrelPlatforms = platforms.filter(plat => plat.route === 'barrel');
    const groundPlatforms = platforms.filter(plat => plat.route === 'ground');
    const quietSpots = shelters.map(cup => ({ x: cup.x, radius: 96 }))
      .concat(pits.map(pit => ({ x: pit.x + pit.w / 2, radius: 94 })))
      .concat(platforms.filter(plat => plat.route === 'saucer').map(plat => ({ x: plat.x + plat.w / 2, radius: 96 })));
    for (let i = decorations.length - 1; i >= 0; i--) {
      if (quietSpots.some(spot => Math.abs(decorations[i].x - spot.x) < spot.radius)) decorations.splice(i, 1);
    }
    function clearGroundSpot(desiredX, minGap, ignoreCup, ignoreItem, allowShelves, reservedZones) {
      const reserved = reservedZones || [];
      const candidates = [];
      for (const floor of groundPlatforms) {
        for (let offset = 62; offset <= floor.w - 62; offset += 10) candidates.push(floor.x + offset);
      }
      candidates.sort((a, b) => Math.abs(a - desiredX) - Math.abs(b - desiredX));
      return candidates.find(px => !stairPlatforms.some(stair => px > stair.x - 24 && px < stair.x + stair.w + 24)
        && !barrelPlatforms.some(barrel => Math.abs(px - (barrel.x + barrel.w / 2)) < 48)
        && !pits.some(pit => Math.abs(px - (pit.x + pit.w / 2)) < pit.w / 2 + 30)
        && !machines.some(machine => Math.abs(px - machine.x) < 62)
        && !enemies.some(enemy => Math.abs(px - enemy.x) < 54)
        && !decorations.some(deco => Math.abs(px - deco.x) < 88)
        && !platforms.some(plat => (plat.route === 'saucer' || (!allowShelves && ['upper','upper-step','summit'].includes(plat.route))) && Math.abs(px - (plat.x + plat.w / 2)) < plat.w / 2 + 48)
        && !items.some(item => item !== ignoreItem && item.y >= groundY - 32 && item.y <= groundY - 20 && Math.abs(px - item.x) < 34)
        && !reserved.some(zone => Math.abs(px - zone.x) < zone.radius)
        && !shelters.some(cup => cup !== ignoreCup && Math.abs(px - cup.x) < minGap));
    }
    for (const item of items) {
      if (item.y >= groundY - 32 && item.y <= groundY - 20) {
        const safeX = clearGroundSpot(item.x, 60, undefined, item);
        if (Number.isFinite(safeX)) item.x = safeX;
      }
    }
    if (currentPhase >= 5 && !machines.length) {
      // Keep the tall dancing brewer clear of Sarinha's fixed opening pose and speech bubble.
      const spot = clearGroundSpot(900, 170, undefined, undefined, false, [{ x: 180, radius: 170 }]);
      if (Number.isFinite(spot)) machines.push({ x: spot, y: groundY, timer: 700 });
    }
    for (const cup of shelters) {
      if (machines.some(machine => machine.x > cup.x && machine.x - cup.x < 280)) continue;
      if (enemies.some(enemy => Math.abs(enemy.x - cup.x) < 155)) continue;
      const left = clearGroundSpot(cup.x - 118, 70, undefined, undefined, true);
      const right = clearGroundSpot(cup.x + 118, 70, undefined, undefined, true);
      const enemySpot = [left, right].filter(Number.isFinite).filter(px => Math.abs(px - cup.x) <= 175)
        .sort((a, b) => Math.abs(a - cup.x) - Math.abs(b - cup.x))[0];
      if (Number.isFinite(enemySpot)) {
        if (enemies.length < enemyLimit) enemies.push({ x: enemySpot, home: enemySpot, y: groundY, dir: 1, kind: (currentPhase + enemies.length) % 6, alive: true, range: 34, pause: 0, anim: enemies.length * .8, hop: 0, hopAt: performance.now() + 1100 + enemies.length * 240 });
        else {
          const farthest = enemies.slice().sort((a, b) => Math.abs(b.x - cup.x) - Math.abs(a.x - cup.x))[0];
          farthest.x = enemySpot; farthest.home = enemySpot; farthest.dir = 1;
        }
      }
    }
    while (enemies.length < Math.min(2, enemyLimit)) {
      const desired = 650 + enemies.length * 540;
      const spot = clearGroundSpot(desired, 64);
      if (!Number.isFinite(spot)) break;
      const kind = (currentPhase + enemies.length) % 6;
      enemies.push({ x: spot, home: spot, y: groundY, dir: enemies.length % 2 ? -1 : 1, kind, alive: true, range: 34, pause: 0, anim: enemies.length * .8, hop: 0, hopAt: performance.now() + 950 + enemies.length * 280 });
    }
    const finishPlatformX = x - gap - 8;
    platforms.push({ x: finishPlatformX, y: groundY, w: 230, h: 25, tile: currentPhase % 4, surface: design.surface, route: 'finish' });
    const finishX = finishPlatformX + 40;
    const introUntil = performance.now() + 6000;
    items.forEach((item, i) => { item.id = 'item-' + i; item.got = !!rewards[item.id]; });
    enemies.forEach((enemy, i) => { enemy.id = 'enemy-' + i; if (rewards[enemy.id]) enemy.alive = false; });
    // Choose her world position once. Moving enemies must never relocate or hide her.
    const cueText = sarinhaCue(currentPhase), cueSpots = [];
    if (cueText) for (const floor of groundPlatforms) {
      for (let px = floor.x + 38; px <= floor.x + floor.w - 38; px += 12) {
        if (px < 450 || px > finishX - 250) continue;
        if (platforms.some(plat => plat.route !== 'ground' && px > plat.x - 38 && px < plat.x + plat.w + 38)) continue;
        if (machines.some(machine => Math.abs(machine.x - px) < 90)
          || shelters.some(cup => Math.abs(cup.x - px) < cup.w / 2 + 38)
          || decorations.some(deco => Math.abs(deco.x - px) < 48)
          || items.some(item => Math.abs(item.y - (groundY - 28)) < 6 && Math.abs(item.x - px) < 38)
          || enemies.some(enemy => Math.abs(enemy.home - px) < enemy.range + 65)) continue;
        cueSpots.push(px);
      }
    }
    const cueX = cueSpots.sort((a, b) => Math.abs(a - finishX * .57) - Math.abs(b - finishX * .57))[0];
    return { platforms, items, enemies, machines, shelters, pits, decorations, shots: [], finishX, finishPlatformX, groundY, camera: 0, checkpoint: 30, safeCheckpoint: { x: 30, y: groundY }, sarinhaX: 180, player: { x: 35, y: groundY, dir: 0, vy: 0, grounded: true, groundedAt: 0, jumpBufferUntil: 0, invulnerable: introUntil + 1200, previousY: groundY, fallingAtFrameStart: false, facing: 1, clothUntil: 0, clothCooldown: 0 }, running: true, last: 0, walk: 0, phase: currentPhase, score: phaseEarned, surfaceOffset: design.surface, introUntil, introText: design.opening, cueText, cueX, cueAt: Number.isFinite(cueX) ? cueX - (W - 28 - 135) : Infinity, cueShown: false };
  }
  function updateRunHud() {
    const got = state.items.filter(it => it.got && !it.bonus && !it.recovery).length;
    setHud(score, got, state.player.x / state.finishX * 100, 'Docinhos: ' + got + ' · siga à direita até o letreiro da Nucífera.');
  }
  function startRunner(currentPhase) {
    mode = 'runner'; state = makeLevel(currentPhase); setPageForPhase();
    updateRunHud(); raf = requestAnimationFrame(loopRunner);
  }
  function startRace() {
    mode = 'race';
    state = { race: NuciferaRace.create(raceSave), running: true, last: 0, finishAge: 0 };
    if (state.race.status === 'finish') mode = 'race-finish';
    setPageForPhase(); updateRaceHud(); raf = requestAnimationFrame(loopRace);
  }
  function updateRaceHud() {
    const r = state.race, ready = Math.max(0, r.boostReady - r.elapsed), accelerating = r.elapsed < r.boostUntil;
    $('#jumpAction').textContent = mode === 'race-finish' ? 'CHEGADA!' : accelerating ? 'ACELERANDO +80%' : ready > 0 ? 'AGUARDE · ' + Math.ceil(ready) + ' s' : 'ACELERAR';
    $('#jumpAction').disabled = ready > 0 || mode === 'race-finish';
    setHud(score, r.sweets, r.elapsed / 60 * 100, mode === 'race-finish'
      ? '60 segundos! Sarinha está comemorando sua chegada.'
      : Math.ceil(60 - r.elapsed) + ' segundos · doces: ' + r.sweets + ' · tropeços: ' + losses + '/10');
  }
  let raceSaraLayers = null;
  function getRaceSaraLayers() {
    if (raceSaraLayers) return raceSaraLayers;
    if (!imageReady('raceSaraFinish')) return null;
    const image = images.raceSaraFinish;
    // Rig the supplied transparent drawing in memory, preserving its original artwork.
    const cloth = [[75,74],[235,7],[553,0],[659,331],[580,391],[498,419],[420,414],[322,402],[239,370],[175,396],[77,462]];
    const arm = [[356,784],[361,864],[307,859],[259,854],[215,835],[136,800],[47,794],[27,752],[28,681],[99,671],[129,693],[144,722],[214,740],[257,737],[289,753],[317,780]];
    const pole = [[46,62],[110,62],[110,936],[46,936]];
    const path = (c, points) => { c.moveTo(points[0][0], points[0][1]); for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]); c.closePath(); };
    const makeLayer = (x, y, w, h, masks) => {
      const layer = document.createElement('canvas'); layer.width = w; layer.height = h;
      const c = layer.getContext('2d'); c.translate(-x, -y);
      c.beginPath(); masks.forEach(points => path(c, points)); c.clip(); c.drawImage(image, 0, 0);
      return layer;
    };
    const body = document.createElement('canvas'); body.width = image.naturalWidth; body.height = image.naturalHeight;
    const c = body.getContext('2d'); c.drawImage(image, 0, 0); c.globalCompositeOperation = 'destination-out';
    for (const points of [cloth, arm, pole]) { c.beginPath(); path(c, points); c.fill(); }
    raceSaraLayers = { body, arm: makeLayer(0, 50, 380, 900, [arm, pole]), cloth: makeLayer(70, 0, 590, 465, [cloth]) };
    return raceSaraLayers;
  }
  function drawRaceSara(x, feet, t, perspective = 1) {
    // Compare her body with Peter's body; the rider's 150px sprite includes the motorcycle.
    const bodyHeight = 130, layers = getRaceSaraLayers(), scale = bodyHeight / (1640 - 421) * perspective;
    if (!layers) { drawSarinha(x, feet, bodyHeight / 78 * perspective); return; }
    ctx.save(); ctx.translate(x, feet);
    // Fixed ground anchor: waving never shifts her body or either foot.
    ctx.fillStyle = 'rgba(40,34,30,.20)'; ctx.beginPath(); ctx.ellipse(0, 1, 36 * perspective, 4 * perspective, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(scale, scale); ctx.translate(-545, -1640);
    ctx.drawImage(layers.body, 0, 0);
    // Shoulder drives hand and pole together; the cloth trails with a travelling wave.
    ctx.translate(352, 815); ctx.rotate(Math.sin(t * 5.1) * .075); ctx.translate(-352, -815);
    ctx.drawImage(layers.arm, 0, 50);
    const strip = 12, flag = layers.cloth;
    for (let sx = 0; sx < flag.width; sx += strip) {
      const sw = Math.min(strip + 1, flag.width - sx), weight = Math.max(0, (sx - 12) / (flag.width - 12));
      const wave = Math.sin(t * 8 - weight * 5.5), dy = wave * 34 * weight;
      ctx.drawImage(flag, sx, 0, sw, flag.height, sx + 70, dy, sw, flag.height * (1 + .022 * wave * weight));
    }
    ctx.restore();
  }
  function drawRace() {
    NuciferaRace.render(ctx, state.race, W, H, {
      scenery: images.raceScenery, bike: images.raceBike, losses,
      poses: {
        straight: { image: images.raceRear, wind: images.raceRearWind },
        right: { image: images.raceRight, wind: images.raceRightWind },
        left: { image: images.raceLeft, wind: images.raceLeftWind }
      },
      sweet: drawPickup, sara: drawRaceSara,
      fallen: (x,y,t) => { ctx.save(); ctx.translate(x,y); ctx.rotate(-1.05+t*.25); drawCharacter(5,0,0,52,72); ctx.restore(); }
    }, state.finishAge);
  }
  function loopRace(ts) {
    if (!['race', 'race-finish'].includes(mode) || !state || !state.running || suspended) return;
    try {
      const dt = state.last ? Math.max(0, Math.min(.1, (ts - state.last) / 1000)) : 0; state.last = ts;
      if (mode === 'race') NuciferaRace.tick(state.race, dt, {
        collect: id => { awardOnce('race-' + id, 100); fx('collect'); },
        crash: () => { stopBoostEffect(); if (loseAttempt('Peter caiu da moto; já vai retomar a estrada')) state.race.status = 'over'; },
        finish: () => { saveRun(); mode = 'race-finish'; state.finishAge = 0; say('Chegada! Sarinha está esperando por você!'); }
      });
      else state.finishAge += dt;
      if (!['race','race-finish'].includes(mode)) { saveRun(); return; }
      if (!state.savedAt || ts - state.savedAt > 500) { saveRun(); state.savedAt = ts; }
      updateRaceHud(); drawRace();
      if (mode === 'race-finish' && state.finishAge >= 2.5) { $('#jumpAction').disabled = false; phaseFinish(); return; }
      raf = requestAnimationFrame(loopRace);
    } catch (error) { showPhaseError(error); }
  }
  function hitEnemy(enemy) {
    if (!enemy.alive || performance.now() < state.player.invulnerable) return false;
    const p = state.player;
    if (isSheltered(state, p)) return false;
    if (p.clothUntil > performance.now() && Math.abs((p.x + p.facing * 50) - enemy.x) < 34 && Math.abs((p.y - 42) - (enemy.y - 12 - (enemy.hop || 0))) < 38) {
      enemy.alive = false; p.clothUntil = Math.min(p.clothUntil, performance.now() + 90);
      if (awardOnce(enemy.id, 75)) state.score += 75; say('Paninho certeiro! +75'); fx('collect'); return false;
    }
    if (Math.abs(p.x - enemy.x) < 25 && Math.abs((p.y - 32) - (enemy.y - 12)) < 28) {
      const stomp = p.fallingAtFrameStart && p.previousY < enemy.y + 2 && p.y <= enemy.y + 9;
      if (stomp) { enemy.alive = false; p.vy = -7; if (awardOnce(enemy.id, 75)) state.score += 75; say('Pulo certeiro! +75'); fx('collect'); }
      else { loseAttempt('Opa, o bichinho pegou o Peter'); return true; }
    }
    return false;
  }
  function isSheltered(j, p) {
    return j.shelters.some(cup => Math.abs(p.x - cup.x) < cup.w * .42 && p.grounded && Math.abs(p.y - cup.groundY) < 5);
  }
  function loopRunner(ts) {
    if (mode !== 'runner' || !state || !state.running) return;
    try { updateRunnerFrame(ts); }
    catch (error) { showPhaseError(error); }
  }
  function updateRunnerFrame(ts) {
    const j = state, p = j.player, dt = Math.min((ts - (j.last || ts)) / 16.67 || 1, 2), ms = dt * 16.67;
    j.last = ts; const oldX = p.x; p.x += p.dir * (2.55 + Math.min(0.08 * (phase - 2), 0.8)) * dt; p.x = Math.max(8, Math.min(j.finishX, p.x));
    if (p.dir) p.facing = p.dir;
    if (!j.hudAt || ts - j.hudAt > 140) {
      $('#progressFill').style.width = Math.max(0, Math.min(100, p.x / j.finishX * 100)) + '%';
      j.hudAt = ts;
    }
    if (p.dir) j.walk += dt * 0.24;
    const oldY = p.y, wasGrounded = p.grounded; p.previousY = oldY; p.fallingAtFrameStart = p.vy > 0; p.vy += 0.48 * dt; p.y += p.vy * dt; p.grounded = false;
    if (p.dir) for (const stair of j.platforms) if (stair.route === 'stair' && p.y > stair.y + 5 && p.y < j.groundY + 10 && p.x + 14 > stair.x && p.x - 14 < stair.x + stair.w) {
      p.x = p.dir > 0 ? Math.min(p.x, stair.x - 15) : Math.max(p.x, stair.x + stair.w + 15);
    }
    for (const plat of j.platforms) if (p.vy >= 0 && oldY <= plat.y && p.y >= plat.y && p.x + 15 > plat.x && p.x - 15 < plat.x + plat.w) {
      p.y = plat.y; p.vy = 0; p.grounded = true;
    }
    if (wasGrounded) for (const saucer of j.platforms) if (saucer.route === 'saucer' && p.x + 15 > saucer.x && p.x - 15 < saucer.x + saucer.w && p.y >= saucer.y && p.y - saucer.y <= 34) {
      p.y = saucer.y; p.vy = 0; p.grounded = true; break;
    }
    if (p.grounded) p.groundedAt = ts;
    if (p.jumpBufferUntil > ts && (p.grounded || ts - p.groundedAt < 190)) {
      p.vy = -11; p.grounded = false; p.jumpBufferUntil = 0; p.groundedAt = 0; fx('jump');
    }
    for (const e of j.enemies) {
      e.anim += dt * .11;
      if (e.kind === 3) {
        if (ts >= e.hopAt) { e.hop = 18; e.hopAt = ts + 1450 + (e.home % 700); }
        else e.hop = Math.max(0, e.hop - .65 * dt);
      }
      if (e.pause > 0) e.pause -= ms;
      else { e.x += e.dir * (0.38 + phase * 0.018) * dt; if (Math.abs(e.x - e.home) > e.range) { e.dir *= -1; e.pause = 420 + (e.kind * 110); } }
      if (hitEnemy(e)) return;
    }
    for (const m of j.machines) {
      m.timer += ms;
      const dripInterval = 3600 + ((Math.floor(m.x / 37) % 4) * 260);
      if (m.timer > dripInterval) { m.timer = 0; j.shots.push({ x: m.x, y: m.y - 16, vx: -1.05 - (phase % 3) * .08, vy: -2.05, age: 0, alive: true }); }
    }
    j.shots = (j.shots || []).filter(s => s.alive && s.x > j.camera - 45);
    for (const s of j.shots) {
      s.x += s.vx * dt; s.age += dt; s.y += s.vy * dt; s.vy += .035 * dt;
      if (!isSheltered(j, p) && performance.now() > p.invulnerable && Math.abs(p.x - s.x) < 17 && Math.abs((p.y - 30) - s.y) < 17) { loseAttempt('Uma gotinha de café acertou o Peter'); return; }
    }
    if (p.grounded && p.x > j.checkpoint + 620) { j.checkpoint = p.x; j.safeCheckpoint = { x: p.x, y: p.y }; say('Ponto de apoio alcançado ☕'); }
    j.camera = Math.max(0, p.x - 135);
    if (!j.cueShown && j.cueText && p.x > j.cueAt) j.cueShown = true;
    for (const it of j.items) if (!it.got && Math.abs(p.x - it.x) < 33 && Math.abs((p.y - 33) - it.y) < 42) {
      if (it.bonus) { it.got = true; awardOnce(it.id, 0); enterBonus(); return; }
      if (it.recovery) {
        it.got = true; const recovered = losses > 0; losses = Math.max(0, losses - 1); if (awardOnce(it.id, 200)) j.score += 200; saveRun(); fx('bonus');
        say(recovered ? 'Achado especial! Um tropeço recuperado · +200' : 'Achado especial! +200 pontos guardados'); updateRunHud(); continue;
      }
      it.got = true; if (awardOnce(it.id, 100)) j.score += 100; fx('collect'); say(itemNames[it.type] + ' · +100'); updateRunHud();
    }
    if (p.y > H + 55) {
      if (ts < j.introUntil) {
        p.x = j.safeCheckpoint.x; p.y = j.safeCheckpoint.y; p.vy = 0; p.grounded = true; p.dir = 0;
      } else { loseAttempt('O Peter caiu do caminho'); return; }
    }
    drawRunner();
    if (p.x >= j.finishX - 26) { phaseFinish(); return; }
    raf = requestAnimationFrame(loopRunner);
  }
  function drawRunner() {
    const j = state, p = j.player; drawBackground(j.camera, phase);
    drawWoodFloor(j.groundY, j.camera);
    for (const pit of j.pits) drawPit(pit, j.camera, j.groundY);
    for (const deco of j.decorations) { const sx = deco.x - j.camera; if (sx > -32 && sx < W + 32) drawFloorPlant(sx, j.groundY, deco.variant); }
    ctx.fillStyle = '#593e28'; ctx.font = 'bold 13px system-ui'; ctx.fillText('FASE ' + phase + ' · ' + phaseNames[phase].toUpperCase(), 14, 25);
    ctx.font = '11px system-ui'; ctx.fillText('TROPEÇOS ' + losses + '/' + MAX_LOSSES, 246, 25);
    if (phase === 2 && p.x < 500) {
      ctx.fillStyle = 'rgba(255,249,235,.94)'; ctx.fillRect(35, 43, 290, 34);
      ctx.strokeStyle = 'rgba(112,80,42,.26)'; ctx.strokeRect(35, 43, 290, 34);
      ctx.fillStyle = '#70502a'; ctx.font = 'bold 12px system-ui'; ctx.fillText('Primeiro salto: Espaço, ↑ ou toque PULAR', 47, 65);
    }
    for (const plat of j.platforms) { const x = plat.x - j.camera; if (x < W + 20 && x + plat.w > -20) { state.surfaceOffset = plat.surface || 0; drawTile(plat.tile, x, plat.y, plat.w, plat.h || 25, plat.route, plat.route === 'stair' ? plat.faceY : j.groundY); drawShelfSupports(plat, x); drawCakeBoxes(plat, x); } }
    for (const cup of j.shelters) { const sx = cup.x - j.camera; if (sx > -40 && sx < W + 40) drawCupShelter(sx, cup.groundY, false); }
    for (const it of j.items) if (!it.got) {
      const sx = it.x - j.camera;
      if (sx > -35 && sx < W + 35) {
        if (it.bonus) { ctx.globalAlpha = 0.78 + Math.sin(performance.now() / 170) * 0.18; drawAtlas('door', 0, 2, 1, sx - 20, it.y - 28, 40, 40); ctx.globalAlpha = 1; }
        else if (it.recovery) drawRecovery(sx, it.y, 30);
        else drawPickup(it.type, sx, it.y, 30);
      }
    }
    for (const e of j.enemies) if (e.alive) drawCritter(e, e.x - j.camera);
    for (const m of j.machines) {
      const camera = Number.isFinite(j.camera) ? j.camera : 0;
      if (Number.isFinite(m.x) && Number.isFinite(m.y)) drawCoffeeMaker(m.x - camera, m.y, m.timer);
    }
    for (const s of j.shots) {
      const sx = s.x - j.camera;
      ctx.save(); ctx.translate(sx, s.y); ctx.rotate(-.28);
      ctx.fillStyle = 'rgba(86,48,28,.18)'; ctx.beginPath(); ctx.ellipse(1, 5, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#815034'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(8, -3, 10, 2, 5, 7); ctx.quadraticCurveTo(0, 11, -5, 7); ctx.bezierCurveTo(-10, 2, -7, -3, 0, -10); ctx.fill();
      ctx.fillStyle = 'rgba(255,226,184,.8)'; ctx.beginPath(); ctx.ellipse(-2, 2, 2, 3, -.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    drawNuciferaSign(j.finishPlatformX + 4 - j.camera, j.groundY);
    const saraScreenX = j.sarinhaX - j.camera;
    const saraVisible = saraScreenX > -45 && saraScreenX < W + 45;
    if (saraVisible) drawSarinha(saraScreenX, j.groundY, .92);
    const blink = performance.now() < p.invulnerable && Math.floor(performance.now() / 95) % 2 === 0;
    const hidingCup = j.shelters.find(cup => Math.abs(p.x - cup.x) < cup.w * .42 && p.grounded && Math.abs(p.y - cup.groundY) < 5);
    if (!blink) {
      const clothSwing = !hidingCup && p.clothUntil > performance.now();
      const frame = clothSwing ? 2 : (p.grounded ? (p.dir ? 1 + Math.floor(j.walk / 5) % 3 : 0) : (p.vy < 0 ? 4 : 5));
      const attackDrawn = clothSwing && drawAttackCharacter(p.x - j.camera, p.y + 1, p.facing);
      if (!attackDrawn && hidingCup) drawCharacter(frame, hidingCup.x - j.camera, p.y + 1, 40, 52);
      else if (!attackDrawn) drawCharacter(frame, p.x - j.camera, p.y + 1, 58, 77, clothSwing ? p.facing : undefined);
    }
    for (const cup of j.shelters) {
      const sx = cup.x - j.camera;
      const hiding = isSheltered(j, p) && Math.abs(p.x - cup.x) < cup.w * .42;
      if (hiding && sx > -40 && sx < W + 40) drawCupShelter(sx, cup.groundY, true);
    }
    // Keep the opening balloon attached to Sarinha; let it leave the view as Peter passes her.
    if (saraVisible && saraScreenX >= 118 && saraScreenX <= W - 118)
      drawSarinhaBubble(j.introText, saraScreenX, j.groundY - 78 * .92 - 22, 220);
    else if (j.cueShown && Number.isFinite(j.cueX)) {
      const screenX = j.cueX - j.camera;
      if (screenX > -45 && screenX < W + 45) {
        drawSarinha(screenX, j.groundY, .92);
        // Give the player as much reading time as needed; leave only with the camera.
        if (screenX >= 8 && screenX <= W - 8)
          drawSarinhaBubble(j.cueText, screenX, j.groundY - 78 * .92 - 22, 220);
      }
    }
    ctx.fillStyle = '#704f30'; ctx.font = '10px system-ui';
    const nearCup = j.shelters.some(cup => Math.abs(cup.x - p.x) < 130);
    ctx.fillText(nearCup ? 'Xícara grande: fique dentro para se esconder' : 'Espaço/↑ pula · X dá uma toalhada · suba os degraus', 24, 481);
  }

  function enterBonus() {
    stopLoop(); resumeState = state; resumeState.running = false; mode = 'bonus';
    const returningPlayer = resumeState.player;
    const returnPlatforms = resumeState.platforms.filter(plat => returningPlayer.x + 14 > plat.x && returningPlayer.x - 14 < plat.x + plat.w && plat.y >= returningPlayer.y - 18 && plat.y <= returningPlayer.y + 100).sort((a, b) => a.y - b.y);
    let safePlatform = returnPlatforms[0];
    if (!safePlatform) {
      const groundPlatforms = resumeState.platforms.filter(plat => !plat.route).sort((a, b) => Math.abs((a.x + a.w / 2) - returningPlayer.x) - Math.abs((b.x + b.w / 2) - returningPlayer.x));
      safePlatform = groundPlatforms[0];
    }
    resumeState.bonusReturn = { x: safePlatform ? Math.max(safePlatform.x + 18, Math.min(safePlatform.x + safePlatform.w - 18, returningPlayer.x)) : resumeState.checkpoint, y: safePlatform ? safePlatform.y : resumeState.groundY };
    const platforms = [
      { x: 105, y: 468, w: 150, tile: 0 }, { x: 112, y: 404, w: 150, tile: 1 },
      { x: 143, y: 340, w: 150, tile: 2 }, { x: 88, y: 276, w: 155, tile: 3 },
      { x: 153, y: 212, w: 150, tile: 0 }, { x: 108, y: 148, w: 155, tile: 1 },
      { x: 142, y: 84, w: 150, tile: 2 }, { x: 96, y: 20, w: 160, tile: 3, route: 'summit' }
    ];
    const summitGoalX = platforms[platforms.length - 1].x + 10 + 51;
    state = { x: 180, y: 456, vy: -10.3, dir: 0, cam: 0, platforms, items: [], got: 0, target: 4, summitReached: false, summitGoalX, running: true, last: 0, grounded: false };
    for (let i = 1; i < platforms.length; i++) state.items.push({ id: 'bonus-' + i, x: platforms[i].x + platforms[i].w * .52, y: platforms[i].y - 22, got: !!rewards['bonus-' + i] });
    state.got = state.items.filter(it => it.got).length;
    say('Atalho da flor! Pegue morangos para o bônus.'); fx('bonus');
    raf = requestAnimationFrame(loopBonus);
  }
  function loopBonus(ts) {
    if (mode !== 'bonus' || !state || !state.running) return;
    const j = state, dt = Math.min((ts - (j.last || ts)) / 16.67 || 1, 2), oldY = j.y; j.last = ts;
    j.vy += 0.42 * dt; j.y += j.vy * dt; j.x += j.dir * 3.2 * dt;
    j.x = Math.max(16, Math.min(W - 16, j.x));
    if (j.vy > 0) for (const p of j.platforms) if (oldY + 12 <= p.y && j.y + 12 >= p.y && j.x > p.x - 10 && j.x < p.x + p.w + 10) { j.y = p.y - 12; j.vy = -10.3; j.grounded = false; if (p.route === 'summit') j.summitReached = true; break; }
    if (j.y - j.cam < 160) j.cam = j.y - 160;
    for (const it of j.items) if (!it.got && Math.abs(j.x - it.x) < 24 && Math.abs(j.y - it.y) < 25) { it.got = true; j.got++; awardOnce(it.id, 150); fx('collect'); }
    drawBonus(); setHud(score, j.got, j.got / j.target * 100, 'Bônus: pegue 4 morangos e alcance o poste no topo (' + j.got + '/' + j.target + ')');
    if (j.got >= j.target && j.summitReached && Math.abs(j.x - j.summitGoalX) < 34 && j.y <= 56) { finishBonus(true); return; }
    if (j.y - j.cam > H + 30) { finishBonus(false); return; }
    raf = requestAnimationFrame(loopBonus);
  }
  function drawBonus() {
    const j = state; drawBackground(0, 1); ctx.fillStyle = '#70502a'; ctx.font = 'bold 13px system-ui'; ctx.fillText('BÔNUS DA FLOR · +150 POR MORANGO', 14, 26);
    const summit = j.platforms.find(p => p.route === 'summit');
    if (summit) drawNuciferaSign(summit.x + 10, summit.y - j.cam + 25);
    for (const p of j.platforms) { const y = p.y - j.cam; if (y > -40 && y < H + 12) drawTile(p.tile, p.x, y, p.w, 25); }
    for (const it of j.items) if (!it.got) drawBerry(it.x, it.y - j.cam, 30);
    drawFlower(j.x, j.y - j.cam, 1.14);
  }
  function finishBonus(reachedSign) {
    stopLoop(); const earned = state.got; if (earned >= 3) { losses = Math.max(0, losses - 1); saveRun(); say('Bônus completo: recuperou um tropeço!'); }
    resumeState.score = phaseEarned;
    if (!reachedSign) say('Atalho encerrado; seus morangos bônus foram guardados.');
    else if (earned < 3) say('Morangos bônus guardados!');
    fx('bonus'); state = resumeState; resumeState = null;
    const safe = state.bonusReturn; delete state.bonusReturn;
    if (safe) { state.player.x = safe.x; state.player.y = safe.y; }
    state.player.vy = 0; state.player.grounded = true; state.player.groundedAt = performance.now(); state.player.dir = 0;
    state.camera = Math.max(0, state.player.x - 135); state.player.invulnerable = performance.now() + 1800;
    mode = 'runner'; state.running = true; updateRunHud();
    raf = requestAnimationFrame(loopRunner);
  }

  function phaseFinish() {
    stopBoostEffect();
    stopLoop(); mode = 'celebrate'; celebrationStart = performance.now(); celebrationNext = phase + 1;
    stopMusicVoices();
    const token = ++celebrationToken;
    clearTimeout(celebrationTimer);
    celebrationTier = score >= 12000 ? 'alta' : score >= 6000 ? 'media' : 'baixa';
    toastChimePlayed = false;
    celebrationDuration = phase >= MAX_PHASE ? 15084 : 4200;
    if (phase >= MAX_PHASE && nativeFinalPlayer) {
      nativeFinalActive = true; nativeFinalFinished = false; nativeFinalFailed = false;
      $('.app').inert = true; $('#pauseAction').disabled = true;
      $('#endingVideoScreen').hidden = false; $('#endingVideoFeedback').hidden = true;
      window.NuciferaStory.playEnding(celebrationTier);
      return;
    }
    if (phase >= MAX_PHASE) {
      const endingVideo = finaleVideos[celebrationTier];
      Object.values(finaleVideos).forEach((video) => { video.pause(); });
      endingVideo.__nuciUnavailable = false;
      if (Number.isFinite(endingVideo.duration) && endingVideo.duration > 0) celebrationDuration = Math.ceil(endingVideo.duration * 1000);
      try { endingVideo.currentTime = 0; } catch (e) { /* the video may not be ready yet */ }
      const playAttempt = endingVideo.play();
      if (playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(() => { endingVideo.__nuciUnavailable = true; });
    }
    // The supplied final carries its own score; keep the level jingle between levels.
    if (phase < MAX_PHASE || !finaleVideos[celebrationTier].__nuciHasSound) fx('phaseComplete');
    // Media ends on its own clock. This timeout only rescues an unavailable/stalled file.
    celebrationTimer = window.setTimeout(() => { if (mode === 'celebrate' && token === celebrationToken) finishCelebration(); }, celebrationDuration + (phase >= MAX_PHASE ? 15000 : 200));
    raf = requestAnimationFrame(loopCelebration);
  }
  function finishCelebration() {
    if (mode !== 'celebrate') return;
    stopLoop(); clearTimeout(celebrationTimer); celebrationTimer = 0; mode = 'transition';
    nativeFinalActive = false; $('#endingVideoScreen').hidden = true;
    $('#endingVideoFeedback').hidden = true; $('.app').inert = false;
    Object.values(finaleVideos).forEach((video) => { video.pause(); });
    if (phase >= MAX_PHASE) {
      mode = 'complete'; recordRun();
      const ending = celebrationTier === 'alta'
        ? ['O Brinde das Delícias', 'Peterzinho devolve a bandeja cheia de delícias e recebe o abraço da Sarinha. A confeitaria volta a atender e os dois comemoram na varanda, brindando com café a esta aventura e às próximas!']
        : celebrationTier === 'media'
          ? ['A Confeitaria Desperta', 'Peterzinho recupera uma bandeja de doces, e Sarinha diz que tem orgulho do esforço dele. Com um abraço e o apoio da mãe, ele ganha confiança para tentar novamente!']
          : ['Uma Vitrine de Esperança', 'Mesmo com poucas delícias recuperadas, Sarinha acolhe Peterzinho e agradece pelo esforço. Na próxima aventura, ele promete tentar salvar todas!'];
      showModal('Seu ranking pessoal', ending[1] + ' Pontuação: ' + score + '. Resultado salvo neste aparelho.', rankingRows());
    } else {
      phase = celebrationNext;
      // Each new level starts clean; stumbles from the previous level do not carry over.
      losses = 0;
      saveRun(); startPhase(); say('Fase ' + phase + ': ' + phaseNames[phase]);
    }
  }
  function loopCelebration(ts) {
    if (mode !== 'celebrate') return;
    drawCelebration(ts);
    const endingVideo = phase >= MAX_PHASE ? finaleVideos[celebrationTier] : null;
    const playingFinal = endingVideo && !endingVideo.__nuciUnavailable && endingVideo.readyState >= 2;
    if ((playingFinal && endingVideo.ended) || (!playingFinal && ts - celebrationStart > celebrationDuration)) {
      finishCelebration();
      return;
    }
    raf = requestAnimationFrame(loopCelebration);
  }
  function drawCinematicBackground(key, pan, dusk, alpha) {
    const im = images[key];
    ctx.save(); ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = '#f1dfc2'; ctx.fillRect(0, 0, W, H);
    if (imageReady(key)) {
      const cropW = Math.min(im.width, im.height * W / H), maxX = Math.max(0, im.width - cropW);
      const sx = maxX * Math.max(0, Math.min(1, pan === undefined ? .48 : pan));
      ctx.drawImage(im, sx, 0, cropW, im.height, 0, 0, W, H);
    }
    if (dusk > 0) {
      ctx.fillStyle = 'rgba(48,50,78,' + (.3 * dusk) + ')'; ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(W * .76, 210, 8, W * .76, 210, 220);
      glow.addColorStop(0, 'rgba(255,195,112,' + (.34 * dusk) + ')'); glow.addColorStop(1, 'rgba(255,195,112,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
  function drawCinemaPeter(frame, x, feet, width, height, faceLeft) {
    ctx.save();
    if (faceLeft) { ctx.translate(x * 2, 0); ctx.scale(-1, 1); }
    drawCharacter(frame, x, feet, width <= 2 ? width * 58 : width, height <= 2 ? height * 77 : height); ctx.restore();
  }
  function drawCinemaSara(x, feet, scale, sway) {
    if (!imageReady('sarinha')) return;
    ctx.save(); ctx.translate(x, feet); ctx.rotate(sway || 0); drawSarinha(0, 0, scale); ctx.restore();
  }
  function drawEndingTray(x, y, treats, t, glow) {
    ctx.save();
    ctx.fillStyle = 'rgba(61,41,25,.24)'; ctx.beginPath(); ctx.ellipse(x, y + 9, 38, 8, 0, 0, Math.PI * 2); ctx.fill();
    const plate = ctx.createLinearGradient(x - 32, y - 7, x + 32, y + 8); plate.addColorStop(0, '#fff7e6'); plate.addColorStop(1, '#dcc5a0');
    ctx.fillStyle = plate; ctx.strokeStyle = '#96734c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 34, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (glow) { ctx.globalAlpha = .28 + Math.sin(t * 4) * .12; ctx.fillStyle = '#ffe4a1'; ctx.beginPath(); ctx.ellipse(x, y - 4, 48, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    for (let i = 0; i < treats; i++) drawPickup((i * 3 + 2) % 8, x - ((treats - 1) * 11) / 2 + i * 11, y - 5 - Math.sin(t * 4 + i) * 2, 19);
    ctx.restore();
  }
  function drawEndingCounter(t, full) {
    ctx.save();
    ctx.fillStyle = 'rgba(79,48,30,.68)'; ctx.beginPath(); ctx.roundRect(40, 324, 280, 78, 8); ctx.fill();
    ctx.fillStyle = '#d4aa76'; ctx.beginPath(); ctx.roundRect(40, 321, 280, 17, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,220,.74)'; ctx.fillRect(50, 326, 260, 2);
    const count = full ? 8 : 3;
    for (let i = 0; i < count; i++) {
      const px = 67 + i * (226 / Math.max(1, count - 1));
      const bob = full ? Math.sin(t * 2.6 + i) * 2 : 0;
      drawPickup((i * 2 + 2) % 8, px, 374 + bob, 28);
    }
    const glow = ctx.createLinearGradient(0, 310, 0, 406); glow.addColorStop(0, 'rgba(255,236,180,0)'); glow.addColorStop(1, 'rgba(255,209,125,' + (full ? .23 + Math.sin(t * 3) * .08 : .08) + ')');
    ctx.fillStyle = glow; ctx.fillRect(40, 310, 280, 96); ctx.restore();
  }
  function drawCustomers(t, amount) {
    ctx.save(); ctx.globalAlpha = amount * .6;
    for (let i = 0; i < 3; i++) {
      const x = 44 + i * 40 + Math.max(0, Math.min(1, (t - 9 - i * .45) / 1.4)) * 14;
      const y = 306 + (i % 2) * 10;
      ctx.fillStyle = ['#6a5140', '#88705a', '#5b5346'][i];
      ctx.beginPath(); ctx.arc(x, y - 18, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y + 2, 13, 23, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawStringLights(t) {
    ctx.save(); ctx.strokeStyle = 'rgba(73,53,40,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 44); ctx.quadraticCurveTo(W * .48, 92, W + 10, 37); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const x = 8 + i * 49, y = 45 + Math.sin((x / W) * Math.PI) * 38;
      ctx.shadowColor = '#ffd47b'; ctx.shadowBlur = 8 + (Math.sin(t * 2.5 + i) + 1) * 5;
      ctx.fillStyle = i % 2 ? '#ffe4a0' : '#fff0c4'; ctx.beginPath(); ctx.arc(x, y, 3.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drawEndingTable(x, y, w, h) {
    if (!imageReady('props')) return;
    const prop = images.props, half = prop.width / 2;
    ctx.drawImage(prop, 0, 0, half, prop.height, x, y, w, h);
  }
  function drawToastSteam(x, y, t) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,247,224,.88)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const rise = (t * 17 + i * 13) % 18;
      ctx.beginPath(); ctx.moveTo(x + i * 5, y - rise); ctx.bezierCurveTo(x - 4 + i * 5, y - 5 - rise, x + 7 + i * 5, y - 10 - rise, x + 2 + i * 5, y - 16 - rise); ctx.stroke();
    }
    ctx.restore();
  }
  function drawToastSpark(x, y, t) {
    const fade = Math.max(0, 1 - Math.abs(t - 19.1) / .65); if (!fade) return;
    ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = '#fff2c0'; ctx.shadowColor = '#ffe4a1'; ctx.shadowBlur = 12;
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 10, y + Math.sin(a) * 8, 2, 6, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawEndingCaption(text, t, start, end) {
    if (t < start || t > end) return;
    const alpha = Math.min(1, (t - start) / .35, (end - t) / .35);
    ctx.save(); ctx.globalAlpha = Math.max(0, alpha); ctx.fillStyle = 'rgba(255,250,240,.94)'; ctx.strokeStyle = 'rgba(177,135,88,.72)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(16, 420, W - 32, 60, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#624322'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    const words = text.split(' '), lines = []; let line = '';
    for (const word of words) { const next = line ? line + ' ' + word : word; if (ctx.measureText(next).width > W - 58 && line) { lines.push(line); line = word; } else line = next; }
    if (line) lines.push(line); lines.slice(0, 2).forEach((part, i) => ctx.fillText(part, W / 2, 444 + i * 17));
    ctx.restore();
  }
  function drawFinalCinematic(t) {
    const video = finaleVideos[celebrationTier];
    if (video && !video.__nuciUnavailable && video.readyState >= 2) {
      ctx.fillStyle = '#f6f1dc'; ctx.fillRect(0, 0, W, H);
      const scale = Math.min(W / video.videoWidth, H / video.videoHeight);
      const videoWidth = video.videoWidth * scale, videoHeight = video.videoHeight * scale;
      const videoX = (W - videoWidth) / 2, videoY = (H - videoHeight) / 2;
      try { ctx.drawImage(video, videoX, videoY, videoWidth, videoHeight); }
      catch (e) { video.__nuciUnavailable = true; }
      if (!video.__nuciUnavailable) {
        if (t > 3.2) {
          ctx.save(); ctx.fillStyle = 'rgba(68,45,28,.58)'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
          ctx.fillText('Toque ou pressione para pular', W - 12, H - 12); ctx.restore();
        }
        return;
      }
    }
    const tier = celebrationTier, progress = Math.min(1, t / (celebrationDuration / 1000));
    const title = tier === 'alta' ? 'O BRINDE DAS DELÍCIAS' : tier === 'media' ? 'A CONFEITARIA DESPERTA' : 'UMA VITRINE DE ESPERANÇA';
    if (tier === 'baixa') {
      drawCinematicBackground('kitchen', .36 + Math.min(1, t / 12) * .14, .04, 1);
      drawEndingCounter(t, false);
      const enter = Math.max(0, Math.min(1, (t - .7) / 2.5));
      const peterX = -28 + enter * 124, saraX = 285 - Math.max(0, Math.min(1, (t - 4.4) / 2.1)) * 46;
      const frame = enter < 1 ? 1 + Math.floor(t * 5) % 3 : (t > 6.5 && t < 7.2 ? 2 : 0);
      drawCinemaSara(saraX, 411, 1.03, Math.sin(t * 2.2) * .018);
      drawCinemaPeter(frame, peterX, 414 + (enter < 1 ? Math.abs(Math.sin(t * 8)) * 3 : 0), .94, 1.0, false);
      const trayX = Math.min(180, -15 + Math.max(0, t - 1) * 50), trayY = 330 - Math.sin(Math.min(1, t / 3) * Math.PI) * 18;
      if (t > 1.2 && t < 5.3) drawEndingTray(trayX, trayY, 3, t, false);
      if (t > 5.6) drawEndingTray(185, 341 + Math.sin(t * 2) * 1.5, 3, t, true);
      drawEndingCaption('A vitrine voltou a brilhar com cada delícia recuperada.', t, 1, 4.2);
      drawEndingCaption('Algumas ainda se esconderam pelo caminho...', t, 4.35, 7.3);
      drawEndingCaption('Sarinha sorri: “Na próxima, a gente busca mais!”', t, 7.45, 10.4);
      drawEndingCaption('Toda aventura já deixa a casa um pouco mais doce.', t, 10.55, 12.75);
    } else if (tier === 'media') {
      const cross = Math.max(0, Math.min(1, (t - 8.4) / 1.8));
      drawCinematicBackground('kitchen', .34 + Math.min(1, t / 17) * .13, 0, 1);
      if (cross > 0) drawCinematicBackground('background', .55 + Math.min(1, (t - 8.4) / 8) * .18, .03, cross);
      const arrive = Math.max(0, Math.min(1, (t - .6) / 3.6));
      const peterX = -25 + arrive * 140, saraX = 275 - Math.max(0, Math.min(1, (t - 6.1) / 2.2)) * 42;
      drawEndingCounter(t, t > 7.2);
      drawCinemaSara(saraX, 411, 1.02, Math.sin(t * 2.4) * .018);
      drawCinemaPeter(arrive < 1 ? 1 + Math.floor(t * 5) % 3 : 0, peterX, 414, .96, 1, false);
      const trayX = Math.min(178, -18 + Math.max(0, t - 1) * 53), trayY = 330 - Math.sin(Math.min(1, t / 3.2) * Math.PI) * 18;
      if (t > .9 && t < 5.5) drawEndingTray(trayX, trayY, 7, t, t > 4.2);
      if (t > 5.5) drawEndingTray(186, 341, 8, t, true);
      if (cross > .25) drawCustomers(t, cross);
      drawEndingCaption('Peter traz a última bandeja para o balcão...', t, 1, 4.4);
      drawEndingCaption('Sarinha acende as luzes da vitrine.', t, 4.55, 8);
      drawEndingCaption('As portas se abrem para os primeiros clientes!', t, 8.2, 12.3);
      drawEndingCaption('Uma manhã doce, feita em equipe.', t, 12.45, 16.7);
    } else {
      const cut = Math.max(0, Math.min(1, (t - 9.1) / 2.2));
      drawCinematicBackground('kitchen', .36 + Math.min(1, t / 10) * .1, 0, 1);
      if (cut > 0) drawCinematicBackground('background', .54 + Math.max(0, t - 10) / 16 * .18, 1, cut);
      const standAlpha = 1 - cut;
      if (standAlpha > .01) {
        drawEndingCounter(t, t > 5.6);
        const arrival = Math.max(0, Math.min(1, (t - .4) / 3.1));
        const peterX = -26 + arrival * 139;
        drawCinemaSara(269, 411, 1.02, Math.sin(t * 2.1) * .02);
        drawCinemaPeter(arrival < 1 ? 1 + Math.floor(t * 6) % 3 : 0, peterX, 414, .97, 1, false);
        const trayX = Math.min(178, -18 + Math.max(0, t - .7) * 60), trayY = 329 - Math.sin(Math.min(1, t / 3) * Math.PI) * 18;
        if (t > .7 && t < 6.4) drawEndingTray(trayX, trayY, 8, t, false);
        if (t > 6.4) drawEndingTray(184, 340, 8, t, true);
      }
      if (cut > .72 && imageReady('toastPeter') && imageReady('saraToast')) {
        const seatIn = Math.min(1, (cut - .72) / .28), bob = Math.sin(t * 2.1) * 1.5;
        const clink = Math.max(0, Math.min(1, (t - 17.6) / .85));
        const pX = 104 + clink * 7, pY = 205 - bob - clink * 4, pW = 87, pH = 218;
        const sX = 164 - clink * 7, sY = 182 - bob + clink * 3, sW = 145, sH = 220;
        ctx.save(); ctx.globalAlpha = seatIn;
        // Chairs and the raised coffee cups are part of each consistent character cutout.
        ctx.drawImage(images.toastPeter, pX, pY, pW, pH);
        ctx.drawImage(images.saraToast, sX, sY, sW, sH);
        ctx.restore();
        drawEndingTable(78, 322, 204, 98);
        ctx.save(); ctx.beginPath(); ctx.rect(78, 322, 204, 43); ctx.clip();
        ctx.globalAlpha = seatIn; drawEndingTable(78, 322, 204, 98); ctx.restore();
        if (t > 13.2) { drawToastSteam(pX + 63, pY + 46, t); drawToastSteam(sX + 50, sY + 59, t + 1.3); }
        drawToastSpark(193, 241, t);
        if (t > 18 && t < 20 && !toastChimePlayed) { toastChimePlayed = true; fx('toast'); }
      }
      if (cut > .12) drawStringLights(t);
      drawEndingCaption('A última guloseima encontra seu lugar...', t, 1, 4.4);
      drawEndingCaption('A Nucífera abre cheia de sabores.', t, 4.55, 8.1);
      drawEndingCaption('Quando o dia termina, o ritmo desacelera...', t, 8.25, 12.1);
      drawEndingCaption('Sarinha e Peter se sentam na varanda.', t, 12.2, 17.25);
      drawEndingCaption('E brindam com café às aventuras que virão.', t, 17.3, 23.5);
    }
    ctx.save(); ctx.globalAlpha = Math.min(1, t / .6); ctx.fillStyle = 'rgba(68,45,28,.62)'; ctx.beginPath(); ctx.roundRect(20, 19, W - 40, 38, 18); ctx.fill();
    ctx.fillStyle = '#fff7e8'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText(title, W / 2, 44); ctx.restore();
    if (t > 3.2) { ctx.save(); ctx.fillStyle = 'rgba(255,250,239,.7)'; ctx.font = '10px system-ui'; ctx.textAlign = 'right'; ctx.fillText('Toque ou pressione para pular', W - 12, 76); ctx.restore(); }
    const fadeStart = (celebrationDuration / 1000) - .55;
    if (t > fadeStart) { ctx.fillStyle = 'rgba(246,241,220,' + Math.min(1, (t - fadeStart) / .55) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  function drawCelebration(ts) {
    const t = (ts - celebrationStart) / 1000, im = images.background, finalScene = phase >= MAX_PHASE;
    if (finalScene) { drawFinalCinematic(t); return; }
    ctx.fillStyle = '#ead5b5'; ctx.fillRect(0, 0, W, H);
    if (imageReady('background')) {
      const sx = Math.max(0, im.width * 0.48), sw = Math.min(im.width - sx, im.height * 0.72);
      ctx.drawImage(im, sx, 0, sw, im.height, 0, 0, W, H);
    }
    ctx.fillStyle = 'rgba(60,39,22,.12)'; ctx.fillRect(0, 0, W, H);
    drawWoodFloor(430, 0);
    if (finalScene && celebrationTier !== 'baixa') {
      const glow = ctx.createRadialGradient(W / 2, 218, 12, W / 2, 218, celebrationTier === 'alta' ? 260 : 205);
      glow.addColorStop(0, celebrationTier === 'alta' ? 'rgba(255,225,150,.52)' : 'rgba(255,236,190,.30)');
      glow.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    }
    const enter = Math.min(1, Math.max(0, t / 0.9));
    // Land the table and the seated Peter at matching centers, with the tabletop crossing his lap.
    const tableX = 93 - (1 - enter) * 150, peterX = 14 + (1 - enter) * 282, tableY = 228;
    const prop = images.props, cw = prop.width / 2;
    if (imageReady('props')) ctx.drawImage(prop, 0, 0, cw, prop.height, tableX, tableY, 215, 202);
    if (t > 0.95 && imageReady('toastPeter')) {
      const alpha = Math.min(1, (t - 0.95) / 0.4); ctx.globalAlpha = alpha;
      // The seated illustration already includes its folding chair, so it arrives as one coherent silhouette.
      const toastLift = finalScene && celebrationTier === 'alta' ? Math.sin(t * 7) * 4 : finalScene && celebrationTier === 'media' ? Math.sin(t * 3) * 1.5 : 0;
      ctx.drawImage(images.toastPeter, 0, 0, images.toastPeter.width, images.toastPeter.height, peterX, 196 - toastLift, 160, 234);
      ctx.globalAlpha = 1;
    }
    if (imageReady('props')) {
      // Keep the tabletop in front of Peter's lap; both pieces of furniture land on the floor line.
      ctx.save(); ctx.beginPath(); ctx.rect(tableX, tableY, 215, 100); ctx.clip();
      ctx.drawImage(prop, 0, 0, cw, prop.height, tableX, tableY, 215, 202); ctx.restore();
    }
    ctx.fillStyle = '#fff8e8'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    const title = !finalScene ? 'FASE ' + phase + ' CONCLUÍDA!' : celebrationTier === 'alta' ? 'A GRANDE FESTA DA NUCÍFERA!' : celebrationTier === 'media' ? 'UM BRINDE ESPECIAL!' : 'UM FINAL PARA GUARDAR!';
    ctx.fillText(title, W / 2, 63);
    if (finalScene) {
      const count = celebrationTier === 'alta' ? 42 : celebrationTier === 'media' ? 20 : 7;
      for (let i = 0; i < count; i++) {
        const speed = celebrationTier === 'alta' ? 68 : celebrationTier === 'media' ? 46 : 30;
        const x = ((i * 67 + Math.sin(t * 1.7 + i) * (celebrationTier === 'alta' ? 38 : 20)) % W + W) % W;
        const y = ((t * speed + i * 83) % (H + 25)) - 12;
        ctx.fillStyle = ['#e9a08a', '#f5d890', '#fff2c8', '#8d9e70'][i % 4];
        ctx.beginPath();
        if (celebrationTier === 'media' && i % 2 === 0) ctx.arc(x, y, 3 + i % 3, 0, Math.PI * 2);
        else ctx.ellipse(x, y, 3 + i % 3, 5, Math.sin(i + t), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.textAlign = 'left';
    const fadeStart = (celebrationDuration / 1000) - 0.65;
    const fade = Math.max(0, Math.min(1, (t - fadeStart) / 0.65)); ctx.fillStyle = 'rgba(246,241,220,' + fade + ')'; ctx.fillRect(0, 0, W, H);
  }

  $('#pauseAction').addEventListener('click', () => {
    if (userPaused || suspended || !state || !['climb','runner','bonus','race','race-finish','celebrate'].includes(mode) || nativeFinalActive) return;
    userPaused = true; suspendGame();
    $('#pauseScreen').hidden = false;
    $('.app').inert = true;
    $('#resumeAdventure').focus();
  });
  $('#resumeAdventure').addEventListener('click', () => {
    userPaused = false; $('#pauseScreen').hidden = true; $('.app').inert = false;
    resumeGame(); $('#pauseAction').focus();
  });
  $('#journeyReset').addEventListener('click', () => {
    if (suspended || mode === 'celebrate' || nativeFinalActive) return;
    newCampaign(); say('Uma nova jornada começa no jardim!');
  });
  $('#saveNickname').addEventListener('click', () => {
    const clean = $('#nicknameInput').value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    if (!clean) { $('#nicknameNote').textContent = 'Digite um apelido para aparecer no placar.'; return; }
    write('nuciPlayerName', clean); $('#nicknameInput').value = clean;
    if (read('nuciLastRunNeedsName', '0') === '1') {
      const board = JSON.parse(read('nuciLocalBoard', '[]') || '[]');
      const latest = board.find((entry) => entry.id === read('nuciLastRunId', ''));
      if (latest) { latest.name = clean; write('nuciLocalBoard', JSON.stringify(board)); }
      write('nuciLastRunNeedsName', '0');
    }
    $('#nicknameNote').textContent = 'Apelido salvo para este e os próximos resultados deste aparelho.';
    if ($('#modalTitle').textContent === 'Seu ranking pessoal') $('#scoreList').innerHTML = rankingRows();
  });
  $('#close').addEventListener('click', () => {
    hideModal();
    if (mode === 'over') { continueRun(); return; }
    if (mode === 'complete' || mode === 'phase-error') { newCampaignIfComplete(); return; }
    if (mode === 'runner') { state.last = 0; state.running = true; raf = requestAnimationFrame(loopRunner); }
    else if (mode === 'climb') { state.last = 0; state.running = true; raf = requestAnimationFrame(loopClimb); }
    else if (mode === 'bonus') { state.last = 0; state.running = true; raf = requestAnimationFrame(loopBonus); }
    else if (mode === 'race' || mode === 'race-finish') { state.last = 0; state.running = true; raf = requestAnimationFrame(loopRace); }
  });
  function newCampaignIfComplete() {
    if (mode === 'complete') newCampaign(); else startPhase();
  }
  function setDirection(direction) {
    if (!state || (direction && (suspended || !$('#modal').classList.contains('hide')))) return;
    if (mode === 'race') { if (direction) NuciferaRace.move(state.race, direction); return; }
    if (state.player) state.player.dir = direction;
    else state.dir = direction;
    document.querySelectorAll('[data-dir]').forEach((button) => button.classList.toggle('active', direction !== 0 && +button.dataset.dir === direction));
  }
  document.querySelectorAll('[data-dir]').forEach((button) => {
    const direction = +button.dataset.dir;
    const down = (event) => {
      event.preventDefault(); startAudio();
      if (event.pointerType === 'mouse') {
        const current = state && state.player ? state.player.dir : state && state.dir;
        setDirection(current === direction ? 0 : direction);
      } else {
        setDirection(direction); try { button.setPointerCapture(event.pointerId); } catch (e) {}
      }
    };
    const up = (event) => { if (event.pointerType !== 'mouse') setDirection(0); };
    button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up);
    button.addEventListener('pointerleave', up); button.addEventListener('pointercancel', up);
  });
  function suspendGame() {
    setDirection(0);
    if (suspended) return;
    suspended = true; suspendedAt = performance.now(); stopLoop(); stopMusicVoices(); stopBoostEffect(); saveRun();
    if (openingPresentationFrame) cancelAnimationFrame(openingPresentationFrame);
    openingPresentationFrame = 0; openingPresentationLast = 0;
    clearTimeout(celebrationTimer);
    Object.values(finaleVideos).forEach(video => video.pause());
    if (openingVideoActive) {
      openingVideoAttempt++; openingVideo.pause();
    }
    if (audio && audio.state === 'running') audio.suspend().catch(() => {});
  }
  function resumeGame() {
    if (!suspended || userPaused || lifecycleSuspended || document.hidden) return;
    const delay = performance.now() - suspendedAt; suspended = false;
    scheduleOpeningPresentation();
    if (state) {
      state.last = 0;
      if (state.introUntil) state.introUntil += delay;
      if (state.player) for (const key of ['invulnerable','clothUntil','clothCooldown','jumpBufferUntil','groundedAt']) if (state.player[key]) state.player[key] += delay;
      for (const enemy of state.enemies || []) if (enemy.hopAt) enemy.hopAt += delay;
    }
    startAudio();
    if (mode === 'story-video' && openingVideoActive) {
      if (openingVideoFinished || openingVideo.ended) finishOpeningVideo();
      else playOpeningVideo();
    } else if (mode === 'celebrate') {
      celebrationStart += delay;
      if (nativeFinalActive) {
        if (nativeFinalFinished) finishCelebration();
        else if (nativeFinalFailed) $('#endingVideoFeedback').hidden = false;
        return;
      }
      if (phase >= MAX_PHASE) finaleVideos[celebrationTier].play().catch(() => {});
      const endingVideo = phase >= MAX_PHASE ? finaleVideos[celebrationTier] : null;
      const remaining = endingVideo && !endingVideo.__nuciUnavailable && Number.isFinite(endingVideo.duration)
        ? (endingVideo.duration - endingVideo.currentTime) * 1000
        : celebrationDuration - (performance.now() - celebrationStart);
      celebrationTimer = setTimeout(finishCelebration, Math.max(0, remaining) + (endingVideo ? 15000 : 200));
      raf = requestAnimationFrame(loopCelebration);
    } else if (state && state.running && $('#modal').classList.contains('hide')) {
      raf = requestAnimationFrame(mode === 'runner' ? loopRunner : mode === 'climb' ? loopClimb : mode === 'bonus' ? loopBonus : loopRace);
    }
  }
  function pauseForLifecycle() { lifecycleSuspended = true; suspendGame(); }
  function resumeForLifecycle() { lifecycleSuspended = false; resumeGame(); }
  // Native lifecycle handles focus; switching to a video surface must not pause the story.
  if (!document.body.classList.contains('nuci-native')) {
    window.addEventListener('blur', pauseForLifecycle);
    window.addEventListener('focus', resumeForLifecycle);
  }
  // Android lifecycle events preserve progress/audio when the app leaves the foreground.
  window.addEventListener('nuci:pause', pauseForLifecycle);
  window.addEventListener('nuci:resume', resumeForLifecycle);
  document.addEventListener('visibilitychange', () => document.hidden ? pauseForLifecycle() : resumeForLifecycle());
  $('#jumpAction').addEventListener('pointerdown', (event) => { event.preventDefault(); useAction(); });
  const clothAction = $('#clothAction');
  if (clothAction) clothAction.addEventListener('pointerdown', (event) => { event.preventDefault(); useTowel(); });
  canvas.addEventListener('pointerdown', (event) => {
    if (!suspended && !nativeFinalActive && mode === 'celebrate' && phase >= MAX_PHASE && performance.now() - celebrationStart > 1500) {
      event.preventDefault(); finishCelebration();
    }
  });
  let swipeStart = null;
  canvas.addEventListener('pointerdown', event => { if (mode === 'race') swipeStart = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener('pointerup', event => {
    if (mode === 'race' && swipeStart && Math.abs(event.clientX - swipeStart.x) > 28 && Math.abs(event.clientX - swipeStart.x) > Math.abs(event.clientY - swipeStart.y)) setDirection(Math.sign(event.clientX - swipeStart.x));
    swipeStart = null;
  });
  canvas.addEventListener('pointercancel', () => { swipeStart = null; });
  window.addEventListener('keydown', (event) => {
    if (mode === 'story-video' || suspended || nativeFinalActive) return;
    if (mode === 'race' && event.repeat) return;
    if (!$('#modal').classList.contains('hide') || event.target && /INPUT|TEXTAREA/.test(event.target.tagName)) return;
    if (mode === 'celebrate' && phase >= MAX_PHASE && [' ', 'Enter', 'Escape'].includes(event.key) && performance.now() - celebrationStart > 1500) {
      event.preventDefault(); finishCelebration(); return;
    }
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setDirection(-1);
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setDirection(1);
    if (event.key === ' ' || event.key === 'ArrowUp') { event.preventDefault(); useAction(); }
    if (event.key.toLowerCase() === 'x' || event.key.toLowerCase() === 'f') { event.preventDefault(); useTowel(); }
  });
  window.addEventListener('keyup', (event) => { if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(event.key) || ['A','D'].includes(event.key)) setDirection(0); });

  window.addEventListener('nuci:ending-ended', () => {
    if (!nativeFinalActive) return;
    nativeFinalFinished = true;
    if (!suspended) finishCelebration();
  });
  window.addEventListener('nuci:ending-error', () => {
    if (!nativeFinalActive) return;
    nativeFinalFailed = true;
    if (!suspended) $('#endingVideoFeedback').hidden = false;
  });
  $('#retryEndingVideo').addEventListener('click', () => {
    if (!nativeFinalActive || suspended) return;
    nativeFinalFailed = false; $('#endingVideoFeedback').hidden = true;
    window.NuciferaStory.playEnding(celebrationTier);
  });
  $('#continueAfterEndingError').addEventListener('click', () => {
    if (nativeFinalActive && nativeFinalFailed && !suspended) finishCelebration();
  });

  // Measure actual viewport and surrounding content, rather than assuming a phone size.
  let fitRequested = false;
  function schedulePlayfieldFit() {
    if (!document.body.classList.contains('nuci-native') || fitRequested) return;
    fitRequested = true;
    requestAnimationFrame(() => { fitRequested = false; fitPlayfield(); });
  }
  function fitPlayfield() {
    const app = $('.app'), field = $('#platform');
    if (app.hidden) return;
    const viewportHeight = Math.floor(window.visualViewport ? window.visualViewport.height : window.innerHeight);
    app.style.height = viewportHeight + 'px';
    const style = getComputedStyle(app);
    const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    let surrounding = 0;
    for (const child of app.children) {
      if (child === field || child.hidden) continue;
      const childStyle = getComputedStyle(child);
      if (childStyle.display === 'none') continue;
      surrounding += child.getBoundingClientRect().height + parseFloat(childStyle.marginTop) + parseFloat(childStyle.marginBottom);
    }
    const buttons = $('.jumpControls'), buttonsStyle = getComputedStyle(buttons);
    const available = app.clientHeight - paddingY - surrounding - buttons.offsetHeight - parseFloat(buttonsStyle.marginTop) - 3;
    const width = Math.floor(Math.min(420, app.clientWidth - paddingX, Math.max(1, available) * W / H));
    if (field.style.width !== width + 'px') field.style.width = width + 'px';
    $('#pauseAction').style.width = $('#jumpAction').getBoundingClientRect().width + 'px';
  }
  window.addEventListener('resize', schedulePlayfieldFit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', schedulePlayfieldFit);
  if (window.ResizeObserver && document.body.classList.contains('nuci-native')) {
    const layoutObserver = new ResizeObserver(schedulePlayfieldFit);
    for (const child of $('.app').children) if (child.id !== 'platform' && !child.classList.contains('controls')) layoutObserver.observe(child);
  }

  function showOpeningVideoProblem(message) {
    if (!openingVideoActive || suspended) return;
    $('#storyVideoMessage').textContent = message;
    $('#storyVideoFeedback').hidden = false;
  }
  function playOpeningVideo() {
    if (!openingVideoActive || suspended) return;
    const attempt = ++openingVideoAttempt;
    $('#intro').classList.add('hide'); $('#intro').hidden = true;
    $('#storyScreen').classList.add('hide'); $('#storyScreen').hidden = true;
    $('#storyVideoScreen').hidden = false;
    $('#storyVideoFeedback').hidden = true;
    openingVideo.muted = false; openingVideo.volume = OUTPUT_VOLUME;
    try {
      if (nativeOpeningPlayer) {
        window.NuciferaStory.play();
        return;
      }
      const playing = openingVideo.play();
      if (playing) playing.catch(error => {
        if (attempt !== openingVideoAttempt || !openingVideoActive || suspended) return;
        console.warn('Não foi possível iniciar o vídeo de abertura.', error);
        showOpeningVideoProblem('O vídeo não começou. Toque em Reproduzir vídeo para assistir.');
      });
    } catch (error) {
      console.warn('Não foi possível iniciar o vídeo de abertura.', error);
      showOpeningVideoProblem('O vídeo não começou. Toque em Reproduzir vídeo para assistir.');
    }
  }
  function finishOpeningVideo() {
    if (!openingVideoActive) return;
    openingVideoFinished = true;
    // Finishing in the background must not start a phase before the player returns.
    if (suspended) return;
    openingVideoActive = false; openingVideoAttempt++;
    openingVideo.pause();
    $('#storyVideoScreen').hidden = true;
    $('#storyVideoFeedback').hidden = true;
    for (const selector of ['#platform', '.controls', '#journeyReset']) $(selector).inert = false;
    mode = 'transition';
    startPhase();
    playMusicStep();
    say('A aventura começou. Boa sorte, Peterzinho!');
  }
  openingVideo.addEventListener('ended', finishOpeningVideo);
  window.addEventListener('nuci:story-ended', finishOpeningVideo);
  window.addEventListener('nuci:story-error', () => {
    showOpeningVideoProblem('Não foi possível reproduzir o vídeo. Tente novamente ou continue para as fases.');
  });
  openingVideo.addEventListener('playing', () => {
    if (suspended || !openingVideoActive) { openingVideo.pause(); return; }
    $('#storyVideoFeedback').hidden = true;
  });
  openingVideo.addEventListener('error', () => {
    showOpeningVideoProblem('Não foi possível carregar o vídeo. Tente reproduzir novamente ou continue para as fases.');
  });
  $('#retryStoryVideo').addEventListener('click', () => {
    if (!openingVideoActive) return;
    if (openingVideo.error) openingVideo.load();
    playOpeningVideo();
  });
  $('#continueAfterVideoError').addEventListener('click', finishOpeningVideo);
  $('#startAdventure').addEventListener('click', () => {
    if ($('#startAdventure').disabled || openingVideoActive) return;
    $('#startAdventure').disabled = true;
    if (openingPresentationFrame) cancelAnimationFrame(openingPresentationFrame);
    openingPresentationFrame = 0; openingPresentationStage = 'complete';
    openingActive = false; mode = 'story-video'; stopLoop(); stopMusicVoices();
    openingVideoActive = true; openingVideoFinished = false;
    openingVideo.currentTime = 0;
    for (const selector of ['#intro', '#storyScreen', '#platform', '.controls', '#journeyReset']) $(selector).inert = true;
    const clickedAt = performance.now();
    // A suspended Web Audio promise cannot hold up the separate video player.
    startAudio().then(ready => {
      if (ready && openingVideoActive && !suspended && performance.now() - clickedAt < 200) playEffect('startClick');
    }).catch(() => {});
    // Call within the tap. Android sequences its local player after the click cue.
    playOpeningVideo();
  });
  $('#retryOpeningAssets').addEventListener('click', () => {
    $('#openingLoadError').hidden = true;
    for (const image of openingImages) {
      if (!image.naturalWidth) image.src = image.getAttribute('src').split('?')[0] + '?retry=' + Date.now();
    }
    prepareOpeningPresentation();
  });
  if (directRace) {
    openingActive = false;
    $('#intro').classList.add('hide'); $('#storyScreen').classList.add('hide');
    $('#storyVideoScreen').hidden = true;
    startPhase();
  } else prepareOpeningPresentation();
})();
