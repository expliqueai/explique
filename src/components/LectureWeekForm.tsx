import { useState } from "react";
import Input from "./Input";
import { PrimaryButton } from "./PrimaryButton";

export type State = {
  name: string;
  startDate: string;
};

export default function LectureWeekForm({
  initialState,
  onSubmit,
  submitLabel,
}: {
  initialState: State;
  onSubmit: (state: { name: string; startDate: number }) => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialState.name);
  const [startDate, setStartDate] = useState(initialState.startDate);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name,
          startDate: +new Date(startDate),
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

      <Input
        value={startDate}
        onChange={setStartDate}
        label="Release"
        type="datetime-local"
        required
      />

      <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
    </form>
  );
}
