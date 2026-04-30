import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function IconZap({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L4 14h7l-1 8 10-13h-7l1-7z" />
    </svg>
  );
}

function IconReset({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
    </svg>
  );
}

function IconClick({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3v9" />
      <path d="M12 7v5" />
      <path d="M16 9v4" />
      <path d="M20 11v5a5 5 0 0 1-5 5h-2.5a5 5 0 0 1-4.2-2.3L5 14.5a1.8 1.8 0 0 1 .4-2.4 1.8 1.8 0 0 1 2.5.3L10 15" />
    </svg>
  );
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeSegment(cx, cy, outerR, innerR, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) return "";

  const largeArcFlag = sweep <= 180 ? 0 : 1;
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

function getRandomIndex(max) {
  return Math.floor(Math.random() * max);
}

function getRandomDelay(minMs = 1750, maxMs = 7000) {
  const safeMin = Math.max(250, Math.min(minMs, maxMs));
  const safeMax = Math.max(safeMin, maxMs);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function shouldShowAvoidTarget(prob = 0.25) {
  const p = Math.max(0, Math.min(1, prob));
  return Math.random() < p;
}

function calculateAverage(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function calculateAccuracy(correct, attempts) {
  if (!attempts) return null;
  return Math.round((correct / attempts) * 100);
}

function usesDeadzone(sectionCount) {
  return sectionCount > 1;
}

function normalizeRoundGoal(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return 10;
  return Math.min(parsed, 999);
}

function normalizeDelaySeconds(value, fallback) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0.25), 30);
}

function normalizePercent(value, fallback) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 100);
}

function buildSessionSummary(times, correctActions, totalAttempts, completedRounds) {
  return {
    totalRounds: completedRounds,
    highestTime: times.length ? Math.max(...times) : null,
    lowestTime: times.length ? Math.min(...times) : null,
    averageTime: calculateAverage(times),
    accuracy: calculateAccuracy(correctActions, totalAttempts),
    correctClicks: correctActions,
    totalAttempts,
  };
}

function getNextDisplayRound(completedRounds, activeRound) {
  return activeRound ?? completedRounds + 1;
}

function makeSessionKey(summary, sections, mode) {
  return [
    sections,
    mode,
    summary.totalRounds,
    summary.highestTime ?? "none",
    summary.lowestTime ?? "none",
    summary.averageTime ?? "none",
    summary.accuracy ?? "none",
  ].join("|");
}

function runLogicTests() {
  console.assert(calculateAverage([]) === null, "Empty average should be null");
  console.assert(calculateAverage([150]) === 150, "Single average should work");
  console.assert(calculateAverage([100, 200, 300]) === 200, "Average should be correct");
  console.assert(calculateAccuracy(8, 10) === 80, "Accuracy should calculate percentage");
  console.assert(calculateAccuracy(0, 0) === null, "No attempts should return null accuracy");
  console.assert(usesDeadzone(1) === false, "One-section mode should not use a deadzone");
  console.assert(usesDeadzone(2) === true, "Two-section mode should use a deadzone");
  console.assert(normalizeRoundGoal("25") === 25, "Round goal should parse valid numbers");
  console.assert(normalizeRoundGoal("0") === 10, "Round goal should reject values below 1");
  console.assert(normalizeRoundGoal("abc") === 10, "Round goal should reject non-numbers");
  console.assert(normalizeDelaySeconds("1.75", 7) === 1.75, "Delay seconds should parse decimals");
  console.assert(normalizeDelaySeconds("abc", 7) === 7, "Invalid delay should use fallback");
  console.assert(normalizePercent("25", 0) === 25, "Percent should parse valid numbers");
  console.assert(normalizePercent("101", 0) === 100, "Percent should cap at 100");
  console.assert(typeof shouldShowAvoidTarget(0.25) === "boolean", "Avoid target selector should return a boolean");
  console.assert(shouldShowAvoidTarget(0) === false, "0% should never show avoid target");
  console.assert(getNextDisplayRound(0, null) === 1, "First pending round should be 1");
  console.assert(getNextDisplayRound(3, null) === 4, "Next pending round should follow completed rounds");
  console.assert(getNextDisplayRound(3, 4) === 4, "Active round should stay stable during retries");

  const summary = buildSessionSummary([100, 200, 300], 3, 4, 5);
  console.assert(summary.totalRounds === 5, "Summary should count completed rounds independently from reaction times");
  console.assert(summary.highestTime === 300, "Summary should track highest time");
  console.assert(summary.lowestTime === 100, "Summary should track lowest time");
  console.assert(summary.averageTime === 200, "Summary should track average time");
  console.assert(summary.accuracy === 75, "Summary should track accuracy");

  const keyA = makeSessionKey(summary, 2, "10 rounds");
  const keyB = makeSessionKey(summary, 2, "10 rounds");
  console.assert(keyA === keyB, "Identical session summaries should produce identical keys");

  const newestFirst = [{ round: 1 }, { round: 3 }, { round: 2 }].sort((a, b) => b.round - a.round);
  console.assert(newestFirst[0].round === 3 && newestFirst[2].round === 1, "Round log should sort newest first");

  for (let max = 1; max <= 4; max++) {
    for (let i = 0; i < 20; i++) {
      const index = getRandomIndex(max);
      console.assert(index >= 0 && index < max, "Random index should stay in range");
    }
  }

  for (let i = 0; i < 20; i++) {
    const delay = getRandomDelay(1750, 7000);
    console.assert(delay >= 1750 && delay <= 7000, "Delay should stay in 1.75s-7s range");
  }
}

