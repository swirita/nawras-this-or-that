import { test, expect } from '@playwright/test';
import questions from '../../src/data/questions.json' with { type: 'json' };
const key='nawras-this-or-that:leaderboard:v2';
const seeded={version:2,results:[{playerId:'saved',resultId:'saved-round',name:'Saved',score:80,answerTimeCs:100}]};
async function start(page) {
  await page.goto('./'); await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(({key,seeded})=>localStorage.setItem(key,JSON.stringify(seeded)),{key,seeded});
  await page.getByRole('textbox').fill('Reset player');
  await page.getByRole('button',{name:'Start',exact:true}).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
}
async function complete(page, wrongFirst = false) {
  for(let i=0;i<10;i++) {
    const id=await page.locator('[data-question-id]').getAttribute('data-question-id');
    const q=questions.find(q=>q.id===id);
    const choice=wrongFirst && i===0 ? q.options.find(o=>o.id!==q.correctOptionId).id : q.correctOptionId;
    await page.locator(`[data-option-id="${choice}"]`).click();
    await page.getByRole('button',{name:'Next',exact:true}).click();
  }
  await expect(page.getByRole('heading',{name:'Round complete'})).toBeVisible();
}
test('reset popup closes safely, continues timing and preserves question/reveal and scores',async({page})=>{
  await start(page);
  const before=await page.locator('.card-scene').boundingBox();
  const control=await page.getByRole('button',{name:'Reset / Stop',exact:true}).boundingBox();
  expect(Math.abs(control.x + control.width / 2 - before.x - before.width / 2)).toBeLessThan(1);
  expect(control.y).toBeGreaterThan(before.y + before.height);
  const id=await page.locator('[data-question-id]').getAttribute('data-question-id');
  await page.getByRole('button',{name:'Reset / Stop',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Reset game?'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Close reset popup'})).toBeFocused();
  expect(await page.locator('.card-scene').boundingBox()).toEqual(before);
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button',{name:'Reset Game',exact:true})).toBeFocused();
  const time=await page.getByTestId('answer-time').textContent();
  await page.waitForTimeout(150);
  await expect(page.getByTestId('answer-time')).not.toHaveText(time);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Reset / Stop',exact:true})).toBeFocused();
  expect(await page.locator('[data-question-id]').getAttribute('data-question-id')).toBe(id);
  await page.locator('.answer-button').first().click();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
  const stopped=await page.getByTestId('answer-time').textContent();
  await page.getByRole('button',{name:'Reset / Stop',exact:true}).click();
  await page.screenshot({path:'test-results/reset-popup.png'});
  await page.getByRole('button',{name:'Close reset popup'}).click();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
  expect(await page.getByTestId('answer-time').textContent()).toBe(stopped);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).toEqual(seeded);
  await page.getByRole('button',{name:'Reset / Stop',exact:true}).click();
  await page.getByRole('button',{name:'Reset Game',exact:true}).dblclick();
  await expect(page.getByTestId('progress')).toHaveText('1 / 10');
  await expect(page.getByTestId('score')).toHaveText('0');
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  expect(await page.locator('.flip-card').evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).toEqual(seeded);
  await complete(page,true);
  const first=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  expect(first.results).toHaveLength(2);
  const player=first.results.find(r=>r.name==='Reset player');
  await page.getByRole('button',{name:'Play Again'}).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  await page.getByRole('button',{name:'Reset / Stop',exact:true}).click();
  await page.getByRole('button',{name:'Reset Game',exact:true}).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  await complete(page);
  const second=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  expect(second.results).toHaveLength(2);
  expect(second.results.find(r=>r.name==='Reset player').playerId).toBe(player.playerId);
  expect(second.results.find(r=>r.name==='Reset player').resultId).not.toBe(player.resultId);
});
test('reset during an active flip cancels abandoned animations without saving or stale callbacks',async({page})=>{
  await start(page); await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.answer-button').first().evaluate(el=>el.addEventListener('click',()=>document.querySelector('.reset-button').click(),{once:true}));
  await page.locator('.answer-button').first().click();
  await expect(page.getByRole('dialog',{name:'Reset game?'})).toBeVisible();
  await page.getByRole('button',{name:'Reset Game',exact:true}).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  await page.waitForTimeout(700);
  await expect(page.getByTestId('progress')).toHaveText('1 / 10');
  await expect(page.getByTestId('score')).toHaveText('0');
  expect(await page.locator('.card-back').getAttribute('aria-hidden')).toBe('true');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).toEqual(seeded);
});
test('Home Screen abandons unanswered or revealed rounds, clears name and preserves scores',async({page})=>{
  await start(page);
  for(const reveal of [false,true]){
    if(reveal){
      await page.getByRole('textbox').fill('Another');
      await page.getByRole('button',{name:'Start',exact:true}).click();
      await expect(page.locator('.answer-button').first()).toBeEnabled();
      await page.locator('.answer-button').first().click();
      await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
    }
    await page.getByRole('button',{name:'Reset / Stop',exact:true}).click();
    await page.getByRole('button',{name:'Home Screen'}).click();
    await expect(page.getByRole('textbox')).toHaveValue('');
    await expect(page.getByRole('button',{name:'Start',exact:true})).toBeDisabled();
    expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).toEqual(seeded);
    expect(await page.locator('.particles').count()).toBe(1);
    expect(await page.locator('.particles i').count()).toBe(40);
  }
});
test('centered wrapped labels, particles, title shadow, square favicon and silent Next flip',async({page})=>{
  await page.addInitScript(()=>{
    const Native=window.AudioContext;window.soundStarts=[];
    window.AudioContext=class extends Native{
      createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(...args)=>{soundStarts.push('tone');return start(...args);};return o;}
      createBufferSource(){soundStarts.push('noise');return super.createBufferSource();}
    };
  });
  await page.goto('./');
  expect(await page.locator('.english-title').evaluate(el=>getComputedStyle(el).textShadow)).toBe(Array.from({length:8},(_,i)=>`rgb(255, 255, 255) 0px ${i+1}px 0px`).join(', '));
  const favicon=await page.locator('link[rel="icon"][sizes="32x32"]').getAttribute('href');
  expect(favicon).toContain('/nawras-this-or-that/assets/branding/favicon-32.png');
  expect((await page.request.get(favicon)).ok()).toBeTruthy();
  await page.getByRole('textbox').fill('Centered');await page.getByRole('button',{name:'Start',exact:true}).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  for(const button of await page.locator('.answer-button').all()){
    const outer=await button.boundingBox(),label=await button.locator('bdi').boundingBox();
    expect(Math.abs(outer.x+outer.width/2-label.x-label.width/2)).toBeLessThan(1);
    expect(Math.abs(outer.y+outer.height/2-label.y-label.height/2)).toBeLessThan(1);
  }
  await page.screenshot({path:'test-results/centered-labels.png'});
  await page.locator('.answer-button').first().click();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
  const count=await page.evaluate(()=>soundStarts.length);
  expect(await page.evaluate(()=>soundStarts.includes('noise'))).toBeFalsy();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  expect(await page.evaluate(()=>soundStarts.length)).toBe(count);
  await page.setViewportSize({width:390,height:700});
  await page.locator('.answer-button').first().locator('bdi').evaluate(el=>{el.textContent='A long wrapped answer label for checking centering';});
  const button=page.locator('.answer-button').first(),outer=await button.boundingBox(),label=await button.locator('bdi').boundingBox();
  expect(Math.abs(outer.y+outer.height/2-label.y-label.height/2)).toBeLessThan(1);
  expect(label.height).toBeLessThanOrEqual(outer.height);
  expect(await page.locator('.particles').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.particles i').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});
