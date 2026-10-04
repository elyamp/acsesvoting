export function applySavedTheme() {
  let savedTheme: string | null = null;

  try {
    savedTheme = localStorage.getItem("acses-theme");
  } catch {
    savedTheme = null;
  }

  const useDarkTheme =
    savedTheme === null
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : savedTheme === "dark";

  document.documentElement.classList.toggle("dark", useDarkTheme);
  return useDarkTheme;
}