runLogicTests();

export default function ReactionTimeTrainer() {
  const [gameState, setGameState] = useState("idle");
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeRound, setActiveRound] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [message, setMessage] = useState("Press Start to begin.");
  const [sections, setSections] = useState(2);
  const [roundGoal, setRoundGoal] = useState(10);
  const [isEndless, setIsEndless] = useState(false);
  const [delayMinSeconds, setDelayMinSeconds] = useState(1.75);
  const [delayMaxSeconds, setDelayMaxSeconds] = useState(7);
  const [avoidRedMode, setAvoidRedMode] = useState(false);
  const [redDurationSeconds, setRedDurationSeconds] = useState(1.25);
  const [redFrequencyPercent, setRedFrequencyPercent] = useState(25);
  const [activeIsAvoid, setActiveIsAvoid] = useState(false);
  const [cursorPos] = useState({ x: 200, y: 200 });
  const [correctActions, setCorrectActions] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [roundHistory, setRoundHistory] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const timeoutRef = useRef(null);
  const clickLockRef = useRef(false);
  const cursorDotRef = useRef(null);
  const savedSessionKeysRef = useRef(new Set());

  const totalRounds = isEndless ? Infinity : roundGoal;
  const center = 200;
  const outerRadius = 180;
  const deadzoneRadius = usesDeadzone(sections) ? 28 : 0;
  const innerRadius = usesDeadzone(sections) ? deadzoneRadius : 0;

  const best = reactionTimes.length ? Math.min(...reactionTimes) : null;
  const average = calculateAverage(reactionTimes);
  const last = reactionTimes.length ? reactionTimes[reactionTimes.length - 1] : null;
  const currentSummary = buildSessionSummary(reactionTimes, correctActions, totalAttempts, completedRounds);
  const sortedRoundHistory = useMemo(() => [...roundHistory].sort((a, b) => b.round - a.round), [roundHistory]);

  const segments = useMemo(() => {
    if (sections === 1) return [];

    const angle = 360 / sections;
    return Array.from({ length: sections }, (_, i) => {
      const start = i * angle;
      const end = (i + 1) * angle;
      return describeSegment(center, center, outerRadius, innerRadius, start, end);
    });
  }, [sections, innerRadius]);

  function clearTimer() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function clearSessionStats() {
    setReactionTimes([]);
    setRoundHistory([]);
    setCorrectActions(0);
    setTotalAttempts(0);
    setCompletedRounds(0);
    setActiveRound(null);
    setActiveIndex(null);
    setActiveIsAvoid(false);
    setStartTime(null);
    clickLockRef.current = false;
  }

  function addSessionToHistory(summary) {
    if (!summary.totalRounds && !summary.totalAttempts) return;

    const mode = isEndless ? "Endless" : `${roundGoal} rounds`;
    const sessionKey = makeSessionKey(summary, sections, mode);
    if (savedSessionKeysRef.current.has(sessionKey)) return;

    savedSessionKeysRef.current.add(sessionKey);
    setSessionHistory((previous) => {
      if (previous.some((session) => session.sessionKey === sessionKey)) return previous;

      return [
        {
          id: `${Date.now()}-${Math.random()}`,
          sessionKey,
          sections,
          mode,
          ...summary,
        },
        ...previous,
      ].slice(0, 8);
    });
  }

  function saveSessionIfNeeded() {
    if (gameState === "finished") return;
    if (!completedRounds && !totalAttempts) return;
    addSessionToHistory(buildSessionSummary(reactionTimes, correctActions, totalAttempts, completedRounds));
  }

  function startWaiting(roundNumber) {
    clearTimer();
    setGameState("waiting");
    setActiveIndex(null);
    setActiveIsAvoid(false);
    setActiveRound(roundNumber);
    clickLockRef.current = false;
    setMessage("Wait for a circle section to light up...");

    timeoutRef.current = setTimeout(() => {
      const isAvoid = avoidRedMode && shouldShowAvoidTarget(redFrequencyPercent / 100);
      const nextIndex = getRandomIndex(sections);
      setActiveIndex(nextIndex);
      setActiveIsAvoid(isAvoid);
      setStartTime(performance.now());
      setGameState("active");
      setMessage(isAvoid ? "Avoid the red!" : sections === 1 ? "Click the circle!" : "Click the lit section!");

      if (isAvoid) {
        timeoutRef.current = setTimeout(() => {
          completeAvoidRound(roundNumber, nextIndex);
        }, redDurationSeconds * 1000);
      }
    }, getRandomDelay(delayMinSeconds * 1000, delayMaxSeconds * 1000));
  }

  function startGame() {
    saveSessionIfNeeded();
    clearTimer();
    clearSessionStats();

    if (sections === 1) {
      startWaiting(1);
    } else {
      setActiveRound(1);
      setGameState("center");
      setMessage("Move your mouse into the center deadzone to start.");
    }
  }

  function resetGame() {
    saveSessionIfNeeded();
    clearTimer();
    clearSessionStats();
    setGameState("idle");
    setMessage("Press Start to begin.");
  }

  function changeSections(amount) {
    saveSessionIfNeeded();
    clearTimer();
    clearSessionStats();
    setSections(amount);
    setGameState("idle");
    setMessage("Press Start to begin.");
  }

  function finishSession(updatedTimes, updatedCorrectActions, updatedTotalAttempts, updatedCompletedRounds) {
    const summary = buildSessionSummary(updatedTimes, updatedCorrectActions, updatedTotalAttempts, updatedCompletedRounds);
    addSessionToHistory(summary);
    setActiveRound(null);
    setGameState("finished");
    setMessage("Session complete. Nice work.");
  }

  function handleDeadzoneEnter() {
    if (gameState === "center") {
      startWaiting(getNextDisplayRound(completedRounds, activeRound));
    }
  }

  function completeAvoidRound(roundNumber, sectionIndex) {
    if (clickLockRef.current) return;
    clickLockRef.current = true;

    const sameRound = roundNumber ?? activeRound ?? completedRounds + 1;
    const updatedCorrectActions = correctActions + 1;
    const updatedTotalAttempts = totalAttempts + 1;

    // Avoiding red is a correct action, but it is NOT a completed round.
    // The same round continues and another target is shown.
    setCorrectActions(updatedCorrectActions);
    setTotalAttempts(updatedTotalAttempts);
    setActiveIndex(null);
    setActiveIsAvoid(false);

    if (sections === 1) {
      setMessage("Good avoid. Same round continues.");
      startWaiting(sameRound);
    } else {
      setActiveRound(sameRound);
      setGameState("center");
      setMessage("Good avoid. Return to the center deadzone for the same round.");
    }
  }

  function handleSegmentPointerDown(index) {
    const pointerTime = performance.now();

    if (gameState === "waiting") {
      setTotalAttempts((attempts) => attempts + 1);

      if (sections === 1) {
        setMessage("Too early.");
      } else {
        clearTimer();
        setGameState("center");
        setMessage("Too early. Return to the center deadzone to retry this round.");
      }
      return;
    }

    if (gameState !== "active") return;
    if (clickLockRef.current) return;

    const updatedTotalAttempts = totalAttempts + 1;
    setTotalAttempts(updatedTotalAttempts);

    if (activeIsAvoid && index === activeIndex) {
      clearTimer();
      setActiveIndex(null);
      setActiveIsAvoid(false);

      if (sections === 1) {
        setMessage("Red clicked. Retry this round.");
        startWaiting(activeRound ?? completedRounds + 1);
      } else {
        setGameState("center");
        setMessage("Red clicked. Return to the center deadzone to retry this round.");
      }
      return;
    }

    if (index !== activeIndex || activeIsAvoid) {
      if (sections === 1) {
        setMessage("Wrong click. Retry this round.");
      } else {
        clearTimer();
        setActiveIndex(null);
        setActiveIsAvoid(false);
        setGameState("center");
        setMessage("Wrong section. Return to the center deadzone to retry this round.");
      }
      return;
    }

    clickLockRef.current = true;

    const reactionTime = Math.round(pointerTime - startTime);
    const finishedRound = activeRound ?? completedRounds + 1;
    const nextCompletedRounds = completedRounds + 1;
    const nextRoundNumber = nextCompletedRounds + 1;
    const updatedTimes = [...reactionTimes, reactionTime];
    const updatedCorrectActions = correctActions + 1;

    setCompletedRounds(nextCompletedRounds);
    setActiveRound(null);
    setReactionTimes(updatedTimes);
    setCorrectActions(updatedCorrectActions);
    setRoundHistory((previous) => {
      const withoutCurrentRound = previous.filter((item) => item.round !== finishedRound);
      return [
        ...withoutCurrentRound,
        {
          id: `round-${finishedRound}`,
          round: finishedRound,
          time: reactionTime,
          section: index + 1,
          avoided: false,
        },
      ];
    });
    setActiveIndex(null);
    setActiveIsAvoid(false);

    if (!isEndless && nextCompletedRounds >= totalRounds) {
      finishSession(updatedTimes, updatedCorrectActions, updatedTotalAttempts, nextCompletedRounds);
      return;
    }

    if (sections === 1) {
      setMessage(`${reactionTime} ms`);
      startWaiting(nextRoundNumber);
    } else {
      setActiveRound(nextRoundNumber);
      setGameState("center");
      setMessage(`${reactionTime} ms. Return to the center deadzone.`);
    }
  }

  function handleSvgPointerMove(event) {
    if (sections === 1 || !cursorDotRef.current) return;

    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 400;
    const y = ((event.clientY - rect.top) / rect.height) * 400;

    cursorDotRef.current.setAttribute("cx", String(x));
    cursorDotRef.current.setAttribute("cy", String(y));
  }

  function handleRoundGoalPreset(amount) {
    saveSessionIfNeeded();
    setIsEndless(false);
    setRoundGoal(amount);
    clearTimer();
    clearSessionStats();
    setGameState("idle");
    setMessage("Press Start to begin.");
  }

  function handleRoundGoalInput(value) {
    saveSessionIfNeeded();
    setIsEndless(false);
    setRoundGoal(normalizeRoundGoal(value));
    clearTimer();
    clearSessionStats();
    setGameState("idle");
    setMessage("Press Start to begin.");
  }

  function handleEndlessMode() {
    saveSessionIfNeeded();
    setIsEndless(true);
    clearTimer();
    clearSessionStats();
    setGameState("idle");
    setMessage("Press Start to begin.");
  }

  function formatMs(value) {
    return value === null ? "—" : `${value} ms`;
  }

  function formatAccuracy(value) {
    return value === null ? "—" : `${value}%`;
  }

  function getActiveFill(index) {
    if (index !== activeIndex) return "rgb(24 24 27)";
    return activeIsAvoid ? "rgb(239 68 68)" : "white";
  }

  useEffect(() => {
    return () => clearTimer();
  }, []);

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
              <IconZap className="h-4 w-4" />
              Reaction Trainer
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Segmented Circle Reaction Test</h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              One section acts like a normal reaction test. Two to four sections use a small center reset point between targets. Choose a round count, light delay, or train endlessly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((amount) => (
              <Button
                key={amount}
                onClick={() => changeSections(amount)}
                variant={sections === amount ? "default" : "secondary"}
                className="rounded-2xl px-4"
              >
                {amount}
              </Button>
            ))}
          </div>
        </header>

        <div className="flex flex-col gap-3">
          <div className="w-full rounded-2xl border border-white/10 bg-zinc-950 p-4">
            <p className="mb-3 text-center text-sm font-semibold text-zinc-300">Round Amount & Light Delay</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs text-zinc-500">Rounds</span>
              {[10, 25, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  onClick={() => handleRoundGoalPreset(amount)}
                  variant={!isEndless && roundGoal === amount ? "default" : "secondary"}
                  className="rounded-xl px-3"
                >
                  {amount}
                </Button>
              ))}

              <input
                type="number"
                min="1"
                max="999"
                value={roundGoal}
                onChange={(event) => handleRoundGoalInput(event.target.value)}
                className="h-10 w-20 rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none"
              />

              <Button
                onClick={handleEndlessMode}
                variant={isEndless ? "default" : "secondary"}
                className="rounded-xl px-3"
              >
                Endless
              </Button>

              <div className="mx-2 hidden h-6 w-px bg-white/10 md:block" />

              <span className="text-xs text-zinc-500">Delay</span>
              <input
                type="number"
                min="0.25"
                max="30"
                step="0.25"
                value={delayMinSeconds}
                onChange={(event) => setDelayMinSeconds(normalizeDelaySeconds(event.target.value, 1.75))}
                className="h-10 w-16 rounded-xl border border-white/10 bg-black px-2 text-sm text-white outline-none"
              />
              <span className="text-xs text-zinc-500">to</span>
              <input
                type="number"
                min="0.25"
                max="30"
                step="0.25"
                value={delayMaxSeconds}
                onChange={(event) => setDelayMaxSeconds(normalizeDelaySeconds(event.target.value, 7))}
                className="h-10 w-16 rounded-xl border border-white/10 bg-black px-2 text-sm text-white outline-none"
              />
              <span className="text-xs text-zinc-500">s</span>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-white/10 bg-zinc-950 p-4">
            <p className="mb-3 text-center text-sm font-semibold text-zinc-300">Avoid Red Mode</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => setAvoidRedMode((value) => !value)}
                variant={avoidRedMode ? "default" : "secondary"}
                className="rounded-xl px-3"
              >
                Avoid Red
              </Button>

              <span className="text-xs text-zinc-500">Duration</span>
              <input
                type="number"
                min="0.25"
                max="30"
                step="0.25"
                value={redDurationSeconds}
                onChange={(event) => setRedDurationSeconds(normalizeDelaySeconds(event.target.value, 1.25))}
                className="h-10 w-16 rounded-xl border border-white/10 bg-black px-2 text-sm text-white outline-none"
              />
              <span className="text-xs text-zinc-500">s</span>

              <div className="mx-2 hidden h-6 w-px bg-white/10 md:block" />

              <span className="text-xs text-zinc-500">Frequency</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={redFrequencyPercent}
                onChange={(event) => setRedFrequencyPercent(normalizePercent(event.target.value, 25))}
                className="h-10 w-16 rounded-xl border border-white/10 bg-black px-2 text-sm text-white outline-none"
              />
              <span className="text-xs text-zinc-500">%</span>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4">
            <Button onClick={startGame} className="rounded-2xl px-6">
              <IconClick className="mr-2 h-4 w-4" />
              Start
            </Button>
            <Button onClick={resetGame} variant="secondary" className="rounded-2xl px-6">
              <IconReset className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="rounded-3xl border-white/10 bg-zinc-950 text-white">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-400">Round</p>
              <p className="mt-1 text-3xl font-bold">
                {completedRounds}/{isEndless ? "∞" : roundGoal}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/10 bg-zinc-950 text-white">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-400">Last</p>
              <p className="mt-1 text-3xl font-bold">{last ? `${last} ms` : "—"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-white/10 bg-zinc-950 text-white">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-400">Average</p>
              <p className="mt-1 text-3xl font-bold">{average ? `${average} ms` : "—"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-white/10 bg-zinc-950 text-white">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-400">Best</p>
              <p className="mt-1 text-3xl font-bold">{best ? `${best} ms` : "—"}</p>
            </CardContent>
          </Card>
        </section>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 text-center text-lg text-zinc-300">
          {message}
        </div>

        <main className="flex justify-center rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <svg
            viewBox="0 0 400 400"
            onPointerMove={handleSvgPointerMove}
            className={`h-[min(72vw,540px)] w-[min(72vw,540px)] overflow-visible ${sections > 1 ? "cursor-none" : "cursor-pointer"}`}
          >
            {sections === 1 ? (
              <circle
                cx={center}
                cy={center}
                r={outerRadius}
                onPointerDown={() => handleSegmentPointerDown(0)}
                className="cursor-pointer"
                fill={getActiveFill(0)}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="2"
              />
            ) : (
              <>
                <circle cx={center} cy={center} r={outerRadius + 7} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />

                {segments.map((path, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <path
                      key={`${sections}-${index}`}
                      d={path}
                      onPointerDown={() => handleSegmentPointerDown(index)}
                      className="cursor-pointer"
                      fill={isActive ? getActiveFill(index) : "rgb(24 24 27)"}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="1"
                    />
                  );
                })}

                <circle
                  cx={center}
                  cy={center}
                  r={deadzoneRadius}
                  onMouseEnter={handleDeadzoneEnter}
                  className="cursor-crosshair"
                  fill={gameState === "center" ? "rgba(255,255,255,0.95)" : "rgb(9 9 11)"}
                  stroke={gameState === "center" ? "white" : "rgba(255,255,255,0.25)"}
                  strokeWidth="2"
                />
                <circle
                  ref={cursorDotRef}
                  cx={cursorPos.x}
                  cy={cursorPos.y}
                  r="5"
                  className="pointer-events-none"
                  fill="white"
                  stroke="black"
                  strokeWidth="1.5"
                />
              </>
            )}
          </svg>
        </main>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Session History</h2>
              <p className="text-sm text-zinc-500">
                Red avoids count as correct actions, but they do not complete rounds. Reaction time averages only use normal click rounds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-black p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Total Rounds</p>
              <p className="mt-1 text-2xl font-bold">{currentSummary.totalRounds}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Lowest Time</p>
              <p className="mt-1 text-2xl font-bold">{formatMs(currentSummary.lowestTime)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Average Time</p>
              <p className="mt-1 text-2xl font-bold">{formatMs(currentSummary.averageTime)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Attempts</p>
              <p className="mt-1 text-2xl font-bold">{currentSummary.totalAttempts}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Accuracy</p>
              <p className="mt-1 text-2xl font-bold">{formatAccuracy(currentSummary.accuracy)}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-semibold text-zinc-300">Round Log</h3>
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-black">
                {sortedRoundHistory.length === 0 ? (
                  <p className="p-4 text-sm text-zinc-500">Completed rounds will appear here.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {sortedRoundHistory.map((item) => (
                      <div key={item.id} className="grid grid-cols-3 gap-2 p-3 text-sm">
                        <span className="text-zinc-500">Round {item.round}</span>
                        <span>{formatMs(item.time)}</span>
                        <span className="text-right text-zinc-500">{item.avoided ? "Avoided" : `Section ${item.section}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-semibold text-zinc-300">Previous Sessions</h3>
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-black">
                {sessionHistory.length === 0 ? (
                  <p className="p-4 text-sm text-zinc-500">Finished or reset sessions will appear here.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {sessionHistory.map((session) => (
                      <div key={session.id} className="p-3 text-sm">
                        <div className="mb-2 flex justify-between gap-3 text-zinc-400">
                          <span>
                            {session.sections} section{session.sections === 1 ? "" : "s"}
                          </span>
                          <span>{session.mode}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-300">
                          <span>Rounds: {session.totalRounds}</span>
                          <span>Accuracy: {formatAccuracy(session.accuracy)}</span>
                          <span>High: {formatMs(session.highestTime)}</span>
                          <span>Low: {formatMs(session.lowestTime)}</span>
                          <span>Attempts: {session.totalAttempts}</span>
                          <span>Average: {formatMs(session.averageTime)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="rounded-3xl border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-500">
          Mistakes do not complete a round. Red targets must be avoided, but avoiding red keeps you on the same round. In 2–4 section modes, return to the center deadzone to continue.
        </footer>
      </div>
    </div>
  );
}
