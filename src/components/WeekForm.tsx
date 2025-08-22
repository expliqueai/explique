import { useState } from "react";
import Input, { InputWithCheckbox } from "./Input";
import { PrimaryButton } from "./PrimaryButton";

export type State = {
  name: string;
  startDate: string;
  softEndDate: string | null;
  endDate: string;
};

export default function WeekForm({
  initialState,
  onSubmit,
  submitLabel,
}: {
  initialState: State;
  onSubmit: (state: {
    name: string;
    startDate: number;
    softEndDate?: number;
    endDate: number;
    endDateExtraTime: number;
  }) => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialState.name);
  const [startDate, setStartDate] = useState(initialState.startDate);
  const [softEndDate, setSoftEndDate] = useState(initialState.softEndDate);
  const [endDate, setEndDate] = useState(initialState.endDate);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();

        onSubmit({
          name,
          startDate: +new Date(startDate),
          endDate: +new Date(endDate),
          softEndDate:
            softEndDate !== null ? +new Date(softEndDate) : undefined,
          endDateExtraTime: +new Date(endDate) + 1000 * 60 * 60 * 24, // + 1 day,
        });
      }}
    >
      {/* Name, start date, duration */}
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

      <InputWithCheckbox
        value={softEndDate}
        onChange={setSoftEndDate}
        label="Soft deadline"
        type="datetime-local"
        required
        hint="If set, this deadline will be the one shown to students. Late submissions are still possible until the hard deadline."
      />

      <Input
        value={endDate}
        onChange={setEndDate}
        label="Deadline"
        type="datetime-local"
        required
      />

      <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
    </form>
  );
}
