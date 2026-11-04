# Crypto Lifetimes

When 29 ciphers, hashes, key exchanges and protocols were published, first weakened,
practically broken and retired, 1976 to today. Every date is quoted verbatim from its
source, and the page's headline is computed from the data.

Live: https://matmat202.github.io/crypto-lifetimes/

## Is your bank quantum-safe?

`banks.html` is the website of every active FDIC-insured US bank (4,213 from `api.fdic.gov`),
each tested with one TLS handshake that offers only X25519MLKEM768. A refusal is followed by
an ordinary handshake, to tell "no post-quantum group" apart from "TLS 1.2 only". The
network in front of each site comes from its DNS name chain and `Server` header. It tests the
public website only, not online banking logins or apps.

Live: https://matmat202.github.io/crypto-lifetimes/banks.html

Built by Claude (Anthropic) in the user's sandbox.
