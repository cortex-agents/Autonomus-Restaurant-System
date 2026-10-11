"""Tiny deterministic NLU used when no LLM is available (no key / no credits).

Pure functions, no DB: easy to unit test. Understands Roman-Urdu/English order lines such as
"zaiqa deal 1 chahiye", "2 zinger burger", "ek beef burger aur 3 fries", "sirf burgers dikhao".
"""
import re

NUM_WORDS = {
    "ek": 1, "aik": 1, "one": 1, "do": 2, "two": 2, "teen": 3, "three": 3, "char": 4, "chaar": 4,
    "four": 4, "panch": 5, "paanch": 5, "five": 5, "chay": 6, "chhe": 6, "six": 6,
}
STOP = {
    "mujhe", "mujhay", "muje", "mjhe", "mjhy", "hamein", "humain", "hume", "chahiye", "chahiyay", "chahye",
    "chaiye", "please", "plz", "pls", "order", "karna", "karo", "kardo", "karde", "kar", "dedo", "dein",
    "bhej", "bhejo", "add", "lena", "liye", "mein", "main", "aur", "and", "the", "kay", "sirf", "bas",
}
MENU_INTENT = re.compile(r"\b(menu|dikha\w*|show|list|available|kya kya|kia kia|what do you have)\b")


def _norm(tok: str) -> str:
    tok = tok.lower()
    return tok[:-1] if len(tok) > 3 and tok.endswith("s") else tok


def tokens(text: str) -> list[str]:
    return [_norm(t) for t in re.findall(r"[a-zA-Z0-9]+", text.lower())]


def _core(name: str) -> str:
    return re.sub(r"\([^)]*\)", " ", name or "")


def _qty_at(toks: list[str], idx: int) -> int | None:
    if 0 <= idx < len(toks):
        t = toks[idx]
        if t.isdigit() and 0 < int(t) < 100:
            return int(t)
        if t in NUM_WORDS:
            return NUM_WORDS[t]
    return None


def _contains(text_toks: set[str], name_toks: list[str]) -> bool:
    return bool(name_toks) and all(t in text_toks for t in name_toks)


def match_items(text: str, items: list) -> tuple[list[tuple[object, int]], list[list]]:
    """Precise matches only (every word of the item's name is in the message).

    Returns (matches, ambiguous): matches = [(item, qty)], ambiguous = [[item, item, ...]].
    Tier 1 = full name incl. brackets ("Broast (4 pcs)"), tier 2 = name without brackets.
    """
    toks = tokens(text)
    tokset = set(toks)
    chosen: dict = {}
    ambiguous: list[list] = []
    chosen_cores: list[set] = []
    for tier in (1, 2):
        groups: dict[tuple, list] = {}
        for it in items:
            nm = it.name if tier == 1 else _core(it.name)
            ntoks = tokens(nm)
            core_set = set(tokens(_core(it.name)))
            if _contains(tokset, ntoks) and it.id not in chosen and not any(core_set <= c for c in chosen_cores):
                groups.setdefault(tuple(sorted(set(ntoks))), []).append((it, ntoks))
        # prefer the most specific (longest) name; drop names fully contained in a longer matched one
        keys = sorted(groups, key=len, reverse=True)
        taken: list[set] = []
        for k in keys:
            ks = set(k)
            if any(ks <= t for t in taken):
                continue
            taken.append(ks)
            members = groups[k]
            if len(members) > 1:
                ambiguous.append([m[0] for m in members])
                continue
            it, ntoks = members[0]
            chosen_cores.append(set(tokens(_core(it.name))))
            first = min(toks.index(t) for t in ntoks)
            last = max(len(toks) - 1 - toks[::-1].index(t) for t in ntoks)
            qty = _qty_at(toks, first - 1)
            if qty is None or (toks[first - 1] in ntoks and tier == 1):
                qty = _qty_at(toks, last + 1) if _qty_at(toks, last + 1) and toks[last + 1] not in ntoks else 1
            chosen[it.id] = (it, qty or 1)
    return list(chosen.values()), ambiguous


def partial_candidates(text: str, items: list) -> list:
    """Loose match for one-word requests like "zinger" / "fries": any distinctive word of the
    message appears in an item name. Used only after precise matching and menu requests failed."""
    sig = [t for t in tokens(text) if len(t) >= 4 and not t.isdigit() and t not in STOP and t not in NUM_WORDS]
    if not sig or len(sig) > 3:
        return []
    out = []
    for it in items:
        nt = set(tokens(_core(it.name)))
        if any(t in nt for t in sig):
            out.append(it)
    return out


def wants_menu(text: str) -> bool:
    return bool(MENU_INTENT.search(text.lower()))


def category_hit(groups: list[tuple[str, list]], text: str) -> list[tuple[str, list]]:
    """Groups whose category name appears as a word in the message (singular/plural insensitive)."""
    tset = set(tokens(text))
    return [(n, i) for n, i in groups if i and any(w in tset for w in tokens(n))]
