export function handleSearchShortcut(event: KeyboardEvent, open: () => void): void {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.repeat) return;
  if (
    event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          (target.isContentEditable || target.matches("input, textarea, select")),
      )
  )
    return;
  const slash = event.key === "/" && !(event.ctrlKey || event.metaKey || event.altKey);
  const command =
    (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k";
  if (!slash && !command) return;
  event.preventDefault();
  open();
}
