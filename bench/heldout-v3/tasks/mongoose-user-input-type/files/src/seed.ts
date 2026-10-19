import { User, type UserInput } from "./models/user.ts";

export const seedUsers: UserInput[] = [
  { email: "ada@example.com", name: "Ada Lovelace", roles: ["admin"], marketingOptIn: false, age: 36 },
  { email: "grace@example.com", name: "Grace Hopper", roles: [], marketingOptIn: true },
];

export async function seed(): Promise<void> {
  await User.insertMany(seedUsers);
}
