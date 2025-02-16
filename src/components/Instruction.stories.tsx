import type { Meta, StoryObj } from "@storybook/react";
import Instruction from "./Instruction";

const meta = {
  title: "Components/Instruction",
  component: Instruction,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Instruction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: "info",
    children: (
      <>
        Explain how <strong>quick sort</strong> works.
      </>
    ),
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    children: (
      <>
        <strong>Congrats!</strong> Let’s go to the next exercise.
      </>
    ),
  },
};

export const Error: Story = {
  args: {
    variant: "error",
    children: (
      <>
        <strong>Oops!</strong> An error has occurred.
      </>
    ),
  },
};
