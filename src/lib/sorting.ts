export const sortBy =
  <T>(
    getKey: (item: T) => string | number | undefined,
    type: "number" | "string" = "number"
  ) =>
  (a: T, b: T) => {
    const A = getKey(a);
    const B = getKey(b);

    if (type === "string") {
      return String(A ?? "").localeCompare(String(B ?? ""));
    }

    const nA = Number(A);
    const nB = Number(B);

    if (Number.isNaN(nA) && Number.isNaN(nB)) return 0;
    if (Number.isNaN(nA)) return 1;
    if (Number.isNaN(nB)) return -1;

    return nA - nB;
  };
