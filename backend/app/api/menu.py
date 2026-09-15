from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import Restaurant, MenuCategory, MenuItem
from app.deps import get_current_restaurant

router=APIRouter(prefix="/api/menu",tags=["menu"])

class ItemIn(BaseModel):
    name:str; description:str|None=None; base_price:Decimal=Field(ge=0); category_id:UUID|None=None; variants:list=[]; addons:list=[]

# 🆕 Separate PATCH schema — every field optional, so a partial update
# (e.g. price only) never wipes out fields the caller didn't send.
class ItemPatch(BaseModel):
    name:str|None=None; description:str|None=None; base_price:Decimal|None=Field(default=None,ge=0)
    category_id:UUID|None=None; variants:list|None=None; addons:list|None=None

class AvailabilityIn(BaseModel): is_available:bool

@router.get("")
async def menu(restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    cats=(await session.execute(select(MenuCategory).where(MenuCategory.restaurant_id==restaurant.id).order_by(MenuCategory.display_order))).scalars().all()
    items=(await session.execute(select(MenuItem).where(MenuItem.restaurant_id==restaurant.id))).scalars().all()
    by={str(c.id):[] for c in cats}
    unc=[]
    for i in items:
        d=item_dict(i)
        if i.category_id and str(i.category_id) in by:by[str(i.category_id)].append(d)
        else:unc.append(d)
    return {"categories":[{"id":str(c.id),"name":c.name,"display_order":c.display_order,"items":by[str(c.id)]} for c in cats],"uncategorized":unc}

def item_dict(i):return {"id":str(i.id),"category_id":str(i.category_id) if i.category_id else None,"name":i.name,"description":i.description,"base_price":float(i.base_price),"is_available":i.is_available,"variants":i.variants,"addons":i.addons}

async def category_check(session,rid,cid):
    if cid is None:return
    c=(await session.execute(select(MenuCategory).where(MenuCategory.id==cid,MenuCategory.restaurant_id==rid))).scalar_one_or_none()
    if not c:raise HTTPException(status_code=400,detail="Category not found for this restaurant")

@router.post("/items")
async def create_item(body:ItemIn,restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    await category_check(session,restaurant.id,body.category_id)
    i=MenuItem(restaurant_id=restaurant.id,**body.model_dump());session.add(i);await session.commit();await session.refresh(i);return item_dict(i)

@router.patch("/items/{id}")
async def edit_item(id:UUID,body:ItemPatch,restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    i=(await session.execute(select(MenuItem).where(MenuItem.id==id,MenuItem.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not i:raise HTTPException(status_code=404,detail="Menu item not found")
    updates=body.model_dump(exclude_unset=True)
    if "category_id" in updates:
        await category_check(session,restaurant.id,updates["category_id"])
    for k,v in updates.items():setattr(i,k,v)
    await session.commit();await session.refresh(i);return item_dict(i)

@router.patch("/items/{id}/availability")
async def availability(id:UUID,body:AvailabilityIn,restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    i=(await session.execute(select(MenuItem).where(MenuItem.id==id,MenuItem.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not i:raise HTTPException(status_code=404,detail="Menu item not found")
    i.is_available=body.is_available;await session.commit();return item_dict(i)

@router.delete("/items/{id}")
async def delete_item(id:UUID,restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    i=(await session.execute(select(MenuItem).where(MenuItem.id==id,MenuItem.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not i:raise HTTPException(status_code=404,detail="Menu item not found")
    await session.delete(i);await session.commit();return {"ok":True}