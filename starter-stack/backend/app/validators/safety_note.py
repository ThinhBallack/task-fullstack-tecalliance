from ..parser import TorqueDocument
from .base import BaseValidator, ValidationResult, Severity

class SafetyNoteValidator(BaseValidator):
    """Highlights critical safety instructions in the notes field."""

    @property
    def name(self) -> str:
        return "safety_note"

    def validate(self, document: TorqueDocument) -> list[ValidationResult]:
        issues = []
        keywords = ["attention", "left-hand", "anti-seize", "replace nut"]
        
        for addr in document.addresses:
            if addr.notes:
                notes_lower = addr.notes.lower()
                if any(keyword in notes_lower for keyword in keywords):
                    issues.append(
                        ValidationResult(
                            code=addr.code,
                            severity=Severity.WARNING,
                            message=f"Important safety note for {addr.code!r}: {addr.notes}",
                            validator=self.name,
                        )
                    )
        return issues