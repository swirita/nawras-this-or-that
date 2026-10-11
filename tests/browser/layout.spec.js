import { test, expect } from '@playwright/test';
import questions from '../../src/data/questions.json' with { type: 'json' };
test('1366×768 laptop layout stays stable through feedback; smaller screens scroll', async ({page}) => {
  await page.setViewportSize({width:1366,height:768}); await page.goto('./');
  await page.getByRole('textbox').fill('Layout');
  await page.getByRole('button',{name:'Start',exact:true}).click();
  for(let i=0;i<10;i++){
    const id=await page.locator('[data-question-id]').getAttribute('data-question-id');
    const q=questions.find(q=>q.id===id);
    const options=page.locator('.card-scene');
    await expect(page.locator(`[data-option-id="${q.correctOptionId}"]`)).toBeEnabled();
    const before=await options.boundingBox();
    await page.locator(`[data-option-id="${q.correctOptionId}"]`).click();
    await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
    expect(await options.boundingBox()).toEqual(before);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBeTruthy();
    expect(await page.locator('.feedback p bdi').evaluateAll(nodes=>nodes.every(n=>n.dir==='ltr'))).toBeTruthy();
    await page.getByRole('button',{name:'Next',exact:true}).click();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBeTruthy();
  await page.screenshot({path:'test-results/results-laptop.png'});
  await page.getByRole('button',{name:'Play Again'}).click();
  await page.setViewportSize({width:390,height:700});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  const first=await page.locator('.answer-button').first().boundingBox();
  const second=await page.locator('.answer-button').nth(1).boundingBox();
  expect(second.y).toBeGreaterThan(first.y+first.height);
  await page.screenshot({path:'test-results/game-mobile.png',fullPage:true});
  await page.reload();
  await page.getByRole('button',{name:'Leaderboard',exact:true}).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
});
