import type { Meta, StoryObj } from "@storybook/react";
import ChatBubble from "./ChatBubble";

const meta: Meta<typeof ChatBubble> = {
  component: ChatBubble,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof ChatBubble>;

export const User: Story = {
  args: {
    author: "user",
    contents: {
      type: "message",
      message: "Hey! I am a student.",
    },
  },
};

export const System: Story = {
  args: {
    author: "system",
    contents: {
      type: "message",
      message: "Why is the algorithm in $$O(n^2)$$?",
    },
    report: {
      isReported: false,
      onReport: async (reason) => {
        console.log("Reporting with reason:", reason);
      },
      onUnreport: async () => {
        console.log("Unreporting message");
      },
    },
  },
};

export const Reported: Story = {
  args: {
    author: "system",
    contents: {
      type: "message",
      message: "Bubble sort is the most efficient sorting algorithm.",
    },
    report: {
      isReported: true,
      onReport: async (reason) => {
        console.log("Reporting with reason:", reason);
      },
      onUnreport: async () => {
        console.log("Unreporting message");
      },
    },
  },
};

export const Typing: Story = {
  args: {
    author: "system",
    contents: {
      type: "typing",
    },
  },
};

export const Error: Story = {
  args: {
    author: "system",
    contents: {
      type: "error",
    },
  },
};
