import { required } from "./validators.ts";

export default { title: "Forms/Validators" };
export const Empty = { args: { error: required("") } };
