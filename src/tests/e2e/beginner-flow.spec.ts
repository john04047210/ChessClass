import { test,expect } from "@playwright/test";

for (const locale of ["zh-CN","en","ja"]) test(`beginner flow works in ${locale}`,async({page})=>{
  await page.goto(`/${locale}`); await page.locator("#nickname").fill(`Learner-${locale}`); await page.locator("form button[type=submit]").click();
  await expect(page.locator("[aria-label='Chess board']")).toBeVisible();
  if(locale==="zh-CN"){await page.locator("[data-square='b1']").hover();await expect(page.getByRole("tooltip")).toHaveText("白方 · 马",{timeout:2_000});await page.locator("[data-square='e2']").hover();}
  const playerId=await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).playerId);
  await page.locator("[data-square='e2']").click(); await page.locator("[data-square='e4']").click();
  if(locale==="zh-CN"){await expect(page.locator("[data-animation-phase='preparing']")).toBeVisible({timeout:3_000});await expect(page.locator("[data-animation-phase='landed']")).toBeVisible({timeout:3_000});}
  await expect(page.locator(".coach-section").first()).toBeVisible({timeout:15_000});
  await expect(page.locator(".app-shell")).toHaveAttribute("data-opponent-engine","stockfish");
  const coachText=await page.locator(".coach-section .coach-text").first().innerText();
  const fen=await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.fen); expect(fen).toBeTruthy();
  await page.getByTestId("undo").click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.fen)).not.toBe(fen);
  await page.getByTestId("redo").click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.fen)).toBe(fen);
  await page.reload(); await expect(page.locator("[aria-label='Chess board']")).toBeVisible();
  await expect(page.locator(".coach-section .coach-text").first()).toHaveText(coachText);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).playerId)).toBe(playerId);
  await page.locator("#locale").selectOption(locale==="en"?"ja":"en"); await page.waitForURL(/\/(en|ja)\/?$/);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.fen)).toBe(fen);
});

test("the static root selects a locale without a server redirect",async({page})=>{
  await page.goto("/");
  await page.waitForURL(/\/(zh-CN|en|ja)\/?$/);
  await expect(page.locator("#nickname")).toBeVisible();
});

test("the starter engine takes over when Stockfish cannot load",async({page})=>{
  await page.route("**/stockfish-18-lite-single.js",route=>route.abort());
  await page.goto("/zh-CN");await page.locator("#nickname").fill("备用引擎测试");await page.locator("form button[type=submit]").click();
  await page.locator("[data-square='e2']").click();await page.locator("[data-square='e4']").click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-opponent-engine","starter",{timeout:15_000});
  await expect(page.locator(".coach-section").first()).toBeVisible({timeout:15_000});
});

test("a player can select and retain the starter engine",async({page})=>{
  await page.goto("/zh-CN");await page.locator("#nickname").fill("引擎选择测试");await page.locator("form button[type=submit]").click();
  await page.getByTestId("engine-select").selectOption("starter");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).opponentEngine)).toBe("starter");
  await page.locator("[data-square='e2']").click();await page.locator("[data-square='e4']").click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-opponent-engine","starter",{timeout:15_000});
  await page.reload();await expect(page.getByTestId("engine-select")).toHaveValue("starter");
});

test("a new move after reviewing history discards the abandoned future branch",async({page})=>{
  await page.goto("/zh-CN");await page.locator("#nickname").fill("复盘学习者");await page.locator("form button[type=submit]").click();
  await page.locator("[data-square='e2']").click();await page.locator("[data-square='e4']").click();await expect(page.locator(".coach-section").first()).toBeVisible({timeout:15_000});
  await page.locator("[data-square='g1']").click();await page.locator("[data-square='f3']").click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.timeline.cursor)).toBe(2);
  await page.getByTestId("undo").click();await page.getByTestId("undo").click();await page.getByTestId("redo").click();
  await expect(page.getByTestId("redo")).toBeEnabled();
  await page.locator("[data-square='d2']").click();await page.locator("[data-square='d4']").click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.timeline.cursor),{timeout:15_000}).toBe(2);
  await expect(page.getByTestId("redo")).toBeDisabled();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.timeline.nodes.length)).toBe(3);
});

test("Chinese nickname works when the mobile browser has no crypto.randomUUID",async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(Crypto.prototype,"randomUUID",{value:undefined,configurable:true});});
  await page.goto("/ja");await page.locator("#nickname").fill("中文昵称");await page.locator("form button[type=submit]").click();
  await expect(page.locator("[aria-label='Chess board']")).toBeVisible();
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!));
  expect(profile.nickname).toBe("中文昵称");expect(profile.playerId).toMatch(/^[0-9a-f-]{36}$/);
});
