from collections import defaultdict
from ..parser import TorqueDocument
from .base import BaseValidator, ValidationResult, Severity

class OverlappingDateValidator(BaseValidator):
    """Detects if multiple addresses with the same code have overlapping validity dates."""

    @property
    def name(self) -> str:
        return "overlapping_date"

    def validate(self, document: TorqueDocument) -> list[ValidationResult]:
        issues = []
        # Group addresses by code.
        groups = defaultdict(list)
        for addr in document.addresses:
            groups[addr.code].append(addr)

        for code, addrs in groups.items():
            if len(addrs) < 2:
                continue
            
            # Sort the addresses by start date (StartDate format YYYY-MM-DD, can be sorted as a string).
            sorted_addrs = sorted(addrs, key=lambda a: a.start_date or "")
            
            for i in range(1, len(sorted_addrs)):
                prev = sorted_addrs[i-1]
                curr = sorted_addrs[i]
                
                # If the start date of the current element is less than or equal to the end date of the previous element, a conflict will occur.
                if prev.end_date and curr.start_date and curr.start_date <= prev.end_date:
                    issues.append(
                        ValidationResult(
                            code=code,
                            severity=Severity.ERROR,
                            message=f"Address {code!r} has overlapping validity dates: ({prev.start_date} to {prev.end_date}) and ({curr.start_date} to {curr.end_date}).",
                            validator=self.name,
                        )
                    )
        return issues