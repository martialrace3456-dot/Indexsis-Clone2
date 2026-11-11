/** Smoothly scroll a container so the matched section's top sits at the container's visible top. */
export function scrollSectionToTop(container: HTMLElement | null, selector: string) {
  if (!container) return;
  const el = container.querySelector(selector) as HTMLElement | null;
  if (!el) return;
  const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  // Also bring the container itself into view on small screens.
  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
