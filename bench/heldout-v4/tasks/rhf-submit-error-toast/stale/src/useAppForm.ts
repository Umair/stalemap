import { useForm, type FieldValues, type UseFormHandleSubmit, type UseFormProps, type UseFormReturn } from "react-hook-form";
import { notify } from "./notify.ts";

/** useForm with our app defaults. Every form in the app uses this instead of useForm. */
export function useAppForm<T extends FieldValues>(props?: UseFormProps<T>): UseFormReturn<T> {
  const form = useForm<T>({ mode: "onBlur", ...props });

  // Errors thrown by a submit handler become an error toast instead of an unhandled rejection.
  const handleSubmit: UseFormHandleSubmit<T> = (onValid, onInvalid) =>
    form.handleSubmit(async (data, event) => {
      try {
        await onValid(data, event);
      } catch (error) {
        notify.error(error instanceof Error ? error.message : String(error));
      }
    }, onInvalid);

  return { ...form, handleSubmit };
}
