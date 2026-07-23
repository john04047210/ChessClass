import { test,expect } from "@playwright/test";

const sitePath = process.env.E2E_BASE_PATH || "";
const siteUrl = (path: string) => `${sitePath}${path}`;

const boardLabels:Record<string,string>={"zh-CN":"国际象棋棋盘",en:"Chess board",ja:"チェス盤"};

for (const locale of ["zh-CN","en","ja"]) test(`beginner flow works in ${locale}`,async({page})=>{
  await page.goto(siteUrl(`/${locale}`)); await page.locator("#nickname").fill(`Learner-${locale}`); await page.locator("form button[type=submit]").click();
  await expect(page.locator(`[aria-label='${boardLabels[locale]}']`)).toBeVisible();
  if(locale==="zh-CN"){await page.locator("[data-square='b1']").hover();await expect(page.getByRole("tooltip")).toHaveText("白方 · 马",{timeout:2_000});await expect(page.getByRole("tooltip")).toBeHidden({timeout:2_500});await page.locator("[data-square='e2']").hover();}
  const playerId=await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).playerId);
  await page.locator("[data-square='e2']").click(); await page.locator("[data-square='e4']").click();
  if(locale==="zh-CN"){await expect(page.locator("[data-animation-phase='preparing']")).toBeVisible({timeout:3_000});await expect(page.locator("[data-animation-phase='landed']")).toBeVisible({timeout:3_000});}
  await expect(page.locator('[data-message-type="coach_comment"]').first()).toBeVisible({timeout:15_000});
  await expect(page.locator(".app-shell")).toHaveAttribute("data-opponent-engine","stockfish");
  const coachText=await page.locator('[data-message-type="coach_comment"] p').first().innerText();
  await expect(page.locator('[data-message-type="player_move"]')).toHaveCount(1);
  await expect(page.locator('[data-message-type="opponent_decision"]')).toHaveCount(1);
  if(locale==="zh-CN"){
    await page.getByRole("button",{name:"推荐走法"}).click();
    await expect(page.locator('[data-message-type="player_question"] p').last()).toHaveText("推荐走法");
    await expect(page.locator('[data-message-type="coach_advice"] p').last()).toContainText("推荐走法",{timeout:15_000});
    await expect.poll(()=>page.locator(".conversation-body").evaluate(node=>Math.round(node.scrollHeight-node.scrollTop-node.clientHeight))).toBeLessThanOrEqual(2);
  }
  const fen=await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.fen); expect(fen).toBeTruthy();
  await page.getByTestId("undo").click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.fen)).not.toBe(fen);
  await page.getByTestId("redo").click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.fen)).toBe(fen);
  await page.reload(); await expect(page.locator(`[aria-label='${boardLabels[locale]}']`)).toBeVisible();
  await expect(page.locator('[data-message-type="coach_comment"] p').first()).toHaveText(coachText);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).playerId)).toBe(playerId);
  await page.locator("#locale").selectOption(locale==="en"?"ja":"en"); await page.waitForURL(/\/(en|ja)\/?$/);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.fen)).toBe(fen);
});

test("rules and practical tips remain available during a game",async({page})=>{
  await page.goto(siteUrl("/zh-CN"));await page.locator("#nickname").fill("规则学习者");await page.locator("form button[type=submit]").click();
  await page.locator(".board-toolbar").getByRole("button",{name:/规则/}).click();
  await expect(page.getByRole("heading",{name:"国际象棋规则"})).toBeVisible();
  await expect(page.locator(".reference-board span")).toHaveCount(64);
  await page.getByRole("button",{name:"技巧",exact:true}).click();
  await expect(page.getByRole("heading",{name:"实战技巧"})).toBeVisible();
  await expect(page.getByText("先发展马和象")).toBeVisible();
});

test("the selected avatar style is saved locally",async({page})=>{
  await page.goto(siteUrl("/zh-CN"));await page.locator("#nickname").fill("女生头像测试");await page.getByText("女生",{exact:true}).click();await page.locator("form button[type=submit]").click();
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!));expect(profile.gender).toBe("female");expect(profile.avatarId).toBe("female");
  await expect(page.locator(".avatar-player").first()).toHaveText("👩");expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes("analytics")))).toEqual([]);
});

test("the beginner guide can be permanently dismissed on its last step",async({page})=>{
  await page.goto(siteUrl("/zh-CN"));await page.locator("#nickname").fill("引导测试");await page.locator("form button[type=submit]").click();
  await expect(page.getByText("先记住这一点")).toBeVisible();
  await page.getByRole("button",{name:"知道了 →"}).click();await page.getByRole("button",{name:"知道了 →"}).click();
  await expect(page.getByTestId("guide-dismiss")).toHaveText("不再显示");await page.getByTestId("guide-dismiss").click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).guideDismissed)).toBe(true);
  await page.reload();await expect(page.getByText("先记住这一点")).toHaveCount(0);
});

test("local coach can be disabled while the computer conversation remains",async({page})=>{
  await page.goto(siteUrl("/zh-CN"));await page.locator("#nickname").fill("关闭教练测试");await page.locator("form button[type=submit]").click();
  await page.locator(".coach-mode select").selectOption("disabled");
  await page.locator("[data-square='e2']").click();await page.locator("[data-square='e4']").click();
  await expect(page.locator('[data-message-type="opponent_decision"]')).toBeVisible({timeout:15_000});
  await expect(page.locator('[data-message-type="coach_comment"]')).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).coachMode)).toBe("disabled");
});

test("the static root selects a locale without a server redirect",async({page})=>{
  await page.goto(siteUrl("/"));
  await page.waitForURL(/\/(zh-CN|en|ja)\/?$/);
  await expect(page.locator("#nickname")).toBeVisible();
});

