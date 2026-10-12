"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { QuizBlock as QuizBlockData } from "@/lib/content/types/lesson";
import { useLessonSide } from "../LessonContext";
import { InlineMathText } from "./MarkdownBlock";

type EndState = "idle" | "wrong1" | "right" | "revealed";

const LETTERS = "ABCDEF";

function optionClass(kind: "plain" | "picked" | "right" | "wrong") {
  const base = "lesson-quiz-option flex min-h-[3.5rem] w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-2 text-left font-sans text-[1.0625rem] transition-colors disabled:cursor-default";
  if (kind === "picked") return `${base} border-[#FFC700] bg-[#FFC700]/15`;
  if (kind === "right") return `${base} border-[#6FD59B] bg-[#6FD59B]/25`;
  if (kind === "wrong") return `${base} border-[#FFB38A] bg-[#FFB38A]/20 opacity-70`;
  return `${base} border-white/30 bg-white/[0.07] hover:bg-white/[0.12]`;
}

function badgeClass(kind: "plain" | "picked" | "right" | "wrong") {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-sm font-bold";
  if (kind === "picked") return `${base} bg-[#FFC700] text-[#1A1814]`;
  if (kind === "right") return `${base} bg-[#6FD59B] text-[#0F3D2E]`;
  if (kind === "wrong") return `${base} bg-[#FFB38A] text-[#2B1A5E]`;
  return `${base} bg-white/20 text-white`;
}

