/* ============================================================
   EvoLuzon — quiz.js
   Final assessment engine (Active Experimentation stage).
   Supports four item types: mcq, truefalse, matching, order.
   ============================================================ */

const QuizState = {
  index: 0,
  score: 0,
  maxScore: 0,
  answered: false,
  items: []
};

function initQuiz(){
  const shell = document.getElementById("quiz-shell");
  if(!shell) return;
  QuizState.items = EVOLUZON_DATA.quiz.map(q => ({ ...q }));
  QuizState.maxScore = QuizState.items.reduce((sum, q) => {
    if(q.type === "matching") return sum + q.pairs.length;
    return sum + 1;
  }, 0);
  renderQuizQuestion();

  document.getElementById("quiz-next").addEventListener("click", nextQuestion);
}

function currentQuestion(){
  return QuizState.items[QuizState.index];
}

function updateProgressBar(){
  const pct = (QuizState.index / QuizState.items.length) * 100;
  document.getElementById("quiz-progress-fill").style.width = pct + "%";
  document.getElementById("quiz-position").textContent =
    `Question ${QuizState.index + 1} of ${QuizState.items.length}`;
}

function renderQuizQuestion(){
  QuizState.answered = false;
  const q = currentQuestion();
  const body = document.getElementById("quiz-body");
  const feedback = document.getElementById("quiz-feedback");
  feedback.textContent = "";
  feedback.className = "quiz-feedback";
  updateProgressBar();
  document.getElementById("quiz-next").textContent =
    QuizState.index === QuizState.items.length - 1 ? "See Results" : "Next Question";
  document.getElementById("quiz-next").disabled = true;

  const kicker = { mcq: "Multiple Choice", truefalse: "True or False", matching: "Matching", order: "Timeline Ordering" }[q.type];
  document.getElementById("quiz-kicker").textContent = kicker;
  document.getElementById("quiz-question").textContent = q.question;

  if(q.type === "mcq"){
    body.innerHTML = `<div class="quiz-options">${
      q.options.map((opt, i) => `<button class="quiz-option" data-i="${i}">${opt}</button>`).join("")
    }</div>`;
    body.querySelectorAll(".quiz-option").forEach(btn => {
      btn.addEventListener("click", () => handleMCQAnswer(btn, Number(btn.dataset.i) === q.answer));
    });
  }

  if(q.type === "truefalse"){
    body.innerHTML = `<div class="quiz-options">
      <button class="quiz-option" data-v="true">True</button>
      <button class="quiz-option" data-v="false">False</button>
    </div>`;
    body.querySelectorAll(".quiz-option").forEach(btn => {
      const val = btn.dataset.v === "true";
      btn.addEventListener("click", () => handleMCQAnswer(btn, val === q.answer));
    });
  }

  if(q.type === "matching"){
    renderMatching(q, body);
  }

  if(q.type === "order"){
    renderOrder(q, body);
  }
}

function handleMCQAnswer(btn, isCorrect){
  if(QuizState.answered) return;
  QuizState.answered = true;
  const buttons = btn.parentElement.querySelectorAll(".quiz-option");
  buttons.forEach(b => b.disabled = true);
  btn.classList.add(isCorrect ? "is-correct" : "is-wrong");
  if(isCorrect) QuizState.score += 1;

  const feedback = document.getElementById("quiz-feedback");
  feedback.textContent = isCorrect ? "Correct!" : "Not quite — review the highlighted answer.";
  feedback.className = "quiz-feedback " + (isCorrect ? "correct" : "wrong");
  document.getElementById("quiz-next").disabled = false;
}

