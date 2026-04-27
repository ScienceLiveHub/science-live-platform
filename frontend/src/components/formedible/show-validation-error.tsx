import { AnyFieldApi } from "@tanstack/form-core";

/**
 * Intended for showing validation errors for Formedible field custom components.
 *
 */
export default function ShowValidationError({
  fieldApi,
}: {
  fieldApi: AnyFieldApi;
}) {
  const hasErrors =
    fieldApi.state?.meta?.isTouched && fieldApi.state?.meta?.errors?.length > 0;

  return (
    <>
      {hasErrors && (
        <div className="text-xs text-destructive">
          {fieldApi.state?.meta?.errors?.map(
            (err: string | Error, index: number) => (
              <p key={index}>
                {typeof err === "string"
                  ? err
                  : (err as Error)?.message || "Invalid"}
              </p>
            ),
          )}
        </div>
      )}
    </>
  );
}
