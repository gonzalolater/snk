import { getBestRoute } from "@snk/compute/getBestRoute";
import { Color, copyGrid, Grid } from "@snk/types/grid";
import { step } from "@snk/compute/step";
import { isStableAndBound, stepSpring } from "./springUtils";
import { Res } from "@snk/github-user-contribution";
import { Snake } from "@snk/types/snake";
import {
  drawLerpWorld,
  getCanvasWorldSize,
  Options,
} from "@snk/draw/drawWorld";
import { userContributionToGrid } from "../action/userContributionToGrid";
import { snake3 } from "@snk/types/__fixtures__/snake";

const createForm = ({
  onSubmit,
  onChangeUserName,
}: {
  onSubmit: (s: string) => Promise<void>;
  onChangeUserName: (s: string) => void;
}) => {
  const form = document.createElement("form");
  form.style.position = "relative";
  form.style.display = "flex";
  form.style.flexDirection = "row";
  const input = document.createElement("input");
  input.addEventListener("input", () => onChangeUserName(input.value));
  input.style.padding = "16px";
  input.placeholder = "github user";
  const submit = document.createElement("button");
  submit.style.padding = "16px";
  submit.type = "submit";
  submit.innerText = "ok";

  const label = document.createElement("label");
  label.style.position = "absolute";
  label.style.textAlign = "center";
  label.style.top = "60px";
  label.style.left = "0";
  label.style.right = "0";

  form.appendChild(input);
  form.appendChild(submit);
  document.body.appendChild(form);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit(input.value).catch((err) => {
      label.innerText = "error :(";
      throw err;
    });

    input.disabled = true;
    submit.disabled = true;
    form.appendChild(label);
    label.innerText = "loading ...";
  });

  //
  // dispose
  const dispose = () => {
    document.body.removeChild(form);
  };

  return { dispose };
};

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

const createGithubProfile = () => {
  const container = document.createElement("div");
  container.style.padding = "20px";
  container.style.opacity = "0";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "flex-start";
  const image = document.createElement("img");
  image.style.width = "100px";
  image.style.height = "100px";
  image.style.borderRadius = "50px";
  const name = document.createElement("a");
  name.style.padding = "4px 0 0 0";

  document.body.appendChild(container);
  container.appendChild(image);
  container.appendChild(name);

  image.addEventListener("load", () => {
    container.style.opacity = "1";
  });
  const onChangeUser = (userName: string) => {
    container.style.opacity = "0";
    name.innerText = userName;
    name.href = `https://github.com/${userName}`;
    image.src = `https://github.com/${userName}.png`;
  };

  const dispose = () => {
    document.body.removeChild(container);
  };

  return { dispose, onChangeUser };
};

const createViewer = ({
  grid0,
  chain,
  drawOptions,
}: {
  grid0: Grid;
  chain: Snake[];
  drawOptions: Options;
}) => {
  //
  // canvas
  const canvas = document.createElement("canvas");
  const { width, height } = getCanvasWorldSize(grid0, drawOptions);
  canvas.width = width;
  canvas.height = height;

  const w = Math.min(width, window.innerWidth);
  const h = (height / width) * w;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.style.pointerEvents = "none";

  document.body.appendChild(canvas);

  //
  // draw
  let animationFrame: number;
  const spring = { x: 0, v: 0, target: 0 };
  const springParams = { tension: 120, friction: 20, maxVelocity: 50 };
  const ctx = canvas.getContext("2d")!;
  const loop = () => {
    cancelAnimationFrame(animationFrame);

    stepSpring(spring, springParams, spring.target);
    const stable = isStableAndBound(spring, spring.target);

    const grid = copyGrid(grid0);
    const stack: Color[] = [];
    for (let i = 0; i < Math.min(chain.length, spring.x); i++)
      step(grid, stack, chain[i]);

    const snake0 = chain[clamp(Math.floor(spring.x), 0, chain.length - 1)];
    const snake1 = chain[clamp(Math.ceil(spring.x), 0, chain.length - 1)];
    const k = spring.x % 1;

    ctx.clearRect(0, 0, 9999, 9999);
    drawLerpWorld(ctx, grid, snake0, snake1, stack, k, drawOptions);

    if (!stable) animationFrame = requestAnimationFrame(loop);
  };
  loop();

  //
  // controls
  const input = document.createElement("input") as any;
  input.type = "range";
  input.value = 0;
  input.step = 1;
  input.min = 0;
  input.max = chain.length;
  input.style.width = "calc( 100% - 20px )";
  input.addEventListener("input", () => {
    spring.target = +input.value;
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  });
  const onClickBackground = (e: MouseEvent) => {
    if (e.target === document.body || e.target === document.body.parentElement)
      input.focus();
  };
  window.addEventListener("click", onClickBackground);
  document.body.append(input);

  //
  // dispose
  const dispose = () => {
    window.removeEventListener("click", onClickBackground);
    cancelAnimationFrame(animationFrame);
    document.body.removeChild(canvas);
    document.body.removeChild(input);
  };

  return { dispose };
};

const onSubmit = async (userName: string) => {
  const res = await fetch(
    `https://snk-one.vercel.app/api/github-user-contribution/${userName}`
  );
  const { cells, colorScheme } = (await res.json()) as Res;

  const drawOptions = {
    sizeBorderRadius: 2,
    sizeCell: 16,
    sizeDot: 12,
    colorBorder: "#1b1f230a",
    colorDots: colorScheme as any,
    colorEmpty: colorScheme[0],
    colorSnake: "purple",
    cells,
  };

  const snake = snake3;
  const grid = userContributionToGrid(cells);
  const chain = getBestRoute(grid, snake)!;
  dispose();

  createViewer({ grid0: grid, chain, drawOptions });
};

const profile = createGithubProfile();
const { dispose } = createForm({
  onSubmit,
  onChangeUserName: profile.onChangeUser,
});

document.body.style.margin = "0";
document.body.style.display = "flex";
document.body.style.flexDirection = "column";
document.body.style.alignItems = "center";
document.body.style.justifyContent = "center";
document.body.style.height = "100%";
document.body.style.width = "100%";
document.body.style.position = "absolute";