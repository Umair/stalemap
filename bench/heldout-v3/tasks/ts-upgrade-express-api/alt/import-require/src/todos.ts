import express = require("express");

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}

export const router = express.Router();
const todos: Todo[] = [];

router.get("/", (_req, res) => {
  res.json(todos);
});

router.post("/", (req, res) => {
  const todo: Todo = { id: todos.length + 1, title: String(req.body.title), done: false };
  todos.push(todo);
  res.status(201).json(todo);
});
