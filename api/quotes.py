from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
import time

BACKEND = "https://admin.reachempirebot.com"
SYMBOLS = (
    {"group":"Forex","label":"EUR/USD","symbols":("FX_IDC:EURUSD","EURUSD"),"decimals":5},
    {"group":"Forex","label":"GBP/USD","symbols":("FX_IDC:GBPUSD","GBPUSD"),"decimals":5},
    {"group":"Forex","label":"USD/JPY","symbols":("FX_IDC:USDJPY","USDJPY"),"decimals":3},
    {"group":"Crypto","label":"BTC/USD","symbols":("BINANCE:BTCUSDT","BTCUSD","BTCUSDT"),"decimals":2},
    {"group":"Crypto","label":"ETH/USD","symbols":("BINANCE:ETHUSDT","ETHUSD","ETHUSDT"),"decimals":2},
    {"group":"Metal","label":"XAU/USD","symbols":("OANDA:XAUUSD","XAUUSD","GOLD"),"decimals":2},
    {"group":"Metal","label":"XAG/USD","symbols":("OANDA:XAGUSD","XAGUSD","SILVER"),"decimals":3},
)

def _number(value):
    try: return float(value)
    except (TypeError, ValueError): return None

def _source(payload):
    if not isinstance(payload, dict): return None
    candidates=[payload.get(k) for k in ("item","latest","quote","market","data","result","payload")]
    for key in ("items","results","data"):
        value=payload.get(key)
        if isinstance(value,list) and value: candidates.append(value[0])
    for value in candidates:
        if isinstance(value,dict): return value
    return payload

def _price(source):
    if not isinstance(source,dict): return None
    fields=("price","current_price","market_price","last_price","latest_price","last","close","close_price","bid","ask","entry")
    for field in fields:
        value=_number(source.get(field))
        if value is not None: return value
    quote=source.get("quote")
    if isinstance(quote,dict):
        for field in fields:
            value=_number(quote.get(field))
            if value is not None: return value
    return None

def _percent(source):
    if not isinstance(source,dict): return 0.0
    for field in ("change_percent","percent","percent_change","changePercent","change_pct","pct_change"):
        value=_number(source.get(field))
        if value is not None: return value
    return 0.0

def fetch_market(config):
    item={"group":config["group"],"label":config["label"],"decimals":config["decimals"],"price":None,"percent":None,"live":False}
    for symbol in config["symbols"]:
        try:
            query=urlencode({"symbol":symbol,"timeframe":"60","limit":"1","_rebts":int(time.time()*1000)})
            req=Request(BACKEND+"/api/market-trends?"+query,headers={"Accept":"application/json","User-Agent":"ReachEmpireBot-Market/2.0","Cache-Control":"no-cache"})
            with urlopen(req,timeout=9) as response:
                payload=json.loads(response.read().decode("utf-8"))
            source=_source(payload)
            price=_price(source)
            if price is None: continue
            item.update({"price":price,"percent":_percent(source),"live":True})
            return item
        except Exception:
            continue
    return item

def build_payload():
    with ThreadPoolExecutor(max_workers=len(SYMBOLS)) as executor:
        items=list(executor.map(fetch_market,SYMBOLS))
    return {"items":items,"updated_at":datetime.now(timezone.utc).isoformat(),"source":"ReachEmpireBot Market Backend","backend":BACKEND}

from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body=json.dumps(build_payload()).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store, max-age=0")
        self.send_header("Access-Control-Allow-Origin","*")
        self.end_headers()
        self.wfile.write(body)
