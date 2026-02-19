# 100 — Bill Scanning & Line-Item Split 💡 Idea

## Goal

Break down a single bank transaction (e.g., "REWE €67.40") into its actual line items (food, cleaning products, clothing) using a photo of the receipt — enabling granular category tracking without manual entry.

## Problem

Even with perfect categorisation, a supermarket transaction is opaque. "REWE €67.40" might contain groceries, household cleaning supplies, and personal care items — but it shows up as one block in the "Groceries" category. The same is true for restaurant bills, hardware stores, or department stores.

## Proposed Approach

### Step 1 — Receipt Capture

- Upload a photo of a receipt (desktop file picker, or mobile browser camera)
- Stored locally; never sent to external services

### Step 2 — OCR (Text Extraction)

- Extract text from the image using a local OCR engine
- Candidate: **Tesseract** (open-source, runs fully locally via `pytesseract`)
- Output: raw text blob of line items, prices, totals

### Step 3 — Line-Item Parsing

- Parse the OCR output into structured line items: `{ description, quantity, unit_price, total }`
- Heuristic rules for common receipt formats (German supermarkets, restaurants)
- Optionally: use a local LLM with vision capabilities (e.g., LLaVA, Mistral Vision) for better accuracy on messy receipts — keeping everything local

### Step 4 — Category Assignment per Line Item

- Each parsed line item gets a suggested category (rule-based or ML from 080)
- User reviews and confirms the split
- The original bank transaction is replaced (or annotated) by the split sub-transactions

### Step 5 — Relate to Bank Transaction

- Match the scanned total to an existing bank transaction (by amount ± small tolerance, date proximity)
- Link the receipt to the transaction; the transaction is now "expanded" with line-item detail

## Data Model Changes

- `receipt` table: stores OCR result, image path, linked transaction id
- `transaction_line_item` table: description, amount, category_id, receipt_id, parent_transaction_id
- Reports optionally use line items instead of the parent transaction amount for category breakdown

## UX Flow

```
Transaction list → [Scan Receipt] on a transaction
  → Upload/capture photo
  → OCR runs locally
  → Review parsed line items + suggested categories
  → Confirm → line items saved, transaction marked as "expanded"

Category breakdown → can toggle between:
  - Transaction-level (current behaviour)
  - Line-item-level (granular, requires scanned receipts)
```

## Design Notes

- This is the most technically complex iteration — OCR quality varies significantly by receipt format and image quality
- Start with desktop file upload; mobile camera is a browser capability that works on modern mobile browsers pointing to the local app
- Tesseract works well for printed receipts; handwritten bills need a vision model
- The local LLM path (for parsing) keeps the privacy-first principle intact but requires the user to have a local model running (e.g., via Ollama)
- Line-item data enriches reports but the feature should be entirely opt-in — existing workflows are unaffected

## Definition of Done

- User can upload a receipt photo and get parsed line items
- Line items are categorised and linked to the parent bank transaction
- Category breakdown report can optionally show line-item granularity
- Everything runs locally; no image or data leaves the machine
