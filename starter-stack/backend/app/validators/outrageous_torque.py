from ..parser import TorqueDocument
from .base import BaseValidator, ValidationResult, Severity

class OutrageousTorqueValidator(BaseValidator):
    """Flags address entries that have an unrealistically high torque value."""

    @property
    def name(self) -> str:
        return "outrageous_torque"

    def validate(self, document: TorqueDocument) -> list[ValidationResult]:
        issues = []
        MAX_SAFE_TORQUE = 1000.0
        
        for addr in document.addresses:
            if addr.torque is not None and addr.torque > MAX_SAFE_TORQUE:
                issues.append(
                    ValidationResult(
                        code=addr.code,
                        severity=Severity.ERROR,
                        message=f"Address {addr.code!r} has an outrageously high torque value ({addr.torque} Nm). Possible missing decimal separator.",
                        validator=self.name,
                    )
                )
        return issues