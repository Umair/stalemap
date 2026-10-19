import { z } from "zod";

const User = z.object({ name: z.string(), age: z.number().int().min(0) });

const user = User.parse({ name: "Ada", age: 36 });
console.log(`${user.name} is ${user.age}`);
