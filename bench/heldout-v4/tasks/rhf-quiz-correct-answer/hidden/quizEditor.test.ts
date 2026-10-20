import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { useForm } = await import("react-hook-form");
const load = (id: string): Promise<any> => import(id);
const { markCorrectAnswer, renameQuestion } = await load("../../src/quizEditor.ts");

const question = (prompt: string, correct: number, n = 3) => ({
  prompt,
  answers: Array.from({ length: n }, (_, i) => ({ text: `${prompt} answer ${i}`, correct: i === correct })),
});
const course = () => ({
  title: "Intro to TypeScript",
  modules: [
    {
      title: "Basics",
      lessons: [
        { title: "Types", quizzes: [{ title: "Check", questions: [question("q0", 0), question("q1", 2)] }] },
        { title: "Generics", quizzes: [{ title: "Check", questions: [question("g0", 1, 4)] }, { title: "Review", questions: [question("r0", 0)] }] },
      ],
    },
  ],
});

async function mountForm(): Promise<{ form: any; unmount: () => void }> {
  let form: any;
  function Editor() {
    form = useForm({ defaultValues: course() });
    return null;
  }
  const root = createRoot(document.getElementById("root")!);
  await React.act(async () => root.render(React.createElement(Editor)));
  return { form, unmount: () => root.unmount() };
}

test("marks the chosen answer correct and the question's others not", async () => {
  const { form, unmount } = await mountForm();
  const at = { module: 0, lesson: 1, quiz: 0, question: 0 };
  await React.act(async () => markCorrectAnswer(form, at, 3));
  const answers = form.getValues().modules[0].lessons[1].quizzes[0].questions[0].answers;
  assert.deepEqual(answers.map((a: any) => a.correct), [false, false, false, true]);
  assert.deepEqual(answers.map((a: any) => a.text), ["g0 answer 0", "g0 answer 1", "g0 answer 2", "g0 answer 3"]);

  await React.act(async () => markCorrectAnswer(form, at, 0));
  const again = form.getValues().modules[0].lessons[1].quizzes[0].questions[0].answers;
  assert.deepEqual(again.map((a: any) => a.correct), [true, false, false, false]);
  unmount();
});

test("other questions are left alone", async () => {
  const { form, unmount } = await mountForm();
  await React.act(async () => markCorrectAnswer(form, { module: 0, lesson: 0, quiz: 0, question: 1 }, 1));
  const values = form.getValues();
  const expected = course();
  expected.modules[0].lessons[0].quizzes[0].questions[1].answers.forEach((a, i) => (a.correct = i === 1));
  assert.deepEqual(values, expected);
  unmount();
});

test("renaming still works", async () => {
  const { form, unmount } = await mountForm();
  await React.act(async () => renameQuestion(form, { module: 0, lesson: 1, quiz: 1, question: 0 }, "Recap"));
  assert.equal(form.getValues().modules[0].lessons[1].quizzes[1].questions[0].prompt, "Recap");
  unmount();
});
