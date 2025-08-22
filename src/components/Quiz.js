import React, { useEffect, useRef, useState } from "react";
import "./Quiz.css";

const Quiz = () => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [order, setOrder] = useState([]);
  const [round, setRound] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLost, setIsLost] = useState(false);
  const advanceTimerRef = useRef(null);
  const ADVANCE_DELAY_MS = 650;
  const TARGET_ROUNDS = 10;

  function buildOrder(pool) {
    const poolLength = Array.isArray(pool) ? pool.length : 0;
    const totalRounds = Math.min(TARGET_ROUNDS, poolLength);
    const indices = Array.from({ length: poolLength }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const nextOrder = indices.slice(0, totalRounds);
    setOrder(nextOrder);
    setRound(0);
    setCurrentIndex(nextOrder[0] ?? 0);
    setSelectedIndex(null);
    setShowAnswer(false);
    setScore(0);
    setIsLost(false);
  }

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (isMounted) setIsLoading(true);
      let pool = [];
      const candidateUrls = [
        "/sherep-questions.json",
        "/sherep-questions-round-2.json",
      ];

      try {
        const res = await fetch(candidateUrls[roundNumber - 1], {
          cache: "no-store",
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          pool = data;
        }
      } catch (_) {
        // try next url
      }

      if (!pool) pool = [];
      if (isMounted) {
        setQuestions(pool);
        buildOrder(pool);
      }
      if (isMounted) setIsLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [roundNumber]);

  // ensure timers are cleared on unmount; must be before any early return
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="quiz__container">
        <div className="quiz quiz--loading fade-in">
          <div className="spinner" />
          <p>Բեռնվում է...</p>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const total = Math.min(TARGET_ROUNDS, questions.length);
  const isFinished = round >= total;

  function handleSelect(index) {
    if (showAnswer) return;
    setSelectedIndex(index);
    const isCorrect = index === question.correctIndex;
    if (isCorrect) {
      setScore((s) => s + 1);
      setShowAnswer(true);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        handleNext();
      }, ADVANCE_DELAY_MS);
    } else {
      setIsLost(true);
      setShowAnswer(true);
    }
  }

  function handleNext() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    const nextRound = round + 1;
    if (nextRound < total) {
      setRound(nextRound);
      setCurrentIndex(order[nextRound]);
      setSelectedIndex(null);
      setShowAnswer(false);
    } else {
      setRound(nextRound); // equals total -> finished
    }
  }

  function handleRestart() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setError(null);
    setRoundNumber(1);
    buildOrder(questions);
  }

  function handleNextRound() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setRoundNumber(2);
  }

  if (isFinished) {
    return (
      <div className="quiz__container">
        <div className="quiz quiz--result rise-in">
          <h2 className="quiz__title">Շերեփ Քվիզ</h2>
          <>
            <div className="score-badge pop">
              {score} / {total}
            </div>
            {roundNumber === 1 ? (
              <>
                <p className="muted">
                  Շնորհավորում ենք, դուք անցաք հաջորդ փուլ
                </p>
                <button className="btn btn--primary" onClick={handleNextRound}>
                  Հաջորդ փուլ
                </button>
              </>
            ) : (
              <>
                <p className="muted">Շնորհավորում ենք, դուք հաղթեցիք</p>
                <button className="btn" onClick={handleRestart}>
                  Նոր խաղ
                </button>
              </>
            )}
          </>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz__container">
      <div className="quiz slide-up">
        <div className="quiz__top">
          <h2 className="quiz__title">Շերեփ Քվիզ</h2>
          <div className="progress">
            <div
              className="progress__bar"
              style={{ width: `${total ? ((round + 1) / total) * 100 : 0}%` }}
            />
            <span className="progress__label">
              {Math.min(round + 1, total)} / {total}
            </span>
          </div>
        </div>

        <div className="question fade-in">
          <p className="question__text">{question.prompt}</p>
        </div>

        <div className="options">
          {question.options.map((opt, idx) => {
            const isCorrect = showAnswer && idx === question.correctIndex;
            const isWrong =
              showAnswer &&
              selectedIndex === idx &&
              idx !== question.correctIndex;
            const className = [
              "option",
              selectedIndex === idx && !showAnswer ? "option--selected" : "",
              isCorrect ? "option--correct pop" : "",
              isWrong ? "option--wrong shake" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={idx}
                className={className}
                onClick={() => handleSelect(idx)}
                disabled={showAnswer}
              >
                <span className="option__index">{idx + 1}</span>
                <span className="option__text">{opt}</span>
              </button>
            );
          })}
        </div>

        <div className="quiz__bottom">
          {error ? <p className="error">{String(error)}</p> : <span />}
          <div className="bottom-actions">
            <p className="muted">{isLost ? "Խաղը ավարտված է" : ""}</p>
            <button className="btn" onClick={handleRestart}>
              Նոր խաղ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
