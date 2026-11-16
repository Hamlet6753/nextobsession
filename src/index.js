const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>NextObsession</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #101014;
      color: #fafafa;
      font-family: Arial, sans-serif;
    }
    main { width: 100%; max-width: 720px; }
    .label {
      color: #ff728f;
      font-size: 13px;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    h1 {
      margin: 24px 0;
      font-size: clamp(40px, 8vw, 76px);
      letter-spacing: -3px;
      overflow-wrap: anywhere;
    }
    p {
      color: #aaaab5;
      font-size: 20px;
      line-height: 1.6;
    }
    footer {
      margin-top: 64px;
      color: #777783;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <main>
    <div class="label">NextObsession</div>
    <h1>Find your next obsession.</h1>
    <p>A new way to discover your favorite creators. Coming soon.</p>
    <footer>Independent creator discovery. Not affiliated with OnlyFans.</footer>
  </main>
</body>
</html>`;

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;

    if (path === "/health") {
      return Response.json({ ok: true });
    }

    if (path !== "/") {
      return new Response("Not found", { status: 404 });
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
};