test("search engines receive static localized content and discovery files",async({request})=>{
  const chinese=await request.get(siteUrl("/zh-CN/"));expect(chinese.ok()).toBe(true);
  const html=await chinese.text();
  expect(html).toContain("从第一步开始，边下边学国际象棋");
  expect(html).toContain('rel="canonical" href="https://chess9527.com/zh-CN/"');
    expect(html).toContain('hrefLang="en"');
  const robots=await request.get(siteUrl("/robots.txt"));expect(robots.ok()).toBe(true);expect(await robots.text()).toContain("Sitemap: https://chess9527.com/sitemap.xml");
  const sitemap=await request.get(siteUrl("/sitemap.xml"));expect(sitemap.ok()).toBe(true);expect(await sitemap.text()).toContain("https://chess9527.com/ja/tips/");
});

test("the Baidu verification files are published at the site root",async({request})=>{
  const verificationFiles={
    "/baidu_verify_codeva-YsESFE2Mq1.html":"e231fe267534e8693e696eaef8c94d85",
    "/baidu_verify_codeva-Y5sYBxcRWI.html":"e6090a1bcfb61072beb235be7df5f17c",
  };
  for(const [path,expected] of Object.entries(verificationFiles)){
    const response=await request.get(siteUrl(path));
    expect(response.ok()).toBe(true);
    expect((await response.text()).trim()).toBe(expected);
  }
});

test("public rules and tips are available in every language",async({page})=>{
  const pages=[["/zh-CN/rules/","国际象棋规则"],["/en/tips/","Practical Tips"],["/ja/rules/","チェスのルール"]] as const;
  for(const [path,title] of pages){await page.goto(siteUrl(path));await expect(page.getByRole("heading",{level:1,name:title})).toBeVisible();}
});

test("a first-time visitor can change language before creating a profile",async({page})=>{
  await page.goto(siteUrl("/zh-CN"));await page.locator("#welcome-locale").selectOption("ja");await page.waitForURL(/\/ja\/?$/);
  await expect(page.getByRole("heading",{name:"指しながらチェスを学ぼう"})).toBeVisible();await expect(page.locator("#nickname")).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("chess-coach-player-v1"))).toBeNull();
});

test("the starter engine takes over when Stockfish cannot load",async({page})=>{
  await page.route("**/stockfish-18-lite-single.js",route=>route.abort());
  await page.goto(siteUrl("/zh-CN"));await page.locator("#nickname").fill("备用引擎测试");await page.locator("form button[type=submit]").click();
  await page.getByTestId("engine-select").selectOption("stockfish");
  await page.locator("[data-square='e2']").click();await page.locator("[data-square='e4']").click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-opponent-engine","starter",{timeout:15_000});
  await expect(page.locator('[data-message-type="coach_comment"]').first()).toBeVisible({timeout:15_000});
});

test("a player can select and retain the starter engine",async({page})=>{
  await page.goto(siteUrl("/zh-CN"));await page.locator("#nickname").fill("引擎选择测试");await page.locator("form button[type=submit]").click();
  await page.getByTestId("engine-select").selectOption("starter");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).opponentEngine)).toBe("starter");
  await page.locator("[data-square='e2']").click();await page.locator("[data-square='e4']").click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-opponent-engine","starter",{timeout:15_000});
  await page.reload();await expect(page.getByTestId("engine-select")).toHaveValue("starter");
});

test("a player can select and retain the growing engine",async({page})=>{
  await page.goto(siteUrl("/zh-CN"));await page.locator("#nickname").fill("成长引擎测试");await page.locator("form button[type=submit]").click();
  await expect(page.getByTestId("engine-select").locator("option")).toHaveCount(3);
  await page.getByTestId("engine-select").selectOption("growing");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).opponentEngine)).toBe("growing");
  await page.locator("[data-square='e2']").click();await page.locator("[data-square='e4']").click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-opponent-engine","growing");
  await expect(page.locator('[data-message-type="opponent_decision"]')).toBeVisible({timeout:15_000});
  await page.reload();await expect(page.getByTestId("engine-select")).toHaveValue("growing");
});

test("a new move after reviewing history discards the abandoned future branch",async({page})=>{
  await page.goto(siteUrl("/zh-CN"));await page.locator("#nickname").fill("复盘学习者");await page.locator("form button[type=submit]").click();
  await page.locator("[data-square='e2']").click();await page.locator("[data-square='e4']").click();await expect(page.locator('[data-message-type="coach_comment"]').first()).toBeVisible({timeout:15_000});
  await page.locator("[data-square='g1']").click();await page.locator("[data-square='f3']").click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.timeline.cursor)).toBe(2);
  await page.getByTestId("undo").click();await page.getByTestId("undo").click();await page.getByTestId("redo").click();
  await expect(page.getByTestId("redo")).toBeEnabled();
  await page.locator("[data-square='d2']").click();await page.locator("[data-square='d4']").click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.timeline.cursor),{timeout:15_000}).toBe(2);
  await expect(page.getByTestId("redo")).toBeDisabled();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!).currentGame.timeline.nodes.length)).toBe(3);
});

test("Chinese nickname works when the mobile browser has no crypto.randomUUID",async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(Crypto.prototype,"randomUUID",{value:undefined,configurable:true});});
  await page.goto(siteUrl("/ja"));await page.locator("#nickname").fill("中文昵称");await page.locator("form button[type=submit]").click();
  await expect(page.locator("[aria-label='チェス盤']")).toBeVisible();
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem("chess-coach-player-v1")!));
  expect(profile.nickname).toBe("中文昵称");expect(profile.playerId).toMatch(/^[0-9a-f-]{36}$/);
});
