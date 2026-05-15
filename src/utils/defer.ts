/**
 * Defers the execution of a function to the next tick.
 *
 * This is primarily used as a workaround for React 19 strict effects and lint warnings
 * (e.g., "Cannot update a component while rendering..."). By deferring state synchronization
 * to a macro-task (setTimeout), we avoid synchronous state updates during the render phase
 * or effect execution that could lead to cascading renders or interfere with text input caret updates.
 *
 * @param fn The function to defer.
 */
export function defer(fn: () => void): void {
  setTimeout(fn, 0);
}
