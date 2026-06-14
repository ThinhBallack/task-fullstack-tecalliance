# Completed Tasks & Progress 🚀

## Task 1 & 2: Data Study & Implement Validators
Identified critical data quality issues and implemented the following validators:

- [x] **NegativeTorqueValidator**: Flags torque values `< 0` (Severity: `ERROR`) - e.g., Code `90AZ`.
- [x] **OutrageousTorqueValidator**: Flags unrealistically high torque values (Severity: `ERROR`) - e.g., Code `111AZ` with `8500 Nm`.
- [x] **OverlappingDateValidator**: Detects date conflicts for the same address code (Severity: `ERROR`) - e.g., Code `126AZ`.
- [x] **SafetyNoteValidator**: Highlights critical safety instructions like *"Left-hand threads"* or *"Anti-seize"* (Severity: `WARNING`/`INFO`) - e.g., Code `10AZ`, `130AZ`.

## Task 3: UI Improvements
- [x] Added severity coloring
- [x] Added grouping by **Address Code**.
- [x] Added filtering by **Validation Severity**.

## Task 4 & 5: Upload History & Export
- [x] Implemented SQLite database to store past uploads and validation results.
- [x] Added UI view to browse previous uploads.
- [x] Added **"Export to CSV"** functionality.

## Task 6: Architecture (Optional)
- [x] Addressed AWS deployment strategy in [`ARCHITECTURE.md`](starter-pack/ARCHITECTURE.md) for large files and timeout handling.

---

### Result screenshot:
![Result screenshot](starter-pack/Result-screenshot.png)
