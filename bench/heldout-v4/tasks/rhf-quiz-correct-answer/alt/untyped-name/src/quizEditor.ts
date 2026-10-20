import type { SetValueConfig, UseFormReturn } from "react-hook-form";
import type { Course, QuestionRef } from "./course.ts";

/** Used by the question card's title input. */
export function renameQuestion(form: UseFormReturn<Course>, at: QuestionRef, prompt: string): void {
  form.setValue(`modules.${at.module}.lessons.${at.lesson}.quizzes.${at.quiz}.questions.${at.question}.prompt`, prompt, {
    shouldDirty: true,
  });
}

// An answer's flag is deeper than react-hook-form's typed paths go, so set it through an untyped name.
type SetByName = (name: string, value: boolean, options?: SetValueConfig) => void;

/** Used by the "Mark as correct" button next to each answer. */
export function markCorrectAnswer(form: UseFormReturn<Course>, at: QuestionRef, answerIndex: number): void {
  const question = `modules.${at.module}.lessons.${at.lesson}.quizzes.${at.quiz}.questions.${at.question}` as const;
  const count = form.getValues(`${question}.answers`).length;
  const setByName = form.setValue as unknown as SetByName;
  for (let i = 0; i < count; i++) setByName(`${question}.answers.${i}.correct`, i === answerIndex, { shouldDirty: true });
}
