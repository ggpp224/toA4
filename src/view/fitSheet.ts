/** Largest rectangle of the given width/height aspect that fits inside the bounds. */
export function containSize(
  bounds: { width: number; height: number },
  aspect: number,
): { width: number; height: number } {
  if (bounds.width <= 0 || bounds.height <= 0 || aspect <= 0) {
    return { width: 0, height: 0 };
  }
  const boundsAspect = bounds.width / bounds.height;
  if (boundsAspect > aspect) {
    return { width: bounds.height * aspect, height: bounds.height };
  }
  return { width: bounds.width, height: bounds.width / aspect };
}

export const VIEW_ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export function stepViewZoom(zoom: number, direction: -1 | 1): number {
  const index = VIEW_ZOOM_STEPS.findIndex((step) => step >= zoom - 0.001);
  const current = index === -1 ? VIEW_ZOOM_STEPS.length - 1 : index;
  const next = Math.min(VIEW_ZOOM_STEPS.length - 1, Math.max(0, current + direction));
  return VIEW_ZOOM_STEPS[next]!;
}
