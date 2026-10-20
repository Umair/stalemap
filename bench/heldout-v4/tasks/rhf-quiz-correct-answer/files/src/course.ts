export interface Answer {
  text: string;
  correct: boolean;
}

export interface Question {
  prompt: string;
  answers: Answer[];
}

export interface Quiz {
  title: string;
  questions: Question[];
}

export interface Lesson {
  title: string;
  quizzes: Quiz[];
}

export interface Module {
  title: string;
  lessons: Lesson[];
}

/** Everything the course editor edits, as one react-hook-form form. */
export interface Course {
  title: string;
  modules: Module[];
}

/** Where a question sits in the course. */
export interface QuestionRef {
  module: number;
  lesson: number;
  quiz: number;
  question: number;
}
