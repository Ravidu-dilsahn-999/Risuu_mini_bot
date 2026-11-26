# RISUU MINI BOT 109

Telegram `robinmaxyt/7` හි **BOT Part 02 All.zip** source එකේ errors fix කරලා, fake menu entries වෙනුවට real command handlers **109ක්** එක්ක rebuild කළ version එක.

## ප්‍රධාන වෙනස්කම්

- Commands **109/109** startup guard සහ offline verifier එකෙන් පරීක්ෂා කළ හැක
- Baileys 6.7.9 වෙනුවට current Baileys 7 + live WhatsApp Web version detection
- QR සහ phone pairing code දෙකම animated web dashboard එකෙන්
- සෑම text command reply එකකටම three-stage WhatsApp edit animation
- LID IDs, owner/admin checks, group permissions සහ reconnect handling fix කර ඇත
- Original source එකේ hard-coded third-party number/callback සම්පූර්ණයෙන් ඉවත් කර ඇත
- Broken mandatory MongoDB dependency ඉවත් කර `.env` / dashboard settings භාවිතා කරයි
- Old Mega `SESSION_ID`, base64 credentials, හෝ fresh dashboard pairing support කරයි
- Download/media commands සඳහා size limit සහ safe error handling ඇත

## අවශ්‍ය දේ

- Node.js **22.22.2+**
- WhatsApp number එකක් (secondary number එකක් වඩා හොඳයි)

## පටන් ගන්න

1. `.env.example` file එක `.env` ලෙස copy කරන්න.
2. `OWNER_NUMBER` සහ `PAIR_NUMBER` country code එකත් එක්ක දාන්න.
3. Run කරන්න:

```bash
npm ci
npm start
```

Windows වල `run.bat`, Linux/Mac වල `chmod +x start.sh && ./start.sh` භාවිතා කරන්න පුළුවන්.

Browser එකේ `http://localhost:8000` open කර Connect tab එකෙන් QR scan කරන්න හෝ phone pairing code එක ගන්න.

## 109/109 පරීක්ෂාව

WhatsApp connection එකක් නැතුව command handlers සියල්ලම test කරන්න:

```bash
npm run verify
```

Dashboard එකේ **Test Lab → Verify 109** button එකෙනුත් එම පරීක්ෂාව run වෙනවා.

## Command categories

| Category | Count |
|---|---:|
| Core | 9 |
| Utility | 20 |
| Text | 15 |
| Fun | 20 |
| Media / Search | 15 |
| Group | 20 |
| Owner | 10 |
| **Total** | **109** |

Chat එකේ `.menu` ගහලා full list එක බලන්න. `.menu group` වගේ category එකක් දුන්නාම usage සහ descriptions ලැබෙනවා.

## Session options

- `SESSION_ID` blank: dashboard QR/phone pairing භාවිතා කරන්න.
- Old Mega id (`fileId#key`) හෝ full Mega URL: automatic restore උත්සාහ කරයි.
- `RISUU_SESSION~<base64 creds.json>` format එකත් support කරයි.
- Session invalid නම් crash නොවී fresh pairing mode එකට යයි.

## වැදගත්

Baileys කියන්නේ unofficial WhatsApp Web library එකක්. Spam/bulk abuse කරන්න එපා. `.broadcast` known chats 100කට සීමා කර delay එකක් දාලා තිබේ. YouTube/Facebook/translation වැනි external services වල availability ඒ service එක අනුව වෙනස් විය හැක.
