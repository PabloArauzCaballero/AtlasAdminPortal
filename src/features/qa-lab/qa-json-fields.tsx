import { Field, Textarea } from "@/shared/components/ui/input";

export type QaJsonField = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function QaJsonFields({ fields }: Readonly<{ fields: QaJsonField[] }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <Field key={field.label} label={field.label}>
          <Textarea
            spellCheck={false}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            className="min-h-36 font-mono text-xs"
          />
        </Field>
      ))}
    </div>
  );
}