export function QuizBlock({ id, variant, questions }: QuizBlockData) {
  const { sideSlot, reportQuiz } = useLessonSide();
  const isEnd = variant === "end";
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState(-1);
  const [checked, setChecked] = useState(false); // mid: answer has been checked
  const [explain, setExplain] = useState(false); // mid: explanation is open
  const [endState, setEndState] = useState<EndState>("idle");
  const [tries, setTries] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);
  const reported = useRef(false);

  const question = questions[Math.min(index, questions.length - 1)];
  const lastQuestion = index >= questions.length - 1;

  useEffect(() => {
    reportQuiz(id, false);
    reported.current = true;
  }, [id, reportQuiz]);
  useEffect(() => {
    if (reported.current) reportQuiz(id, finished);
  }, [finished, id, reportQuiz]);

  if (!question) return null;

  const midLocked = !isEnd && checked;
  const endLocked = isEnd && (endState === "right" || endState === "revealed");
  const locked = midLocked || endLocked;
  const midRight = pick === question.answerIndex;

  const kindFor = (optionIndex: number): "plain" | "picked" | "right" | "wrong" => {
    if (!isEnd) {
      if (checked && optionIndex === question.answerIndex) return "right";
      if (checked && pick === optionIndex) return "wrong";
      if (!checked && pick === optionIndex) return "picked";
      return "plain";
    }
    if (endLocked && optionIndex === question.answerIndex) return "right";
    if (wrongPicks.includes(optionIndex) && endState !== "right") return "wrong";
    if (endState === "idle" && pick === optionIndex) return "picked";
    return "plain";
  };

  const onCheck = () => {
    if (pick < 0 || locked) return;
    if (!isEnd) {
      setChecked(true);
      if (pick === question.answerIndex) {
        setCorrect((value) => value + 1);
        setFirstTry((value) => value + 1);
      }
      return;
    }
    if (pick === question.answerIndex) {
      setEndState("right");
      setCorrect((value) => value + 1);
      if (tries === 0) setFirstTry((value) => value + 1);
    } else if (tries === 0) {
      setEndState("wrong1");
      setTries(1);
      setWrongPicks([pick]);
      setPick(-1);
    } else {
      setEndState("revealed");
      setWrongPicks((value) => value.concat([pick]));
    }
  };

  const onNext = () => {
    if (lastQuestion) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setPick(-1);
    setChecked(false);
    setExplain(false);
    setEndState("idle");
    setTries(0);
    setWrongPicks([]);
  };

  const onRestart = () => {
    setIndex(0);
    setPick(-1);
    setChecked(false);
    setExplain(false);
    setEndState("idle");
    setTries(0);
    setWrongPicks([]);
    setCorrect(0);
    setFirstTry(0);
    setFinished(false);
  };

  const checkLabel = isEnd && endState === "wrong1" ? "Try again" : "Check answer";
  const canCheck = pick >= 0 && !locked;

  let side: ReactNode = null;
  if (!finished) {
    if (!isEnd) {
      side = (
        <>
          {checked ? (
            <div className={`lesson-quiz-card ${midRight ? "lesson-quiz-good" : "lesson-quiz-bad"}`}>
              <p className="font-sans text-base font-bold">{midRight ? "Correct." : "Not quite."}</p>
              {!midRight ? (
                <p className="mt-1 font-sans text-[0.95rem]">
                  The answer is {LETTERS[question.answerIndex]}: <InlineMathText text={question.options[question.answerIndex]} />
                </p>
              ) : null}
            </div>
          ) : null}
          {explain && checked ? (
            <div className="lesson-quiz-card lesson-quiz-explain">
              <p className="font-sans text-sm font-semibold text-[#FFC700]">Explanation</p>
              <p className="mt-1 font-sans text-[1.0625rem] leading-relaxed">
                <InlineMathText text={question.explanation} />
              </p>
            </div>
          ) : null}
        </>
      );
    } else if (endState !== "idle") {
      const title =
        endState === "wrong1"
          ? "Not quite."
          : endState === "right"
            ? tries === 0
              ? "Correct on the first try."
              : "Correct on the second try."
            : `The answer is ${LETTERS[question.answerIndex]}: ${question.options[question.answerIndex]}`;
      side = (
        <div className={`lesson-quiz-card ${endState === "right" ? "lesson-quiz-good" : "lesson-quiz-bad"}`}>
          <p className="font-sans text-base font-bold">
            <InlineMathText text={title} />
          </p>
          <p className="mt-1 font-sans text-[1.0625rem] leading-relaxed">
            {endState === "wrong1" ? "You have one more try. Pick another option." : <InlineMathText text={question.explanation} />}
          </p>
        </div>
      );
    }
  }

  const sidePortal = side ? (sideSlot ? createPortal(side, sideSlot) : <div className="mt-4 flex flex-col gap-3">{side}</div>) : null;

  if (finished) {
    return (
      <div className="lesson-quiz flex flex-col gap-4">
        <p className="font-sans text-sm font-semibold text-[#FFC700]">{isEnd ? "End-of-lesson test" : "Mid-lesson test"} · Results</p>
        <p className="font-serif text-[2rem] leading-tight">
          You got {correct} of {questions.length}
        </p>
        <p className="font-serif text-[1.15rem] leading-relaxed opacity-90">
          {isEnd
            ? `${firstTry} on the first try. Questions you missed twice showed you the answer so you can review them.`
            : "You can continue to the next part of the lesson."}
        </p>
        <div>
          <button type="button" onClick={onRestart} className="min-h-12 rounded-xl border border-white/40 px-5 font-sans text-sm font-semibold">
            Retake the test
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-quiz flex flex-col gap-4">
      <p className="font-sans text-sm font-semibold text-[#FFC700]">
        {isEnd ? "End-of-lesson test" : "Mid-lesson test"} · Question {index + 1} of {questions.length}
      </p>
      <p className="font-serif text-[1.6rem] leading-snug md:text-[2rem]">
        <InlineMathText text={question.prompt} />
      </p>
      <div className="flex flex-col gap-3" role="group" aria-label="Answer options">
        {question.options.map((option, optionIndex) => {
          const kind = kindFor(optionIndex);
          const disabled = locked || (isEnd && wrongPicks.includes(optionIndex));
          return (
            <button key={optionIndex} type="button" disabled={disabled} onClick={() => setPick(optionIndex)} className={optionClass(kind)}>
              <span className={badgeClass(kind)}>{LETTERS[optionIndex]}</span>
              <span className="min-w-0 flex-1 font-serif text-[1.25rem] leading-snug">
                <InlineMathText text={option} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!locked ? (
          <button
            type="button"
            onClick={onCheck}
            disabled={!canCheck}
            className="min-h-12 rounded-xl bg-[#FFC700] px-6 font-sans text-sm font-bold text-[#1A1814] disabled:bg-white/15 disabled:text-white/50"
          >
            {checkLabel}
          </button>
        ) : null}
        {!isEnd && checked ? (
          <button type="button" onClick={() => setExplain((value) => !value)} className="min-h-12 rounded-xl border border-white/40 px-5 font-sans text-sm font-semibold">
            {explain ? "Hide explanation" : "Show explanation"}
          </button>
        ) : null}
        {locked ? (
          <button type="button" onClick={onNext} className="min-h-12 rounded-xl bg-[#FFC700] px-6 font-sans text-sm font-bold text-[#1A1814]">
            {lastQuestion ? "See results" : "Next question"}
          </button>
        ) : null}
      </div>
      {sidePortal}
    </div>
  );
}
