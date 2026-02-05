import React from "react";
import { render } from "@testing-library/react-native";
import { AgentVisualizer } from "./AgentVisualizer";

describe("AgentVisualizer", () => {
  it("renders correctly in idle state", () => {
    const { toJSON } = render(<AgentVisualizer state="idle" />);
    expect(toJSON()).toMatchSnapshot();
  });

  it("renders correctly in listening state", () => {
    const { toJSON } = render(
      <AgentVisualizer state="listening" volume={0.5} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it("renders correctly in speaking state", () => {
    const { toJSON } = render(
      <AgentVisualizer state="speaking" volume={0.8} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
