import { render, screen, fireEvent } from "@testing-library/react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { BookCardMenu } from "@/components/BookCardMenu";

describe("BookCardMenu", () => {
  let confirmSpy: Mock;

  beforeEach(() => {
    confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(false) as unknown as Mock;
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it("renders the trigger button", () => {
    render(<BookCardMenu bookTitle="Test Book" onDelete={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Book options" });
    expect(button).toBeInTheDocument();
  });

  it("toggles the menu on click", () => {
    render(<BookCardMenu bookTitle="Test Book" onDelete={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Book options" });

    // Menu should not be visible initially
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(trigger);
    expect(screen.getByText("Delete")).toBeInTheDocument();

    // Click again to close
    fireEvent.click(trigger);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("closes the menu on Escape", () => {
    render(<BookCardMenu bookTitle="Test Book" onDelete={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Book options" });

    fireEvent.click(trigger);
    expect(screen.getByText("Delete")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("closes the menu on click outside", () => {
    render(<BookCardMenu bookTitle="Test Book" onDelete={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Book options" });

    fireEvent.click(trigger);
    expect(screen.getByText("Delete")).toBeInTheDocument();

    fireEvent.mouseDown(document);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("calls window.confirm with the book title", () => {
    render(<BookCardMenu bookTitle="My Great Book" onDelete={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Book options" });
    fireEvent.click(trigger);

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Delete "My Great Book"? This cannot be undone.',
    );
  });

  it("calls onDelete when confirmed", () => {
    confirmSpy.mockReturnValue(true);
    const onDelete = vi.fn();

    render(<BookCardMenu bookTitle="Test Book" onDelete={onDelete} />);

    const trigger = screen.getByRole("button", { name: "Book options" });
    fireEvent.click(trigger);

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("does NOT call onDelete when cancelled", () => {
    confirmSpy.mockReturnValue(false);
    const onDelete = vi.fn();

    render(<BookCardMenu bookTitle="Test Book" onDelete={onDelete} />);

    const trigger = screen.getByRole("button", { name: "Book options" });
    fireEvent.click(trigger);

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("stops event propagation on trigger button click", () => {
    const parentClickHandler = vi.fn();

    render(
      <div onClick={parentClickHandler}>
        <BookCardMenu bookTitle="Test Book" onDelete={vi.fn()} />
      </div>,
    );

    const trigger = screen.getByRole("button", { name: "Book options" });
    fireEvent.click(trigger);

    expect(parentClickHandler).not.toHaveBeenCalled();
  });
});
