"""Public dynamic OG HTML for shared Social posts. No DB writes or credentials.
Vercel rewrite: /social/post/:postId/ -> /api/social-share-preview?post=:postId
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen
from html import escape
import json
import re

PUBLIC_ORIGIN = "https://reachempirebot.com"
BACKEND_ORIGIN = "https://admin.reachempirebot.com"
FALLBACK_IMAGE = PUBLIC_ORIGIN + "/assets/images/resource/reachempirebot-dashboard.png"

def youtube_id(text):
    m = re.search(r'https?://(?:www\.|m\.|music\.)?(?:youtube\.com/watch\?[^\s]*?v=|youtu\.be/|youtube\.com/shorts/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])', text or '')
    return m.group(1) if m else ''

def get_post(post_id):
    req = Request(BACKEND_ORIGIN + "/api/social/posts/" + str(post_id),
                  headers={"Accept": "application/json", "User-Agent": "ReachEmpireBotSocialPreview/1.0"})
    with urlopen(req, timeout=5) as r:
        payload=json.loads(r.read(256 * 1024).decode('utf-8'))
    p=payload.get('post') if isinstance(payload,dict) else None
    return p if isinstance(p,dict) and str(p.get('visibility','public'))=='public' else None

def image_for(post):
    posts=[post]
    if isinstance(post.get('shared_post'),dict):posts.append(post['shared_post'])
    for source in posts:
        for medium in (source.get('media') or []):
            if not isinstance(medium,dict) or medium.get('media_type')!='image':continue
            url=str(medium.get('url') or '')
            try:
                parsed=urlsplit(url)
                if parsed.scheme=='https' and parsed.hostname in {'admin.reachempirebot.com','api.reachempirebot.com','reachempirebot.com'} and parsed.path.startswith('/uploads/social/posts/'):
                    return url
            except Exception:pass
    for source in posts:
        vid=youtube_id(str(source.get('content') or ''))
        if vid:return 'https://i.ytimg.com/vi/'+vid+'/hqdefault.jpg'
    return FALLBACK_IMAGE

def build_html(post_id, post):
    post=post or {}
    community=bool(post.get('community_id'))
    landing=PUBLIC_ORIGIN + ('/social/community/?post=' if community else '/social/?post=') + str(post_id)
    share=PUBLIC_ORIGIN+'/social/post/'+str(post_id)+'/'
    author=post.get('author') or {}
    name=str(author.get('display_name') or 'ReachEmpire Member')[:100]
    title=name+' on ReachEmpire Social'
    desc=re.sub(r'\s+',' ',str(post.get('content') or '')).strip()[:240] or 'View this post on ReachEmpire Social.'
    img=image_for(post)
    def e(v):return escape(v,quote=True)
    jsurl=json.dumps(landing).replace('<',r'\u003c')
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
       f'<meta name="viewport" content="width=device-width, initial-scale=1">'
       f'<title>{e(title)}</title><meta name="description" content="{e(desc)}">'
       f'<link rel="canonical" href="{e(share)}">'
       f'<meta property="og:type" content="article">'
       f'<meta property="og:site_name" content="ReachEmpire Social">'
       f'<meta property="og:url" content="{e(share)}">'
       f'<meta property="og:title" content="{e(title)}">'
       f'<meta property="og:description" content="{e(desc)}">'
       f'<meta property="og:image" content="{e(img)}">'
       f'<meta name="twitter:card" content="summary_large_image">'
       f'<meta name="twitter:title" content="{e(title)}">'
       f'<meta name="twitter:description" content="{e(desc)}">'
       f'<meta name="twitter:image" content="{e(img)}">'
       f'</head><body><p>Opening the post on ReachEmpire Social…</p>'
       f'<p><a href="{e(landing)}">View post</a></p>'
       f'<script>window.location.replace({jsurl});</script></body></html>')

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query=parse_qs(urlsplit(self.path).query)
        raw=(query.get('post') or [''])[0]
        if not re.fullmatch(r'[1-9][0-9]{0,11}',raw):
            self.send_error(404,'Not found');return
        post_id=int(raw)
        try:post=get_post(post_id)
        except Exception:post=None
        # Never show an unrelated preview for a missing/deleted post.
        if not post:
            self.send_error(404,'Post not found');return
        body=build_html(post_id,post).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Cache-Control','public, s-maxage=120, stale-while-revalidate=300')
        self.send_header('X-Content-Type-Options','nosniff')
        self.end_headers()
        self.wfile.write(body)
