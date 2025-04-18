import { useState } from "react";
import Input from "./Input";
import { PrimaryButton } from "./PrimaryButton";

export type State = {
  name: string;
};

export default function LectureWeekForm({
  initialState,
  onSubmit,
  submitLabel,
}: {
  initialState: State;
  onSubmit: (state: { name: string }) => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialState.name);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
        });
      }}
    >
      <Input
        value={name}
        onChange={setName}
        label="Name"
        placeholder="Week 1"
        required
      />

      <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
    </form>
  );
}
