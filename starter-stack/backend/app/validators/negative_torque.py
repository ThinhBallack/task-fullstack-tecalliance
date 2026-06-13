from ..parser import TorqueDocument
from .base import BaseValidator, ValidationResult, Severity

class NegativeTorqueValidator(BaseValidator):
    """Flags address entries that have a negative torque value."""

    @property
    def name(self) -> str:
        return "negative_torque"

    def validate(self, document: TorqueDocument) -> list[ValidationResult]:
        issues = []
        for addr in document.addresses:
            if addr.torque is not None and addr.torque < 0:
                issues.append(
                    ValidationResult(
                        code=addr.code,
                        severity=Severity.ERROR,
                        message=f"Address {addr.code!r} has an invalid negative torque value ({addr.torque}).",
                        validator=self.name,
                    )
                )
        return issues