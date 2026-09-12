# Betkyo provably-fair verifier

![One rounding, not many — why the verifier must match the server bit for bit](docs/cover.webp)

A dependency-free Node script that recomputes a Betkyo round from the revealed server seed, your client seed, the nonce and the cursor — the same inputs and the same constructions the site's browser verifier uses.

```bash
node verify.mjs commit   <serverSeed>                        # SHA-256 fingerprint to compare with the commitment shown before play
node verify.mjs u        <serverSeed> <clientSeed> <nonce> [cursor]   # the uniform number in [0,1)
node verify.mjs limbo    <serverSeed> <clientSeed> <nonce>   # Limbo outcome in hundredths (×1.00 = 100)
node verify.mjs roulette <serverSeed> <clientSeed> <nonce>   # pocket 0–36
node verify.mjs sicbo    <serverSeed> <clientSeed> <nonce>   # three dice
node verify.mjs koban    <serverSeed> <clientSeed> <nonce> <flips>   # faces, 0 = omote, 1 = ura
```

## Worked example

A test seed, so you can check the script against itself before you check it against a round:

```bash
$ node verify.mjs commit 0000000000000000000000000000000000000000000000000000000000000001
c386d8e8d07342f2e39e189c8e6c57bb205bb373fe4e3a6f69404a8bb767b417
$ node verify.mjs limbo    0000000000000000000000000000000000000000000000000000000000000001 betkyo 1
186            # ×1.86
$ node verify.mjs roulette 0000000000000000000000000000000000000000000000000000000000000001 betkyo 1
17             # pocket 17
$ node verify.mjs sicbo    0000000000000000000000000000000000000000000000000000000000000001 betkyo 1
[3,2,1]        # three dice, total 6
$ node verify.mjs koban    0000000000000000000000000000000000000000000000000000000000000001 betkyo 1 5
[0,0,0,1,0]    # five flips, 0 = omote, 1 = ura
```

On a real round: take the revealed server seed from the fairness panel after rotating your seed pair, the client seed and nonce from the bet record, and compare `commit` with the fingerprint you were shown before play and the game command with the result you were paid on.

## How a round is derived

1. Before play the house shows `SHA-256(serverSeed)`. After the seed pair is retired it reveals `serverSeed`; `commit` reproduces the fingerprint.
2. Each random number is `HMAC-SHA256(key = serverSeed, message = "clientSeed-nonce-cursor")`. The **nonce** counts rounds; the **cursor** counts draws inside a round (a Sic Bo roll reads cursors 0, 1, 2; roulette reads 0 only).
3. The first eight bytes of the digest become a number in [0,1) as `hi / 2^32 + lo / 2^64` — two exact pieces added once, so the only rounding matches the server's integer-to-double conversion bit for bit. Why that matters: [One rounding, not many](https://betkyo.com/en/blog/one-rounding-not-many-why-the-verifier-matches-the-server-bit-for-bit/).
4. Each game maps the number through its published rule: Limbo `floor(0.99 / (1 − u) × 100)` clamped to [100, 1,000,000]; roulette `floor(u × 37)`; a die `floor(u × 6) + 1`.

Cursor layouts for every game, including the card games that draw without replacement, are documented in [What the cursor counts](https://betkyo.com/en/blog/one-nonce-many-numbers-what-the-cursor-counts/). What the scheme proves and what it cannot: [What a hash commitment proves](https://betkyo.com/en/blog/what-a-hash-commitment-proves/).

## Scope

This script covers the seed-pair originals whose mapping is a single arithmetic step. Card games (blackjack, video poker, Casino Hold'em, Andar Bahar, bingo) use the same numbers but a without-replacement pool; those layouts are described in the article above and verified by the in-site panel.

Betkyo is a crypto casino with provably fair original games. 18+. Verification shows the randomness was committed and honest; it does not change the house edge, which every game's article states.

Related: [odds-data](https://github.com/betkyo-open-labs/odds-data) (the paytables), [odds-derivations](https://github.com/betkyo-open-labs/odds-derivations) (the return figures). Licence: MIT.
