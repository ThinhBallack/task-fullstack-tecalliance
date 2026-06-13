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
        # Gom nhóm các address theo mã code
        groups = defaultdict(list)
        for addr in document.addresses:
            groups[addr.code].append(addr)

        for code, addrs in groups.items():
            if len(addrs) < 2:
                continue
            
            # Sắp xếp các address theo ngày bắt đầu (StartDate định dạng YYYY-MM-DD có thể sort chuỗi)
            sorted_addrs = sorted(addrs, key=lambda a: a.start_date or "")
            
            for i in range(1, len(sorted_addrs)):
                prev = sorted_addrs[i-1]
                curr = sorted_addrs[i]
                
                # Nếu ngày bắt đầu của phần tử hiện tại <= ngày kết thúc của phần tử trước đó -> Xung đột
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