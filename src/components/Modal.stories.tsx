import type { Meta, StoryObj } from "@storybook/react";

import { Modal } from "./Modal";
import { useState } from "react";
import { PrimaryButton } from "./PrimaryButton";

const meta: Meta<typeof Modal> = {
  component: Modal,
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Primary: Story = {
  args: {
    title: "Hello world",
    children: "This is a modal",
  },
  render: Template,
};

function Template(args: Parameters<typeof Modal>[0]) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <>
      <PrimaryButton onClick={() => setIsOpen(true)}>Open</PrimaryButton>

      <Modal
        {...args}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </>
  );
}
