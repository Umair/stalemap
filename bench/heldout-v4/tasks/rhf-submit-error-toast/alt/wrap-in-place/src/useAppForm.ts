import { useForm, type FieldValues, type UseFormProps, type UseFormReturn } from "react-hook-form";
import { notify } from "./notify.ts";

/** useForm with our app defaults. Every form in the app uses this instead of useForm. */
export function useAppForm<T extends FieldValues>(props?: UseFormProps<T>): UseFormReturn<T> {
  const form = useForm<T>({ mode: "onBlur", ...props });
  const original = form.handleSubmit;
  return {
    ...form,
    handleSubmit: (onValid, onInvalid) => (event) =>
      original(onValid, onInvalid)(event).catch((error: unknown) => {
        notify.error(error instanceof Error ? error.message : String(error));
        return undefined;
      }),
  };
}
