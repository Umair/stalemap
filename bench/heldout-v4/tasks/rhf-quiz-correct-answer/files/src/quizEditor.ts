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
  throw new Error("not implemented");
}
