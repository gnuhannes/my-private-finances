# Backlog — Small Improvements & Bug Fixes

Items too small for a numbered iteration but worth tracking.

---

## Import UX

### Trade Republic CSV: rows without an amount should be silently skipped

**Area:** backend — TR CSV row filter  
**Status:** 🐛 Known issue

TR exports occasionally include rows with no amount (e.g. pending or informational entries). These currently reach the validation step and surface as import errors to the user, which is alarming and misleading — they are not errors, just non-booking rows.

**Fix direction:** Extend the row-filter logic (see `bbe792c`) to also drop rows where the amount field is empty/null before validation, or catch the specific validation error and suppress it silently.

---

### Import dialog: profile selector is confusing

**Area:** frontend — import dialog component  
**Status:** 💡 Improvement

The profile selector is not intuitive to users who think in terms of their bank, not "import profiles".

**Ideas to explore:**
- Rename label to "Bank / Source" instead of "Profile"
- Use bank names as option labels (e.g. "Trade Republic" rather than `trade_republic`)
- Add a short description line per option
- Auto-detect the profile from the CSV file headers on upload