/* ---------- Matching ---------- */
function renderMatching(q, body){
  const rightShuffled = [...q.pairs.map(p => p.right)].sort(() => Math.random() - 0.5);
  const matched = new Set();
  let selectedLeft = null;

  body.innerHTML = `
    <div class="match-grid">
      <div class="match-col" id="match-left">
        ${q.pairs.map((p, i) => `<button class="match-item" data-left="${i}">${p.left}</button>`).join("")}
      </div>
      <div class="match-col" id="match-right">
        ${rightShuffled.map(r => `<button class="match-item" data-right="${r.replace(/"/g,'&quot;')}">${r}</button>`).join("")}
      </div>
    </div>
  `;

  const leftBtns = body.querySelectorAll("[data-left]");
  const rightBtns = body.querySelectorAll("[data-right]");

  leftBtns.forEach(btn => btn.addEventListener("click", () => {
    if(btn.classList.contains("is-matched")) return;
    leftBtns.forEach(b => b.classList.remove("is-selected"));
    btn.classList.add("is-selected");
    selectedLeft = btn;
  }));

  rightBtns.forEach(btn => btn.addEventListener("click", () => {
    if(!selectedLeft || btn.classList.contains("is-matched")) return;
    const leftIndex = Number(selectedLeft.dataset.left);
    const correctRight = q.pairs[leftIndex].right;
    if(btn.dataset.right === correctRight){
      selectedLeft.classList.add("is-matched");
      selectedLeft.classList.remove("is-selected");
      btn.classList.add("is-matched");
      matched.add(leftIndex);
      selectedLeft = null;
      if(matched.size === q.pairs.length){
        QuizState.score += q.pairs.length;
        QuizState.answered = true;
        const feedback = document.getElementById("quiz-feedback");
        feedback.textContent = "All pairs matched correctly!";
        feedback.className = "quiz-feedback correct";
        document.getElementById("quiz-next").disabled = false;
      }
    } else {
      btn.classList.add("is-wrong");
      setTimeout(() => btn.classList.remove("is-wrong"), 500);
    }
  }));
}

/* ---------- Ordering ---------- */
function renderOrder(q, body){
  let order = [...q.items].sort(() => Math.random() - 0.5);
  renderOrderList();

  function renderOrderList(){
    body.innerHTML = `
      <ol class="order-list" id="order-list">
        ${order.map((item, i) => `
          <li class="order-item" draggable="true" data-item="${item}">
            <span class="drag-handle" aria-hidden="true">⠿</span>
            <span>${item}</span>
            <span style="margin-left:auto; display:flex; gap:.4em;">
              <button type="button" class="icon-btn" data-move="up" data-i="${i}" aria-label="Move up" style="width:28px;height:28px;">↑</button>
              <button type="button" class="icon-btn" data-move="down" data-i="${i}" aria-label="Move down" style="width:28px;height:28px;">↓</button>
            </span>
          </li>
        `).join("")}
      </ol>
      <button class="btn btn-primary" id="order-check" style="margin-top:1.2em;">Check Order</button>
    `;

    body.querySelectorAll("[data-move]").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.i);
        const dir = btn.dataset.move === "up" ? -1 : 1;
        const j = i + dir;
        if(j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
        renderOrderList();
      });
    });

    // Drag reordering (mouse/touch users)
    let dragIndex = null;
    const items = body.querySelectorAll(".order-item");
    items.forEach((li, i) => {
      li.addEventListener("dragstart", () => { dragIndex = i; li.classList.add("dragging"); });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      li.addEventListener("dragover", (e) => e.preventDefault());
      li.addEventListener("drop", () => {
        if(dragIndex === null || dragIndex === i) return;
        const moved = order.splice(dragIndex, 1)[0];
        order.splice(i, 0, moved);
        renderOrderList();
      });
    });

    document.getElementById("order-check").addEventListener("click", () => {
      const isCorrect = order.every((item, i) => item === q.items[i]);
      const feedback = document.getElementById("quiz-feedback");
      if(isCorrect){
        QuizState.score += 1;
        feedback.textContent = "Correct chronological order!";
        feedback.className = "quiz-feedback correct";
      } else {
        feedback.textContent = "Not quite the right order — but you can still move on.";
        feedback.className = "quiz-feedback wrong";
      }
      QuizState.answered = true;
      document.getElementById("quiz-next").disabled = false;
      document.getElementById("order-check").disabled = true;
    });
  }
}

/* ---------- Navigation between questions / results ---------- */
function nextQuestion(){
  if(QuizState.index < QuizState.items.length - 1){
    QuizState.index += 1;
    renderQuizQuestion();
  } else {
    showQuizResults();
  }
}

function showQuizResults(){
  const shell = document.getElementById("quiz-shell");
  const pct = Math.round((QuizState.score / QuizState.maxScore) * 100);
  addXP(20, "Completed the final assessment");
  awardBadge("evolution-expert");

  shell.innerHTML = `
    <div class="quiz-card quiz-results reveal is-visible">
      <span class="eyebrow">Assessment Complete</span>
      <h2>Field Report</h2>
      <div class="quiz-score">${pct}%</div>
      <p>${QuizState.score} out of ${QuizState.maxScore} points — ${
        pct >= 80 ? "Excellent work, Evolution Expert." :
        pct >= 50 ? "Solid understanding — review the timeline and gallery for the rest." :
        "Revisit the Explore and Fossil Gallery sections, then try again."
      }</p>
      <div class="badge-row" id="badge-tracker-results"></div>
      <button class="btn btn-primary" id="quiz-retry" style="margin-top:1.8em;">Retry Assessment</button>
    </div>
  `;

  const tracker = document.getElementById("badge-tracker-results");
  tracker.innerHTML = EVOLUZON_DATA.badges.map(b => `
    <div class="badge-pill ${EvoState.badges.has(b.id) ? "" : "is-locked"}">
      <span>${b.icon}</span><span>${b.name}</span>
    </div>
  `).join("");

  document.getElementById("quiz-retry").addEventListener("click", restartQuiz);
}

function restartQuiz(){
  QuizState.index = 0;
  QuizState.score = 0;
  QuizState.answered = false;
  const shell = document.getElementById("quiz-shell");
  shell.innerHTML = `
    <div class="quiz-progressbar"><div class="quiz-progressbar-fill" id="quiz-progress-fill"></div></div>
    <p class="stat-label" id="quiz-position" style="margin-bottom:1em;"></p>
    <div class="quiz-card">
      <span class="quiz-kicker" id="quiz-kicker"></span>
      <h3 class="quiz-question" id="quiz-question"></h3>
      <div id="quiz-body"></div>
      <div class="quiz-feedback" id="quiz-feedback"></div>
      <div class="quiz-nav">
        <span></span>
        <button class="btn btn-primary" id="quiz-next">Next Question</button>
      </div>
    </div>
  `;
  document.getElementById("quiz-next").addEventListener("click", nextQuestion);
  renderQuizQuestion();
}
