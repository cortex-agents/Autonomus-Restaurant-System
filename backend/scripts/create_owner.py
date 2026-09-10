import argparse,json
from pathlib import Path
from app.security import hash_password
from app.config import get_settings
p=argparse.ArgumentParser();p.add_argument("--email",required=True);p.add_argument("--password",required=True);p.add_argument("--restaurant-id",required=True);a=p.parse_args()
f=Path(get_settings().owner_accounts_file);f.parent.mkdir(parents=True,exist_ok=True)
rows=json.loads(f.read_text()) if f.exists() else []
rows=[x for x in rows if x.get("email")!=a.email]
rows.append({"email":a.email,"password_hash":hash_password(a.password),"restaurant_id":a.restaurant_id})
f.write_text(json.dumps(rows,indent=2));print(f"Owner account written to {f}")
