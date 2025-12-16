"use client";

import { useState, useEffect, useCallback } from "react";

interface QuizQuestion {
  question: string;
  type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  chapter?: string;
}

interface QuizModeProps {
  bookId: string;
  questions: QuizQuestion[];
  chapterTitle?: string;
}

interface QuizState {
  currentIndex: number;
  selectedAnswer: string | null;
  showResult: boolean;
  score: number;
  answered: number;
  streak: number;
  maxStreak: number;
  questionResults: ("correct" | "incorrect" | null)[];
}

interface SpacedRepetitionData {
  questionId: string;
  lastReviewed: number;
  nextReview: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export default function QuizMode({ bookId, questions, chapterTitle }: QuizModeProps) {
  const [state, setState] = useState<QuizState>({
    currentIndex: 0,
    selectedAnswer: null,
    showResult: false,
    score: 0,
    answered: 0,
    streak: 0,
    maxStreak: 0,
    questionResults: new Array(questions.length).fill(null),
  });

  const [sessionTime, setSessionTime] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Timer
  useEffect(() => {
    if (isComplete) return;
    const timer = setInterval(() => setSessionTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[state.currentIndex];

  const handleSelectAnswer = useCallback((answer: string) => {
    if (state.showResult) return;
    setState((prev) => ({ ...prev, selectedAnswer: answer }));
  }, [state.showResult]);

  const handleSubmit = useCallback(() => {
    if (!state.selectedAnswer || state.showResult) return;

    const isCorrect = state.selectedAnswer === currentQuestion.correct_answer;
    const newResults = [...state.questionResults];
    newResults[state.currentIndex] = isCorrect ? "correct" : "incorrect";

    const newStreak = isCorrect ? state.streak + 1 : 0;

    setState((prev) => ({
      ...prev,
      showResult: true,
      score: isCorrect ? prev.score + 1 : prev.score,
      answered: prev.answered + 1,
      streak: newStreak,
      maxStreak: Math.max(prev.maxStreak, newStreak),
      questionResults: newResults,
    }));

    // Save to localStorage for spaced repetition
    const srKey = `sr_${bookId}`;
    try {
      const existing = JSON.parse(localStorage.getItem(srKey) || "{}");
      const questionId = `q_${state.currentIndex}`;
      const now = Date.now();

      if (!existing[questionId]) {
        existing[questionId] = {
          questionId,
          lastReviewed: now,
          nextReview: now + (isCorrect ? 86400000 : 3600000), // 1 day or 1 hour
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
        };
      } else {
        const item = existing[questionId];
        if (isCorrect) {
          item.repetitions++;
          item.interval = Math.round(item.interval * item.easeFactor);
          item.easeFactor = Math.max(1.3, item.easeFactor + 0.1);
        } else {
          item.repetitions = 0;
          item.interval = 1;
          item.easeFactor = Math.max(1.3, item.easeFactor - 0.2);
        }
        item.lastReviewed = now;
        item.nextReview = now + item.interval * 86400000;
      }

      localStorage.setItem(srKey, JSON.stringify(existing));
    } catch (e) {
      console.error("Failed to save spaced repetition data:", e);
    }
  }, [state, currentQuestion, bookId]);

  const handleNext = useCallback(() => {
    if (state.currentIndex < questions.length - 1) {
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedAnswer: null,
        showResult: false,
      }));
    } else {
      setIsComplete(true);
    }
  }, [state.currentIndex, questions.length]);

  const handleRestart = useCallback(() => {
    setState({
      currentIndex: 0,
      selectedAnswer: null,
      showResult: false,
      score: 0,
      answered: 0,
      streak: 0,
      maxStreak: 0,
      questionResults: new Array(questions.length).fill(null),
    });
    setIsComplete(false);
    setSessionTime(0);
  }, [questions.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key) - 1;
        if (currentQuestion?.options[idx]) {
          handleSelectAnswer(currentQuestion.options[idx]);
        }
      } else if (e.key === "Enter") {
        if (state.showResult) {
          handleNext();
        } else if (state.selectedAnswer) {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentQuestion, state, handleSelectAnswer, handleSubmit, handleNext]);

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4 opacity-50">🎯</div>
        <h2 className="text-2xl font-bold text-[var(--color-snow)] mb-2">No Quizzes Available</h2>
        <p className="text-[var(--color-pearl)]">
          {chapterTitle
            ? "This chapter doesn't have any quiz questions yet."
            : "Generate quizzes to test your knowledge."}
        </p>
      </div>
    );
  }

  // Completion Screen
  if (isComplete) {
    const percentage = Math.round((state.score / questions.length) * 100);
    const grade =
      percentage >= 90 ? "A" : percentage >= 80 ? "B" : percentage >= 70 ? "C" : percentage >= 60 ? "D" : "F";
    const gradeColor =
      percentage >= 90
        ? "var(--color-electric-emerald)"
        : percentage >= 70
        ? "var(--color-electric-blue)"
        : percentage >= 50
        ? "var(--color-electric-amber)"
        : "var(--color-electric-rose)";

    return (
      <div className="max-w-2xl mx-auto py-12 reveal-up">
        <div className="text-center mb-12">
          <div
            className="text-8xl font-black mb-4"
            style={{ color: gradeColor }}
          >
            {grade}
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-snow)] mb-2">Quiz Complete!</h2>
          <p className="text-[var(--color-pearl)]">{chapterTitle || "Full Book Quiz"}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="p-4 rounded-xl bg-[var(--color-slate)] border border-white/5 text-center">
            <div className="text-3xl font-bold gradient-text">{state.score}/{questions.length}</div>
            <div className="text-xs text-[var(--color-silver)] mt-1">Correct</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-slate)] border border-white/5 text-center">
            <div className="text-3xl font-bold text-[var(--color-electric-cyan)]">{percentage}%</div>
            <div className="text-xs text-[var(--color-silver)] mt-1">Score</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-slate)] border border-white/5 text-center">
            <div className="text-3xl font-bold text-[var(--color-electric-amber)]">{state.maxStreak}</div>
            <div className="text-xs text-[var(--color-silver)] mt-1">Best Streak</div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-slate)] border border-white/5 text-center">
            <div className="text-3xl font-bold text-[var(--color-electric-purple)] session-timer">
              {formatTime(sessionTime)}
            </div>
            <div className="text-xs text-[var(--color-silver)] mt-1">Time</div>
          </div>
        </div>

        {/* Question Review */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-[var(--color-silver)] uppercase tracking-wider mb-4">
            Question Review
          </h3>
          <div className="flex flex-wrap gap-2">
            {state.questionResults.map((result, idx) => (
              <div
                key={idx}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${
                  result === "correct"
                    ? "bg-[var(--color-electric-emerald)]/20 text-[var(--color-electric-emerald)]"
                    : result === "incorrect"
                    ? "bg-[var(--color-electric-rose)]/20 text-[var(--color-electric-rose)]"
                    : "bg-[var(--color-graphite)] text-[var(--color-steel)]"
                }`}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={handleRestart} className="btn-primary px-8">
            Try Again
          </button>
          <a href={`/book/${bookId}`} className="btn-secondary px-8">
            Back to Book
          </a>
        </div>
      </div>
    );
  }

  // Active Quiz
  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="badge badge-blue">
            Question {state.currentIndex + 1} of {questions.length}
          </div>
          {currentQuestion.chapter && (
            <span className="text-sm text-[var(--color-silver)]">{currentQuestion.chapter}</span>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Streak */}
          {state.streak > 0 && (
            <div className="flex items-center gap-2 text-[var(--color-electric-amber)]">
              <span className="text-lg">🔥</span>
              <span className="font-bold">{state.streak}</span>
            </div>
          )}

          {/* Timer */}
          <div className="text-sm text-[var(--color-pearl)] session-timer">{formatTime(sessionTime)}</div>

          {/* Score */}
          <div className="text-sm font-semibold text-[var(--color-electric-emerald)]">
            {state.score}/{state.answered}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-8">
        <div
          className="progress-bar-fill"
          style={{ width: `${((state.currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-[var(--color-slate)] rounded-2xl p-8 border border-white/5 mb-8">
        {/* Question type badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`badge ${
              currentQuestion.type === "multiple_choice"
                ? "badge-blue"
                : currentQuestion.type === "true_false"
                ? "badge-purple"
                : "badge-amber"
            }`}
          >
            {currentQuestion.type === "multiple_choice"
              ? "Multiple Choice"
              : currentQuestion.type === "true_false"
              ? "True/False"
              : "Scenario"}
          </span>
        </div>

        {/* Question text */}
        <h2 className="text-xl font-semibold text-[var(--color-snow)] leading-relaxed mb-8">
          {currentQuestion.question}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = state.selectedAnswer === option;
            const isCorrect = option === currentQuestion.correct_answer;
            const showAsCorrect = state.showResult && isCorrect;
            const showAsIncorrect = state.showResult && isSelected && !isCorrect;

            return (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(option)}
                disabled={state.showResult}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                  showAsCorrect
                    ? "answer-correct border-[var(--color-electric-emerald)]"
                    : showAsIncorrect
                    ? "answer-incorrect border-[var(--color-electric-rose)]"
                    : isSelected
                    ? "answer-selected border-[var(--color-electric-blue)]"
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                {/* Option number */}
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    showAsCorrect
                      ? "bg-[var(--color-electric-emerald)] text-white"
                      : showAsIncorrect
                      ? "bg-[var(--color-electric-rose)] text-white"
                      : isSelected
                      ? "bg-[var(--color-electric-blue)] text-white"
                      : "bg-[var(--color-graphite)] text-[var(--color-pearl)]"
                  }`}
                >
                  {idx + 1}
                </span>

                {/* Option text */}
                <span className="flex-1 text-[var(--color-cloud)]">{option}</span>

                {/* Result icon */}
                {state.showResult && (
                  <span className="text-xl flex-shrink-0">
                    {showAsCorrect ? "✓" : showAsIncorrect ? "✗" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {state.showResult && (
          <div className="mt-6 p-4 rounded-xl bg-[var(--color-graphite)] border border-white/5 reveal-up">
            <h4 className="text-sm font-semibold text-[var(--color-electric-cyan)] mb-2">Explanation</h4>
            <p className="text-sm text-[var(--color-pearl)] leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--color-steel)]">Press 1-4 to select, Enter to {state.showResult ? "continue" : "submit"}</div>

        {!state.showResult ? (
          <button
            onClick={handleSubmit}
            disabled={!state.selectedAnswer}
            className={`btn-primary px-8 ${!state.selectedAnswer ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Check Answer
          </button>
        ) : (
          <button onClick={handleNext} className="btn-primary px-8">
            {state.currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
          </button>
        )}
      </div>
    </div>
  );
}
