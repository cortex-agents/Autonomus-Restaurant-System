from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import MenuCategory, MenuItem
from app.deps import get_current_restaurant

router=APIRouter(prefix="/api/menu",tags=["menu"])

class CategoryIn(BaseModel):
    name: str
    display_order: int = 0

class CategoryPatch(BaseModel):
    name: str | None = None
    display_order: int | None = None

class VariantIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price_delta: Decimal = Field(default=Decimal(0))

class AddonIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: Decimal = Field(default=Decimal(0), ge=0)

def _plain(models):
    # JSONB column: store plain numbers, not Decimal.
    return [{k:(float(v) if isinstance(v,Decimal) else v) for k,v in m.model_dump().items()} for m in models]

class ItemIn(BaseModel):
    name:str=Field(min_length=1,max_length=255); description:str|None=None; base_price:Decimal=Field(ge=0); category_id:UUID|None=None; variants:list[VariantIn]=[]; addons:list[AddonIn]=[]

# 🆕 Separate PATCH schema — every field optional, so a partial update
# (e.g. price only) never wipes out fields the caller didn't send.
class ItemPatch(BaseModel):
    name:str|None=None; description:str|None=None; base_price:Decimal|None=Field(default=None,ge=0)
    category_id:UUID|None=None; variants:list[VariantIn]|None=None; addons:list[AddonIn]|None=None

class AvailabilityIn(BaseModel): is_available:bool

def category_dict(c): return {"id": str(c.id), "name": c.name, "display_order": c.display_order}

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

@router.get("/categories")
async def list_categories(restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    cats=(await session.execute(select(MenuCategory).where(MenuCategory.restaurant_id==restaurant.id).order_by(MenuCategory.display_order, MenuCategory.name))).scalars().all()
    return {"items": [category_dict(c) for c in cats]}

@router.post("/categories")
async def create_category(body: CategoryIn, restaurant=Depends(get_current_restaurant), session: AsyncSession=Depends(get_db)):
    c = MenuCategory(restaurant_id=restaurant.id, name=body.name.strip(), display_order=body.display_order)
    session.add(c); await session.commit(); await session.refresh(c)
    return category_dict(c)

@router.patch("/categories/{id}")
async def edit_category(id: UUID, body: CategoryPatch, restaurant=Depends(get_current_restaurant), session: AsyncSession=Depends(get_db)):
    c=(await session.execute(select(MenuCategory).where(MenuCategory.id==id,MenuCategory.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not c: raise HTTPException(status_code=404, detail="Category not found")
    updates=body.model_dump(exclude_unset=True)
    for k,v in updates.items():
        setattr(c, k, v.strip() if k == "name" and isinstance(v, str) else v)
    await session.commit(); await session.refresh(c)
    return category_dict(c)

@router.delete("/categories/{id}")
async def delete_category(id: UUID, restaurant=Depends(get_current_restaurant), session: AsyncSession=Depends(get_db)):
    c=(await session.execute(select(MenuCategory).where(MenuCategory.id==id,MenuCategory.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not c: raise HTTPException(status_code=404, detail="Category not found")
    has_items=(await session.execute(select(MenuItem.id).where(MenuItem.restaurant_id==restaurant.id,MenuItem.category_id==id).limit(1))).scalar_one_or_none()
    if has_items: raise HTTPException(status_code=400, detail="Category has menu items; move or delete items first")
    await session.delete(c); await session.commit()
    return {"ok": True}

@router.post("/items")
async def create_item(body:ItemIn,restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    await category_check(session,restaurant.id,body.category_id)
    data=body.model_dump(exclude={"variants","addons"})
    i=MenuItem(restaurant_id=restaurant.id,**data,variants=_plain(body.variants),addons=_plain(body.addons));session.add(i);await session.commit();await session.refresh(i);return item_dict(i)

@router.patch("/items/{id}")
async def edit_item(id:UUID,body:ItemPatch,restaurant=Depends(get_current_restaurant),session:AsyncSession=Depends(get_db)):
    i=(await session.execute(select(MenuItem).where(MenuItem.id==id,MenuItem.restaurant_id==restaurant.id))).scalar_one_or_none()
    if not i:raise HTTPException(status_code=404,detail="Menu item not found")
    updates=body.model_dump(exclude_unset=True,exclude={"variants","addons"})
    if body.variants is not None: updates["variants"]=_plain(body.variants)
    if body.addons is not None: updates["addons"]=_plain(body.addons)
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