import type { Meta, StoryObj } from "@storybook/react";

import { PrimaryButton } from "./PrimaryButton";

const meta: Meta<typeof PrimaryButton> = {
  component: PrimaryButton,
  args: {
    children: "PrimaryButton",
    onClick() {},
  },
};

export default meta;
type Story = StoryObj<typeof PrimaryButton>;

export const Primary: Story = {
  args: {},
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
