import { useForm, type FieldValues, type UseFormProps, type UseFormReturn } from "react-hook-form";
import { notify } from "./notify.ts";

/** useForm with our app defaults. Every form in the app uses this instead of useForm. */
export function useAppForm<T extends FieldValues>(props?: UseFormProps<T>): UseFormReturn<T> {
  return useForm<T>({ mode: "onBlur", ...props });
}
