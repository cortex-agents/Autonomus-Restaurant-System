from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api import auth,orders,menu,settings as settings_api,escalations,conversations,whatsapp

s=get_settings(); app=FastAPI(title="Restaurant Digital FTE API",version="0.1.0")
app.add_middleware(CORSMiddleware,allow_origins=s.cors_list,allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
app.include_router(auth.router);app.include_router(orders.router);app.include_router(menu.router);app.include_router(settings_api.router);app.include_router(escalations.router);app.include_router(conversations.router);app.include_router(whatsapp.router)
@app.get("/health")
async def health():return {"status":"ok"}
