/**
 * ============================================================================
 * CELLULE D'ENQUÊTE pHARe - COLLÈGE DE BIGUGLIA (4ème)
 * SCRIPT JS D'INVESTIGATION ET RÈGLES DE JEU GLOBALES
 * ============================================================================
 */

(function () {
  'use strict';

  // --- ÉTAT GLOBAL DU JEU ---
  const state = {
    teamName: 'Brigade pHARe Biguglia',
    totalSeconds: 40 * 60, // 40 minutes
    remainingSeconds: 40 * 60,
    timerInterval: null,
    isTimerRunning: false,
    soundEnabled: true,
    digits: {
      1: null, // Énigme 1 (Tri des faits) -> 3
      2: null, // Énigme 2 (Loi 2022) -> 4
      3: null, // Énigme 3 (Vidéo « Des Héros ») -> 2
      4: null  // Énigme 4 (Ligne 3018) -> 8
    },
    selectedTrack: 1, // 1: Escape Game (4 clés), 2: 3 Dossiers Complexes, 3: Affiche (7ème Regard)
    p3SelectedEye: 2, // Œil sélectionné par défaut
    solvedEnigmas: {
      1: false,
      2: false,
      3: false,
      4: false,
      complex: false, // Parcours 2
      poster: false   // Parcours 3
    },
    enteredPin: '',
    dialedNumber: ''
  };

  // --- SYNTHÉTISEUR AUDIO WEB AUDIO API ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!state.soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;

      if (type === 'click') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'dtmf') {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.frequency.setValueAtTime(697, now);
        osc2.frequency.setValueAtTime(1209, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.12);
        osc2.stop(now + 0.12);
      } else if (type === 'success') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.15, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.35);
        });
      } else if (type === 'error') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'victory') {
        const notes = [440, 554.37, 659.25, 880, 783.99, 880];
        const times = [0, 0.15, 0.3, 0.45, 0.7, 0.9];
        const durs = [0.12, 0.12, 0.12, 0.22, 0.18, 0.6];
        notes.forEach((freq, idx) => {
          const t = now + times[idx];
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + durs[idx]);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(t);
          osc.stop(t + durs[idx]);
        });
      }
    } catch (e) {
      console.warn('Audio non initialisé:', e);
    }
  }

  // --- GESTION DU COMPTE À REBOURS ---
  function updateTimerDisplay() {
    const minutes = Math.floor(state.remainingSeconds / 60);
    const seconds = state.remainingSeconds % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const timeDisplayEl = document.getElementById('time-display');
    const timerBoxEl = document.getElementById('timer-box');
    
    if (timeDisplayEl) {
      timeDisplayEl.textContent = formatted;
    }

    if (timerBoxEl) {
      if (state.remainingSeconds <= 300) {
        timerBoxEl.classList.add('warning');
      } else {
        timerBoxEl.classList.remove('warning');
      }
    }

    const elapsed = state.totalSeconds - state.remainingSeconds;
    const percent = Math.min(100, Math.max(5, Math.round((elapsed / state.totalSeconds) * 100)));
    
    const fillEl = document.getElementById('threat-progress-fill');
    const labelEl = document.getElementById('threat-percentage');
    if (fillEl) fillEl.style.width = `${percent}%`;
    if (labelEl) labelEl.textContent = `Progression du téléversement : ${percent}%`;

    if (state.remainingSeconds <= 0) {
      clearInterval(state.timerInterval);
      state.isTimerRunning = false;
      playSound('error');
      alert("⚠️ Le temps imparti est écoulé ! Mais le déverrouillage de secours reste actif. Continuez la saisie pour protéger l'élève !");
    }
  }

  function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.isTimerRunning = true;
    state.timerInterval = setInterval(() => {
      if (state.remainingSeconds > 0) {
        state.remainingSeconds--;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      state.isTimerRunning = false;
    }
  }

  // --- GESTION DES ÉCRANS ET ONGLETS ---
  function showScreen(screenId) {
    document.querySelectorAll('.screen-view').forEach(sc => sc.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
  }

  function showEnigmaTab(tabId) {
    document.querySelectorAll('.enigma-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');

    const targetBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- CONFIGURATION DES 3 PARCOURS PÉDAGOGIQUES ---
  const TRACK_INFOS = {
    1: {
      name: "Parcours 1 : Opération Stop-Meute (Escape Game en 4 clés)",
      badge: "Parcours 1 • Escape Game (4 Clés)",
      defaultTab: "tab-p1-enigma-1",
      tabs: [
        { id: "tab-p1-enigma-1", num: "CLÉ 1", title: "⚖️ Le Tri des Faits", badgeId: "badge-1", defaultBadge: "À résoudre" },
        { id: "tab-p1-enigma-2", num: "CLÉ 2", title: "📜 Décodage Pénal", badgeId: "badge-2", defaultBadge: "À résoudre" },
        { id: "tab-p1-enigma-3", num: "CLÉ 3", title: "🎬 Vidéo « Des Héros »", badgeId: "badge-3", defaultBadge: "À résoudre" },
        { id: "tab-p1-enigma-4", num: "CLÉ 4", title: "📞 Ligne 3018", badgeId: "badge-4", defaultBadge: "À résoudre" },
        { id: "tab-phone-lock", num: "NEUTRALISATION", title: "📱 Smartphone Sécurisé", badgeId: "badge-phone", defaultBadge: "Verrouillé 🔒", isLock: true }
      ]
    },
    2: {
      name: "Parcours 2 : Cellule pHARe (3 Dossiers Complexes & Zones Grises)",
      badge: "Parcours 2 • Cellule pHARe (3 Dossiers)",
      defaultTab: "tab-p2-cases",
      tabs: [
        { id: "tab-p2-cases", num: "DOSSIERS 1, 2 & 3", title: "⚖️ Cellule pHARe (3 Cas)", badgeId: "badge-complex", defaultBadge: "À instruire" },
        { id: "tab-phone-lock", num: "NEUTRALISATION", title: "📱 Smartphone Sécurisé", badgeId: "badge-phone", defaultBadge: "Verrouillé 🔒", isLock: true }
      ]
    },
    3: {
      name: "Parcours 3 : L'Anatomie du Piège (« Le 7ème Regard » & Écriture)",
      badge: "Parcours 3 • Affiche & Le 7ème Regard",
      defaultTab: "tab-p3-poster",
      tabs: [
        { id: "tab-p3-poster", num: "ATELIER CITOYEN", title: "🖼️ Affiche & Le 7ème Regard", badgeId: "badge-poster", defaultBadge: "En cours ✍️" },
        { id: "tab-phone-lock", num: "NEUTRALISATION", title: "📱 Smartphone Sécurisé", badgeId: "badge-phone", defaultBadge: "Verrouillé 🔒", isLock: true }
      ]
    }
  };

  function renderNavTabs(trackNum) {
    const navContainer = document.getElementById('main-nav-tabs');
    if (!navContainer) return;
    navContainer.innerHTML = '';

    const trackConfig = TRACK_INFOS[trackNum] || TRACK_INFOS[1];

    const currentBadge = document.getElementById('current-track-badge');
    if (currentBadge) currentBadge.textContent = trackConfig.badge;

    trackConfig.tabs.forEach((tabDef, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-tab' + (tabDef.isLock ? ' lock-tab' : '') + (idx === 0 ? ' active' : '');
      btn.setAttribute('data-tab', tabDef.id);
      btn.id = `nav-${tabDef.id}`;

      let badgeText = tabDef.defaultBadge;
      if (tabDef.id === 'tab-p1-enigma-1' && state.solvedEnigmas[1]) badgeText = 'Résolu ✅';
      if (tabDef.id === 'tab-p1-enigma-2' && state.solvedEnigmas[2]) badgeText = 'Résolu ✅';
      if (tabDef.id === 'tab-p1-enigma-3' && state.solvedEnigmas[3]) badgeText = 'Résolu ✅';
      if (tabDef.id === 'tab-p1-enigma-4' && state.solvedEnigmas[4]) badgeText = 'Résolu ✅';
      if (tabDef.id === 'tab-p2-cases' && state.solvedEnigmas.complex) badgeText = 'Instruit ✅';
      if (tabDef.id === 'tab-p3-poster' && state.solvedEnigmas.poster) badgeText = 'Rédigé ✅';

      btn.innerHTML = `
        <div class="tab-top">
          <span class="tab-num">${tabDef.num}</span>
          <span class="tab-badge" id="${tabDef.badgeId}">${badgeText}</span>
        </div>
        <div class="tab-title">${tabDef.title}</div>
      `;

      if (badgeText.includes('✅')) {
        btn.classList.add('solved');
      }

      btn.addEventListener('click', () => {
        playSound('click');
        showEnigmaTab(tabDef.id);
      });

      navContainer.appendChild(btn);
    });

    showEnigmaTab(trackConfig.defaultTab);
  }

  function switchTrack(trackNum) {
    state.selectedTrack = parseInt(trackNum, 10);
    renderNavTabs(state.selectedTrack);

    const lbl = document.getElementById('lbl-selected-track');
    if (lbl && TRACK_INFOS[state.selectedTrack]) {
      lbl.textContent = TRACK_INFOS[state.selectedTrack].name;
    }

    document.querySelectorAll('.track-card').forEach(card => {
      if (parseInt(card.getAttribute('data-track'), 10) === state.selectedTrack) {
        card.classList.add('highlighted');
      } else {
        card.classList.remove('highlighted');
      }
    });

    const modalTeacher = document.getElementById('modal-teacher');
    if (modalTeacher) modalTeacher.classList.add('hidden');
    playSound('beep');
  }

  // --- DÉBLOCAGE D'UNE ÉPREUVE (SANS RAPPEL DU CODE SUR LE SMARTPHONE) ---
  function unlockDigit(enigmaNum, digitValue) {
    state.digits[enigmaNum] = digitValue;
    state.solvedEnigmas[enigmaNum] = true;

    // Mise à jour de l'indicateur d'étape (coche verte, aucun chiffre)
    const stepBadge = document.getElementById(`step-badge-${enigmaNum}`);
    if (stepBadge) {
      stepBadge.classList.add('completed');
      const checkEl = stepBadge.querySelector('.step-check');
      if (checkEl) checkEl.textContent = '✅';
    }

    // Mise à jour de l'onglet de navigation
    const navBtn = document.getElementById(`nav-tab-p1-enigma-${enigmaNum}`) || document.getElementById(`tab-btn-${enigmaNum}`);
    const badge = document.getElementById(`badge-${enigmaNum}`);
    if (navBtn) navBtn.classList.add('solved');
    if (badge) {
      badge.textContent = 'Résolu ✅';
      badge.style.background = 'var(--accent-green)';
      badge.style.color = '#064e3b';
    }

    playSound('success');
    checkAllTasksCompleted();
  }

  function markComplexCasesSolved() {
    state.solvedEnigmas.complex = true;
    const stepBadge = document.getElementById('step-badge-complex');
    if (stepBadge) {
      stepBadge.classList.add('completed');
      const checkEl = stepBadge.querySelector('.step-check');
      if (checkEl) checkEl.textContent = '✅';
    }

    const navBtn = document.getElementById('nav-tab-p2-cases') || document.getElementById('tab-btn-complex');
    const badge = document.getElementById('badge-complex');
    if (navBtn) navBtn.classList.add('solved');
    if (badge) {
      badge.textContent = 'Instruit ✅';
      badge.style.background = 'var(--accent-green)';
      badge.style.color = '#064e3b';
    }

    playSound('success');
    checkAllTasksCompleted();
  }

  function checkAllTasksCompleted() {
    const allDigitsFound = Object.values(state.digits).every(v => v !== null);
    const btnKeypad = document.getElementById('btn-open-keypad');

    if (allDigitsFound && state.solvedEnigmas.complex) {
      if (btnKeypad) {
        btnKeypad.disabled = false;
        btnKeypad.textContent = '🔓 Accéder au Digicode Final !';
      }
      const badgePhone = document.getElementById('badge-phone');
      if (badgePhone) {
        badgePhone.textContent = 'Déverrouillage prêt';
        badgePhone.style.background = 'var(--accent-cyan)';
        badgePhone.style.color = '#000';
      }
    }
  }

  // ==========================================================================
  // ÉNIGME 1 : LE TRI DES FAITS (Solutions : B, C, E -> Total = 3)
  // SANS AIDE GUIDÉE PRÉ-REMPLIE
  // ==========================================================================
  const e1CardSelections = {};

  const e1Feedbacks = {
    A: { correct: false, text: "Conflit ponctuel : La dispute est violente sur le moment, mais il n'y a ni répétition dans le temps ni isolement (réconciliation dès le lendemain)." },
    B: { correct: true, text: "Harcèlement avéré : Répétition quotidienne depuis 2 mois + violence verbale/psychologique + effet de meute (3 élèves contre 1 pour dominer)." },
    C: { correct: true, text: "Cyberharcèlement avéré : Publication répétée chaque soir sur les réseaux + humiliation publique + isolement de la victime devant 40 élèves." },
    D: { correct: false, text: "Tristesse isolée : Chloé vit un moment douloureux, mais il n'y a pas d'agresseur, pas d'agression ni de volonté de nuire." },
    E: { correct: true, text: "Harcèlement avéré : Répétition quotidienne (tous les midis) + humiliation publique + isolement forcé (sac caché, place confisquée)." },
    F: { correct: false, text: "Incident isolé : Une insulte par SMS après un match est répréhensible et sanctionnable au collège, mais ce n'est pas un harcèlement sans répétition." }
  };

  function initEnigma1() {
    const factCards = document.querySelectorAll('.fact-card');
    const countEl = document.getElementById('e1-count-selected');

    factCards.forEach(card => {
      const cardId = card.getAttribute('data-id');
      const buttons = card.querySelectorAll('.btn-choice');

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          playSound('click');
          const isHarcelement = btn.getAttribute('data-val') === 'true';
          e1CardSelections[cardId] = isHarcelement;

          buttons.forEach(b => b.classList.remove('selected-harcelement', 'selected-autre'));
          if (isHarcelement) {
            btn.classList.add('selected-harcelement');
          } else {
            btn.classList.add('selected-autre');
          }

          const countHarcelement = Object.values(e1CardSelections).filter(v => v === true).length;
          if (countEl) countEl.textContent = countHarcelement;
        });
      });
    });

    const btnValidateE1 = document.getElementById('btn-validate-e1');
    const resultBoxE1 = document.getElementById('e1-result-box');

    if (btnValidateE1) {
      btnValidateE1.addEventListener('click', () => {
        const totalAnswered = Object.keys(e1CardSelections).length;
        if (totalAnswered < 6) {
          playSound('error');
          alert("Veuillez d'abord qualifier chacun des 6 signalements (A, B, C, D, E et F) !");
          return;
        }

        let allCorrect = true;
        factCards.forEach(card => {
          const cardId = card.getAttribute('data-id');
          const expected = e1Feedbacks[cardId].correct;
          const userChoice = e1CardSelections[cardId];
          const fbDiv = card.querySelector('.card-feedback');

          card.classList.remove('validated-correct', 'validated-wrong');
          if (userChoice === expected) {
            card.classList.add('validated-correct');
            fbDiv.style.display = 'block';
            fbDiv.style.background = 'rgba(16, 185, 129, 0.2)';
            fbDiv.style.color = '#a7f3d0';
            fbDiv.textContent = '✅ ' + e1Feedbacks[cardId].text;
          } else {
            allCorrect = false;
            card.classList.add('validated-wrong');
            fbDiv.style.display = 'block';
            fbDiv.style.background = 'rgba(239, 68, 68, 0.2)';
            fbDiv.style.color = '#fca5a5';
            fbDiv.textContent = '❌ ' + e1Feedbacks[cardId].text;
          }
        });

        if (allCorrect) {
          resultBoxE1.className = 'solution-box success';
          resultBoxE1.innerHTML = `
            <div class="solution-title">🎯 AUDIT VALIDÉ : 3 SITUATIONS DE HARCÈLEMENT AVÉRÉES</div>
            <p>Seuls les signalements <strong>B, C et E</strong> cumulent les <strong>3 critères légaux</strong> (Violence + Répétition + Domination/Isolement).</p>
            <div class="digit-revealed-banner">
              <div class="digit-main-val">PREMIER CHIFFRE DU CODE : <span>3</span></div>
              <div class="scribe-warning-tag">📝 Scribe, notez immédiatement le chiffre 3 sur votre feuille ! Ce chiffre ne sera plus rappelé.</div>
            </div>
          `;
          unlockDigit(1, 3);
        } else {
          playSound('error');
          resultBoxE1.className = 'solution-box error';
          resultBoxE1.innerHTML = `
            <div class="solution-title">❌ ERREUR DE QUALIFICATION JURIDIQUE</div>
            <p>Relisez les faits avec rigueur. Un conflit ponctuel ou un acte isolé n'est pas un harcèlement sans <strong>répétition</strong> dans le temps ! Corrigez vos choix et revalidez.</p>
          `;
        }
      });
    }
  }

  // ==========================================================================
  // ÉNIGME 2 : LE DOSSIER PÉNAL (X=3, Y=45, Z=10, W=150 -> (10-3)-3 = 4)
  // ==========================================================================
  function initEnigma2() {
    const btnValidateE2 = document.getElementById('btn-validate-e2');
    const resultBoxE2 = document.getElementById('e2-result-box');

    if (btnValidateE2) {
      btnValidateE2.addEventListener('click', () => {
        const valX = document.getElementById('val-X').value;
        const valY = document.getElementById('val-Y').value;
        const valZ = document.getElementById('val-Z').value;
        const valW = document.getElementById('val-W').value;
        const userResult = document.getElementById('e2-calc-result').value.trim();

        if (!valX || !valY || !valZ || !valW || !userResult) {
          playSound('error');
          alert("Veuillez sélectionner toutes les peines du Code pénal et saisir votre résultat de calcul !");
          return;
        }

        const isLawExact = (valX === '3' && valY === '45' && valZ === '10' && valW === '150');
        const isCalcExact = (parseInt(userResult, 10) === 4);

        if (isLawExact && isCalcExact) {
          resultBoxE2.className = 'solution-box success';
          resultBoxE2.innerHTML = `
            <div class="solution-title">⚖️ CODE PÉNAL 2022 PARFAITEMENT DÉCRYPTÉ !</div>
            <p>La loi punit très lourdement le harcèlement scolaire :</p>
            <ul>
              <li>ITT &le; 8 jours : <strong>X = 3 ans</strong> de prison et <strong>Y = 45 000 €</strong> d'amende.</li>
              <li>En cas de suicide ou tentative : <strong>Z = 10 ans</strong> de prison et <strong>W = 150 000 €</strong> d'amende.</li>
            </ul>
            <p>Calcul officiel : <code>(10 - 3) - 3 = 7 - 3 = 4</code>.</p>
            <div class="digit-revealed-banner">
              <div class="digit-main-val">DEUXIÈME CHIFFRE DU CODE : <span>4</span></div>
              <div class="scribe-warning-tag">📝 Scribe, notez immédiatement le chiffre 4 sur votre feuille ! Ce chiffre ne sera plus rappelé.</div>
            </div>
          `;
          unlockDigit(2, 4);
        } else {
          playSound('error');
          resultBoxE2.className = 'solution-box error';
          let hints = [];
          if (!isLawExact) {
            hints.push("Certaines sanctions pénales sont erronées (rappel : 3 ans et 45 000 € pour ITT &le; 8j, et jusqu'à 10 ans et 150 000 € en cas de suicide).");
          }
          if (isLawExact && !isCalcExact) {
            hints.push("Les sanctions sont exactes, mais le calcul mathématique est faux ! Vérifiez : (10 - 3) - 3 = ?");
          }
          resultBoxE2.innerHTML = `
            <div class="solution-title">❌ ERREUR DE DÉCRYPTAGE PÉNAL</div>
            <p>${hints.join('<br>')}</p>
          `;
        }
      });
    }
  }

  // ==========================================================================
  // ÉNIGME 3 : VIDÉO « DES HÉROS » & TÉMOINS (Réactions 2 et 4 -> Chiffre 2)
  // ==========================================================================
  function initEnigma3() {
    const items = document.querySelectorAll('.witness-item');
    const countEl = document.getElementById('e3-count-selected');
    const btnValidateE3 = document.getElementById('btn-validate-e3');
    const resultBoxE3 = document.getElementById('e3-result-box');

    items.forEach(item => {
      const cb = item.querySelector('.witness-checkbox');
      cb.addEventListener('change', () => {
        playSound('click');
        const checkedCount = document.querySelectorAll('.witness-checkbox:checked').length;
        if (countEl) countEl.textContent = checkedCount;
      });
    });

    if (btnValidateE3) {
      btnValidateE3.addEventListener('click', () => {
        const item1 = document.querySelector('.witness-item[data-id="1"] .witness-checkbox').checked;
        const item2 = document.querySelector('.witness-item[data-id="2"] .witness-checkbox').checked;
        const item3 = document.querySelector('.witness-item[data-id="3"] .witness-checkbox').checked;
        const item4 = document.querySelector('.witness-item[data-id="4"] .witness-checkbox').checked;
        const item5 = document.querySelector('.witness-item[data-id="5"] .witness-checkbox').checked;

        const isSuccess = (!item1 && item2 && !item3 && item4 && !item5);

        items.forEach(it => {
          const id = it.getAttribute('data-id');
          const isCorrect = (id === '2' || id === '4');
          const isChecked = it.querySelector('.witness-checkbox').checked;

          it.classList.remove('correct-checked', 'wrong-checked');
          if (isChecked && isCorrect) {
            it.classList.add('correct-checked');
          } else if (isChecked && !isCorrect) {
            it.classList.add('wrong-checked');
          }
        });

        if (isSuccess) {
          resultBoxE3.className = 'solution-box success';
          resultBoxE3.innerHTML = `
            <div class="solution-title">🤝 ANALYSE VALIDÉE : 2 COMPORTEMENTS SENTINELLES PROTECTEURS</div>
            <p>Comme le montre avec force le court-métrage <em>« Des Héros »</em>, seules <strong>2 réactions</strong> font basculer la situation :</p>
            <ul>
              <li><strong>Réaction 2 :</strong> Prévenir un adulte de confiance du collège (CPE, surveillant, professeur, infirmière...). C'est le geste décisif qui déclenche la protection.</li>
              <li><strong>Réaction 4 :</strong> Rompre immédiatement l'isolement d'Enzo en lui montrant qu'il a des alliés.</li>
            </ul>
            <p><em>Rappel pénal :</em> Filmer et diffuser la scène sur les réseaux (réaction 3) est un délit réprimé par la loi. Rire ou se taire (1 et 5) donne son pouvoir au harceleur.</p>
            <div class="digit-revealed-banner">
              <div class="digit-main-val">TROISIÈME CHIFFRE DU CODE : <span>2</span></div>
              <div class="scribe-warning-tag">📝 Scribe, notez immédiatement le chiffre 2 sur votre feuille ! Ce chiffre ne sera plus rappelé.</div>
            </div>
          `;
          unlockDigit(3, 2);
        } else {
          playSound('error');
          resultBoxE3.className = 'solution-box error';
          let warnings = [];
          if (item3) {
            warnings.push("🚨 <strong>Attention !</strong> Filmer une scène de harcèlement pour la partager sur les réseaux est illégal et vous rend complice de cyberharcèlement.");
          }
          if (item1 || item5) {
            warnings.push("⚠️ Rire ou détourner les yeux conforte l'agresseur dans son sentiment de toute-puissance.");
          }
          if (!item2 || !item4) {
            warnings.push("💡 N'oubliez pas les 2 piliers : alerter un adulte et soutenir la victime.");
          }
          resultBoxE3.innerHTML = `
            <div class="solution-title">❌ SÉLECTION INEXACTE</div>
            <p>${warnings.join('<br>')}</p>
          `;
        }
      });
    }
  }

  // ==========================================================================
  // ÉNIGME 4 : LA LIGNE D'URGENCE 3018 (Dernier chiffre = 8)
  // ==========================================================================
  function initEnigma4() {
    const displayEl = document.getElementById('dialed-number');
    const feedbackEl = document.getElementById('call-feedback-text');
    const btnCall = document.getElementById('btn-call-emergency');
    const resultBoxE4 = document.getElementById('e4-result-box');

    document.querySelectorAll('.dial-key[data-digit]').forEach(key => {
      key.addEventListener('click', () => {
        if (state.dialedNumber.length < 6) {
          const digit = key.getAttribute('data-digit');
          state.dialedNumber += digit;
          playSound('dtmf');
          updateDialDisplay();
        }
      });
    });

    const btnBack = document.getElementById('dial-backspace');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        playSound('click');
        state.dialedNumber = state.dialedNumber.slice(0, -1);
        updateDialDisplay();
      });
    }

    const btnClear = document.getElementById('dial-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        playSound('click');
        state.dialedNumber = '';
        updateDialDisplay();
      });
    }

    function updateDialDisplay() {
      if (displayEl) {
        displayEl.textContent = state.dialedNumber || '_ _ _ _';
      }
    }

    if (btnCall) {
      btnCall.addEventListener('click', () => {
        playSound('dtmf');
        if (state.dialedNumber === '3018') {
          if (feedbackEl) {
            feedbackEl.textContent = "🟢 Appel connecté : Plateforme Nationale 3018";
            feedbackEl.style.color = '#10b981';
          }
          resultBoxE4.className = 'solution-box success';
          resultBoxE4.innerHTML = `
            <div class="solution-title">📞 SERVICE NATIONAL 3018 CONTACTÉ EN URGENCE !</div>
            <p>Le <strong>3018</strong> est le numéro unique national, 100% gratuit, anonyme et confidentiel pour les victimes et les témoins.</p>
            <p>Comme précisé dans la consigne, le 4ème chiffre correspond au <strong>tout DERNIER chiffre</strong> de ce numéro d'urgence (3 0 1 <strong>8</strong>) :</p>
            <div class="digit-revealed-banner">
              <div class="digit-main-val">QUATRIÈME CHIFFRE DU CODE : <span>8</span></div>
              <div class="scribe-warning-tag">📝 Scribe, notez immédiatement le chiffre 8 sur votre feuille ! Ce chiffre ne sera plus rappelé.</div>
            </div>
          `;
          unlockDigit(4, 8);
        } else {
          playSound('error');
          if (feedbackEl) {
            feedbackEl.textContent = "🔴 Numéro d'urgence non reconnu";
            feedbackEl.style.color = '#ef4444';
          }
          resultBoxE4.className = 'solution-box error';
          resultBoxE4.innerHTML = `
            <div class="solution-title">❌ NUMÉRO INCORRECT (${state.dialedNumber || 'Vide'})</div>
            <p>Le numéro national d'urgence pour le harcèlement scolaire et le cyberharcèlement comporte 4 chiffres (vu en 1ère heure : c'est le 3018 !). Réessayez.</p>
          `;
        }
      });
    }
  }

  // ==========================================================================
  // PHASE 2 : LES 3 DOSSIERS COMPLEXES SUR LES ZONES GRISES
  // Solution : D1 (B, B), D2 (A, B), D3 (B, A)
  // ==========================================================================
  function setupOptionItems() {
    document.querySelectorAll('.option-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const radio = item.querySelector('input[type="radio"]');
        if (radio && e.target !== radio) {
          radio.checked = true;
          playSound('click');
        }
        const name = radio.name;
        document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
          r.closest('.option-item').classList.remove('selected');
        });
        item.classList.add('selected');
      });
    });
  }

  function initComplexCases() {
    const btnValidate = document.getElementById('btn-validate-complex') || document.getElementById('btn-validate-p2');
    const resultBox = document.getElementById('complex-result-box') || document.getElementById('p2-result-box');

    if (btnValidate) {
      btnValidate.addEventListener('click', () => {
        const d1_q1 = document.querySelector('input[name="d1_q1"]:checked')?.value;
        const d1_q2 = document.querySelector('input[name="d1_q2"]:checked')?.value;
        const d2_q1 = document.querySelector('input[name="d2_q1"]:checked')?.value;
        const d2_q2 = document.querySelector('input[name="d2_q2"]:checked')?.value;
        const d3_q1 = document.querySelector('input[name="d3_q1"]:checked')?.value;
        const d3_q2 = document.querySelector('input[name="d3_q2"]:checked')?.value;

        if (!d1_q1 || !d1_q2 || !d2_q1 || !d2_q2 || !d3_q1 || !d3_q2) {
          playSound('error');
          alert("Veuillez instruire l'ensemble des questions des 3 dossiers de crise !");
          return;
        }

        const isD1Correct = (d1_q1 === 'B' && d1_q2 === 'B');
        const isD2Correct = (d2_q1 === 'A' && d2_q2 === 'B');
        const isD3Correct = (d3_q1 === 'B' && d3_q2 === 'A');

        if (isD1Correct && isD2Correct && isD3Correct) {
          resultBox.className = 'solution-box success';
          resultBox.innerHTML = `
            <div class="solution-title">⚖️ AVIS JURIDIQUE DE LA CELLULE pHARe INTÉGRALEMENT VALIDÉ !</div>
            <p><strong>1. Affaire Noah (Mème EPS) :</strong> Le relais collectif crée un harcèlement en meute. La fabrication d'un sticker et sa diffusion élargie engagent la responsabilité pénale directe de leurs auteurs.</p>
            <p><strong>2. Affaire Léna (Ghosting) :</strong> La diffamation et la mise à l'écart organisée constituent un harcèlement moral détruisant la santé de la victime sans aucun coup physique. Se taire n'est pas être neutre.</p>
            <p><strong>3. Affaire Adam (Doxxing) :</strong> La légitime défense n'existe pas en ligne. On ne répond jamais à une agression par un délit (vidéo intime + adresse). L'anonymat sur NGL ne résiste pas aux réquisitions IP de la justice.</p>
            <div style="margin-top: 10px; font-weight: 800; color: #a7f3d0;">
              ✅ Ravitaillement citoyen validé : Vous êtes autorisés à composer le code de secours sur le digicode final du smartphone !
            </div>
          `;
          markComplexCasesSolved();
        } else {
          playSound('error');
          resultBox.className = 'solution-box error';
          let errors = [];
          if (!isD1Correct) errors.push("• <strong>Dossier 1 (Mème) :</strong> Réflechissez bien à la notion de 'harcèlement en meute' et aux responsabilités de chaque maillon de diffusion.");
          if (!isD2Correct) errors.push("• <strong>Dossier 2 (Ghosting) :</strong> La loi sanctionne les atteintes psychologiques sans coups, et le silence d'un témoin qui sait la vérité n'est pas neutre.");
          if (!isD3Correct) errors.push("• <strong>Dossier 3 (Riposte) :</strong> Attention à la frontière de la légalité : se faire justice soi-même en divulguant une adresse (doxxing) reste un délit pénal.");

          resultBox.innerHTML = `
            <div class="solution-title">❌ CERTAINES CONCLUSIONS D'ENQUÊTE SONT INEXACTES</div>
            <p>${errors.join('<br>')}</p>
            <p style="margin-top: 8px;">Débattez au sein de l'îlot, revoyez vos arguments et revalidez.</p>
          `;
        }
      });
    }
  }

  // ==========================================================================
  // CLAVIER PIN DU SMARTPHONE (ÉCRAN FINAL : Code 3428)
  // AUCUN RAPPEL DE CHIFFRE ! CONSULTATION OBLIGATOIRE DES NOTES DU SCRIBE
  // ==========================================================================
  function initPinKeypad() {
    const pinDots = [
      document.getElementById('dot-0'),
      document.getElementById('dot-1'),
      document.getElementById('dot-2'),
      document.getElementById('dot-3')
    ];
    const statusMsg = document.getElementById('pin-status-msg');
    const smartphoneFrame = document.querySelector('.smartphone-frame');

    function updatePinDots() {
      pinDots.forEach((dot, index) => {
        if (dot) {
          if (index < state.enteredPin.length) {
            dot.classList.add('filled');
          } else {
            dot.classList.remove('filled');
          }
        }
      });
    }

    function checkPinCode() {
      if (state.enteredPin === '3428') {
        playSound('victory');
        pauseTimer();

        if (statusMsg) {
          statusMsg.textContent = '✅ CODE EXACT ! SMARTPHONE DÉVERROUILLÉ';
          statusMsg.style.color = '#10b981';
        }

        setTimeout(() => {
          showVictoryScreen();
        }, 1200);
      } else {
        playSound('error');
        if (smartphoneFrame) {
          smartphoneFrame.classList.add('shake-anim');
          setTimeout(() => smartphoneFrame.classList.remove('shake-anim'), 500);
        }
        if (statusMsg) {
          statusMsg.textContent = '❌ CODE INCORRECT ! Consultez les notes du Scribe';
          statusMsg.style.color = '#ef4444';
        }
        state.enteredPin = '';
        updatePinDots();
      }
    }

    document.querySelectorAll('.pin-key[data-num]').forEach(key => {
      key.addEventListener('click', () => {
        if (state.enteredPin.length < 4) {
          playSound('click');
          state.enteredPin += key.getAttribute('data-num');
          updatePinDots();

          if (state.enteredPin.length === 4) {
            setTimeout(checkPinCode, 200);
          }
        }
      });
    });

    const btnClear = document.getElementById('pin-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        playSound('click');
        state.enteredPin = '';
        updatePinDots();
        if (statusMsg) {
          statusMsg.textContent = 'Entrez le code secret à 4 chiffres';
          statusMsg.style.color = 'var(--text-secondary)';
        }
      });
    }

    const btnSubmit = document.getElementById('pin-submit');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        if (state.enteredPin.length === 4) {
          checkPinCode();
        } else {
          playSound('error');
          if (statusMsg) {
            statusMsg.textContent = 'Veuillez saisir les 4 chiffres !';
          }
        }
      });
    }

    const btnOpenKeypad = document.getElementById('btn-open-keypad');
    if (btnOpenKeypad) {
      btnOpenKeypad.addEventListener('click', () => {
        playSound('click');
        showEnigmaTab('tab-phone-lock');
      });
    }
  }

  // ==========================================================================
  // ÉCRAN DE VICTOIRE & DIPLÔME DU COLLÈGE DE BIGUGLIA
  // ==========================================================================
  function showVictoryScreen() {
    showScreen('screen-victory');

    const teamEl = document.getElementById('vic-team-name');
    const timeLeftEl = document.getElementById('vic-time-left');
    const diplomaTeamEl = document.getElementById('diploma-team-name');
    const diplomaDateEl = document.getElementById('diploma-date');

    const minutes = Math.floor(state.remainingSeconds / 60);
    const seconds = state.remainingSeconds % 60;
    const timeFormatted = `${minutes} min ${String(seconds).padStart(2, '0')} s`;

    if (teamEl) teamEl.textContent = state.teamName;
    if (timeLeftEl) timeLeftEl.textContent = timeFormatted;
    if (diplomaTeamEl) diplomaTeamEl.textContent = state.teamName;

    const today = new Date();
    const dateFormatted = today.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    if (diplomaDateEl) diplomaDateEl.textContent = dateFormatted;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================================================
  // PANNEAU ENSEIGNANT (SUPERVISEUR)
  // ==========================================================================
  
  // ==========================================================================
  // SÉLECTION DU PARCOURS D'APPRENTISSAGE (ACCUEIL)
  // ==========================================================================
  function initTrackSelection() {
    const trackCards = document.querySelectorAll('.track-card');
    const selectButtons = document.querySelectorAll('.btn-select-track');

    function select(trackNum) {
      state.selectedTrack = parseInt(trackNum, 10);
      playSound('beep');

      trackCards.forEach(c => {
        if (parseInt(c.getAttribute('data-track'), 10) === state.selectedTrack) {
          c.classList.add('highlighted');
        } else {
          c.classList.remove('highlighted');
        }
      });

      const lbl = document.getElementById('lbl-selected-track');
      if (lbl && TRACK_INFOS[state.selectedTrack]) {
        lbl.textContent = TRACK_INFOS[state.selectedTrack].name;
      }
    }

    trackCards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
          const t = card.getAttribute('data-track');
          if (t) select(t);
        }
      });
    });

    selectButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const t = btn.getAttribute('data-track');
        if (t) select(t);
      });
    });
  }

  // ==========================================================================
  // PARCOURS 3 : ATELIER « LE 7ème REGARD » & DÉCRYPTAGE SÉMIOLOGIQUE
  // ==========================================================================
  const EYE_DATA = {
    1: { title: "Œil n°1 (Haut Gauche)" },
    2: { title: "Œil n°2 (Haut Centre)" },
    3: { title: "Œil n°3 (Haut Droite)" },
    4: { title: "Œil n°4 (Bas Gauche)" },
    5: { title: "Œil n°5 (Bas Centre)" },
    6: { title: "Œil n°6 (Bas Droite)" }
  };

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initPosterWorkshop() {
    // --- 1. Interaction et synchronisation des 4 indices avec l'affiche ---
    const clueCards = document.querySelectorAll('.clue-card');
    const targetZones = {
      1: [document.getElementById('target-zone-1a'), document.getElementById('target-zone-1b')],
      2: [document.getElementById('target-zone-2')],
      3: [document.getElementById('target-zone-3')],
      4: [document.getElementById('target-zone-4')]
    };
    const examinedIndices = new Set();
    const progressFill = document.getElementById('clues-progress-fill');
    const progressCount = document.getElementById('clues-examined-count');
    const posterHint = document.getElementById('poster-hotspot-msg');

    function highlightIndice(indiceNum) {
      // Retirer l'état actif sur toutes les cibles et cartes
      document.querySelectorAll('.poster-target-zone').forEach(z => z.classList.remove('active'));
      clueCards.forEach(c => c.classList.remove('active'));

      // Activer la carte sélectionnée
      const card = document.getElementById(`clue-card-${indiceNum}`);
      if (card) {
        card.classList.add('active', 'examined');
      }

      // Activer les zones sur l'affiche
      const zones = targetZones[indiceNum] || [];
      zones.forEach(z => {
        if (z) z.classList.add('active');
      });

      // Mettre à jour la pilule de statut
      const pill = document.getElementById(`pill-indice-${indiceNum}`);
      if (pill) {
        pill.textContent = '✅ Zone ciblée';
      }

      // Marquer comme examiné
      examinedIndices.add(indiceNum);
      const count = examinedIndices.size;

      if (progressCount) {
        progressCount.textContent = `${count} / 4 zones examinées`;
      }
      if (progressFill) {
        progressFill.style.width = `${(count / 4) * 100}%`;
      }

      if (posterHint) {
        if (count === 4) {
          posterHint.innerHTML = "✨ <strong>Bravo !</strong> Les 4 zones ont été analysées. Passez à l'Atelier d'Écriture ci-dessous !";
          posterHint.style.color = "#10b981";
        } else {
          const names = {
            1: "Les 6 regards (haut & bas)",
            2: "Le geste central (mains sur les yeux)",
            3: "La typographie 'h A R C e L E M e n T'",
            4: "La question-clé du haut"
          };
          posterHint.innerHTML = `🎯 Zone ciblée : <strong>${names[indiceNum]}</strong>`;
          posterHint.style.color = "#38bdf8";
        }
      }

      playSound('beep');
    }

    clueCards.forEach(card => {
      card.addEventListener('click', () => {
        const indiceNum = parseInt(card.getAttribute('data-indice'), 10);
        if (indiceNum) {
          highlightIndice(indiceNum);
        }
      });
    });

    // --- 2. Sélection des 6 yeux avec feedback immédiat ---
    const eyeButtons = document.querySelectorAll('.btn-eye-choice');
    const eyeFeedback = document.getElementById('lbl-active-eye');

    function selectEye(eyeNum) {
      state.p3SelectedEye = eyeNum;
      eyeButtons.forEach(btn => {
        const bEye = parseInt(btn.getAttribute('data-eye'), 10);
        if (bEye === eyeNum) {
          btn.classList.add('active', 'selected');
        } else {
          btn.classList.remove('active', 'selected');
        }
      });

      const eyeInfo = EYE_DATA[eyeNum] || EYE_DATA[1];
      if (eyeFeedback) {
        eyeFeedback.textContent = eyeInfo.title;
      }
      playSound('click');
    }

    eyeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const eyeNum = parseInt(btn.getAttribute('data-eye'), 10);
        selectEye(eyeNum);
      });
    });

    // Sélectionner l'Œil 1 par défaut au chargement
    selectEye(state.p3SelectedEye || 1);

    // --- 3. Génération, validation et actions de victoire de la scène ---
    const btnGenerate = document.getElementById('btn-generate-scene');
    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => {
        const linkInput = document.getElementById('p3-character-link');
        const triggerInput = document.getElementById('p3-character-trigger');
        const strategyInput = document.getElementById('p3-character-strategy');

        const linkVal = linkInput ? linkInput.value.trim() : '';
        const triggerVal = triggerInput ? triggerInput.value.trim() : '';
        const strategyVal = strategyInput ? strategyInput.value.trim() : '';

        if (!linkVal || linkVal.length < 10) {
          playSound('error');
          alert("⚠️ Étape 1 incomplète : Veuillez décrire précisément l'identité et le lien de ce regard avec la victime.");
          if (linkInput) linkInput.focus();
          return;
        }

        if (!triggerVal || triggerVal.length < 10) {
          playSound('error');
          alert("⚠️ Étape 2 incomplète : Veuillez décrire le déclic précis (le point de bascule où le harcèlement devient évident).");
          if (triggerInput) triggerInput.focus();
          return;
        }

        if (!strategyVal || strategyVal.length < 15) {
          playSound('error');
          alert("⚠️ Étape 3 incomplète : Veuillez formuler une action concrète et réaliste sous 24h sans héroïsme naïf.");
          if (strategyInput) strategyInput.focus();
          return;
        }

        const eyeInfo = EYE_DATA[state.p3SelectedEye] || EYE_DATA[1];

        const box = document.getElementById('formatted-scene-box');
        const metaEl = document.getElementById('scene-final-meta');
        const contentEl = document.getElementById('scene-final-content');

        if (metaEl) {
          metaEl.textContent = `Îlot d'enquête : ${state.teamName} • ${eyeInfo.title}`;
        }

        if (contentEl) {
          contentEl.innerHTML = `
            <div class="scene-stage-block" style="margin-bottom: 14px;">
              <h4 style="color: var(--accent-cyan); font-size: 0.95rem; margin-bottom: 4px;">👤 1. Identité & Relation avec la Victime (${eyeInfo.title})</h4>
              <p style="color: var(--text-primary); line-height: 1.5;">${escapeHtml(linkVal)}</p>
            </div>
            <div class="scene-stage-block" style="margin-bottom: 14px;">
              <h4 style="color: var(--accent-cyan); font-size: 0.95rem; margin-bottom: 4px;">⚡ 2. Le Déclic / Le Point de Bascule</h4>
              <p style="color: var(--text-primary); line-height: 1.5;">${escapeHtml(triggerVal)}</p>
            </div>
            <div class="scene-stage-block" style="margin-bottom: 14px;">
              <h4 style="color: var(--accent-cyan); font-size: 0.95rem; margin-bottom: 4px;">🛡️ 3. La Stratégie d'Action Réaliste en 24h</h4>
              <p style="color: var(--text-primary); line-height: 1.5;">${escapeHtml(strategyVal)}</p>
            </div>
            <div class="scene-validation-banner" style="background: rgba(16, 185, 129, 0.12); border: 1px solid var(--accent-green); border-radius: 8px; padding: 12px 16px; margin-top: 14px; font-size: 0.9rem; color: #a7f3d0;">
              <strong>✅ Conforme aux critères de l'atelier citoyen :</strong> Scène réaliste sans héroïsme naïf, favorisant le soutien à la victime et l'action responsable vers les adultes ou le 3018.
            </div>
          `;
        }

        if (box) {
          box.classList.remove('hidden');
          box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        state.solvedEnigmas.poster = true;
        pauseTimer(); // Gel du compte à rebours et arrêt de la menace !

        const navPosterBtn = document.getElementById('nav-tab-p3-poster');
        const badgePoster = document.getElementById('badge-poster');
        if (navPosterBtn) navPosterBtn.classList.add('solved');
        if (badgePoster) {
          badgePoster.textContent = 'Validé 🏆';
          badgePoster.style.background = 'var(--accent-green)';
          badgePoster.style.color = '#064e3b';
        }

        playSound('victory');
        checkAllTasksCompleted();
      });
    }

    // --- 4. Actions dans la bannière de clôture ---
    // A. Bouton d'obtention immédiate du Diplôme officiel
    const btnP3Victory = document.getElementById('btn-p3-victory');
    if (btnP3Victory) {
      btnP3Victory.addEventListener('click', () => {
        playSound('victory');
        showVictoryScreen();
      });
    }

    // B. Bouton d'accès au smartphone sécurisé
    const btnP3Phone = document.getElementById('btn-p3-phone');
    if (btnP3Phone) {
      btnP3Phone.addEventListener('click', () => {
        playSound('click');
        showEnigmaTab('tab-phone-lock');
      });
    }

    // C. Impression de la scène
    const btnPrintScene = document.getElementById('btn-print-scene');
    if (btnPrintScene) {
      btnPrintScene.addEventListener('click', () => {
        window.print();
      });
    }
  }

    function initTeacherModal() {
    const modalTeacher = document.getElementById('modal-teacher');
    const btnOpen = document.getElementById('btn-teacher');
    const btnClose = document.getElementById('btn-close-modal');

    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        playSound('click');
        modalTeacher.classList.remove('hidden');
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        playSound('click');
        modalTeacher.classList.add('hidden');
      });
    }

    document.getElementById('btn-time-minus5')?.addEventListener('click', () => {
      state.remainingSeconds = Math.max(0, state.remainingSeconds - 300);
      updateTimerDisplay();
    });

    document.getElementById('btn-time-plus5')?.addEventListener('click', () => {
      state.remainingSeconds += 300;
      state.totalSeconds += 300;
      updateTimerDisplay();
    });

    document.getElementById('btn-time-pause')?.addEventListener('click', (e) => {
      if (state.isTimerRunning) {
        pauseTimer();
        e.target.textContent = '▶️ Reprendre';
      } else {
        startTimer();
        e.target.textContent = '⏸️ Pause';
      }
    });

    document.getElementById('btn-time-reset')?.addEventListener('click', () => {
      state.totalSeconds = 40 * 60;
      state.remainingSeconds = 40 * 60;
      updateTimerDisplay();
    });

    document.getElementById('btn-force-e1')?.addEventListener('click', () => unlockDigit(1, 3));
    document.getElementById('btn-force-e2')?.addEventListener('click', () => unlockDigit(2, 4));
    document.getElementById('btn-force-e3')?.addEventListener('click', () => unlockDigit(3, 2));
    document.getElementById('btn-force-e4')?.addEventListener('click', () => unlockDigit(4, 8));
    document.getElementById('btn-force-complex')?.addEventListener('click', () => markComplexCasesSolved());

    // Sélecteurs de parcours depuis le panneau prof
    document.getElementById('btn-force-track-1')?.addEventListener('click', () => switchTrack(1));
    document.getElementById('btn-force-track-2')?.addEventListener('click', () => switchTrack(2));
    document.getElementById('btn-force-track-3')?.addEventListener('click', () => switchTrack(3));

    // Forcer toutes les énigmes Parcours 1
    document.getElementById('btn-force-all-p1')?.addEventListener('click', () => {
      unlockDigit(1, 3);
      unlockDigit(2, 4);
      unlockDigit(3, 2);
      unlockDigit(4, 8);
      showEnigmaTab('tab-phone-lock');
      modalTeacher.classList.add('hidden');
    });

    // Forcer validation Parcours 2
    document.getElementById('btn-force-all-p2')?.addEventListener('click', () => {
      markComplexCasesSolved();
      showEnigmaTab('tab-phone-lock');
      modalTeacher.classList.add('hidden');
    });

    document.getElementById('btn-force-all')?.addEventListener('click', () => {
      unlockDigit(1, 3);
      unlockDigit(2, 4);
      unlockDigit(3, 2);
      unlockDigit(4, 8);
      markComplexCasesSolved();
      showEnigmaTab('tab-phone-lock');
      modalTeacher.classList.add('hidden');
    });

    // Bouton de bascule de parcours dans la barre de titre
    const btnSwitchTrack = document.getElementById('btn-switch-track');
    if (btnSwitchTrack) {
      btnSwitchTrack.addEventListener('click', () => {
        modalTeacher.classList.remove('hidden');
      });
    }
  }

  // ==========================================================================
  // INITIALISATION GLOBALE
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {

    const btnStart = document.getElementById('btn-start-game');
    const inputTeam = document.getElementById('team-name-input');
    const displayTeam = document.getElementById('display-team-name');

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        initAudio();
        playSound('click');

        const val = inputTeam ? inputTeam.value.trim() : '';
        if (val) {
          state.teamName = val;
        }
        if (displayTeam) {
          displayTeam.textContent = `Brigade : ${state.teamName}`;
        }

        showScreen('screen-game');
        renderNavTabs(state.selectedTrack || 1);
        startTimer();
      });
    }

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        playSound('click');
        const tabTarget = tab.getAttribute('data-tab');
        showEnigmaTab(tabTarget);
      });
    });

    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        btnSound.textContent = state.soundEnabled ? '🔊' : '🔇';
      });
    }

    const btnPrint = document.getElementById('btn-print-diploma');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    const btnRestart = document.getElementById('btn-restart-game');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        window.location.reload();
      });
    }

    initTrackSelection();
    initEnigma1();
    initEnigma2();
    initEnigma3();
    initEnigma4();
    setupOptionItems();
    initComplexCases();
    initPosterWorkshop();
    initPinKeypad();
    initTeacherModal();
    updateTimerDisplay();
  });

})();
