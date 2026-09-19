const H = (...children) => ({ direction: "h", children }),
  V = (...children) => ({ direction: "v", children });
const layouts = [
  H(4 / 5, 4 / 5),
  V(3, 3),
  H(5 / 4, 9 / 16),
  H(1, 3 / 4),
  H(5 / 4, V(1, 1)),
  H(9 / 16, 9 / 16, 9 / 16),
  V(3, H(21 / 9, 21 / 9)),
  V(H(4 / 3, 4 / 3), 3),
  V(H(16 / 9, 16 / 9), H(16 / 9, 16 / 9)),
  H(5 / 4, V(2, 2, 2)),
  V(3, H(3 / 2, 16 / 10, 3 / 2)),
  H(V(2, 2, 2), 5 / 4),
  V(H(16 / 9, 1), H(1, 4 / 3, 21 / 9)),
  V(H(16 / 9, 4 / 5), H(16 / 9, 16 / 9, 16 / 9)),
  H(9 / 16, V(H(5 / 4, 5 / 4), H(5 / 4, 5 / 4))),
  V(H(3 / 2, 3 / 2), H(3 / 2, 3 / 2, 3 / 2)),
  H(V(H(5 / 4, 5 / 4), H(4 / 5, 4 / 5, 3 / 4)), 9 / 16),
  V(H(5 / 4, 5 / 4, 5 / 4), H(5 / 4, 5 / 4, 5 / 4)),
  V(3, H(1, 1, 1, 1, 1)),
  H(V(16 / 9, H(4 / 5, 4 / 5)), V(16 / 9, H(4 / 5, 4 / 5))),
];
function ratio(n) {
  return typeof n === "number"
    ? n
    : n.direction === "h"
      ? n.children.reduce((s, c) => s + ratio(c), 0)
      : 1 / n.children.reduce((s, c) => s + 1 / ratio(c), 0);
}
export function composition(id) {
  const tree = layouts[id - 1] || layouts[0],
    width = 960,
    height = width / ratio(tree),
    boxes = [];
  function place(n, x, y, w, h) {
    if (typeof n === "number") {
      const gap = 7;
      boxes.push({ x: x + gap, y: y + gap, w: w - gap * 2, h: h - gap * 2 });
      return;
    }
    let offset = 0;
    const total = n.children.reduce(
      (s, c) => s + (n.direction === "h" ? ratio(c) : 1 / ratio(c)),
      0,
    );
    for (const c of n.children) {
      const fraction = (n.direction === "h" ? ratio(c) : 1 / ratio(c)) / total;
      place(
        c,
        x + (n.direction === "h" ? offset * w : 0),
        y + (n.direction === "v" ? offset * h : 0),
        n.direction === "h" ? w * fraction : w,
        n.direction === "v" ? h * fraction : h,
      );
      offset += fraction;
    }
  }
  place(tree, 0, 0, width, height);
  return { width, height, boxes };
}
