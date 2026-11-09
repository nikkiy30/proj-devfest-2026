import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseReply,
  playfulScore,
  replies,
  resolveCategory,
} from "../../src/lib/chinoke.ts";

test("explicit tags override keyword matches", () => {
  assert.equal(resolveCategory("love", "上司と残業と仕事"), "love");
  assert.equal(resolveCategory("general", "課題"), "general");
});

test("local keywords recognize all four specific categories", () => {
  for (const [text, expected] of [
    ["上司と残業がつらい", "work"],
    ["恋人とデート", "love"],
    ["大学の課題と単位", "study"],
    ["友達と約束したのにドタキャン", "friends"],
  ])
    assert.equal(resolveCategory("auto", text), expected);
});

test("normalizes Japanese half-width input", () => {
  assert.equal(resolveCategory("auto", "ﾊﾞｲﾄの話"), "work");
});

test("ties and no matches use a general reply instead of guessing", () => {
  assert.equal(resolveCategory("auto", "恋人と課題"), "general");
  assert.equal(resolveCategory("auto", "上司と恋人と課題"), "general");
  assert.equal(resolveCategory("auto", "大学の課題と友達"), "study");
  assert.equal(resolveCategory("auto", "疲れた"), "general");
  assert.equal(resolveCategory("auto", ""), "general");
});

test("contains the requested 17 replies, grouped 4/4/5/3/1", () => {
  assert.deepEqual(
    Object.values(replies).map((items) => items.length),
    [4, 4, 5, 3, 1],
  );
  assert.equal(new Set(Object.values(replies).flat()).size, 17);
  for (const category of Object.keys(replies)) {
    for (let i = 0; i < 20; i++)
      assert.ok(replies[category].includes(chooseReply(category)));
  }
});

test("playful score stays within bounds and follows volume", () => {
  assert.equal(playfulScore(-1), 58);
  assert.equal(playfulScore(0), 58);
  assert.equal(playfulScore(1), 99);
  assert.equal(playfulScore(2), 99);
  assert.ok(playfulScore(0.2) < playfulScore(0.8));
});
