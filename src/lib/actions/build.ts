'use server'
import {
  ServerValidateError,
  createServerValidate,
} from "@tanstack/react-form/nextjs";

import { buildForm, buildSchema } from "@/shared/form";

const serverValidate = createServerValidate({
  ...buildForm,
  onServerValidate: buildSchema,
});

export default async function buildConfluxAction(
  prev: unknown,
  formData: FormData
) {
  try {
    console.log("Validating form data..."); 
    const validateData = await serverValidate(formData);
    console.log(validateData)
} catch (e) {
    if (e instanceof ServerValidateError) {
      return e.formState;
    }

    throw e;
  }
}
