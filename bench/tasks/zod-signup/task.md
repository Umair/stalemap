In `src/signup.ts`, export `SignupSchema`: a zod schema for `{ email: string; age: number }` with exactly these error messages:

- email missing: "Email is required"
- email not a string: "Email must be text"
- email not a valid address: "Invalid email"
- age below 18: "Must be 18 or older"
