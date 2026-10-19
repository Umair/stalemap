import { z } from "zod";

const Email = z.email();

const result = Email.safeParse("not-an-email");
if (!result.success) console.log(result.error.issues[0]?.message);
