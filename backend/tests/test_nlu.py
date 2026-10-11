from types import SimpleNamespace as NS
from decimal import Decimal
import uuid
from app.agent import nlu

def _items():
    mk = lambda n, p: NS(id=uuid.uuid4(), name=n, base_price=Decimal(p))
    return [mk("Broast (2 pcs)", 550), mk("Broast (4 pcs)", 950), mk("Beef Burger", 400), mk("Zinger Burger", 700),
            mk("Family Deal (4 Broast pcs + 2 Zinger + Fries + 2 Drinks)", 2200),
            mk("Zaiqa Deal 1 (1 Zinger + Fries + Drink)", 750), mk("Fries (Regular)", 200)]

def names(res): return [(i.name, q) for i, q in res[0]]

def test_deal_without_digit_quantity():
    assert names(nlu.match_items("zaiqa deal 1 chahiye", _items())) == [("Zaiqa Deal 1 (1 Zinger + Fries + Drink)", 1)]

def test_quantity_and_multiple_items():
    r = names(nlu.match_items("2 zinger burger aur 3 fries", _items()))
    assert ("Zinger Burger", 2) in r and ("Fries (Regular)", 3) in r

def test_urdu_number_words():
    assert names(nlu.match_items("ek beef burger", _items())) == [("Beef Burger", 1)]
    assert names(nlu.match_items("teen beef burger chahiye", _items())) == [("Beef Burger", 3)]

def test_bracket_variant_selected_by_full_name():
    assert [n for n, _ in names(nlu.match_items("broast 4 pcs", _items()))] == ["Broast (4 pcs)"]

def test_ambiguous_broast_asks():
    m, amb = nlu.match_items("2 broast", _items())
    assert not m and len(amb[0]) == 2

def test_menu_and_category_requests():
    groups = [("Burgers", _items()[2:4]), ("Deals", _items()[4:6])]
    assert nlu.wants_menu("mujhay sirf burgers dikhaoo")
    assert [n for n, _ in nlu.category_hit(groups, "mujhay sirf burger kay baray main btaooo")] == ["Burgers"]
    assert nlu.match_items("sirf burgers dikhao", _items())[0] == []

def test_partial_single_word():
    assert [i.name for i in nlu.partial_candidates("fries", _items())][0].startswith("Fries")
    assert nlu.partial_candidates("mujhay sirf burger kay baray main btaooo kuch bhi aur", _items()) == []
