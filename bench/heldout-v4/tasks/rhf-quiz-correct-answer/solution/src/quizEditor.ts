import type { UseFormReturn } from "react-hook-form";
import type { Course, QuestionRef } from "./course.ts";

/** Used by the question card's title input. */
export function renameQuestion(form: UseFormReturn<Course>, at: QuestionRef, prompt: string): void {
  form.setValue(`modules.${at.module}.lessons.${at.lesson}.quizzes.${at.quiz}.questions.${at.question}.prompt`, prompt, {
    shouldDirty: true,
  });
}

/** Used by the "Mark as correct" button next to each answer. */
export function markCorrectAnswer(form: UseFormReturn<Course>, at: QuestionRef, answerIndex: number): void {
  // Set the whole answers array: react-hook-form's typed paths stop at 10 segments, and a single answer's
  // `correct` flag is 11 deep.
  const path = `modules.${at.module}.lessons.${at.lesson}.quizzes.${at.quiz}.questions.${at.question}.answers` as const;
  const answers = form.getValues(path);
  form.setValue(
    path,
    answers.map((answer, i) => ({ ...answer, correct: i === answerIndex })),
    { shouldDirty: true },
  );
}
